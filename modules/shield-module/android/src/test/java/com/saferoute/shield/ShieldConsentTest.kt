package com.saferoute.shield

import android.app.Activity
import android.app.Application
import android.content.Intent
import android.graphics.Rect
import androidx.test.core.app.ApplicationProvider
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ServiceController
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import org.robolectric.shadows.ShadowLooper
import java.util.concurrent.TimeUnit

/** Screen-capture consent across shield sessions, and how fast a stop is reported. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h800dp-xxhdpi")
class ShieldConsentTest {

    private class FakeSource : ScreenSource {
        var released = false
        override fun capture(notBefore: Long, waitMs: Long, masks: List<Rect>, onFrame: () -> Unit) = ScreenCapturer.Capture.None
        override fun release() { released = true }
    }

    private val app: Application = ApplicationProvider.getApplicationContext()
    private val defaultOpen = ShieldService.openCapture
    private val opened = ArrayList<ShieldBridge.Consent>()
    private val sources = ArrayList<FakeSource>()
    private val states = ArrayList<Boolean>()
    private var refuse: (ShieldBridge.Consent) -> Boolean = { false }
    private var controller: ServiceController<ShieldService>? = null

    @Before
    fun setUp() {
        ShieldBridge.pendingConsent = null
        ShieldBridge.stateSink = { states += it }
        ShieldService.openCapture = { _, consent, _ ->
            opened += consent
            if (refuse(consent)) null else FakeSource().also { sources += it }
        }
    }

    @After
    fun tearDown() {
        controller?.destroy()
        ShieldService.openCapture = defaultOpen
        ShieldBridge.pendingConsent = null
        ShieldBridge.stateSink = null
    }

    private fun idle() = ShadowLooper.idleMainLooper()

    private fun startShield(): ShieldService {
        val c = Robolectric.buildService(ShieldService::class.java, Intent().setAction(ShieldService.ACTION_START)).create().startCommand(0, 1)
        controller = c
        idle()
        return c.get()
    }

    private fun stopShield(service: ShieldService) {
        service.stopNow()
        controller?.destroy()
        controller = null
        idle()
    }

    private fun grant() = ShieldBridge.Consent(Activity.RESULT_OK, Intent()).also { ShieldBridge.pendingConsent = it }

    private fun consentDialogs(): Int {
        var n = 0
        while (true) {
            val next = shadowOf(app).nextStartedActivity ?: return n
            if (next.component?.className == ConsentActivity::class.java.name) n++
        }
    }

    @Test
    @Config(sdk = [33])
    fun android13ReusesTheConsentOnTheNextStartWithoutAskingAgain() {
        val consent = grant()
        val first = startShield()
        assertEquals(listOf(consent), opened)
        assertTrue(first.hasProjection())
        stopShield(first)
        assertTrue("the projection stops with the shield", sources.single().released)
        assertSame("the consent outlives the session", consent, ShieldBridge.pendingConsent)
        assertTrue("the app skips the system dialog", ShieldBridge.hasProjection())

        val second = startShield()
        assertEquals(listOf(consent, consent), opened)
        assertTrue(second.hasProjection())
        assertEquals(0, consentDialogs())
    }

    @Test
    @Config(sdk = [33])
    fun android13AsksAgainOnTheFirstTapWhenTheKeptConsentNoLongerWorks() {
        val consent = grant()
        stopShield(startShield())
        refuse = { it.uses > 1 }
        val service = startShield()
        assertFalse(service.hasProjection())
        assertNull("a refused consent is dropped", ShieldBridge.pendingConsent)
        assertEquals("no error on the bubble before the user taps", ShieldOverlay.State.IDLE, service.overlayForTest?.state)
        assertEquals(0, consentDialogs())

        service.requestCheck()
        idle()
        assertEquals(1, consentDialogs())
        assertEquals(listOf(consent, consent), opened)
    }

    @Test
    @Config(sdk = [33])
    fun android13DropsTheConsentWhenTheUserStopsSharing() {
        grant()
        var stopped: (() -> Unit)? = null
        ShieldService.openCapture = { _, consent, onStopped ->
            opened += consent
            stopped = onStopped
            FakeSource().also { sources += it }
        }
        val service = startShield()
        stopped!!.invoke()
        idle()
        assertFalse(service.hasProjection())
        assertNull(ShieldBridge.pendingConsent)
    }

    @Test
    @Config(sdk = [34])
    fun android14StartsWithoutConsentAndAsksOnTheFirstBubbleTap() {
        val service = startShield()
        assertTrue(ShieldService.isRunning)
        assertNotNull("the bubble shows", service.overlayForTest)
        assertEquals(ShieldOverlay.State.IDLE, service.overlayForTest?.state)
        assertTrue(opened.isEmpty())
        assertEquals("no consent dialog at start", 0, consentDialogs())

        service.requestCheck()
        idle()
        assertEquals("the first tap asks", 1, consentDialogs())

        val consent = grant()
        service.onConsentGranted()
        idle()
        assertEquals(listOf(consent), opened)
        assertTrue(service.hasProjection())
        assertNull("Android 14 uses a consent once", ShieldBridge.pendingConsent)
    }

    @Test
    @Config(sdk = [34])
    fun android14AsksAgainInTheNextSession() {
        grant()
        stopShield(startShield())
        assertFalse(ShieldBridge.hasProjection())
        val service = startShield()
        assertFalse(service.hasProjection())
        assertEquals(1, opened.size)
        service.requestCheck()
        idle()
        assertEquals(1, consentDialogs())
    }

    @Test
    @Config(sdk = [34])
    fun stopRemovesTheBubbleAndReportsStoppedBeforeTheServiceTearsDown() {
        grant()
        val service = startShield()
        val bubble = service.overlayForTest!!.bubbleViewForTest
        assertTrue(bubble.isAttachedToWindow)
        assertEquals(listOf(true), states)

        service.stopNow()
        assertEquals("reported in the same call, with no animation or looper turn", listOf(true, false), states)
        assertFalse(ShieldService.isRunning)
        assertNull(service.overlayForTest)
        assertSame("the service is not torn down yet", service, ShieldService.instance)
        assertFalse("capture is released later, in onDestroy", sources.single().released)

        idle()
        assertFalse(bubble.isAttachedToWindow)
        controller?.destroy()
        controller = null
        assertTrue(sources.single().released)
        assertEquals("onDestroy does not report twice", listOf(true, false), states)
        assertNull(ShieldService.instance)
    }

    @Test
    @Config(sdk = [34])
    fun closingFromTheBubbleUsesAShortExitAndThenReportsStopped() {
        assertTrue(ShieldMotion.EXIT_MS <= 150)
        val service = startShield()
        service.overlayForTest!!.bubbleViewForTest.performLongClick()
        ShadowLooper.idleMainLooper(ShieldMotion.EXIT_MS + 20, TimeUnit.MILLISECONDS)
        assertEquals(listOf(true, false), states)
        assertFalse(ShieldService.isRunning)
    }
}
