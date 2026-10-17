package com.saferoute.shield

import android.app.Application
import android.app.StatusBarManager
import android.content.Context
import android.content.Intent
import android.service.quicksettings.Tile
import androidx.test.core.app.ApplicationProvider
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ServiceController
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLooper
import org.robolectric.shadows.ShadowSettings

/** The Quick Settings tile mirrors the shield and toggles it without asking for screen capture. */
@RunWith(RobolectricTestRunner::class)
@Config(qualifiers = "w360dp-h800dp-xxhdpi")
class ShieldTileTest {

    private val app: Application = ApplicationProvider.getApplicationContext()
    private var shield: ServiceController<ShieldService>? = null
    private var tileController: ServiceController<ShieldTileService>? = null

    private val options = mapOf(
        "apiUrl" to "https://api.example.test",
        "fallbackApiUrl" to "https://fallback.example.test",
        "language" to "my",
        "authToken" to "secret-token-value",
        "shareSignals" to true,
        "home" to "mm",
        "destination" to "TH",
        "strings" to mapOf("a11yShield" to "ကာကွယ် shield", "unknownKey" to "dropped", "ask" to "  ")
    )

    @Before
    fun setUp() {
        ShieldBridge.strings = ShieldStrings.DEFAULT
        ShieldBridge.shareSignals = false
    }

    @After
    fun tearDown() {
        tileController?.get()?.onStopListening()
        shield?.destroy()
        app.getSharedPreferences("kakwe_shield_start", Context.MODE_PRIVATE).edit().clear().commit()
        ShieldBridge.strings = ShieldStrings.DEFAULT
        ShieldBridge.shareSignals = false
        ShadowSettings.setCanDrawOverlays(false)
    }

    private fun idle() = ShadowLooper.idleMainLooper()

    private fun tile(): ShieldTileService {
        val c = Robolectric.buildService(ShieldTileService::class.java).create()
        tileController = c
        return c.get()
    }

    private fun runShield(): ShieldService {
        val c = Robolectric.buildService(ShieldService::class.java, Intent().setAction(ShieldService.ACTION_START)).create().startCommand(0, 1)
        shield = c
        idle()
        return c.get()
    }

    private fun configure() = ShieldStartConfig.save(app, ShieldStartConfig.fromOptions(options))

    private fun startedActivities(): List<Intent> {
        val out = ArrayList<Intent>()
        while (true) out += shadowOf(app).nextStartedActivity ?: return out
    }

    private fun startedServices(): List<Intent> {
        val out = ArrayList<Intent>()
        while (true) out += shadowOf(app).nextStartedService ?: return out
    }

    private fun assertOpensShieldScreen(intents: List<Intent>) {
        val open = intents.singleOrNull()
        assertNotNull("one activity opens", open)
        assertEquals(Intent.ACTION_VIEW, open!!.action)
        assertEquals("saferoute://shield", open.dataString)
        assertEquals(app.packageName, open.`package`)
        assertTrue(open.flags and Intent.FLAG_ACTIVITY_NEW_TASK != 0)
    }

    @Test
    fun tileStateFollowsTheShield() {
        assertEquals(Tile.STATE_ACTIVE, ShieldTileLogic.state(running = true))
        assertEquals(Tile.STATE_INACTIVE, ShieldTileLogic.state(running = false))
    }

    @Test
    fun clickRules() {
        for (overlay in listOf(true, false)) for (configured in listOf(true, false)) {
            assertEquals("on always turns off", TileAction.STOP, ShieldTileLogic.action(true, overlay, configured))
        }
        assertEquals(TileAction.OPEN_SETUP, ShieldTileLogic.action(false, canDrawOverlays = false, configured = true))
        assertEquals(TileAction.OPEN_SETUP, ShieldTileLogic.action(false, canDrawOverlays = true, configured = false))
        assertEquals(TileAction.OPEN_SETUP, ShieldTileLogic.action(false, canDrawOverlays = false, configured = false))
        assertEquals(TileAction.START, ShieldTileLogic.action(false, canDrawOverlays = true, configured = true))
    }

    @Test
    fun labelUsesTheAppLanguageWhenKnown() {
        assertEquals("Kakwe shield", ShieldTileLogic.label(null, "Kakwe shield"))
        assertEquals("ကာကွယ် shield", ShieldTileLogic.label(ShieldStartConfig.fromOptions(options), "Kakwe shield"))
    }

    @Test
    fun savedStartOptionsRoundTripWithoutTheToken() {
        assertNull("nothing saved before the app starts the shield", ShieldStartConfig.load(app))
        configure()
        val loaded = ShieldStartConfig.load(app)!!
        assertEquals("https://api.example.test", loaded.apiUrl)
        assertEquals("https://fallback.example.test", loaded.fallbackApiUrl)
        assertEquals("my", loaded.language)
        assertTrue(loaded.shareSignals)
        assertEquals("MM", loaded.home)
        assertEquals("TH", loaded.destination)
        assertEquals(mapOf("a11yShield" to "ကာကွယ် shield"), loaded.strings)
        val stored = app.getSharedPreferences("kakwe_shield_start", Context.MODE_PRIVATE).all
        assertFalse("the auth token is never stored", stored.values.any { it.toString().contains("secret-token-value") })

        ShieldStartConfig.saveShareSignals(app, false)
        assertFalse(ShieldStartConfig.load(app)!!.shareSignals)
    }

