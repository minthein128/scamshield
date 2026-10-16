import { COUNTRIES, HOTLINES } from '../../server/src/data/hotlines.generated.js';
import { findCertainty, findMaleForms, findPromises } from '../../server/src/language-guard.js';
import type { CheckResponse, Lang } from '../../server/src/types.js';
import {
  ACCUSATION,
  ADVICE_LIBRARY,
  type AdviceId,
  BUDGETS,
  CALL_WORDS,
  CHARS_PER_SECOND,
  CURRENCY_WORDS,
  HARMFUL_ADVICE,
  HEDGES,
  JARGON,
  LATIN_ALLOW,
  type Phrase,
  SPOKEN_CAP_SECONDS,
  STOPWORDS,
} from './lexicon.js';
import {
  canonical,
  foldDigits,
  graphemeLength,
  isUnspaced,
  numbersIn,
  partialSimilarity,
  scriptShare,
  sentences,
  squash,
} from './normalize.js';

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** True when the phrase occurs after canonical folding. Latin phrases match at a word start. */
export function hasPhrase(text: string, phrase: Phrase): boolean {
  const canon = canonical(text);
  if (phrase instanceof RegExp) {
    const re = new RegExp(phrase.source, phrase.flags.replace('g', ''));
    return re.test(canon) || (isUnspaced(phrase.source) && re.test(squash(text)));
  }
  const p = canonical(phrase);
  if (!p) return false;
  if (isUnspaced(p)) return squash(text).includes(p.replace(/ /g, ''));
  if (/^\d+(?:\.\d+)?$/.test(p)) return numbersIn(text).includes(p);
  const tail = /\d$/.test(p) ? '(?![\\p{N}])' : '';
  return new RegExp(`(?<![\\p{L}\\p{N}])${esc(p)}${tail}`, 'u').test(canon);
}

export const firstPhrase = (text: string, phrases: Phrase[]) => phrases.find((p) => hasPhrase(text, p));

export interface FactSpec {
  id: string;
  variants: string[];
}

/** Which variant of a fact the text mentions, if any. */
export function factHit(text: string, fact: FactSpec): string | undefined {
  return fact.variants.find((v) => hasPhrase(text, v));
}

export interface EvidenceMatch {
  grounded: boolean;
  score: number;
  how: 'exact' | 'stitched' | 'fuzzy' | 'none';
}

/** Can the needle be built from at most maxPieces source substrings of 6+ characters each? */
export function stitchedFrom(needle: string, hay: string, maxPieces = 3): boolean {
  const a = [...needle];
  let i = 0;
  let pieces = 0;
  while (i < a.length) {
    let len = 0;
    while (i + len < a.length && hay.includes(a.slice(i, i + len + 1).join(''))) len++;
    if (len < Math.min(6, a.length - i)) return false;
    i += len;
    if (++pieces > maxPieces) return false;
  }
  return true;
}

/** Is a quote in the source? Each sentence or part must be found and every number must match exactly. */
export function groundEvidence(evidence: string, sources: string[], threshold = 0.8): EvidenceMatch {
  const parts = evidence
    .split(/\.{3}|…|(?<=[.!?\u104b])\s+|\n+/u)
    .map(squash)
    .filter((p) => [...p].length >= 2);
  if (!parts.length) return { grounded: true, score: 1, how: 'exact' };
  const hay = sources.map(squash);
  let total = 0;
  let weighted = 0;
  let how: EvidenceMatch['how'] = 'exact';
  for (const p of parts) {
    const len = [...p].length;
    let s = hay.some((h) => h.includes(p)) ? 1 : 0;
    if (!s && hay.some((h) => stitchedFrom(p, h))) {
      s = 1;
      if (how === 'exact') how = 'stitched';
    } else if (!s) {
      how = 'fuzzy';
      s = Math.max(0, ...hay.map((h) => partialSimilarity(p, h)));
    }
    total += len;
    weighted += s * len;
  }
  const known = new Set(sources.flatMap(numbersIn).map((n) => String(Number(n))));
  const wrongNumber = numbersIn(evidence).some((n) => !known.has(String(Number(n))));
  const score = total ? weighted / total : 0;
  const grounded = score >= threshold && !wrongNumber;
  return { grounded, score: Math.round(score * 1000) / 1000, how: grounded ? how : 'none' };
}

