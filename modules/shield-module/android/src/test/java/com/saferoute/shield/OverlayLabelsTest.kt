package com.saferoute.shield

import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.test.core.app.ApplicationProvider
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLooper
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w360dp-h800dp-xxhdpi")
class OverlayLabelsTest {

    private val burmese = mapOf(
        "verdictSafe" to "အန္တရာယ်နည်း",
        "verdictCareful" to "သတိထားပါ",
        "verdictDanger" to "အန္တရာယ်မြင့်",
        "chipOffline" to "အင်တာနက်မရှိ",
        "chipNotChecked" to "မစစ်ရသေး",
        "tapToRetry" to "ထပ်စမ်းရန် နှိပ်ပါ",
        "dismiss" to "ပိတ်ရန်",
        "fullReport" to "အစီရင်ခံစာ အပြည့်",
    )

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
        overlay.strings = ShieldStrings.from(burmese)
        overlay.show()
    }

    @After
    fun tearDown() = overlay.remove()

    private fun advance(ms: Long) = ShadowLooper.idleMainLooper(ms, TimeUnit.MILLISECONDS)

    private fun texts(v: View): List<String> = when (v) {
        is TextView -> listOf(v.text.toString())
        is ViewGroup -> (0 until v.childCount).flatMap { texts(v.getChildAt(it)) }
        else -> emptyList()
    }

    @Test
    fun burmeseStringsGiveBurmeseChips() {
        val s = ShieldStrings.from(burmese)
        assertEquals("အန္တရာယ်နည်း", s.chip(ShieldOverlay.State.SAFE))
        assertEquals("သတိထားပါ", s.chip(ShieldOverlay.State.CAREFUL))
        assertEquals("အန္တရာယ်မြင့်", s.chip(ShieldOverlay.State.DANGER))
        assertEquals("အင်တာနက်မရှိ", s.errorChip("No connection. Check your internet and try again."))
        assertEquals("မစစ်ရသေး", s.errorChip("Could not read the screen."))
        assertEquals("fallback stays English for a missing key", "Service busy", s.errorChip("The check service is busy (503)."))
    }

    @Test
    fun theOverlayShowsBurmeseChipTitleAndButtons() {
        overlay.setResult(JSONObject("""{"verdict":"safe","title":"","summary":"s","flags":[]}"""))
        advance(400)
        val model = overlay.cardModelForTest!!
        assertEquals("အန္တရာယ်နည်း", model.chip)
        assertEquals("the title fallback uses the verdict word", "အန္တရာယ်နည်း", model.title)
        overlay.setError("No connection. Check your internet and try again.")
        advance(400)
        assertEquals("အင်တာနက်မရှိ", overlay.cardModelForTest!!.chip)
        assertEquals("ထပ်စမ်းရန် နှိပ်ပါ", overlay.cardModelForTest!!.title)
    }

    @Test
    fun theSheetButtonsUseTheStrings() {
        val ctx = ApplicationProvider.getApplicationContext<Context>()
        val model = CardModel(ShieldOverlay.State.CAREFUL, "x", "t", "s", emptyList(), true, "d")
        val card = ResultCardView(ctx, ShieldPalette(false), ShieldFonts(ctx), 1f, model, object : CardCallbacks {
            override fun onRetry() = Unit
            override fun onFullReport() = Unit
            override fun onDismissClicked() = Unit
            override fun onSwipedAway() = Unit
        }, ShieldStrings.from(burmese))
        val all = texts(card)
        assertTrue(all.toString(), "ပိတ်ရန်" in all && "အစီရင်ခံစာ အပြည့်" in all)
        assertFalse(all.toString(), "Dismiss" in all || "Full report" in all)
    }

    @Test
    fun safeNeverAppearsInAnyDefaultLabel() {
        val d = ShieldStrings.DEFAULT
        val labels = ShieldOverlay.State.values().map { d.chip(it) } +
            listOf("low", "medium", "high").map { d.severity(it) } +
            ShieldOverlay.State.values().map { bubbleDescription(it, d) }
        for (l in labels) assertFalse(l, Regex("\\bsafe\\b", RegexOption.IGNORE_CASE).containsMatchIn(l))
        assertEquals("Low risk", d.chip(ShieldOverlay.State.SAFE))
    }
}
