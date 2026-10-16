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
  { re: /\bverified jobs?\b/gi, sub: 'job offer' },
  { re: /\bscams? confirmed\b/gi, sub: 'scam reported' },
  { re: /\bno risks? (?:detected|found)\b/gi, sub: 'few warning signs detected' },
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
  { re: /\bpekerjaan terverifikasi\b/gi, sub: 'tawaran pekerjaan' },
  { re: /\bpenipuan terkonfirmasi\b/gi, sub: 'laporan penipuan' },
  { re: /\btidak ada risiko terdeteksi\b/gi, sub: 'sedikit tanda peringatan terdeteksi' },
];

const TL: Rule[] = [
  { re: /\bay (?:isang )?(scam|panloloko|bitag|peke|pekeng)\b/gi, sub: (_m, n) => `ay mukhang ${n}` },
  { re: /\b(?:ay|ang) (?:isang )?(?:manloloko|kriminal|scammer|trafficker)\b/gi, sub: 'ay maaaring may kaugnayan sa mga ulat ng scam' },
  { re: /\b(?:siguradong|tiyak na|tiyak|sigurado)\b/gi, sub: 'posibleng' },
  { re: /\bwalang duda\b/gi, sub: 'posible' },
  { re: /\bkumpirmado\b/gi, sub: 'iniulat' },
  { re: /\b100\s?%\s*(?:sigurado|scam|peke|ligtas)/gi, sub: 'posibleng' },
  { re: /\bberipikadong trabaho\b/gi, sub: 'alok na trabaho' },
  { re: /\bkumpirmadong scam\b/gi, sub: 'iniulat na scam' },
  { re: /\bwalang natukoy na panganib\b/gi, sub: 'kakaunting babala ang natukoy' },
];

const SCAM_NOUN = '(လိမ်လည်မှု|လိမ်ညာမှု|လှည့်စားမှု|ထောင်ချောက်|လူကုန်ကူးမှု)';
const MY: Rule[] = [
  { re: new RegExp(`${SCAM_NOUN}\\s*(?:ဖြစ်ပါသည်|ဖြစ်သည်|ဖြစ်ပါတယ်)`, 'g'), sub: (_m, n) => `${n} ဖြစ်နိုင်ပါသည်` },
  { re: /(ကျိန်းသေ|မလွဲဧကန်)/g },
  { re: /(၁၀၀\s*(?:%|ရာခိုင်နှုန်း)|100\s?%)/g },
  { re: /(အတည်ပြုပြီး|အတည်ပြုထားသည်)/g, sub: 'ဖော်ပြထားပြီး' },
  { re: /(လိမ်စားသူ|ရာဇဝတ်ကောင်|လူကုန်ကူးသူ)\s*(?:ဖြစ်ပါသည်|ဖြစ်သည်)/g },
  { re: /(အတည်ပြုပြီးသောအလုပ်)/g, sub: 'ဖော်ပြထားသောအလုပ်' },
  { re: /(လိမ်လည်မှုအတည်ပြုပြီး)/g, sub: 'လိမ်လည်မှုဖော်ပြထားပြီး' },
  { re: /(အန္တရာယ်မတွေ့ရှိပါ)/g, sub: 'သတိပေးချက်အနည်းငယ်သာတွေ့ရှိပါသည်' },
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
  { re: new RegExp(`${TH_NOT}งานได้รับการยืนยัน`, 'g'), sub: 'ข้อเสนองาน' },
  { re: new RegExp(`${TH_NOT}ยืนยันการหลอกลวง`, 'g'), sub: 'มีรายงานการหลอกลวง' },
  { re: new RegExp(`${TH_NOT}ไม่พบความเสี่ยง`, 'g'), sub: 'พบสัญญาณเตือนน้อย' },
];

const RULES: Record<Lang, Rule[]> = { en: EN, id: ID, tl: TL, my: MY, th: TH };

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
}

export function guardExtraction(x: Extraction, lang: Lang): { extraction: Extraction; stats: GuardStats } {
  const stats: GuardStats = { before: 0, rewrites: 0 };
  const fix = (t: string) => {
    const r = rewriteCertainty(t, lang);
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
    const r = rewriteCertainty(t, lang);
    stats.before += r.hits;
    if (r.text !== t) stats.rewrites++;
    return r.text;
  };
  return { flags: flags.map((f) => ({ ...f, label: fix(f.label), evidence: fix(f.evidence) })), stats };
}

export const isHeavy = (hits: number) => hits >= 3;

export function userFacingText(res: Pick<CheckResponse, 'title' | 'summary' | 'spokenWarning' | 'flags'>): string[] {
  return [res.title, res.summary, res.spokenWarning, ...res.flags.map((f) => f.label)];
}

export function countCertainty(res: Pick<CheckResponse, 'title' | 'summary' | 'spokenWarning' | 'flags'>, lang: Lang): number {
  return userFacingText(res).reduce((n, t) => n + findCertainty(t, lang).length, 0);
}