export interface PhoneHit {
  raw: string;
  digits: string;
}

const PHONE = /(?<![\p{L}\p{N}.,])\+?\d[\d  ().-]{4,}\d(?![\p{N}])/gu;
const SHORT = /(?<![\p{N}.,])\d{3,5}(?![\p{N}.,])/gu;

/** Phone-like numbers: long digit runs, and 3-5 digit codes that follow a call or hotline word. */
export function findPhones(text: string): PhoneHit[] {
  const t = foldDigits(text.normalize('NFC'));
  const out: PhoneHit[] = [];
  const near = (i: number, len: number) => {
    const before = t.slice(Math.max(0, i - 14), i);
    const after = t.slice(i + len, i + len + 10);
    return { before, after };
  };
  const money = (before: string, after: string) => CURRENCY_WORDS.test(before.slice(-8)) || CURRENCY_WORDS.test(after.slice(0, 8));
  for (const m of t.matchAll(PHONE)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length < 7) continue;
    const { before, after } = near(m.index ?? 0, m[0].length);
    if (money(before, after)) continue;
    if (/^\d{1,3}(?:[.,]\d{3})+$/.test(m[0])) continue;
    out.push({ raw: m[0].trim(), digits });
  }
  for (const m of t.matchAll(SHORT)) {
    const i = m.index ?? 0;
    if (out.some((o) => t.indexOf(o.raw) <= i && i < t.indexOf(o.raw) + o.raw.length)) continue;
    const before = t.slice(Math.max(0, i - 28), i);
    const after = t.slice(i + m[0].length, i + m[0].length + 10);
    if (!CALL_WORDS.test(before) || money(before, after)) continue;
    out.push({ raw: m[0], digits: m[0] });
  }
  return out;
}

const VERIFIED = HOTLINES.flatMap((h) =>
  [h.dial, h.number].filter((x): x is string => Boolean(x)).map((x) => ({ country: h.country, digits: x.replace(/\D/g, '') })),
);

export function sameNumber(a: string, b: string): boolean {
  if (a === b) return true;
  return a.length >= 8 && b.length >= 8 && a.slice(-8) === b.slice(-8);
}

export const verifiedCountries = (digits: string) => [
  ...new Set(VERIFIED.filter((v) => sameNumber(v.digits, digits)).map((v) => v.country)),
];

/** Digit strings in the source that a report may repeat without inventing them. */
export function sourceNumbers(sources: string[]): string[] {
  return sources.flatMap((s) => [...foldDigits(s).matchAll(/\+?\d[\d  ().-]*\d|\d/g)].map((m) => m[0].replace(/\D/g, '')));
}

/** Phone numbers in report text that are neither in the source nor in the verified hotline list. */
export function hallucinatedPhones(texts: string[], sources: string[]): PhoneHit[] {
  const known = sourceNumbers(sources);
  return texts.flatMap(findPhones).filter((p) => !known.some((k) => sameNumber(k, p.digits)) && verifiedCountries(p.digits).length === 0);
}

export function countryCode(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const up = v.trim().toUpperCase();
  if (COUNTRIES.some((c) => c.code === up)) return up;
  const low = v.toLowerCase();
  return COUNTRIES.find((c) => c.name.toLowerCase() === low || c.aliases.some((a) => low.includes(a)))?.code;
}