    @Test
    fun aBlankServiceAddressCountsAsNotSetUp() {
        ShieldStartConfig.save(app, ShieldStartConfig.fromOptions(mapOf("apiUrl" to "")))
        assertNull(ShieldStartConfig.load(app))
    }

    @Test
    @Config(sdk = [33])
    fun clickWithoutOverlayPermissionOpensTheShieldScreen() {
        configure()
        ShadowSettings.setCanDrawOverlays(false)
        val t = tile()
        t.onStartListening()
        t.onClick()
        idle()
        assertOpensShieldScreen(startedActivities())
        assertTrue("the shield does not start", startedServices().isEmpty())
        assertEquals(Tile.STATE_INACTIVE, t.qsTile.state)
    }

    @Test
    @Config(sdk = [34])
    fun clickBeforeTheAppEverStartedTheShieldOpensTheShieldScreen() {
        ShadowSettings.setCanDrawOverlays(true)
        val t = tile()
        t.onStartListening()
        t.onClick()
        idle()
        assertOpensShieldScreen(startedActivities())
        assertTrue(startedServices().isEmpty())
    }

    @Test
    @Config(sdk = [34])
    fun clickWhenOffStartsTheShieldLikeTheAppAndAsksForNoCapture() {
        configure()
        ShadowSettings.setCanDrawOverlays(true)
        val t = tile()
        t.onStartListening()
        assertEquals(Tile.STATE_INACTIVE, t.qsTile.state)
        t.onClick()
        idle()
        val started = startedServices().single()
        assertEquals(ShieldService::class.java.name, started.component?.className)
        assertEquals(ShieldService.ACTION_START, started.action)
        assertEquals("https://api.example.test", started.getStringExtra(ShieldService.EXTRA_API_URL))
        assertEquals("https://fallback.example.test", started.getStringExtra(ShieldService.EXTRA_FALLBACK_API_URL))
        assertEquals("my", started.getStringExtra(ShieldService.EXTRA_LANGUAGE))
        assertEquals("ကာကွယ် shield", ShieldBridge.strings["a11yShield"])
        assertTrue(ShieldBridge.shareSignals)
        assertTrue("no consent dialog and no app screen", startedActivities().isEmpty())
        assertEquals(Tile.STATE_ACTIVE, t.qsTile.state)
        assertEquals("ကာကွယ် shield", t.qsTile.label)
    }

    @Test
    @Config(sdk = [34])
    fun clickWhenOnTurnsTheShieldOff() {
        val service = runShield()
        assertTrue(ShieldService.isRunning)
        val t = tile()
        t.onStartListening()
        assertEquals(Tile.STATE_ACTIVE, t.qsTile.state)
        t.onClick()
        idle()
        assertFalse(ShieldService.isRunning)
        assertNull(service.overlayForTest)
        assertEquals(Tile.STATE_INACTIVE, t.qsTile.state)
        assertTrue(startedActivities().isEmpty())
    }

    @Test
    @Config(sdk = [34])
    fun turningOffFromTheTileReleasesTheSessionConsent() {
        val service = runShield()
        var released = false
        val defaultOpen = ShieldService.openCapture
        ShieldService.openCapture = { _, _, _ ->
            object : ScreenSource {
                override fun capture(notBefore: Long, waitMs: Long, masks: List<android.graphics.Rect>, onFrame: () -> Unit) =
                    ScreenCapturer.Capture.None
                override fun release() { released = true }
            }
        }
        try {
            service.requestCheck()
            idle()
            val id = startedActivities().single().getIntExtra(ConsentActivity.EXTRA_REQUEST_ID, -1)
            service.onConsentResult(id, ShieldBridge.Consent(android.app.Activity.RESULT_OK, Intent()))
            idle()
            assertTrue(service.hasProjection())
            val t = tile()
            t.onClick()
            idle()
            assertTrue(released)
            assertFalse(service.hasProjection())
        } finally {
            ShieldService.openCapture = defaultOpen
        }
    }

    @Test
    @Config(sdk = [34])
    fun tileFollowsStateChangesOnlyWhileListening() {
        val t = tile()
        t.onStartListening()
        ShieldBridge.publishRunning(true)
        idle()
        assertEquals(Tile.STATE_ACTIVE, t.qsTile.state)
        ShieldBridge.publishRunning(false)
        idle()
        assertEquals(Tile.STATE_INACTIVE, t.qsTile.state)
        t.onStopListening()
        ShieldBridge.publishRunning(true)
        idle()
        assertEquals("no updates after the shade closes", Tile.STATE_INACTIVE, t.qsTile.state)
        ShieldBridge.publishRunning(false)
    }

    @Test
    @Config(sdk = [34])
    fun aClickOnTheLockScreenUnlocksFirst() {
        configure()
        ShadowSettings.setCanDrawOverlays(true)
        val t = tile()
        shadowOf(t).setLocked(true)
        t.onClick()
        idle()
        assertEquals(ShieldService::class.java.name, startedServices().single().component?.className)
    }

    @Test
    fun addTileResults() {
        assertEquals("added", ShieldModule.tileRequestResult(StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED))
        assertEquals("already", ShieldModule.tileRequestResult(StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED))
        assertEquals("declined", ShieldModule.tileRequestResult(StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_NOT_ADDED))
        assertEquals("error", ShieldModule.tileRequestResult(StatusBarManager.TILE_ADD_REQUEST_ERROR_APP_NOT_IN_FOREGROUND))
    }
}
