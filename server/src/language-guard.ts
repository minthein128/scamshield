import type { CheckResponse, Extraction, Flag, Lang } from './types.js';

interface Rule {
  re: RegExp;
  sub?: string | ((...m: string[]) => string);
}

const EN: Rule[] = [
  {
    re: /\b(is|are) (?:a |an )?((?:[a-z]+ ){0,3}?)(scams?|frauds?|traps?|cons?)\b/gi,
    sub: (_m, v, mid, n) =>
      `${v.toLowerCase() === 'are' ? 'look' : 'looks'} like ${/(scams|frauds|traps|cons)$/i.test(n) ? '' : 'a '}${mid}${n}`,
  },
  {
    re: /\b(is|are) (?:definitely |clearly |obviously )?(fake|fraudulent|illegal|a lie)\b/gi,
    sub: (_m, v, w) => `${v.toLowerCase() === 'are' ? 'look' : 'looks'} ${w === 'a lie' ? 'untrue' : w}`,
  },
  {
    re: /\b(?:is|are) (?:a |an )?(?:criminals?|scammers?|fraudsters?|traffickers?|thieves|thief|crooks?)\b/gi,
    sub: 'may be linked to scam reports',
  },
  {
    re: /(?<!(?:possibly|likely|apparently|looks like|look like|could be|may be|might be|seems|seem)\s(?:an? )?)\bfake(?= [a-z])/gi,
    sub: 'possibly fake',
  },
  { re: /\bmust be (?:a |an )?/gi, sub: 'could be ' },
  {
    re: /\b(?:a |an )?(?:dangerous|deadly|obvious|clear|certain) ((?:[a-z-]+ ){0,2}?(?:trap|scam|fraud))\b/gi,
    sub: (_m, n) => `a possible ${n}`,
  },
  { re: /\b(?:definitely|certainly|undoubtedly|absolutely|without (?:a )?doubt|for sure)\b/gi, sub: 'likely' },
  { re: /(?<!not )(?<!un)\bconfirmed\b/gi, sub: 'reported' },
  {
    re: /\b100\s?% (sure|certain|scam|fake|fraud|safe)\b/gi,
    sub: (_m, w) => `likely ${w === 'sure' || w === 'certain' ? 'concerning' : w}`,
  },
  { re: /\bproves? that\b/gi, sub: 'suggests that' },
];

const ID: Rule[] = [
  {
    re: /\b(?:adalah|merupakan) (?:sebuah |suatu )?(penipuan|scam|jebakan|perangkap|tipuan|modus penipuan)/gi,
    sub: (_m, n) => `kemungkinan ${n}`,
  },
  { re: /\b(?:adalah|merupakan) palsu\b/gi, sub: 'tampak palsu' },
  {
    re: /\b(?:adalah|merupakan) (?:seorang )?(?:penipu|penjahat|pelaku kejahatan|pelaku perdagangan orang|scammer)\b/gi,
    sub: 'mungkin terkait laporan penipuan',
  },
  { re: /(?<!tidak )(?<!belum )\b(?:sudah pasti|dipastikan|pasti)\b/gi, sub: 'kemungkinan besar' },
  { re: /\bterbukti\b/gi, sub: 'tampaknya' },
  { re: /\bterkonfirmasi\b/gi, sub: 'dilaporkan' },
  { re: /\b100\s?%\s*(?:yakin|pasti|penipuan|palsu|aman)/gi, sub: 'kemungkinan besar' },
];

const TL: Rule[] = [
  { re: /\bay (?:isang )?(scam|panloloko|bitag|peke|pekeng)\b/gi, sub: (_m, n) => `ay mukhang ${n}` },
  { re: /\b(?:ay|ang) (?:isang )?(?:manloloko|kriminal|scammer|trafficker)\b/gi, sub: 'ay maaaring may kaugnayan sa mga ulat ng scam' },
  { re: /\b(?:siguradong|tiyak na|tiyak|sigurado)\b/gi, sub: 'posibleng' },
  { re: /\bwalang duda\b/gi, sub: 'posible' },
  { re: /\bkumpirmado\b/gi, sub: 'iniulat' },
  { re: /\b100\s?%\s*(?:sigurado|scam|peke|ligtas)/gi, sub: 'posibleng' },
];

