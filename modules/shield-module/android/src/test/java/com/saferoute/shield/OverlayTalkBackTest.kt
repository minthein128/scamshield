package com.saferoute.shield

import android.content.Context
import androidx.test.core.app.ApplicationProvider
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
import java.io.File
import java.util.concurrent.TimeUnit

/** TalkBack text on the overlay follows the app language: a Burmese map gives Burmese sentences. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w360dp-h800dp-xxhdpi")
class OverlayTalkBackTest {

    /** The map the app sends for [lang], read from its locale files like src/lib/companionStrings.ts. */
    private fun appStrings(lang: String): ShieldStrings {
        val root = generateSequence(File("").absoluteFile) { it.parentFile }.first { File(it, "src/i18n/locales").exists() }
        fun json(ns: String) = org.json.JSONObject(File(root, "src/i18n/locales/$lang/$ns.json").readText())
        val companion = json("live").getJSONObject("companion")
        val map = HashMap<String, Any?>()
        companion.keys().forEach { map[it] = companion.getString(it) }
        val verdict = json("common").getJSONObject("verdict")
        map["verdictSafe"] = verdict.getString("safe")
        map["verdictCareful"] = verdict.getString("careful")
        map["verdictDanger"] = verdict.getString("danger")
        map["dismiss"] = json("home").getJSONObject("notice").getString("dismiss")
        return ShieldStrings.from(map)
    }

    private val myanmar = Regex("[\\u1000-\\u109F]")
    private val english = Regex("Double tap|Checking|details|Expanded|connection|internet|screenshot|failed|Try again|not allowed", RegexOption.IGNORE_CASE)

    @Test
    fun burmeseMapGivesBurmeseBubbleDescriptions() {
        val my = appStrings("my")
        for (state in ShieldOverlay.State.values()) {
            val text = bubbleDescription(state, my)
            assertTrue("$state: $text", myanmar.containsMatchIn(text))
            assertFalse("$state: $text", english.containsMatchIn(text))
            assertTrue(text.startsWith("ပစ်တိုင်းထောင်"))
        }
    }

    @Test
    fun burmeseMapGivesBurmeseErrorSentences() {
        val my = appStrings("my")
        val messages = listOf(
            "No connection. Check your internet and try again.",
            "Too many checks. Wait a minute and try again.",
            "The check service is busy (503). Try again soon.",
            "The screenshot is too large to check.",
            "Could not read the screen. Tap the shield to try again.",
            "Screen capture was not allowed. Tap the shield to try again.",
            "The server sent an answer we cannot read.",
            "Recruiter text rejected by server",
        )
        val sentences = messages.map { my.errorText(it) }
        for ((m, s) in messages.zip(sentences)) {
            assertTrue("$m -> $s", myanmar.containsMatchIn(s))
            assertFalse("$m -> $s", english.containsMatchIn(s))
        }
        assertEquals("each kind has its own sentence", 7, sentences.toSet().size)
    }

    @Test
    fun englishFallbacksStayReadable() {
        val d = ShieldStrings.DEFAULT
        assertEquals("Pyit Taing Htaung, Kakwe shield. Double tap to check the screen.", bubbleDescription(ShieldOverlay.State.IDLE, d))
        assertEquals("No connection. Check your internet and try again.", d.errorText("No connection. Check your internet and try again."))
        assertEquals("The check failed. Try again.", d.errorText("anything else"))
    }

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
        overlay.strings = appStrings("my")
        overlay.show()
    }

    @After
    fun tearDown() = overlay.remove()

    @Test
    fun theErrorPillReadsBurmeseToTalkBack() {
        overlay.setError("No connection. Check your internet and try again.")
        ShadowLooper.idleMainLooper(400, TimeUnit.MILLISECONDS)
        val model = overlay.cardModelForTest!!
        assertTrue(model.description, myanmar.containsMatchIn(model.description))
        assertFalse(model.description, english.containsMatchIn(model.description))
        assertTrue(myanmar.containsMatchIn(overlay.bubbleViewForTest.contentDescription))
    }
}
