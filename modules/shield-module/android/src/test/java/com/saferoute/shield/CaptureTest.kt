package com.saferoute.shield

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Rect
import android.view.View
import androidx.test.core.app.ApplicationProvider
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertArrayEquals
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
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w360dp-h800dp-xxhdpi")
class CaptureTest {

    private val white = 0xFFFAFAFA.toInt()
    private val bubbleColor = 0xFF1D4ED8.toInt()

    private fun frame(w: Int, h: Int, bg: Int = white) = IntArray(w * h) { bg }

    private fun paint(px: IntArray, w: Int, r: Rect, c: Int) {
        for (y in r.top until r.bottom) for (x in r.left until r.right) px[y * w + x] = c
    }

    // ---- rect maths ----

    @Test
    fun screenRectsScaleIntoTheBitmapAndClip() {
        assertEquals(Rect(50, 100, 90, 140), CaptureMask.toBitmapRect(Rect(100, 200, 180, 280), 0.5f, 540, 1200))
        assertEquals("a tucked bubble is clipped at the edge", Rect(1020, 300, 1080, 520), CaptureMask.toBitmapRect(Rect(1020, 300, 1240, 520), 1f, 1080, 2400))
        assertEquals(Rect(0, 0, 30, 40), CaptureMask.toBitmapRect(Rect(-50, -10, 30, 40), 1f, 1080, 2400))
        assertNull("off screen", CaptureMask.toBitmapRect(Rect(1100, 0, 1200, 50), 1f, 1080, 2400))
        assertEquals("rounding never leaves a sliver", Rect(33, 33, 67, 67), CaptureMask.toBitmapRect(Rect(100, 100, 200, 200), 1f / 3f, 1000, 1000))
    }

    @Test
    fun ringWidthScalesWithTheWindow() {
        assertEquals(22, CaptureMask.band(Rect(0, 0, 220, 220)))
        assertEquals(3, CaptureMask.band(Rect(0, 0, 10, 300)))
    }

    // ---- masking ----

    @Test
    fun aPlainBackgroundIsFilledWithItsOwnColour() {
        val w = 200
        val h = 300
        val px = frame(w, h)
        val bubble = Rect(150, 100, 200, 150)
        paint(px, w, bubble, bubbleColor)
        assertTrue(CaptureMask.maskPixels(px, w, h, listOf(bubble)))
        assertTrue(px.all { it == white })
    }

    @Test
    fun textAroundTheBubbleIsBusyAndNothingChanges() {
        val w = 200
        val h = 300
        val px = frame(w, h)
        for (y in 80 until 170 step 6) paint(px, w, Rect(100, y, 200, y + 2), 0xFF111111.toInt())
        val bubble = Rect(150, 100, 200, 150)
        paint(px, w, bubble, bubbleColor)
        val before = px.copyOf()
        assertFalse(CaptureMask.maskPixels(px, w, h, listOf(bubble)))
        assertArrayEquals(before, px)
    }

    @Test
    fun theNeighbouringWindowDoesNotCountAsContent() {
        val w = 300
        val h = 300
        val px = frame(w, h)
        val bubble = Rect(250, 100, 300, 150)
        val pill = Rect(60, 152, 300, 190)
        paint(px, w, bubble, bubbleColor)
        paint(px, w, pill, 0xFF222222.toInt())
        assertTrue(CaptureMask.maskPixels(px, w, h, listOf(bubble, pill)))
        assertTrue(px.all { it == white })
    }

    @Test
    fun aSoftGradientStillCountsAsPlain() {
        val w = 100
        val h = 200
        val px = IntArray(w * h) { i -> val v = 200 + (i / w) / 10; (0xFF shl 24) or (v shl 16) or (v shl 8) or v }
        val bubble = Rect(70, 80, 100, 110)
        paint(px, w, bubble, bubbleColor)
        assertTrue(CaptureMask.maskPixels(px, w, h, listOf(bubble)))
        assertFalse(px.any { it == bubbleColor })
    }

    @Test
    fun masksABitmapAtTheCaptureScale() {
        val bmp = Bitmap.createBitmap(540, 1200, Bitmap.Config.ARGB_8888)
        bmp.eraseColor(white)
        val screen = Rect(900, 600, 1080, 780)
        for (y in 300 until 390) for (x in 450 until 540) bmp.setPixel(x, y, bubbleColor)
        assertTrue(CaptureMask.maskBitmap(bmp, listOf(screen), 0.5f))
        assertEquals(white, bmp.getPixel(500, 340))
        assertEquals(white, bmp.getPixel(539, 389))
    }