const SCAM_NOUN = '(လိမ်လည်မှု|လိမ်ညာမှု|လှည့်စားမှု|ထောင်ချောက်|လူကုန်ကူးမှု)';
const MY: Rule[] = [
  { re: new RegExp(`${SCAM_NOUN}\\s*(?:ဖြစ်ပါသည်|ဖြစ်သည်|ဖြစ်ပါတယ်)`, 'g'), sub: (_m, n) => `${n} ဖြစ်နိုင်ပါသည်` },
  { re: /(ကျိန်းသေ|မလွဲဧကန်)/g },
  { re: /(၁၀၀\s*(?:%|ရာခိုင်နှုန်း)|100\s?%)/g },
  { re: /(အတည်ပြုပြီး|အတည်ပြုထားသည်)/g, sub: 'ဖော်ပြထားပြီး' },
  { re: /(လိမ်စားသူ|ရာဇဝတ်ကောင်|လူကုန်ကူးသူ)\s*(?:ဖြစ်ပါသည်|ဖြစ်သည်)/g },
];

// Thai has no word boundaries: rules use lookbehinds for negation and hedge prefixes instead of \b.
const TH_NOT = '(?<!ไม่)(?<!ไม่ได้)(?<!ยังไม่)(?<!ไม่ค่อย)';
const TH_HEDGE = '(?<!(?:อาจ|อาจจะ|น่าจะ|คง|คงจะ|ดูเหมือน|ดูเหมือนว่า|ดูเหมือนจะ|เหมือน|คล้าย|เข้าข่าย|เสี่ยง|สงสัยว่า|ถ้า|หาก|ไม่|จะ))';
const TH_SCAM_NOUN = '(?:การ)?(?:หลอกลวง|หลอกให้|ต้มตุ๋น|ฉ้อโกง|กลโกง|กลลวง|กับดัก|แก๊งต้มตุ๋น|การค้ามนุษย์)';
const TH_PERSON = '(?:มิจฉาชีพ|คนร้าย|อาชญากร|คนหลอกลวง|ผู้ค้ามนุษย์|นายหน้าค้ามนุษย์|คนโกง|โจร)';
const TH: Rule[] = [
  { re: new RegExp(`${TH_HEDGE}(?:เป็น|คือ)${TH_PERSON}`, 'g'), sub: 'อาจเกี่ยวข้องกับรายงานการหลอกลวง' },
  { re: new RegExp(`${TH_HEDGE}(?:เป็น|คือ)(${TH_SCAM_NOUN})`, 'g'), sub: (_m, n) => `ดูเหมือน${n}` },
  {
    re: new RegExp(`${TH_HEDGE}เป็น((?:ของ|ข้อความ|เว็บไซต์|เว็บ|บัญชี|เอกสาร|ข้อเสนอ|ลิงก์|แอป)?ปลอม)`, 'g'),
    sub: (_m, n) => `ดูเหมือน${n}`,
  },
  { re: new RegExp(`(?<!ไม่)ปลอดภัย\\s?(?:100\\s?%|${TH_NOT}แน่นอน|ชัวร์|ร้อยเปอร์เซ็นต์)`, 'g'), sub: 'ไม่พบสัญญาณเตือนสำคัญ' },
  { re: new RegExp(`${TH_NOT}(?:อย่างแน่นอน|แน่นอน(?!ว่า)|แน่ๆ|ชัวร์|ไม่ต้องสงสัย|ไม่ผิดแน่|เต็มร้อย|ร้อยเปอร์เซ็นต์)`, 'g'), sub: '' },
  { re: new RegExp(`${TH_NOT}แน่นอนว่า`, 'g') },
  { re: /(?:100|๑๐๐)\s?(?:%|เปอร์เซ็นต์)/g },
  { re: new RegExp(`${TH_NOT}(?<!สามารถ)(?:ยืนยันแล้ว|ได้รับการยืนยัน)(?!หรือไม่|หรือยัง)`, 'g'), sub: 'มีรายงาน' },
  { re: new RegExp(`${TH_NOT}(?<!สามารถ)พิสูจน์ได้ว่า`, 'g'), sub: 'บ่งชี้ว่า' },
  { re: new RegExp(`${TH_NOT}(?<!สามารถ)พิสูจน์แล้ว`, 'g'), sub: 'มีรายงาน' },
];

