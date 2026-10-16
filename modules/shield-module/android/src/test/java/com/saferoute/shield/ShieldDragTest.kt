package com.saferoute.shield

import android.content.Context
import android.os.SystemClock
import android.view.Gravity
import android.view.MotionEvent
import androidx.test.core.app.ApplicationProvider
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import org.robolectric.shadows.ShadowLooper
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w360dp-h800dp-xxhdpi")
class ShieldDragTest {

    private class Recorder : ShieldOverlay.Listener {
        var taps = 0
        var closed = 0
        var dismissed = 0
        override fun onBallTap() { taps++ }
        override fun onOpenReport() = Unit
        override fun onDismiss() { dismissed++ }
        override fun onClose() { closed++ }
    }

    private lateinit var context: Context
    private lateinit var overlay: ShieldOverlay
    private val listener = Recorder()
    private var d = 1f
    private val pad get() = (12 * d).toInt()
    private val size get() = (80 * d).toInt()

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        d = context.resources.displayMetrics.density
        overlay = ShieldOverlay(context, listener)
        overlay.show()
    }

    @After
    fun tearDown() {
        overlay.remove()
    }

    private fun result(verdict: String) = JSONObject(
        """{"verdict":"$verdict","title":"Fake bank","summary":"Pushes you to pay now.",
        "flags":[{"label":"Urgent","severity":"high"}]}"""
    )

    private fun advance(ms: Long) = ShadowLooper.idleMainLooper(ms, TimeUnit.MILLISECONDS)

    private fun touch(action: Int, x: Float, y: Float) {
        val t = SystemClock.uptimeMillis()
        val e = MotionEvent.obtain(t, t, action, x, y, 0)
        overlay.bubbleViewForTest.dispatchTouchEvent(e)
        e.recycle()
    }

    private fun params() = overlay.bubbleParamsForTest

    private fun expectedGravity(): Int {
        val (sw, sh) = overlay.screenForTest
        return AnchorMath.compute(params().x, params().y, size, pad, (8 * d).toInt(), sw, sh).gravity
    }

    private fun drag(fromX: Float, fromY: Float, toX: Float, toY: Float, release: Boolean = true) {
        touch(MotionEvent.ACTION_DOWN, fromX, fromY)
        val steps = 6
        for (i in 1..steps) {
            touch(MotionEvent.ACTION_MOVE, fromX + (toX - fromX) * i / steps, fromY + (toY - fromY) * i / steps)
            advance(16)
        }
        if (release) touch(MotionEvent.ACTION_UP, toX, toY)
    }

    // ---- anchor maths (pixels at density 2.75) ----

    private val p = 33
    private val s = 220
    private val gap = 22
    private val w = 1080
    private val h = 2400

    @Test
    fun anchorLeftUpperPutsCardBelowOnTheLeft() {
        val a = AnchorMath.compute(-p, 300, s, p, gap, w, h)
        assertTrue(a.left)
        assertTrue(a.below)
        assertEquals(300 + s - p + gap - p, a.offsetY)
        assertEquals(Gravity.TOP or Gravity.START, a.gravity)
    }

    @Test
    fun anchorRightLowerPutsCardAboveOnTheRight() {
        val a = AnchorMath.compute(900, 1700, s, p, gap, w, h)
        assertFalse(a.left)
        assertFalse(a.below)
        assertEquals(h - (1700 + p) + gap - p, a.offsetY)
        assertEquals(Gravity.BOTTOM or Gravity.END, a.gravity)
    }

    @Test
    fun anchorFlipsAtTheMiddleOfTheScreen() {
        assertTrue(AnchorMath.compute(w / 2 - s / 2 - 1, 100, s, p, gap, w, h).left)
        assertFalse(AnchorMath.compute(w / 2 - s / 2 + 1, 100, s, p, gap, w, h).left)
        assertTrue(AnchorMath.compute(0, h / 2 - s / 2 - 1, s, p, gap, w, h).below)
        assertFalse(AnchorMath.compute(0, h / 2 - s / 2 + 1, s, p, gap, w, h).below)
    }

    @Test
    fun anchorNearNavBarStaysOnScreen() {
        val lowest = h - s - (48 * 2.75f).toInt()
        val a = AnchorMath.compute(900, lowest, s, p, gap, w, h)
        assertFalse(a.below)
        assertTrue(a.offsetY >= 0)
        val past = AnchorMath.compute(900, h, s, p, gap, w, h)
        assertEquals(0, past.offsetY)
    }

    @Test
    fun anchorNearTopStartsBelowTheStatusEdge() {
        val a = AnchorMath.compute(0, 0, s, p, gap, w, h)
        assertTrue(a.below)
        assertTrue(a.offsetY > 0)
    }

    // ---- drag state machine ----

    @Test
    fun jitterBelowSlopIsATap() {
        val m = DragMachine(20)
        m.down()
        assertFalse(m.move(5, -6))
        assertEquals(DragMachine.Outcome.TAP, m.up(true))
        assertEquals(DragMachine.Phase.IDLE, m.phase)
    }

    @Test
    fun movePastSlopStartsDragOnce() {
        val m = DragMachine(20)
        m.down()
        assertTrue(m.move(21, 0))
        assertFalse(m.move(60, 0))
        assertEquals(DragMachine.Phase.DRAGGING, m.phase)
    }

    @Test
    fun releaseOverTargetCloses() {
        val m = DragMachine(20)
        m.down()
        m.move(50, 0)
        m.overTarget = true
        assertEquals(DragMachine.Outcome.CLOSE, m.up(true))
        assertEquals(DragMachine.Phase.IDLE, m.phase)
        assertFalse(m.overTarget)
    }

    @Test
    fun releaseElsewhereSnapsThenSettlesOnce() {
        val m = DragMachine(20)
        m.down()
        m.move(50, 0)
        assertEquals(DragMachine.Outcome.SNAP, m.up(true))
        assertEquals(DragMachine.Phase.SNAPPING, m.phase)
        assertTrue(m.settled())
        assertFalse(m.settled())
    }

    @Test
    fun cancelOverTargetDoesNotClose() {
        val m = DragMachine(20)
        m.down()
        m.move(50, 0)
        m.overTarget = true
        assertEquals(DragMachine.Outcome.SNAP, m.up(false))
    }

    @Test
    fun longPressOnlyFiresWhilePressed() {
        val m = DragMachine(20)
        m.down()
        assertTrue(m.longPress())
        m.down()
        m.move(50, 0)
        assertFalse(m.longPress())
    }

    @Test
    fun grabbingDuringSnapStartsANewGesture() {
        val m = DragMachine(20)
        m.down()
        m.move(50, 0)
        m.up(true)
        m.down()
        assertEquals(DragMachine.Phase.PRESSED, m.phase)
        assertFalse(m.settled())
    }

    // ---- overlay behaviour ----

    @Test
    fun cardCollapsesOnDragAndReturnsAtTheNewSide() {
        overlay.setResult(result("danger"))
        advance(400)
        assertTrue(overlay.hasCardWindow)
        val before = overlay.cardGravityForTest!!
        assertEquals("screen ${overlay.screenForTest} bubble ${params().x},${params().y}", expectedGravity(), before)
        assertTrue("gravity $before screen ${overlay.screenForTest} bubble ${params().x},${params().y}", (before and Gravity.RELATIVE_HORIZONTAL_GRAVITY_MASK) == Gravity.END)

        val bx = params().x + size / 2f
        val by = params().y + size / 2f
        drag(bx, by, bx, by, release = false)
        touch(MotionEvent.ACTION_MOVE, bx - 20 * d, by)
        touch(MotionEvent.ACTION_MOVE, bx - 400 * d, by + 60 * d)
        advance(300)
        assertFalse("only the bubble shows while dragging", overlay.hasCardWindow)
        assertTrue(overlay.isCardResumePending)

        touch(MotionEvent.ACTION_UP, bx - 400 * d, by + 60 * d)
        advance(2000)
        assertTrue("card is back after the snap", overlay.hasCardWindow)
        assertFalse(overlay.isCardResumePending)
        val after = overlay.cardGravityForTest!!
        assertEquals("screen ${overlay.screenForTest} bubble ${params().x},${params().y}", expectedGravity(), after)
        assertTrue("card flipped to the left", (after and Gravity.RELATIVE_HORIZONTAL_GRAVITY_MASK) == Gravity.START)
        assertNotEquals(before, after)
        assertEquals(DragMachine.Phase.IDLE, overlay.dragPhase)
    }

    @Test
    fun jitterTapKeepsTheCardAndFiresTap() {
        overlay.setResult(result("careful"))
        advance(400)
        val bx = params().x + size / 2f
        val by = params().y + size / 2f
        touch(MotionEvent.ACTION_DOWN, bx, by)
        touch(MotionEvent.ACTION_MOVE, bx + 2, by - 2)
        touch(MotionEvent.ACTION_UP, bx + 2, by - 2)
        advance(300)
        assertTrue(overlay.hasCardWindow)
        assertEquals(1, listener.taps)
    }

    @Test
    fun releaseOnCloseTargetDiscardsTheResultAndClosesTheShield() {
        overlay.setResult(result("danger"))
        advance(400)
        val bx = params().x + size / 2f
        val by = params().y + size / 2f
        val (sw, sh) = overlay.screenForTest
        val tx = sw / 2f
        val ty = sh - 48 * d - 36 * d
        drag(bx, by, tx, ty)
        advance(600)
        assertEquals("screen ${overlay.screenForTest} bubble ${params().x},${params().y} phase ${overlay.dragPhase}", 1, listener.closed)
        assertFalse(overlay.hasCardWindow)
        assertFalse(overlay.isCardResumePending)
    }

    @Test
    fun configurationChangeKeepsTheCardAndKeepsTheBubbleOnScreen() {
        overlay.setResult(result("danger"))
        advance(400)
        RuntimeEnvironment.setQualifiers("w800dp-h360dp-xxhdpi")
        overlay.refreshTheme()
        advance(400)
        assertTrue(overlay.hasCardWindow)
        val widthPx = context.resources.displayMetrics.widthPixels
        assertTrue(params().x + size / 2 <= widthPx + size)
    }
}
