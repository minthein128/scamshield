package com.saferoute.shield

import android.app.Activity
import android.app.Application
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Rect
import androidx.test.core.app.ApplicationProvider
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
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
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Screen-capture consent is asked on the first bubble tap of a shield session and the projection lives until the session ends. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h800dp-xxhdpi")
class ShieldConsentTest {

    private class FakeSource(@Volatile var gate: CountDownLatch?) : ScreenSource {
        @Volatile var released = false
        @Volatile var captures = 0
        override fun capture(notBefore: Long, waitMs: Long, masks: List<Rect>, onFrame: () -> Unit): ScreenCapturer.Capture {
            captures++
            gate?.await(5, TimeUnit.SECONDS)
            return ScreenCapturer.Capture.None
        }
        override fun release() { released = true }
    }

    private val app: Application = ApplicationProvider.getApplicationContext()
    private val defaultOpen = ShieldService.openCapture
    private val opened = ArrayList<ShieldBridge.Consent>()
    private val sources = ArrayList<FakeSource>()
    private val typesAtOpen = ArrayList<Int>()
    private val states = ArrayList<Boolean>()
    private var gate: CountDownLatch? = null
    private var refuse = false
    private var stopCallbacks = ArrayList<() -> Unit>()
    private var controller: ServiceController<ShieldService>? = null

    @Before
    fun setUp() {
        ShieldBridge.stateSink = { states += it }
        ShieldService.openCapture = { service, consent, onStopped ->
            opened += consent
            typesAtOpen += service.foregroundType()
            stopCallbacks += onStopped
            if (refuse) null else FakeSource(gate).also { sources += it }
        }
    }

