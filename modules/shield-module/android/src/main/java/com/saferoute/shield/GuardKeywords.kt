package com.saferoute.shield

import org.json.JSONObject

/** Tunable prefilter data, parsed from res/raw/message_guard_keywords.json. */
internal class GuardKeywords(
    val threshold: Int,
    val minLength: Int,
    val maxSendLength: Int,
    val otpMaxLength: Int,
    val weights: Map<String, Int>,
    val shorteners: List<String>,
    val tlds: List<String>,
    val categories: Map<String, List<String>>,
) {
    fun weight(signal: String): Int = weights[signal] ?: 0

    companion object {
        fun parse(json: String): GuardKeywords {
            val root = JSONObject(json)
            val weights = HashMap<String, Int>()
            root.getJSONObject("weights").let { w -> w.keys().forEach { weights[it] = w.getInt(it) } }
            val categories = HashMap<String, List<String>>()
            val cats = root.getJSONObject("categories")
            cats.keys().forEach { name ->
                val byLanguage = cats.getJSONObject(name)
                val all = ArrayList<String>()
                byLanguage.keys().forEach { lang ->
                    val arr = byLanguage.getJSONArray(lang)
                    for (i in 0 until arr.length()) all.add(arr.getString(i))
                }
                categories[name] = all
            }
            return GuardKeywords(
                threshold = root.getInt("threshold"),
                minLength = root.getInt("minLength"),
                maxSendLength = root.getInt("maxSendLength"),
                otpMaxLength = root.getInt("otpMaxLength"),
                weights = weights,
                shorteners = root.getJSONArray("shorteners").let { a -> (0 until a.length()).map { a.getString(it) } },
                tlds = root.getJSONArray("tlds").let { a -> (0 until a.length()).map { a.getString(it) } },
                categories = categories,
            )
        }

        fun load(context: android.content.Context): GuardKeywords =
            parse(context.resources.openRawResource(R.raw.message_guard_keywords).bufferedReader(Charsets.UTF_8).use { it.readText() })
    }
}