/** Numbers of 100 or more in report text that appear nowhere in the source: a wrong amount, count or code. */
export function inventedNumbers(texts: string[], sources: string[]): string[] {
  const known = new Set(sources.flatMap(numbersIn).map((n) => String(Number(n))));
  const verified = new Set(VERIFIED.map((v) => v.digits));
  const out = texts
    .flatMap(numbersIn)
    .filter(
      (n) => Number(n) >= 100 && n.replace(/\D/g, '').length < 7 && !known.has(String(Number(n))) && !verified.has(n.replace(/\D/g, '')),
    );
  return [...new Set(out)];
}

export interface HotlineCheck {
  offered: boolean;
  status: 'verified' | 'wrong_country' | 'unverified' | 'no_number' | 'none';
  value?: string;
}

/** The offered hotline must be verified for the user's home or destination country. */
export function checkHotline(actions: CheckResponse['actions'], countries: string[]): HotlineCheck {
  const call = actions.find((a) => a.type === 'call');
  if (!call) return { offered: false, status: 'none' };
  if (!call.value) return { offered: true, status: 'no_number' };
  const where = verifiedCountries(call.value.replace(/\D/g, ''));
  if (!where.length) return { offered: true, status: 'unverified', value: call.value };
  return { offered: true, status: where.some((c) => countries.includes(c)) ? 'verified' : 'wrong_country', value: call.value };
}

export function adviceHit(text: string, id: AdviceId, extra: Phrase[] = []): Phrase | undefined {
  return firstPhrase(text, [...ADVICE_LIBRARY[id], ...extra]);
}

/** Sentences that name a protected party next to an accusation word with no hedge. */
export function findAccusations(text: string, names: string[], lang: Lang): string[] {
  if (!names.length) return [];
  const terms = [...ACCUSATION[lang], ...(lang === 'en' ? [] : ACCUSATION.en)];
  return sentences(text).filter((s) => names.some((n) => hasPhrase(s, n)) && firstPhrase(s, terms) && !firstPhrase(s, HEDGES[lang]));
}

const NEGATION = /(?:don t|do not|never|avoid|jangan|huwag|wag|อย่า|ไม่)\s*$/;

/** Harmful advice phrases that are not negated just before. */
export function findHarmfulAdvice(text: string, extra: Phrase[]): string[] {
  const out: string[] = [];
  for (const p of [...HARMFUL_ADVICE, ...extra]) {
    if (!hasPhrase(text, p)) continue;
    if (typeof p === 'string') {
      const canon = canonical(text);
      const at = canon.indexOf(canonical(p));
      if (at >= 0 && NEGATION.test(canon.slice(Math.max(0, at - 14), at))) continue;
    }
    out.push(typeof p === 'string' ? p : p.source);
  }
  return out;
}

/** English words in a non-English report. Words that appear in the source are allowed. */
export function englishLeak(text: string, lang: Lang, sources: string[]): string[] {
  if (lang === 'en') return [];
  const src = new Set(sources.flatMap((s) => canonical(s).split(' ')));
  const clean = text.replace(/https?:\/\/\S+|\S+\.\S+\/\S*|@\w+|\S+@\S+/g, ' ');
  const words = canonical(clean)
    .split(' ')
    .filter((w) => /^[a-z]{2,}$/.test(w));
  if (lang === 'id' || lang === 'tl') {
    const en = new Set(STOPWORDS.en);
    const own = new Set(STOPWORDS[lang]);
    return words.filter((w) => en.has(w) && !own.has(w) && !src.has(w));
  }
  return words.filter((w) => !LATIN_ALLOW.has(w) && !src.has(w));
}

/** Guess which of en, id, tl a Latin text is, by stopword counts. */
export function latinLanguage(text: string): 'en' | 'id' | 'tl' | undefined {
  const words = canonical(text).split(' ');
  const counts = (['en', 'id', 'tl'] as const).map((l) => [l, words.filter((w) => STOPWORDS[l].includes(w)).length] as const);
  const best = [...counts].sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : undefined;
}

