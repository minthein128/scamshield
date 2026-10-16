export const LANG_NAMES = {
  en: 'English',
  my: 'Burmese (Myanmar language, standard Unicode, never Zawgyi)',
  id: 'Bahasa Indonesia',
  tl: 'Tagalog / Filipino',
  th: 'Thai',
} as const;

/** Product terms. null means keep the English text exactly as written. Mirrors scripts/translate.mjs; a test keeps them in step. */
export const GLOSSARY: Record<string, Record<string, string | null>> = {
  Kakwe: { my: 'ကာကွယ်', id: 'Kakwe', tl: 'Kakwe', th: 'Kakwe' },
  'Screen shield': { all: null },
  'Message Guard': { all: null },
  'Low risk (the safe verdict; never "Safe", it must read as a likelihood)': {
    my: 'အန္တရာယ်နည်း',
    id: 'Risiko rendah',
    tl: 'Mababang panganib',
    th: 'ความเสี่ยงต่ำ',
  },
  'Be careful (the careful verdict)': { my: 'သတိထားပါ', id: 'Hati-hati', tl: 'Mag-ingat', th: 'ระวัง' },
  'High risk (the danger verdict)': { my: 'အန္တရာယ်မြင့်', id: 'Risiko tinggi', tl: 'Mataas na panganib', th: 'ความเสี่ยงสูง' },
  'Scam radar': { my: 'လိမ်လည်မှု ရေဒါ', id: 'Radar penipuan', tl: 'Scam radar', th: 'เรดาร์การหลอกลวง' },
  'Trusted contacts': { my: 'ယုံကြည်ရသူများ', id: 'Kontak tepercaya', tl: 'Mga pinagkakatiwalaang contact', th: 'ผู้ติดต่อที่ไว้ใจ' },
};

export const STYLE_RULES = `
- Audience: migrant workers with low literacy. Use plain, short, kind sentences and everyday words. No slang, no jargon.
- Speak in likelihood, not certainty. Describe risk and warning signs. Never say a thing "is a scam", "is fake", "confirmed" or call a person a "scammer". Keep the hedge in the source: "looks risky", "shows warning signs", "likely", "possible".
- Keep every {{placeholder}} exactly as written, with the same name. Do not translate placeholder names.
- Keep digits, URLs, "+95", "KB" and emoji as in the source. Keep the same punctuation style and sentence count.
- Keep short UI labels short. Buttons and chips must stay a few words.
- Burmese must use standard Unicode (Myanmar3 style), never Zawgyi.
- Thai: polite, neutral register, no spaces inside words, natural Thai sentence spacing.
- Return only translations. No notes.`;

export function glossaryLines(lang: string): string {
  return Object.entries(GLOSSARY)
    .map(([term, tr]) => `- "${term}" => ${tr.all === null ? 'keep in English' : `"${tr[lang]}"`}`)
    .join('\n');
}
