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
        overlay.strings = ShieldStrings.from(mapOf("listening" to "Nar htaung nay"))
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
    fun companionShowsVoiceGlyphsAndAStatusPillWithoutText() {
        overlay.setResult(result("careful"))
        advance(400)
        overlay.showCompanion(CompanionView(CompanionState.LISTENING))
        advance(300)
        assertTrue(overlay.hasPillWindow)
        assertEquals(BubbleView.Voice.LISTENING, overlay.bubbleVoiceForTest)
        assertEquals("Nar htaung nay", overlay.pillForTest!!.chipText)
        val pill = overlay.pillForTest!!
        assertEquals("only the status chip carries text", listOf("Nar htaung nay"), texts(pill))
        assertEquals(ShieldStrings.DEFAULTS["endA11y"], pill.endViewForTest.contentDescription)
        assertEquals("Pyit Taing Htaung. Nar htaung nay", pill.chipViewForTest.contentDescription)
        assertEquals("status changes are announced", View.ACCESSIBILITY_LIVE_REGION_POLITE, pill.chipViewForTest.accessibilityLiveRegion)
        assertEquals(View.VISIBLE, pill.muteViewForTest.visibility)
        assertTrue(overlay.bubbleViewForTest.contentDescription.startsWith("Pyit Taing Htaung."))

        overlay.showCompanion(CompanionView(CompanionState.SPEAKING))
        assertEquals(BubbleView.Voice.SPEAKING, overlay.bubbleVoiceForTest)
        assertEquals("Speaking", overlay.pillForTest!!.chipText)

        overlay.showCompanion(CompanionView(CompanionState.THINKING))
        assertEquals(BubbleView.Voice.THINKING, overlay.bubbleVoiceForTest)

        overlay.showCompanion(CompanionView(CompanionState.LISTENING, muted = true))
        assertEquals(BubbleView.Voice.MUTED, overlay.bubbleVoiceForTest)
        assertEquals("Muted", overlay.pillForTest!!.chipText)
        assertEquals(ShieldStrings.DEFAULTS["unmuteA11y"], overlay.pillForTest!!.muteViewForTest.contentDescription)
        overlay.pillForTest!!.muteViewForTest.performClick()
        assertEquals("the pill's mute control toggles like a bubble tap", 1, listener.taps)

        overlay.showCompanion(CompanionView(CompanionState.CONNECTING))
        assertEquals(View.GONE, overlay.pillForTest!!.muteViewForTest.visibility)
    }

    private fun texts(v: View): List<String> = when (v) {
        is android.widget.TextView -> listOf(v.text.toString()).filter { it.isNotEmpty() }
        is android.view.ViewGroup -> (0 until v.childCount).flatMap { texts(v.getChildAt(it)) }
        else -> emptyList()
    }

    @Test
    fun burmeseStatusWordsFitAtTheNarrowestWidth() {
        val ctx = ApplicationProvider.getApplicationContext<Context>()
        val d = ctx.resources.displayMetrics.density
        val root = generateSequence(java.io.File("").absoluteFile) { it.parentFile }.first { java.io.File(it, "src/i18n/locales").exists() }
        val companion = JSONObject(java.io.File(root, "src/i18n/locales/my/live.json").readText()).getJSONObject("companion")
        val my = ShieldStrings.from(companion.keys().asSequence().associateWith { companion.getString(it) })
        val maxPx = ((320 - 48) * d).toInt()
        val states = listOf(
            CompanionView(CompanionState.LISTENING), CompanionView(CompanionState.THINKING), CompanionView(CompanionState.SPEAKING),
            CompanionView(CompanionState.LISTENING, muted = true), CompanionView(CompanionState.LISTENING, paused = true),
            CompanionView(CompanionState.CONNECTING), CompanionView(CompanionState.RECHECKING),
            CompanionView(CompanionState.CHECKING), CompanionView(CompanionState.WARNING),
        )
        for (v in states) {
            val pill = CompanionPillView(ctx, ShieldPalette(false), ShieldFonts(ctx), 1.3f, my, {}, {})
            pill.fitTo(maxPx)
            pill.render(v, ShieldOverlay.State.DANGER)
            val spec = View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
            pill.measure(spec, spec)
            pill.layout(0, 0, pill.measuredWidth, pill.measuredHeight)
            val chip = pill.chipViewForTest
            assertTrue("${pill.chipText} pill ${pill.measuredWidth} > $maxPx", pill.measuredWidth <= maxPx)
            val lines = chip.layout?.lineCount ?: 1
            for (line in 0 until lines) assertEquals("${pill.chipText} is not cut", 0, chip.layout?.getEllipsisCount(line) ?: 0)
            assertTrue("${pill.chipText} uses at most two lines", lines <= 2)
        }
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
        overlay.setChecking()
        assertEquals(View.VISIBLE, overlay.bubbleViewForTest.visibility)
        assertEquals("the pill is masked, not hidden", 2, overlay.captureRects().size)
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
        overlay.showNotice("Open Kakwe once to allow voice", opensApp = true)
        advance(400)
        assertTrue(overlay.cardModelForTest!!.notice)
        overlay.closeNotice()
        advance(400)
        assertEquals(ShieldOverlay.State.CAREFUL, overlay.cardModelForTest!!.state)
        assertFalse(overlay.cardModelForTest!!.notice)
    }
}
