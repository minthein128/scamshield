package com.saferoute.shield

import android.content.Context
import android.os.SystemClock
import android.view.MotionEvent
import android.view.View
import androidx.test.core.app.ApplicationProvider
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import org.robolectric.shadows.ShadowLooper
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w360dp-h800dp-xxhdpi")
class CompanionOverlayTest {

    private class Recorder : ShieldOverlay.Listener {
        var taps = 0
        var doubleTaps = 0
        var asks = 0
        var ends = 0
        var closed = 0
        var opensApp = 0
        var consumeLongPress = false
        var longPresses = 0
        override fun onBallTap() { taps++ }
        override fun onOpenReport() = Unit
        override fun onDismiss() = Unit
        override fun onClose() { closed++ }
        override fun onBallDoubleTap() { doubleTaps++ }
        override fun onAsk() { asks++ }
        override fun onEndCompanion() { ends++ }
        override fun onOpenApp() { opensApp++ }
        override fun onLongPressBubble(): Boolean {
            longPresses++
            return consumeLongPress
        }
    }

    private lateinit var context: Context
    private lateinit var overlay: ShieldOverlay
    private val listener = Recorder()

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        overlay = ShieldOverlay(context, listener)
        overlay.strings = ShieldStrings.from(mapOf("listening" to "Nar htaung nay", "end" to "Yat"))
        overlay.show()
    }

    @After
    fun tearDown() = overlay.remove()

    private fun advance(ms: Long) = ShadowLooper.idleMainLooper(ms, TimeUnit.MILLISECONDS)

    private fun result(verdict: String) = JSONObject("""{"verdict":"$verdict","title":"Job offer","summary":"Fee first.","flags":[]}""")

    private fun tap() {
        val p = overlay.bubbleParamsForTest
        val x = p.x + 40f
        val y = p.y + 40f
        val t = SystemClock.uptimeMillis()
        for (action in listOf(MotionEvent.ACTION_DOWN, MotionEvent.ACTION_UP)) {
            val e = MotionEvent.obtain(t, t, action, x, y, 0)
            overlay.bubbleViewForTest.dispatchTouchEvent(e)
            e.recycle()
        }
    }

    @Test
    fun singleTapWaitsForTheDoubleTapWindow() {
        tap()
        assertEquals(0, listener.taps)
        advance(350)
        assertEquals(1, listener.taps)
        assertEquals(0, listener.doubleTaps)
    }

    @Test
    fun doubleTapStartsTheCompanionAndSkipsTheCheck() {
        tap()
        advance(80)
        tap()
        advance(400)
        assertEquals(1, listener.doubleTaps)
        assertEquals(0, listener.taps)
    }

    @Test
    fun theDollIsBundledForTheBubble() {
        val doll = overlay.companionAvatar
        assertTrue(doll != null && doll.width == 192 && doll.height == 192)
    }

    @Test
    fun resultPillCarriesTheAskChip() {
        overlay.setResult(result("danger"))
        advance(400)
        val model = overlay.cardModelForTest!!
        assertTrue(model.canAsk)
        assertEquals("Ask", model.askLabel)
    }

    @Test
    fun companionShowsVoiceGlyphsAndTheCaptionPill() {
        overlay.setResult(result("careful"))
        advance(400)
        overlay.showCompanion(CompanionView(CompanionState.LISTENING))
        advance(300)
        assertTrue(overlay.hasPillWindow)
        assertEquals(BubbleView.Voice.LISTENING, overlay.bubbleVoiceForTest)
        assertEquals("Nar htaung nay", overlay.pillForTest!!.chipText)
        assertEquals(ShieldStrings.DEFAULTS["captionHint"], overlay.pillForTest!!.captionText)
        assertTrue(overlay.pillForTest!!.contentDescription.startsWith("Pyit Taing Htaung. Nar htaung nay"))
        assertTrue(overlay.bubbleViewForTest.contentDescription.startsWith("Pyit Taing Htaung."))

        overlay.showCompanion(CompanionView(CompanionState.SPEAKING, caption = "It looks risky."))
        assertEquals(BubbleView.Voice.SPEAKING, overlay.bubbleVoiceForTest)
        assertEquals("It looks risky.", overlay.pillForTest!!.captionText)

        overlay.showCompanion(CompanionView(CompanionState.THINKING))
        assertEquals(BubbleView.Voice.THINKING, overlay.bubbleVoiceForTest)

        overlay.showCompanion(CompanionView(CompanionState.LISTENING, muted = true))
        assertEquals(BubbleView.Voice.MUTED, overlay.bubbleVoiceForTest)
        assertEquals("Muted", overlay.pillForTest!!.chipText)

        overlay.showCompanion(CompanionView(CompanionState.LISTENING, micBlocked = true))
        assertEquals(ShieldStrings.DEFAULTS["needsForeground"], overlay.pillForTest!!.captionText)
    }

    @Test
    fun tapDuringASessionIsImmediateAndLongPressIsOffered() {
        overlay.showCompanion(CompanionView(CompanionState.LISTENING))
        tap()
        assertEquals(1, listener.taps)
        listener.consumeLongPress = true
        overlay.bubbleViewForTest.performLongClick()
        assertEquals(1, listener.longPresses)
        assertEquals(0, listener.closed)
        advance(400)
        assertEquals(0, listener.closed)
    }

    @Test
    fun recheckHidesThePillForCaptureAndShowsTheNewVerdict() {
        overlay.setResult(result("danger"))
        overlay.showCompanion(CompanionView(CompanionState.RECHECKING))
        advance(300)
        overlay.hideForCapture()
        assertEquals(View.INVISIBLE, overlay.bubbleViewForTest.visibility)
        overlay.setChecking()
        assertEquals(BubbleView.Voice.NONE, overlay.bubbleVoiceForTest)
        overlay.setResult(result("safe"))
        assertEquals(ShieldOverlay.State.SAFE, overlay.state)
        assertFalse("the result pill stays hidden behind the companion pill", overlay.hasCardWindow)
        assertTrue(overlay.hasPillWindow)
    }

    @Test
    fun endingRestoresTheResultPill() {
        overlay.setResult(result("danger"))
        advance(400)
        overlay.showCompanion(CompanionView(CompanionState.LISTENING))
        advance(400)
        assertFalse(overlay.hasCardWindow)
        overlay.endCompanion()
        advance(400)
        assertFalse(overlay.hasPillWindow)
        assertTrue(overlay.hasCardWindow)
        assertEquals(BubbleView.Voice.NONE, overlay.bubbleVoiceForTest)
        assertFalse(overlay.companionActive)
    }

    @Test
    fun aNoticeKeepsTheResultBehindIt() {
        overlay.setResult(result("careful"))
        advance(400)
        overlay.showNotice("Open SafeRoute once to allow voice", opensApp = true)
        advance(400)
        assertTrue(overlay.cardModelForTest!!.notice)
        overlay.closeNotice()
        advance(400)
        assertEquals(ShieldOverlay.State.CAREFUL, overlay.cardModelForTest!!.state)
        assertFalse(overlay.cardModelForTest!!.notice)
    }
}
