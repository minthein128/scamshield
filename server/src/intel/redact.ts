export type Placeholder =
  | '[EMAIL]'
  | '[LINK]'
  | '[HANDLE]'
  | '[IBAN]'
  | '[ID_NUMBER]'
  | '[CARD]'
  | '[PHONE]'
  | '[ACCOUNT]'
  | '[ADDRESS]'
  | '[PASSPORT]'
  | '[AMOUNT]'
  | '[DOB]'
  | '[PERSON]'
  | '[NUMBER]';

export interface Span {
  start: number;
  end: number;
  placeholder: Placeholder;
}

export interface Redacted {
  text: string;
  spans: Span[];
}

interface Candidate extends Span {
  priority: number;
}

const DIGIT_BASES = [0x1040, 0x0e50, 0x0660, 0x06f0];

/** Map Burmese, Thai and Arabic-Indic digits to ASCII, keeping string length. */
export function foldDigits(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    const base = DIGIT_BASES.find((b) => c >= b && c <= b + 9);
    out += base === undefined ? ch : String(c - base);
  }
  return out;
}

export const luhn = (digits: string): boolean => {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
};

export const thaiIdValid = (digits: string): boolean => {
  if (!/^\d{13}$/.test(digits) || digits[0] === '0') return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(digits[12]);
};

export const nikValid = (digits: string): boolean => {
  if (!/^\d{16}$/.test(digits)) return false;
  const prov = Number(digits.slice(0, 2));
  const day = Number(digits.slice(6, 8));
  const month = Number(digits.slice(8, 10));
  const dayOk = (day >= 1 && day <= 31) || (day >= 41 && day <= 71);
  return prov >= 11 && prov <= 96 && dayOk && month >= 1 && month <= 12;
};

export const ibanValid = (raw: string): boolean => {
  const s = raw.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of v) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1;
};

const digitsOf = (s: string) => s.replace(/\D/g, '');

interface Rule {
  priority: number;
  re: RegExp;
  placeholder: Placeholder | ((m: string, g: RegExpExecArray) => Placeholder | null);
  /** Capture group index to replace instead of the whole match. */
  group?: number;
  /** Run on the digit-folded text. */
  folded?: boolean;
}

const CC = '66|95|62|63|855|856|84|60|65|91|86|81|82';
const ACCOUNT_CTX =
  'acc(?:oun)?t(?:\\s*(?:no|number|num|#))?|a\\/c|bank|rekening|rek\\.?|no\\.?\\s*rek|norek|akaun|kuenta|gcash|maya|dana|ovo|gopay|shopeepay|kbz\\s?pay|wave\\s?(?:pay|money)|aya\\s?pay|promptpay|truemoney|bca|bri|bni|mandiri|bdo|bpi|metrobank|unionbank|scb|kasikorn|kbank|krungthai|bangkok bank|cimb|maybank|ဘဏ်|အကောင့်|บัญชี|ธนาคาร';
const PASSPORT_CTX = 'passport|pasaporte|paspor|ပတ်စပို့|နိုင်ငံကူးလက်မှတ်|หนังสือเดินทาง';
const NAME_TITLE = 'Mr|Mrs|Ms|Miss|Mdm|Dr|Daw|U|Ko|Ma|Maung|Pak|Bu|Ibu|Bapak|Mas|Mbak|Kuya|Ate|Tita|Tito|Khun|Nang|Nai|Sir|Madam';
const NOT_NAMES = 'There|Sir|Madam|All|Team|Customer|Friend|Everyone|Sis|Bro|Valued|User|Sister|Brother';
const STREET_WORD = 'Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Soi|Blvd|Boulevard|Drive|Dr|Highway|Hwy|Jalan|Calle';