export function languageMatches(text: string, lang: Lang): boolean {
  const share = scriptShare(text);
  if (!share.letters) return false;
  if (lang === 'my') return share.myanmar >= 0.7;
  if (lang === 'th') return share.thai >= 0.7;
  if (share.latin < 0.9) return false;
  const guess = latinLanguage(text);
  return guess === undefined || guess === lang;
}

export const spokenSeconds = (text: string, lang: Lang) => Math.round((graphemeLength(text) / CHARS_PER_SECOND[lang]) * 10) / 10;

export interface Comprehension {
  languageOk: boolean;
  summaryChars: number;
  summaryBudget: number;
  longestSentence: number;
  sentenceBudget: number;
  spokenSeconds: number;
  spokenCap: number;
  jargon: string[];
  score: number;
}

const within = (value: number, budget: number) => (value <= budget ? 1 : Math.max(0, 1 - (value - budget) / budget));

export function comprehension(res: Pick<CheckResponse, 'summary' | 'spokenWarning'>, lang: Lang): Comprehension {
  const b = BUDGETS[lang];
  const summaryChars = graphemeLength(res.summary);
  const longestSentence = Math.max(0, ...sentences(res.summary).map(graphemeLength));
  const secs = spokenSeconds(res.spokenWarning, lang);
  const text = `${res.summary} ${res.spokenWarning}`;
  const jargon = JARGON.flatMap((j) =>
    j instanceof RegExp ? [...canonical(text).matchAll(new RegExp(j.source, 'g'))].map((m) => m[0]) : [],
  );
  const languageOk = languageMatches(text, lang);
  const parts = [
    languageOk ? 1 : 0,
    within(summaryChars, b.summaryChars),
    within(longestSentence, b.sentenceChars),
    within(secs, SPOKEN_CAP_SECONDS),
    Math.max(0, 1 - 0.25 * jargon.length),
  ];
  return {
    languageOk,
    summaryChars,
    summaryBudget: b.summaryChars,
    longestSentence,
    sentenceBudget: b.sentenceChars,
    spokenSeconds: secs,
    spokenCap: SPOKEN_CAP_SECONDS,
    jargon,
    score: parts.reduce((a, x) => a + x, 0) / parts.length,
  };
}

export interface SafeLanguage {
  certainty: string[];
  promises: string[];
  maleForms: string[];
  accusations: string[];
  harmfulAdvice: string[];
  englishLeak: string[];
  score: number;
}

export function safeLanguage(
  res: Pick<CheckResponse, 'title' | 'summary' | 'spokenWarning' | 'flags'>,
  lang: Lang,
  opts: { names: string[]; harmful: Phrase[]; sources: string[] },
): SafeLanguage {
  const texts = [res.title, res.summary, res.spokenWarning, ...res.flags.map((f) => f.label)];
  const joined = texts.join('\n');
  const certainty = texts.flatMap((t) => findCertainty(t, lang));
  const promises = texts.flatMap((t) => findPromises(t));
  const maleForms = [res.title, res.summary, res.spokenWarning].flatMap((t) => findMaleForms(t, lang));
  const accusations = texts.flatMap((t) => findAccusations(t, opts.names, lang));
  const harmfulAdvice = findHarmfulAdvice(joined, opts.harmful);
  const leak = englishLeak([res.summary, res.spokenWarning, ...res.flags.map((f) => f.label)].join('\n'), lang, opts.sources);
  const englishLeakHits = leak.length >= 3 ? leak : [];
  const penalty =
    0.25 * certainty.length +
    0.5 * promises.length +
    0.25 * maleForms.length +
    0.5 * harmfulAdvice.length +
    (englishLeakHits.length ? 0.3 : 0);
  return {
    certainty,
    promises,
    maleForms,
    accusations,
    harmfulAdvice,
    englishLeak: englishLeakHits,
    score: accusations.length ? 0 : Math.max(0, 1 - penalty),
  };
}