    @After
    fun tearDown() {
        gate?.countDown()
        controller?.destroy()
        ShieldService.openCapture = defaultOpen
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

    /** Request ids of the consent dialogs launched since the last call. */
    private fun consentDialogs(): List<Int> {
        val out = ArrayList<Int>()
        while (true) {
            val next = shadowOf(app).nextStartedActivity ?: return out
            if (next.component?.className == ConsentActivity::class.java.name) {
                out += next.getIntExtra(ConsentActivity.EXTRA_REQUEST_ID, -1)
            }
        }
    }

    private fun tap(service: ShieldService): List<Int> {
        service.requestCheck()
        idle()
        return consentDialogs()
    }

    private fun grant(service: ShieldService, requestId: Int): ShieldBridge.Consent {
        val consent = ShieldBridge.Consent(Activity.RESULT_OK, Intent())
        service.onConsentResult(requestId, consent)
        idle()
        return consent
    }

    /** Runs the main looper until [done] holds; the capture runs on the service worker thread. */
    private fun waitFor(what: String, done: () -> Boolean) {
        val deadline = System.currentTimeMillis() + 5_000
        while (!done()) {
            assertTrue("timed out waiting for $what", System.currentTimeMillis() < deadline)
            Thread.sleep(10)
            idle()
        }
    }

    private fun hasProjectionType(service: ShieldService) =
        service.foregroundType() and ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION != 0

    private fun checkFinished(service: ShieldService) = service.overlayForTest?.state == ShieldOverlay.State.ERROR

    private fun notificationText(service: ShieldService): String? =
        shadowOf(service).lastForegroundNotification?.extras?.getCharSequence(android.app.Notification.EXTRA_TEXT)?.toString()

    /** Runs one tap after consent is held: no dialog, a capture on the same projection. */
    private fun checkWithoutDialog(service: ShieldService, source: FakeSource, expectedCaptures: Int) {
        service.overlayForTest?.reset()
        assertEquals("no dialog once consent is held", 0, tap(service).size)
        waitFor("check $expectedCaptures") { checkFinished(service) && source.captures == expectedCaptures }
        assertEquals("the same projection serves every check", 1, opened.size)
        assertFalse("the projection stays for the session", source.released)
        assertTrue(service.hasProjection())
    }

    private fun assertOneConsentPerSession(service: ShieldService) {
        assertTrue("no dialog and no projection at start", consentDialogs().isEmpty() && opened.isEmpty())
        assertFalse(service.hasProjection())
        assertFalse("idle service has no mediaProjection type", hasProjectionType(service))
        assertEquals(ShieldNotification.TEXT, notificationText(service))

        val first = tap(service)
        assertEquals("the first tap asks", 1, first.size)
        assertTrue("nothing opens before the user allows", opened.isEmpty())
        val c1 = grant(service, first.single())
        assertEquals(listOf(c1), opened)
        assertTrue("mediaProjection type is on while the projection opens", typesAtOpen.single() and ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION != 0)
        waitFor("the first check") { checkFinished(service) }
        val source = sources.single()
        assertEquals(1, source.captures)
        assertFalse("the projection is kept after the first check", source.released)
        assertTrue(service.hasProjection())
        assertTrue("the type stays while the projection is held", hasProjectionType(service))
        assertEquals("the notification says sharing is on", ShieldStrings.DEFAULT.sharingNotice, notificationText(service))

        checkWithoutDialog(service, source, 2)
        checkWithoutDialog(service, source, 3)
    }

    @Test
    @Config(sdk = [31])
    fun android12AsksOncePerSessionAndKeepsTheProjection() {
        val service = startShield()
        assertEquals("Android 10 to 13 idle without a foreground type", 0, service.foregroundType())
        assertOneConsentPerSession(service)
    }

    @Test
    @Config(sdk = [33])
    fun android13AsksOncePerSessionAndKeepsTheProjection() {
        assertOneConsentPerSession(startShield())
    }

    @Test
    @Config(sdk = [34])
    fun android14AsksOncePerSessionAndKeepsTheProjection() {
        val service = startShield()
        assertEquals(ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE, service.foregroundType())
        assertOneConsentPerSession(service)
        assertEquals(ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION, service.foregroundType())
    }

    @Test
    @Config(sdk = [34])
    fun turningTheShieldOffReleasesTheProjectionAndTheNextSessionAsksAgain() {
        val service = startShield()
        grant(service, tap(service).single())
        waitFor("the check") { checkFinished(service) }
        val source = sources.single()
        service.stopNow()
        assertTrue("stop releases the projection at once", source.released)
        assertFalse(service.hasProjection())
        controller?.destroy()
        controller = null
        idle()

        val next = startShield()
        assertFalse("a new session holds no consent", next.hasProjection())
        assertEquals(ShieldNotification.TEXT, notificationText(next))
        assertEquals("the new session asks again", 1, tap(next).size)
    }

    @Test
    @Config(sdk = [34])
    fun closingTheBubbleReleasesTheProjection() {
        val service = startShield()
        grant(service, tap(service).single())
        waitFor("the check") { checkFinished(service) }
        service.overlayForTest!!.reset()
        service.overlayForTest!!.bubbleViewForTest.performLongClick()
        ShadowLooper.idleMainLooper(ShieldMotion.EXIT_MS + 20, TimeUnit.MILLISECONDS)
        assertFalse(ShieldService.isRunning)
        assertTrue(sources.single().released)
        assertFalse(service.hasProjection())
    }

    @Test
    @Config(sdk = [31])
    fun stoppingSharingFromTheSystemDropsTheConsentAndTheNextTapAsks() {
        val service = startShield()
        grant(service, tap(service).single())
        waitFor("the check") { checkFinished(service) }
        stopCallbacks.single().invoke()
        idle()
        assertFalse(service.hasProjection())
        assertFalse(hasProjectionType(service))
        assertTrue(sources.single().released)
        assertEquals("the notification goes back to idle", ShieldNotification.TEXT, notificationText(service))
        assertTrue("the shield stays on", ShieldService.isRunning)
        val again = tap(service)
        assertEquals("the next tap asks again", 1, again.size)
        grant(service, again.single())
        assertEquals(2, opened.size)
        assertTrue(service.hasProjection())
    }

    @Test
    @Config(sdk = [31])
    fun startingTheShieldAsksNothingAndHoldsNoProjection() {
        val service = startShield()
        assertTrue(ShieldService.isRunning)
        assertNotNull("the bubble shows", service.overlayForTest)
        assertEquals(ShieldOverlay.State.IDLE, service.overlayForTest?.state)
        assertTrue(consentDialogs().isEmpty())
        assertTrue(opened.isEmpty())
        assertFalse(service.hasProjection())
        stopShield(service)
        assertTrue("stopping asks nothing either", consentDialogs().isEmpty())
    }

    @Test
    @Config(sdk = [31])
    fun cancelReturnsTheBubbleToIdleWithAShortNotice() {
        val service = startShield()
        val id = tap(service).single()
        service.onConsentResult(id, null)
        idle()
        assertTrue(opened.isEmpty())
        assertFalse(service.hasProjection())
        val overlay = service.overlayForTest!!
        assertEquals(ShieldOverlay.State.IDLE, overlay.state)
        val notice = overlay.cardModelForTest
        assertTrue("a notice, not an error card", notice?.notice == true)
        assertEquals(ShieldStrings.DEFAULT.captureCancelled, notice?.title)
        assertEquals("the next tap asks again at once", 1, tap(service).size)
    }

    @Test
    @Config(sdk = [34])
    fun rapidTapsOpenOneDialogAndTapsDuringTheCheckAreIgnored() {
        gate = CountDownLatch(1)
        val service = startShield()
        service.requestCheck()
        service.requestCheck()
        service.requestCheck()
        idle()
        val ids = consentDialogs()
        assertEquals("three quick taps, one dialog", 1, ids.size)

        grant(service, ids.single())
        waitFor("the capture to start") { sources.singleOrNull()?.captures == 1 }
        assertTrue(service.hasProjection())
        assertEquals("taps while capturing are ignored", 0, tap(service).size)
        service.onBallTap()
        idle()
        assertEquals(0, consentDialogs().size)

        gate!!.countDown()
        waitFor("the check") { checkFinished(service) }
        assertEquals(1, opened.size)
        assertEquals("ignored taps start no capture", 1, sources.single().captures)
        assertFalse(sources.single().released)
    }

    @Test
    @Config(sdk = [34])
    fun rapidTapsWithConsentHeldRunOneCheck() {
        val service = startShield()
        grant(service, tap(service).single())
        waitFor("the first check") { checkFinished(service) }
        val source = sources.single()
        gate = CountDownLatch(1)
        source.gate = gate
        service.overlayForTest!!.reset()
        service.requestCheck()
        service.requestCheck()
        service.requestCheck()
        idle()
        assertEquals("no dialog", 0, consentDialogs().size)
        waitFor("the second capture") { source.captures == 2 }
        service.onBallTap()
        idle()
        gate!!.countDown()
        waitFor("the second check") { checkFinished(service) }
        Thread.sleep(50)
        idle()
        assertEquals("three quick taps, one capture", 2, source.captures)
        assertEquals(1, opened.size)
    }

    @Test
    @Config(sdk = [31])
    fun anUnrequestedOrStaleConsentIsDroppedWithoutOpeningAProjection() {
        val service = startShield()
        service.onConsentResult(1, ShieldBridge.Consent(Activity.RESULT_OK, Intent()))
        idle()
        assertTrue("no tap, no projection", opened.isEmpty())

        val first = tap(service).single()
        assertEquals("a tap during the dialog does nothing", 0, tap(service).size)
        ShadowLooper.idleMainLooper(ShieldService.CONSENT_RETRY_MS, TimeUnit.MILLISECONDS)
        val second = tap(service).single()
        assertNotEquals("after Home left the dialog open, a later tap asks again", first, second)

        grant(service, first)
        assertTrue("the answer to the old dialog is ignored", opened.isEmpty())
        grant(service, second)
        assertEquals(1, opened.size)
        waitFor("the check") { checkFinished(service) }
        assertTrue(service.hasProjection())
    }

    @Test
    @Config(sdk = [31])
    fun aConsentThatArrivesAfterTheShieldStoppedOpensNothing() {
        val service = startShield()
        val id = tap(service).single()
        stopShield(service)
        service.onConsentResult(id, ShieldBridge.Consent(Activity.RESULT_OK, Intent()))
        idle()
        assertTrue(opened.isEmpty())
    }

    @Test
    @Config(sdk = [31])
    fun aRefusedProjectionShowsAnErrorAndLeavesNoProjectionType() {
        refuse = true
        val service = startShield()
        grant(service, tap(service).single())
        assertEquals(1, opened.size)
        assertFalse(service.hasProjection())
        assertFalse(hasProjectionType(service))
        assertEquals(ShieldOverlay.State.ERROR, service.overlayForTest?.state)
    }

    @Test
    @Config(sdk = [34])
    fun stoppingSharingFromTheStatusBarEndsTheCapture() {
        gate = CountDownLatch(1)
        val service = startShield()
        grant(service, tap(service).single())
        waitFor("the capture to start") { sources.singleOrNull()?.captures == 1 }
        stopCallbacks.single().invoke()
        idle()
        assertFalse(service.hasProjection())
        assertFalse(hasProjectionType(service))
        gate!!.countDown()
        waitFor("the check") { checkFinished(service) }
    }

    @Test
    @Config(sdk = [34])
    fun stopRemovesTheBubbleAndReportsStoppedBeforeTheServiceTearsDown() {
        val service = startShield()
        val bubble = service.overlayForTest!!.bubbleViewForTest
        assertTrue(bubble.isAttachedToWindow)
        assertEquals(listOf(true), states)

        service.stopNow()
        assertEquals("reported in the same call, with no animation or looper turn", listOf(true, false), states)
        assertFalse(ShieldService.isRunning)
        assertNull(service.overlayForTest)
        assertSame("the service is not torn down yet", service, ShieldService.instance)

        idle()
        assertFalse(bubble.isAttachedToWindow)
        controller?.destroy()
        controller = null
        assertEquals("onDestroy does not report twice", listOf(true, false), states)
        assertNull(ShieldService.instance)
    }

    @Test
    @Config(sdk = [34])
    fun stoppingDuringACaptureReleasesTheProjection() {
        gate = CountDownLatch(1)
        val service = startShield()
        grant(service, tap(service).single())
        waitFor("the capture to start") { sources.singleOrNull()?.captures == 1 }
        stopShield(service)
        assertTrue(sources.single().released)
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