const RULES: Rule[] = [
  { priority: 1, re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, placeholder: '[EMAIL]' },
  {
    priority: 1,
    re: /[A-Za-z0-9._%+-]+\s?[[(]\s?(?:at|AT)\s?[\])]\s?[A-Za-z0-9-]+(?:\s?[[(]\s?(?:dot|DOT)\s?[\])]\s?[A-Za-z0-9-]+)+/g,
    placeholder: '[EMAIL]',
  },
  {
    priority: 2,
    re: /\b(?:t\.me|telegram\.me|wa\.me|api\.whatsapp\.com\/send\?phone=|line\.me\/ti\/p|line\.me\/R\/ti\/p|m\.me|ig\.me|zalo\.me|(?:www\.)?(?:instagram|facebook|fb|tiktok)\.com)\/[^\s<>"')\]]+/gi,
    placeholder: '[HANDLE]',
  },
  {
    priority: 3,
    re: /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+|\b[a-z0-9][a-z0-9-]{0,62}(?:\.[a-z0-9-]{1,63})*\.(?:com|net|org|info|xyz|top|club|online|site|shop|store|vip|app|link|click|cc|co|me|io|id|ph|th|kh|mm|asia|biz|live|work|icu|example|test)\b(?:\/[^\s<>"')\]]*)?/gi,
    placeholder: '[LINK]',
  },
  {
    priority: 4,
    re: /(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?: ?[A-Z0-9]{3,4}){3,8}(?![A-Za-z0-9])/g,
    placeholder: (m) => (ibanLike(m) ? '[IBAN]' : null),
  },
  {
    priority: 5,
    folded: true,
    re: /(?<!\d)\d{1,2}\s?\/\s?[A-Za-zက-႟]{3,15}\s?[(（]\s?[A-Za-zက-႟]{1,8}\s?[)）]\s?\d{6}(?!\d)/g,
    placeholder: '[ID_NUMBER]',
  },
  {
    priority: 6,
    folded: true,
    re: /(?<!\d)\d(?:[ -]?\d){11,18}(?!\d)/g,
    placeholder: (m) => {
      const d = digitsOf(m);
      if (thaiIdValid(d) || nikValid(d)) return '[ID_NUMBER]';
      if (luhn(d)) return '[CARD]';
      return null;
    },
  },
  {
    priority: 6,
    folded: true,
    re: /(?<!\d)(?:\d{4}[ -]\d{4}[ -]\d{4}(?:[ -]\d{4})?|\d{3}-\d{3}-\d{3}(?:-\d{3,5})?|\d{2}-\d{7}-\d)(?!\d)/g,
    placeholder: '[ID_NUMBER]',
  },
  {
    priority: 7,
    folded: true,
    re: new RegExp(
      `(?<![\\w])(?:(?:\\+|00)\\s?(?:${CC})[\\s.\\-()]*\\d(?:[\\s.\\-()]*\\d){6,11}|(?:628\\d{8,11}|639\\d{9}|66[689]\\d{8}|959\\d{7,9}|8[4-9]\\d{8,9}))(?!\\d)`,
      'g',
    ),
    placeholder: (m) => (phoneDigits(m) ? '[PHONE]' : null),
  },
  {
    priority: 7,
    folded: true,
    re: /(?<![\d+\w])\(0\d{1,3}\)[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?!\d)/g,
    placeholder: '[PHONE]',
  },
  {
    priority: 7,
    folded: true,
    re: /(?<![\d+\w])0\d(?:[\s.\-()]?\d){7,10}(?!\d)/g,
    placeholder: (m) => (phoneDigits(m) ? '[PHONE]' : null),
  },
  {
    priority: 8,
    folded: true,
    re: new RegExp(`(?:${ACCOUNT_CTX})[^\\d\\n]{0,40}?(\\d(?:[ -]?\\d){5,17})(?!\\d)`, 'gi'),
    group: 1,
    placeholder: '[ACCOUNT]',
  },
  {
    priority: 9,
    re: new RegExp(
      `\\b(?:No\\.?\\s*)?\\d{1,5}[A-Za-z]?(?:[/-]\\d{1,4})?,?\\s+(?:(?:[A-Z][\\w.'-]*|\\d+)\\s+){0,3}?(?:${STREET_WORD})\\b\\.?(?:,?\\s+[A-Z][\\w.'-]+(?:\\s+[A-Z][\\w.'-]+){0,2})?`,
      'g',
    ),
    placeholder: '[ADDRESS]',
  },
  {
    priority: 9,
    re: /\b\d{1,5}(?:\/\d{1,4})?\s+Moo\s*\d{1,2}(?:,?\s*(?:Tambon|Tumbon|Amphoe|Soi|Road)\s+[A-Z][\w-]+)*/g,
    placeholder: '[ADDRESS]',
  },
  {
    priority: 9,
    re: /\bJl(?:n)?\.?\s+[A-Za-z0-9.'\- ]{2,40}?(?:\s+(?:No|Nomor|Blok|Gg|RT|RW)\.?\s*[\w/.-]+)+/g,
    placeholder: '[ADDRESS]',
  },
  {
    priority: 9,
    folded: true,
    re: /\d{1,5}(?:\/\d{1,4})?\s+(?:หมู่|ม\.)\s?\d{1,2}(?:\s+(?:ตำบล|ต\.|อำเภอ|อ\.|จังหวัด|จ\.|ซอย|ถนน)\s?[\u0E00-\u0E7F]+)*/g,
    placeholder: '[ADDRESS]',
  },
  { priority: 9, re: /\bRT\.?\s*\d{1,3}\s*\/\s*RW\.?\s*\d{1,3}\b/gi, placeholder: '[ADDRESS]' },
  {
    priority: 9,
    re: /\b(?:Brgy\.?|Barangay)\s+[A-Z][\w.]*(?:\s+[A-Z][\w.]*){0,2}(?:,\s*[A-Z][\w.]*(?:\s+[A-Z][\w.]*){0,2}){0,2}/g,
    placeholder: '[ADDRESS]',
  },
  {
    priority: 9,
    folded: true,
    re: /အမှတ်\s*[\d/\-A-Za-z]+[^\n,]{0,40}?(?:လမ်း|ရပ်ကွက်|မြို့နယ်|ကျေးရွာ)(?:\s?[က-႟]{2,15})?/g,
    placeholder: '[ADDRESS]',
  },
  {
    priority: 10,
    re: new RegExp(`(?:${PASSPORT_CTX})[^\\nA-Z\\d]{0,20}([A-Z]{0,2}\\d{6,9}[A-Z]?)`, 'gi'),
    group: 1,
    folded: true,
    placeholder: '[PASSPORT]',
  },
  { priority: 10, re: /(?<![A-Za-z0-9])(?:[A-Z]{1,2}\d{7}|[A-Z]\d{7}[A-Z])(?![A-Za-z0-9])/g, placeholder: '[PASSPORT]' },
  {
    priority: 11,
    re: /(?:\b(?:line|wechat|telegram|tele|tg|wa|whatsapp|viber|zalo|kakao|kakaotalk|signal|instagram|insta|ig|fb|facebook|tiktok)\s*(?:id|me|us|account)?\s*(?:is)?\s*[:：@-]\s*)@?([A-Za-z0-9_.-]{3,32})/gi,
    group: 1,
    placeholder: (m) => (/[\d_.]/.test(m) || m.length >= 5 ? '[HANDLE]' : null),
  },
  { priority: 11, re: /(?<![\w@.])@[A-Za-z0-9_]{3,32}\b/g, placeholder: '[HANDLE]' },
  {
    priority: 12,
    folded: true,
    re: /(?:USD|US\$|\$|THB|฿|Rp\.?|IDR|PHP|₱|MMK|Ks\.?|RM|SGD|VND|₫|KHR|៛)\s?\d[\d.,]*(?:\s?(?:k|K|million|juta|ribu|rb|lakh|ล้าน|သိန်း|သောင်း))?|(?:ဒေါ်လာ|ဘတ်|ကျပ်|ดอลลาร์|บาท)\s?\d[\d.,]*|\d[\d.,]*\s?(?:USD|THB|baht|dollars?|ringgit|rupiah|pesos?|piso|kyat|ks|MMK|PHP|IDR|ကျပ်|ဘတ်|ဒေါ်လာ|ดอลลาร์|บาท|riel)/gi,
    placeholder: '[AMOUNT]',
  },
  {
    priority: 12,
    folded: true,
    re: /(?:dob|date of birth|born|tanggal lahir|tgl lahir|ttl|kapanganakan|မွေးနေ့|เกิด)[^\n\d]{0,8}(\d{1,2}[/.\- ]\d{1,2}[/.\- ]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/gi,
    group: 1,
    placeholder: '[DOB]',
  },
  {
    priority: 13,
    re: new RegExp(`(?<![\\p{L}\\p{N}])(?:${NAME_TITLE})(?![\\p{L}\\p{N}])\\.?\\s+\\p{Lu}\\p{Ll}+(?:\\s+\\p{Lu}\\p{Ll}+){0,2}`, 'gu'),
    placeholder: '[PERSON]',
  },
  {
    priority: 13,
    re: new RegExp(
      `\\b(?:Dear|Hi|Hello|Hey|Halo|Hai|Kepada|Yth\\.?)\\s+(?!(?:${NOT_NAMES})\\b)\\p{Lu}\\p{Ll}+(?:\\s+\\p{Lu}\\p{Ll}+)?`,
      'gu',
    ),
    placeholder: '[PERSON]',
  },
  {
    priority: 13,
    re: /(?:[Mm]y [Nn]ame is|[Nn]ama saya|[Nn]ama aku|[Aa]ko si|[Aa]ko po si|[Aa]ng pangalan ko ay|[Ii] am called)\s+(\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+){0,2})/gu,
    group: 1,
    placeholder: '[PERSON]',
  },
  {
    priority: 13,
    re: /(?:\b[Nn]ame|\b[Nn]ama|\b[Pp]angalan|အမည်|နာမည်|ชื่อ)\s*[:：-]\s*([^\n,;]{2,40})/gu,
    group: 1,
    placeholder: '[PERSON]',
  },
  {
    priority: 13,
    re: /(?:ဦး(?![က-႟]*ခေါင်း)|ဒေါ်(?!လာ)|မောင်)\s?[က-အ][က-႟]{1,15}(?:\s[က-အ][က-႟]{1,15})?/g,
    placeholder: '[PERSON]',
  },
  {
    priority: 14,
    folded: true,
    re: /(?<!\d)\d(?:[ .-]?\d){6,}(?!\d)/g,
    placeholder: (m) => (/^\d{1,3}(?:\.\d{3})+$/.test(m) ? null : '[NUMBER]'),
  },
];

function ibanLike(m: string): boolean {
  const s = m.replace(/\s/g, '');
  return s.length >= 15 && s.length <= 34 && (s.match(/\d/g)?.length ?? 0) >= 6;
}

function phoneDigits(m: string): boolean {
  const n = digitsOf(m).length;
  return n >= 9 && n <= 15;
}

function collect(text: string): Candidate[] {
  const folded = foldDigits(text);
  const out: Candidate[] = [];
  for (const rule of RULES) {
    const src = rule.folded ? folded : text;
    const re = new RegExp(rule.re.source, rule.re.flags.includes('d') ? rule.re.flags : `${rule.re.flags}d`);
    for (const m of src.matchAll(re)) {
      const idx = m.indices;
      const range = rule.group ? idx?.[rule.group] : idx?.[0];
      if (!range) continue;
      const matched = src.slice(range[0], range[1]);
      const ph = typeof rule.placeholder === 'function' ? rule.placeholder(matched, m as RegExpExecArray) : rule.placeholder;
      if (!ph) continue;
      out.push({ start: range[0], end: range[1], placeholder: ph, priority: rule.priority });
    }
  }
  return out;
}

/** Deterministic pass: replace structured personal data with typed placeholders. */
export function redactDeterministic(text: string): Redacted {
  const cands = collect(text).sort((a, b) => a.priority - b.priority || b.end - b.start - (a.end - a.start) || a.start - b.start);
  const taken: Span[] = [];
  for (const c of cands) {
    if (taken.some((t) => c.start < t.end && c.end > t.start)) continue;
    taken.push({ start: c.start, end: c.end, placeholder: c.placeholder });
  }
  taken.sort((a, b) => a.start - b.start);
  let out = '';
  let pos = 0;
  for (const s of taken) {
    out += text.slice(pos, s.start) + s.placeholder;
    pos = s.end;
  }
  out += text.slice(pos);
  return { text: out.replace(/[ \t]{2,}/g, ' ').trim(), spans: taken };
}

/** Residual patterns that must never survive into a persisted string. */
export const LEAK_PATTERNS: RegExp[] = [/@[A-Za-z0-9_]{3,}/, /https?:\/\//i, /\d{6,}/, /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[a-z]{2,}/i];

export function hasResidualPii(s: string): boolean {
  const f = foldDigits(s);
  return LEAK_PATTERNS.some((p) => p.test(f));
}