const RULES: Record<Lang, Rule[]> = { en: EN, id: ID, tl: TL, my: MY, th: TH };

// Job Shield never reassures: "safe", "verified job", "scam confirmed", "no risk", "detected".
const JOB_BANNED: Record<Lang, Rule[]> = {
  en: [
    { re: /\bverified (?:jobs?|offers?|employers?|recruiters?|agenc(?:y|ies))\b/gi, sub: 'job offer' },
    { re: /\b(?:scams? confirmed|confirmed scams?)\b/gi, sub: 'possible scam' },
    { re: /\bno risks? (?:detected|found)\b|\brisk[- ]free\b/gi, sub: 'few warning signs found' },
    { re: /(?<!\bnot )\bsafe\b/gi, sub: 'lower-risk' },
    { re: /\bdetected\b/gi, sub: 'found' },
  ],
  id: [
    { re: /\bpekerjaan terverifikasi\b/gi, sub: 'tawaran pekerjaan' },
    { re: /\b(?:penipuan terkonfirmasi|terkonfirmasi penipuan)\b/gi, sub: 'kemungkinan penipuan' },
    { re: /\btidak ada risiko(?: terdeteksi| ditemukan)?\b/gi, sub: 'sedikit tanda bahaya' },
    { re: /(?<!\b(?:tidak|kurang|belum) )\baman\b/gi, sub: 'berisiko lebih rendah' },
    { re: /\bterdeteksi\b/gi, sub: 'ditemukan' },
  ],
  tl: [
    { re: /\bberipikadong trabaho\b/gi, sub: 'alok na trabaho' },
    { re: /\bkumpirmadong scam\b/gi, sub: 'posibleng scam' },
    { re: /\bwalang (?:natukoy na |nakitang )?panganib\b/gi, sub: 'kaunting babala' },
    { re: /(?<!\bhindi )\bligtas\b/gi, sub: 'mas mababa ang panganib' },
    { re: /\bnatukoy\b/gi, sub: 'nakita' },
  ],
  my: [
    { re: /အတည်ပြုပြီး(?:သော|သည့်)?\s*အလုပ်/g, sub: 'ဖော်ပြထားသောအလုပ်' },
    { re: /လိမ်လည်မှု\s*(?:ဖြစ်ကြောင်း\s*)?အတည်ပြု(?:ပြီး|ထားသည်)?/g, sub: 'လိမ်လည်မှု ဖြစ်နိုင်' },
    { re: /အန္တရာယ်\s*(?:မရှိ|မတွေ့)(?:ပါ)?/g, sub: 'သတိပေးလက္ခဏာ နည်း' },
    { re: /(?<!မ)(?:လုံခြုံ|ဘေးကင်း)/g, sub: 'သတိပေးလက္ခဏာနည်း' },
    { re: /(?:ထောက်လှမ်း|စစ်ဆေး)\s*တွေ့ရှိ/g, sub: 'တွေ့ရ' },
  ],
  th: [
    { re: /งาน(?:ที่)?(?:ตรวจสอบแล้ว|ผ่านการตรวจสอบ)/g, sub: 'ข้อเสนองาน' },
    { re: /ยืนยัน(?:ว่าเป็น)?การหลอกลวง/g, sub: 'อาจเป็นการหลอกลวง' },
    { re: /ไม่พบความเสี่ยง|ไร้ความเสี่ยง/g, sub: 'พบสัญญาณเตือนน้อย' },
    { re: new RegExp(`${TH_NOT}ปลอดภัย`, 'g'), sub: 'มีสัญญาณเตือนน้อย' },
    { re: /ตรวจพบ/g, sub: 'พบ' },
  ],
};

