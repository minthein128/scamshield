package com.saferoute.shield

import android.animation.Animator
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.os.SystemClock
import android.view.View
import android.view.ViewGroup
import androidx.test.core.app.ApplicationProvider
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import org.robolectric.shadows.ShadowSystemClock
import java.io.File
import java.io.FileOutputStream
import java.time.Duration
import kotlin.math.sin

/** Opt-in (SHIELD_MOTION_FRAMES=<dir>): renders the overlay views at 30 fps, stepping the clock by hand. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w360dp-h800dp-xxhdpi")
class ShieldMotionPreviewTest {

    private val out = System.getenv("SHIELD_MOTION_FRAMES")
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val d = context.resources.displayMetrics.density
    private val frameMs = 1000L / 30
    private val palette = ShieldPalette(false)
    private val strings = ShieldStrings.DEFAULT
    private val doll by lazy { BitmapFactory.decodeResource(context.resources, R.drawable.companion_doll) }

    private fun model(state: ShieldOverlay.State): CardModel {
        val chip = strings.chip(state)
        return when (state) {
            ShieldOverlay.State.SAFE -> CardModel(state, chip, "Looks like a normal chat", "No signs of a scam were found on this screen.", emptyList(), true, chip, canAsk = true, askLabel = strings.ask)
            ShieldOverlay.State.CAREFUL -> CardModel(
                state, chip, "Unknown sender asks for a code", "The sender is not in your contacts and wants a login code.",
                listOf(FlagRow("Asks for a one-time code", "medium"), FlagRow("Unknown number", "low")), true, chip, canAsk = true, askLabel = strings.ask
            )
            else -> CardModel(
                ShieldOverlay.State.DANGER, chip, "Fake bank asks you to transfer money", "This message pretends to be your bank and pushes you to move money now.",
                listOf(FlagRow("Urgent payment demand", "high"), FlagRow("Link does not match the bank: secure-bnk.example", "high")), true, chip, canAsk = true, askLabel = strings.ask
            )
        }
    }

    @Test
    fun checkingToEachVerdict() {
        assumeTrue(out != null)
        for (s in listOf(ShieldOverlay.State.DANGER, ShieldOverlay.State.CAREFUL, ShieldOverlay.State.SAFE)) check(s, motion = true)
    }

    @Test
    fun checkingWithAnimationsOff() {
        assumeTrue(out != null)
        check(ShieldOverlay.State.DANGER, motion = false)
    }

    @Test
    fun voiceCompanion() {
        assumeTrue(out != null)
        val scene = Scene("voice")
        val bubble = scene.bubble
        bubble.shieldState = ShieldOverlay.State.DANGER
        scene.run(600)
        val pill = CompanionPillView(context, palette, ShieldFonts(context), 1f, strings, {}, {})
        pill.fitTo((300 * d).toInt())
        scene.pill = pill
        val states = listOf(
            CompanionView(CompanionState.LISTENING) to 2600L,
            CompanionView(CompanionState.THINKING) to 2000L,
            CompanionView(CompanionState.SPEAKING) to 3000L,
            CompanionView(CompanionState.LISTENING, muted = true) to 1200L,
        )
        var first = true
        for ((view, ms) in states) {
            pill.render(view, ShieldOverlay.State.DANGER)
            bubble.voice = CompanionPillView.voiceFor(view)
            if (first) scene.play(pill.enterAnimator(), ShieldMotion.STEP_MS)
            first = false
            val chip = pill.chipViewForTest
            chip.animate().cancel()
            val fadeFrom = chip.alpha
            scene.run(ms) { t ->
                chip.alpha = fadeFrom + (1f - fadeFrom) * ShieldMotion.OUT.getInterpolation((t.toFloat() / ShieldMotion.FADE_MS).coerceAtMost(1f))
                bubble.level = when (view.state) {
                    CompanionState.LISTENING -> if (view.muted) 0f else speech(t, 0.9f)
                    CompanionState.SPEAKING -> speech(t, 1f)
                    else -> 0f
                }
                if (view.state == CompanionState.THINKING) scene.setField(bubble, "thinkPhase", (t % 1400L) / 1400f)
            }
        }
        bubble.voice = BubbleView.Voice.NONE
        bubble.level = 0f
        scene.pill = null
        scene.run(900)
    }

    private fun check(state: ShieldOverlay.State, motion: Boolean) {
        val scene = Scene("check-${state.name.lowercase()}" + if (motion) "" else "-reduced")
        val bubble = scene.bubble
        scene.run(600)
        bubble.shieldState = ShieldOverlay.State.CHECKING
        if (motion) scene.setField(bubble, "checker", ValueAnimator.ofFloat(0f, 1f))
        scene.run(3400) { t -> scene.setField(bubble, "checkStart", SystemClock.uptimeMillis() - t) }
        bubble.shieldState = state
        scene.setField(bubble, "checker", null)
        val revealer = scene.getField(bubble, "revealer") as Animator?
        revealer?.cancel()
        val card = ResultCardView(context, palette, ShieldFonts(context), 1f, model(state), object : CardCallbacks {
            override fun onRetry() = Unit
            override fun onFullReport() = Unit
            override fun onDismissClicked() = Unit
            override fun onSwipedAway() = Unit
        }, strings)
        card.prepare((360 * d).toInt() - (48 * d).toInt())
        card.layoutParams = ViewGroup.LayoutParams(card.collapsedWidth, ViewGroup.LayoutParams.WRAP_CONTENT)
        scene.card = card
        if (motion) {
            scene.setField(bubble, "revealer", revealer)
            val enter = card.enterAnimator()
            scene.play(enter, ShieldMotion.STEP_MS + BADGE_DELAY) { t -> scene.setField(bubble, "revealMs", t.toFloat()) }
            scene.setField(bubble, "revealer", null)
        }
        scene.run(1200)
        scene.morph(card, 0f, 1f, if (motion) ShieldMotion.STEP_MS else 0)
        scene.run(1300)
        scene.morph(card, 1f, 0f, if (motion) ShieldMotion.FADE_MS else 0)
        scene.run(700)
        if (motion) {
            scene.run(170) { t ->
                val f = ShieldMotion.EXIT.getInterpolation(t / 170f)
                card.alpha = 1f - f
                card.scaleX = 1f + (ResultCardView.EXIT_SCALE - 1f) * f
                card.scaleY = card.scaleX
            }
        }
        scene.card = null
        bubble.shieldState = ShieldOverlay.State.IDLE
        scene.run(700)
    }

    private fun speech(ms: Long, peak: Float): Float {
        val syllable = 0.5f + 0.5f * sin(ms / 1000.0 * 2 * Math.PI * 4.2).toFloat()
        val phrase = (0.55f + 0.45f * sin(ms / 1000.0 * 2 * Math.PI * 0.6).toFloat()).coerceAtLeast(0f)
        return (peak * syllable * phrase).coerceIn(0f, 1f)
    }

    private inner class Scene(name: String) {
        private val dir = File(out!!, name).apply {
            deleteRecursively()
            mkdirs()
        }
        private var n = 0
        private val w = (360 * d).toInt()
        private val h = (420 * d).toInt()
        private val page = Paint(Paint.ANTI_ALIAS_FLAG)
        val bubble = BubbleView(context, palette).also { it.avatar = doll }
        var card: ResultCardView? = null
        var pill: CompanionPillView? = null
        private val bubbleX = w - (BubbleView.CIRCLE_DP + 2 * BubbleView.PAD_DP + 4) * d
        private val bubbleY = 24 * d

        fun field(target: Any, name: String) = target.javaClass.getDeclaredField(name).apply { isAccessible = true }
        fun setField(target: Any, name: String, value: Any?) = field(target, name).set(target, value)
        fun getField(target: Any, name: String): Any? = field(target, name).get(target)

        fun run(ms: Long, each: (Long) -> Unit = {}) {
            var t = 0L
            while (t < ms) {
                each(t)
                frame()
                ShadowSystemClock.advanceBy(Duration.ofMillis(frameMs))
                t += frameMs
            }
        }

        fun play(animator: Animator, ms: Long, each: (Long) -> Unit = {}) {
            val set = animator as? android.animation.AnimatorSet
            run(ms) { t ->
                each(t)
                val at = t.coerceAtMost(animator.totalDuration)
                if (set != null) set.currentPlayTime = at else (animator as android.animation.ValueAnimator).currentPlayTime = at
            }
            if (set != null) set.currentPlayTime = set.totalDuration
        }

        fun morph(card: ResultCardView, from: Float, to: Float, ms: Long) {
            if (ms == 0L) return card.apply(to)
            run(ms) { t -> card.apply(from + (to - from) * ShieldMotion.OUT.getInterpolation(t.toFloat() / ms)) }
            card.apply(to)
        }

        private fun layout(view: View) {
            val lw = view.layoutParams?.width?.takeIf { it > 0 }
            val ws = if (lw != null) View.MeasureSpec.makeMeasureSpec(lw, View.MeasureSpec.EXACTLY) else View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
            view.measure(ws, View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
            view.layout(0, 0, view.measuredWidth, view.measuredHeight)
        }

        /** Draws [view] at (x, y) with its own alpha and scale about a pivot at the bubble, as its window parent would. */
        private fun place(canvas: Canvas, view: View, x: Float, y: Float) {
            layout(view)
            if (view.alpha <= 0f) return
            canvas.save()
            canvas.translate(x, y)
            val px = bubbleX + (BubbleView.CIRCLE_DP / 2f + BubbleView.PAD_DP) * d - x
            val py = bubbleY + (BubbleView.CIRCLE_DP / 2f + BubbleView.PAD_DP) * d - y
            canvas.scale(view.scaleX, view.scaleY, px, py)
            canvas.saveLayerAlpha(0f, 0f, view.width.toFloat(), view.height.toFloat(), (view.alpha * 255).toInt())
            view.draw(canvas)
            canvas.restore()
            canvas.restore()
        }

        private fun frame() {
            val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            canvas.drawColor(0xFFECE5DD.toInt())
            for (i in 0 until 5) {
                page.color = if (i % 2 == 0) 0xFFFFFFFF.toInt() else 0xFFDCF8C6.toInt()
                val left = if (i % 2 == 0) 16 * d else 120 * d
                val y = 16 * d + i * 82 * d
                canvas.drawRoundRect(left, y, left + 220 * d, y + 58 * d, 14 * d, 14 * d, page)
            }
            val below = bubbleY + (BubbleView.CIRCLE_DP + BubbleView.PAD_DP + 8) * d
            card?.let { place(canvas, it, w - it.layoutParams.width - 16 * d, below) }
            pill?.let {
                layout(it)
                place(canvas, it, w - it.measuredWidth - 16 * d, below)
            }
            place(canvas, bubble, bubbleX, bubbleY)
            FileOutputStream(File(dir, "%05d.jpg".format(n++))).use { bitmap.compress(Bitmap.CompressFormat.JPEG, 92, it) }
            bitmap.recycle()
        }
    }

    private companion object {
        const val BADGE_DELAY = 120L
    }
}