    // ---- ask chip contrast ----

    @Test
    fun askChipMeetsWcagAaInBothThemes() {
        for (dark in listOf(false, true)) {
            val p = ShieldPalette(dark)
            assertTrue("fill $dark", CaptureMask.contrast(p.askText, p.askFill) >= 4.5)
            assertTrue("pressed $dark", CaptureMask.contrast(p.askText, p.askPressed) >= 4.5)
            assertTrue("chip vs surface $dark", CaptureMask.contrast(p.askFill, p.surface) >= 3.0)
        }
    }

    @Test
    fun theAskMicIsTintedNotBlack() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        for (dark in listOf(false, true)) {
            val p = ShieldPalette(dark)
            assertEquals(p.askText, ResultCardView.MicIconView(context, p.askText).paintColorForTest)
        }
    }

    // ---- overlay during a check ----

    private class Quiet : ShieldOverlay.Listener {
        override fun onBallTap() = Unit
        override fun onOpenReport() = Unit
        override fun onDismiss() = Unit
        override fun onClose() = Unit
    }

    private lateinit var overlay: ShieldOverlay

    @Before
    fun setUp() {
        overlay = ShieldOverlay(ApplicationProvider.getApplicationContext<Context>(), Quiet())
        overlay.show()
    }

    @After
    fun tearDown() = overlay.remove()

    private fun advance(ms: Long) = ShadowLooper.idleMainLooper(ms, TimeUnit.MILLISECONDS)

    @Test
    fun theBubbleNeverVanishesWhenACheckStarts() {
        advance(2500)
        val tuckedX = overlay.bubbleParamsForTest.x
        overlay.setChecking()
        val bubble = overlay.bubbleViewForTest
        assertEquals(View.VISIBLE, bubble.visibility)
        assertEquals(1f, bubble.alpha, 0f)
        assertEquals(ShieldOverlay.State.CHECKING, overlay.state)
        advance(400)
        assertEquals("no untuck before the frame is captured", tuckedX, overlay.bubbleParamsForTest.x)
        val p = overlay.bubbleParamsForTest
        val size = p.width
        assertEquals(listOf(Rect(p.x, p.y, p.x + size, p.y + size)), overlay.captureRects())
        overlay.afterCapture()
        advance(800)
        assertTrue("untucked after capture", overlay.bubbleParamsForTest.x != tuckedX)
    }

    @Test
    fun theResultCardIsGoneBeforeTheFrame() {
        overlay.setResult(JSONObject("""{"verdict":"danger","title":"t","summary":"s","flags":[]}"""))
        advance(400)
        assertTrue(overlay.hasCardWindow)
        overlay.setChecking()
        assertFalse(overlay.hasCardWindow)
        assertEquals(1, overlay.captureRects().size)
    }

    @Test
    fun fadeFallbackIsShortAndComesBackWithTheLoader() {
        overlay.setChecking()
        overlay.fadeForCapture()
        advance(ShieldOverlay.FADE_OUT_MS + 10)
        assertEquals(0f, overlay.bubbleViewForTest.alpha, 0.01f)
        assertEquals(ShieldOverlay.State.CHECKING, overlay.state)
        overlay.restoreAfterCapture()
        advance(ShieldOverlay.FADE_IN_MS + 20)
        assertEquals(1f, overlay.bubbleViewForTest.alpha, 0.01f)
        assertEquals(ShieldOverlay.State.CHECKING, overlay.state)
    }

    @Test
    fun aResultDuringTheFadeShowsTheBubbleAtOnce() {
        overlay.setChecking()
        overlay.fadeForCapture()
        advance(30)
        overlay.setResult(JSONObject("""{"verdict":"safe","title":"t","summary":"s","flags":[]}"""))
        assertEquals(1f, overlay.bubbleViewForTest.alpha, 0f)
    }

    @Test
    fun talkBackNamesTheDollAndTheVerdict() {
        assertEquals("Pyit Taing Htaung, SafeRoute shield. Result: high risk. Double tap to show details.", bubbleDescription(ShieldOverlay.State.DANGER, "Pyit Taing Htaung"))
        assertTrue(bubbleDescription(ShieldOverlay.State.CHECKING, "ပစ်တိုင်းထောင်").startsWith("ပစ်တိုင်းထောင်, SafeRoute shield. Checking"))
        overlay.setChecking()
        assertTrue(overlay.bubbleViewForTest.contentDescription.contains("Checking the screen"))
    }
}