/** Certainty phrases plus the Job Shield banned phrases, in this language. */
export function findJobBanned(text: string, lang: Lang): string[] {
  const out = findCertainty(text, lang);
  for (const r of JOB_BANNED[lang]) {
    for (const m of text.matchAll(new RegExp(r.re.source, r.re.flags))) out.push(m[0]);
  }
  return out;
}

/** Rewrites certainty phrases, then the Job Shield banned phrases. */
export function guardJobText(text: string, lang: Lang): { text: string; hits: number } {
  const first = rewriteCertainty(fixAppName(text, lang), lang);
  let hits = first.hits;
  let out = first.text;
  for (const r of JOB_BANNED[lang]) {
    const n = [...out.matchAll(new RegExp(r.re.source, r.re.flags))].length;
    hits += n;
    if (n && r.sub !== undefined) out = out.replace(new RegExp(r.re.source, r.re.flags), r.sub as never);
  }
  return { text: out, hits };
}

const TH_VOWEL_MARK = '\\u0E30-\\u0E3A\\u0E47-\\u0E4E';
const TH_APP_NAME = new RegExp(`[กค]า[กคข]ว(?:าย|ย์?)|[กค]า[เแ][กคข]ว(?:ย์)?(?![${TH_VOWEL_MARK}])`, 'g');

/** Thai-script spellings of the app name (ka-kwe) back to Kakwe. Only Thai text is touched. */
export function fixAppName(text: string, lang: Lang): string {
  return lang === 'th' ? text.replace(TH_APP_NAME, 'Kakwe') : text;
}

export function findCertainty(text: string, lang: Lang): string[] {
  const out: string[] = [];
  for (const r of RULES[lang]) {
    for (const m of text.matchAll(new RegExp(r.re.source, r.re.flags))) out.push(m[0]);
  }
  return out;
}

export function rewriteCertainty(text: string, lang: Lang): { text: string; hits: number } {
  let hits = 0;
  let out = text;
  for (const r of RULES[lang]) {
    const re = new RegExp(r.re.source, r.re.flags);
    const n = [...out.matchAll(re)].length;
    hits += n;
    if (n && r.sub !== undefined) out = out.replace(new RegExp(r.re.source, r.re.flags), r.sub as never);
  }
  return { text: out, hits };
}

export interface GuardStats {
  before: number;
  rewrites: number;
  dropped?: number;
  replaced?: number;
}

const SCRIPT = {
  myanmar: '\\u1000-\\u109F\\uA9E0-\\uA9FF\\uAA60-\\uAA7F',
  thai: '\\u0E00-\\u0E7F',
  other: '\\u0900-\\u0DFF\\u0E80-\\u0EFF\\u1780-\\u17FF',
};
const FOREIGN: Record<Lang, RegExp> = {
  en: new RegExp(`[${SCRIPT.myanmar}${SCRIPT.thai}${SCRIPT.other}]`, 'gu'),
  id: new RegExp(`[${SCRIPT.myanmar}${SCRIPT.thai}${SCRIPT.other}]`, 'gu'),
  tl: new RegExp(`[${SCRIPT.myanmar}${SCRIPT.thai}${SCRIPT.other}]`, 'gu'),
  my: new RegExp(`[${SCRIPT.thai}${SCRIPT.other}]`, 'gu'),
  th: new RegExp(`[${SCRIPT.myanmar}${SCRIPT.other}]`, 'gu'),
};

/** Characters from a regional script the report language does not use (Thai in Burmese, Tamil anywhere). */
export function countForeignScript(text: string, lang: Lang): number {
  return text.match(FOREIGN[lang])?.length ?? 0;
}

