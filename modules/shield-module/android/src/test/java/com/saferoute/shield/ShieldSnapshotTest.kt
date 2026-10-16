package com.saferoute.shield

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.view.View
import android.view.ViewGroup
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File
import java.io.FileOutputStream

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "xxhdpi")
class ShieldSnapshotTest {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private val d = context.resources.displayMetrics.density
    private val states = ShieldOverlay.State.values()

    @Test
    fun rendersEveryStateLightAndDark() {
        for (dark in listOf(false, true)) render(dark)
    }

    /** A stand-in for the sent screenshot: a chat-like page with message bubbles. */
    private fun fakeShot(): Bitmap {
        val bmp = Bitmap.createBitmap(240, 480, Bitmap.Config.ARGB_8888)
        val c = android.graphics.Canvas(bmp)
        c.drawColor(0xFFECE5DD.toInt())
        val p = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG)
        for (i in 0 until 6) {
            p.color = if (i % 2 == 0) 0xFFFFFFFF.toInt() else 0xFFDCF8C6.toInt()
            val left = if (i % 2 == 0) 12f else 80f
            c.drawRoundRect(left, 24f + i * 74f, left + 148f, 80f + i * 74f, 12f, 12f, p)
        }
        return bmp
    }

    private fun model(state: ShieldOverlay.State): CardModel {
        val chip = ShieldPalette.chipLabel(state)
        return when (state) {
            ShieldOverlay.State.SAFE -> CardModel(
                state, chip, "Looks like a normal chat", "No signs of a scam were found on this screen.",
                emptyList(), true, "$chip. Looks like a normal chat", canAsk = true, askLabel = "Ask"
            )
            ShieldOverlay.State.CAREFUL -> CardModel(
                state, chip, "Unknown sender asks for a code", "The sender is not in your contacts and wants a login code.",
                listOf(FlagRow("Asks for a one-time code", "medium"), FlagRow("Unknown number", "low")),
                true, "$chip. Unknown sender asks for a code", canAsk = true, askLabel = "Ask"
            )
            ShieldOverlay.State.ERROR -> CardModel(
                state, "Offline", "Tap to retry", "No connection. Check your internet and try again.",
                emptyList(), false, "Offline"
            )
            else -> CardModel(
                ShieldOverlay.State.DANGER, ShieldPalette.chipLabel(ShieldOverlay.State.DANGER),
                "Fake bank asks you to transfer money", "This message pretends to be your bank and pushes you to move money now.",
                listOf(
                    FlagRow("Urgent payment demand", "high"),
                    FlagRow("Link does not match the bank domain: secure-bnk.example", "high"),
                    FlagRow("Asks you to keep this secret", "medium")
                ),
                true, "High risk. Fake bank asks you to transfer money", canAsk = true, askLabel = "Ask", preview = fakeShot()
            )
        }
    }

    private fun card(palette: ShieldPalette, m: CardModel, expanded: Boolean): ResultCardView {
        val card = ResultCardView(context, palette, ShieldFonts(context), 1f, m, object : CardCallbacks {
            override fun onRetry() = Unit
            override fun onFullReport() = Unit
            override fun onDismissClicked() = Unit
            override fun onSwipedAway() = Unit
        })
        card.prepare((360 * d).toInt() - (48 * d).toInt())
        card.layoutParams = ViewGroup.LayoutParams(card.collapsedWidth, ViewGroup.LayoutParams.WRAP_CONTENT)
        if (expanded) card.setExpanded(true, false)
        return card
    }

    private fun draw(canvas: Canvas, view: View, x: Float, y: Float): Int {
        val w = view.layoutParams?.width?.takeIf { it > 0 } ?: View.MeasureSpec.UNSPECIFIED
        val wSpec = if (w == View.MeasureSpec.UNSPECIFIED) {
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
        } else {
            View.MeasureSpec.makeMeasureSpec(w, View.MeasureSpec.EXACTLY)
        }
        view.measure(wSpec, View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
        view.layout(0, 0, view.measuredWidth, view.measuredHeight)
        canvas.save()
        canvas.translate(x, y)
        view.draw(canvas)
        canvas.restore()
        return view.measuredHeight
    }

    private fun render(dark: Boolean) {
        val palette = ShieldPalette(dark)
        val bitmap = Bitmap.createBitmap((380 * d).toInt(), (830 * d).toInt(), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(if (dark) 0xFF0F1B2D.toInt() else 0xFFF4F6F8.toInt())

        var y = 8 * d
        val doll = android.graphics.BitmapFactory.decodeResource(context.resources, R.drawable.companion_doll)
        states.forEachIndexed { i, s ->
            val bubble = BubbleView(context, palette).also {
                it.avatar = doll
                it.shieldState = s
            }
            draw(canvas, bubble, 8 * d + i * 60 * d, y)
        }
        y += 84 * d

        listOf(BubbleView.Voice.LISTENING, BubbleView.Voice.THINKING, BubbleView.Voice.SPEAKING, BubbleView.Voice.MUTED)
            .forEachIndexed { i, v ->
                val bubble = BubbleView(context, palette).also {
                    it.shieldState = ShieldOverlay.State.DANGER
                    it.avatar = doll
                    it.voice = v
                    it.level = 0.6f
                }
                draw(canvas, bubble, 8 * d + i * 60 * d, y)
            }
        y += 84 * d

        val rows = listOf(
            card(palette, model(ShieldOverlay.State.SAFE), false),
            card(palette, model(ShieldOverlay.State.CAREFUL), false),
            card(palette, model(ShieldOverlay.State.DANGER), false),
            card(palette, model(ShieldOverlay.State.ERROR), false),
            card(palette, model(ShieldOverlay.State.DANGER), true)
        )
        rows.forEach { card ->
            val h = draw(canvas, card, 20 * d, y)
            if (!card.isExpanded) assertTrue("pill is at least 48dp tall", h >= 48 * d - 1)
            y += h + 14 * d
        }

        val dir = File("build/shield-snapshots").apply { mkdirs() }
        FileOutputStream(File(dir, if (dark) "dark.png" else "light.png")).use {
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)
        }
    }
}
