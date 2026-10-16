package com.saferoute.shield

/** Finds URLs, shortened links and bare domains in message text. */
internal class MessageLinks(keywords: GuardKeywords) {
    private val explicit = Regex("""(?i)\b(?:https?://|www\.)[^\s<>"']+""")
    private val shortener = Regex(
        """(?i)(?<![\p{L}\p{Nd}@.-])(?:${keywords.shorteners.joinToString("|") { Regex.escape(it) }})(?:/[^\s<>"']*)?"""
    )
    private val bare = Regex(
        """(?i)(?<![\p{L}\p{Nd}@.-])(?:[a-z0-9][a-z0-9-]*\.)+(?:${keywords.tlds.joinToString("|")})(?![\p{L}\p{Nd}-])(?:/[^\s<>"']*)?"""
    )
    private val shortenerHosts = keywords.shorteners.map { it.lowercase() }

    /** Non-overlapping link ranges in text order, without trailing punctuation. */
    fun find(text: String): List<IntRange> {
        val found = ArrayList<IntRange>()
        for (re in listOf(explicit, shortener, bare)) {
            for (m in re.findAll(text)) {
                var end = m.range.last
                while (end > m.range.first && text[end] in TRAILING) end--
                val range = m.range.first..end
                if (found.none { it.first <= range.last && range.first <= it.last }) found.add(range)
            }
        }
        return found.sortedBy { it.first }
    }

    fun hasShortener(text: String): Boolean {
        val lower = text.lowercase()
        return find(text).any { r ->
            val s = lower.substring(r)
            shortenerHosts.any { h -> s.contains("//$h") || s.startsWith(h) || s.startsWith("www.$h") }
        }
    }

    private companion object {
        const val TRAILING = ".,;:!?)]}'\""
    }
}