const NATIVE: Partial<Record<Lang, RegExp>> = {
  my: new RegExp(`[${SCRIPT.myanmar}]`, 'gu'),
  th: new RegExp(`[${SCRIPT.thai}]`, 'gu'),
};
const LINKISH = /https?:\/\/\S+|\S+@\S+|[\w-]+(?:\.[\w-]+)+\S*/g;
const EN_WORDS = new Set(
  'the is are was were be been has have had of and or with this that these those we our they their it its could would not no found find describe describes described similar reports reported messages message as by for from about which there here online scam scams scammers licence license record records registered website company'.split(
    ' ',
  ),
);
const OWN_WORDS: Partial<Record<Lang, Set<string>>> = {
  id: new Set(
    'yang dan ini itu tidak kami untuk dengan sebagai ada di dari pada laporan serupa belum tentang oleh atau menyebut ditemukan catatan izin pesan situs penipuan'.split(
      ' ',
    ),
  ),
  tl: new Set(
    'ang ng mga sa na ay ito hindi wala kami may para iniulat ulat nang at nahanap rekord lisensya mensahe katulad panloloko'.split(' '),
  ),
};

/** True when model-written text reads as English in a my, th, id or tl report. Links and short names are ignored. */
export function wrongLanguage(text: string, lang: Lang): boolean {
  if (lang === 'en') return false;
  const plain = text.replace(LINKISH, ' ');
  const words = plain.toLowerCase().match(/[a-z']+/g) ?? [];
  const english = words.filter((w) => EN_WORDS.has(w)).length;
  if (english < 2) return false;
  const native = NATIVE[lang];
  if (native) return (plain.match(/[A-Za-z]/g)?.length ?? 0) > (plain.match(native)?.length ?? 0);
  const own = OWN_WORDS[lang];
  return english > (own ? words.filter((w) => own.has(w)).length : 0);
}

const offLanguage = (text: string, lang: Lang) => countForeignScript(text, lang) > 0 || wrongLanguage(text, lang);

/** Source note for a grounded finding whose own evidence sentence came back in another language. */
export const GROUND_EVIDENCE_FALLBACK: Record<Lang, string> = {
  en: 'Based on web search results.',
  id: 'Berdasarkan hasil pencarian web.',
  tl: 'Batay sa mga resulta ng paghahanap sa web.',
  my: 'အွန်လိုင်း ရှာဖွေမှုရလဒ်များအပေါ် အခြေခံထားသည်။',
  th: 'อ้างอิงจากผลการค้นหาบนเว็บ',
};

/** The grounded evidence, or the localized source note when it is not in the report language. */
export function groundEvidence(evidence: string, lang: Lang): string {
  return offLanguage(evidence, lang) ? GROUND_EVIDENCE_FALLBACK[lang] : evidence;
}

/** Foreign-script characters in the model's own words: summary, spoken warning and flag labels. */
export function foreignInExtraction(x: Pick<Extraction, 'summary' | 'spokenWarning' | 'flags'>, lang: Lang): number {
  return [x.summary, x.spokenWarning, ...x.flags.map((f) => f.label)].reduce((n, t) => n + countForeignScript(t, lang), 0);
}

export function guardExtraction(x: Extraction, lang: Lang): { extraction: Extraction; stats: GuardStats } {
  const stats: GuardStats = { before: 0, rewrites: 0 };
  const fix = (t: string) => {
    const r = rewriteCertainty(fixAppName(t, lang), lang);
    stats.before += r.hits;
    if (r.text !== t) stats.rewrites++;
    return r.text;
  };
  const extraction: Extraction = {
    ...x,
    summary: fix(x.summary),
    spokenWarning: fix(x.spokenWarning),
    flags: x.flags.map((f) => ({ ...f, label: fix(f.label) })),
  };
  return { extraction, stats };
}

export function guardFlags(flags: Flag[], lang: Lang): { flags: Flag[]; stats: GuardStats } {
  const stats: GuardStats = { before: 0, rewrites: 0 };
  const fix = (t: string) => {
    const r = rewriteCertainty(fixAppName(t, lang), lang);
    stats.before += r.hits;
    if (r.text !== t) stats.rewrites++;
    return r.text;
  };
  const kept = flags.filter((f) => !offLanguage(f.label, lang));
  if (kept.length < flags.length) stats.dropped = flags.length - kept.length;
  const replaced = kept.filter((f) => offLanguage(f.evidence, lang)).length;
  if (replaced) stats.replaced = replaced;
  return { flags: kept.map((f) => ({ ...f, label: fix(f.label), evidence: fix(groundEvidence(f.evidence, lang)) })), stats };
}

export const isHeavy = (hits: number) => hits >= 3;

export function userFacingText(res: Pick<CheckResponse, 'title' | 'summary' | 'spokenWarning' | 'flags'>): string[] {
  return [res.title, res.summary, res.spokenWarning, ...res.flags.map((f) => f.label)];
}

export function countCertainty(res: Pick<CheckResponse, 'title' | 'summary' | 'spokenWarning' | 'flags'>, lang: Lang): number {
  return userFacingText(res).reduce((n, t) => n + findCertainty(t, lang).length, 0);
}

// Kakwe speaks with a female voice. These are male speaker forms; ผม also means "hair", so this is detect only.
const MALE_FORMS: Partial<Record<Lang, RegExp>> = {
  my: /ကျွန်တော်|ခင်ဗျာ|ခင်ဗျ/g,
  th: /ครับ|ผม/g,
};

export const genderCounters = { gender_form_hit: 0 };

// Promises of actions Kakwe cannot take (send, call, contact, report, follow up). Detect only.
const PROMISES: Record<Lang, RegExp> = {
  en: /\b(?:we|i)(?:'ll| will| are going to| am going to) (?:send|call|contact|message|text|report|follow up|notify|get back|reach out)/gi,
  id: /\b(?:kami|saya) akan (?:mengirim|kirim|menelepon|menghubungi|melaporkan|mengabari)/gi,
  tl: /\b(?:ipapadala|tatawagan|kokontakin|ire-report|ipapaalam) (?:namin|ko)\b/gi,
  my: /(?:ပို့ပေးပါမယ်|ပေးပို့ပေးပါမယ်|ဖုန်းဆက်ပေးပါမယ်|ဆက်သွယ်ပေးပါမယ်|သတင်းပို့ပေးပါမယ်|တိုင်ကြားပေးပါမယ်|ပို့ပေးပါ့မယ်|ဆက်သွယ်ပေးပါ့မယ်)/g,
  th: /(?:เรา|ดิฉัน|ฉัน|ทางเรา)จะ(?:ส่ง|โทร|ติดต่อ|แจ้ง|รายงาน)/g,
};

export const promiseCounters = { promise_hit: 0 };

/** Promises of actions Kakwe cannot take, in any language. Detect only, never rewritten. */
export function findPromises(text: string): string[] {
  return (Object.values(PROMISES) as RegExp[]).flatMap((re) => [...text.matchAll(new RegExp(re.source, re.flags))].map((m) => m[0]));
}

/** Male speaker forms in text the female voice speaks. Detect only, never rewritten. */
export function findMaleForms(text: string, lang: Lang): string[] {
  const re = MALE_FORMS[lang];
  return re ? [...text.matchAll(new RegExp(re.source, re.flags))].map((m) => m[0]) : [];
}

/** Male forms in any language, for spoken text whose language is not fixed. */
export function findMaleFormsAny(text: string): string[] {
  return (Object.keys(MALE_FORMS) as Lang[]).flatMap((l) => findMaleForms(text, l));
}

export function countMaleForms(res: Pick<CheckResponse, 'title' | 'summary' | 'spokenWarning' | 'flags'>, lang: Lang): number {
  return userFacingText(res).reduce((n, t) => n + findMaleForms(t, lang).length, 0);
}
