import type { SalaryPeriod, SalaryValue } from './types.js';

/** Burmese ၀-၉ and Thai ๐-๙ digits to ASCII. */
export function asciiDigits(text: string): string {
  return text.replace(/[၀-၉]/g, (d) => String(d.charCodeAt(0) - 0x1040)).replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - 0x0e50));
}

const MULTIPLIERS: Array<[RegExp, number]> = [
  [/^\s*(?:k|K)\b/, 1_000],
  [/^\s*(?:thousand|ribu|rb|libo|พัน)/i, 1_000],
  [/^\s*(?:သောင်း|หมื่น)/, 10_000],
  [/^\s*(?:သိန်း|lakhs?|แสน)/i, 100_000],
  [/^\s*(?:million|juta|jt|milyon|ล้าน)/i, 1_000_000],
];

function toNumber(raw: string): number {
  const groups = /^\d{1,3}(?:([.,\s])\d{3})+$/.exec(raw);
  if (groups) return Number(raw.replace(/[.,\s]/g, ''));
  const mixed = /^(\d{1,3}(?:,\d{3})+)\.(\d+)$/.exec(raw) ?? /^(\d{1,3}(?:\.\d{3})+),(\d+)$/.exec(raw);
  if (mixed) return Number(`${(mixed[1] ?? '').replace(/[.,]/g, '')}.${mixed[2]}`);
  return Number(raw.replace(',', '.'));
}

/** First money amount in a text, with thousand separators and k / lakh / หมื่น style multipliers. */
export function parseAmount(text: string | number | null | undefined): number | null {
  if (typeof text === 'number') return Number.isFinite(text) ? text : null;
  if (!text) return null;
  const s = asciiDigits(text);
  const m = /\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/.exec(s);
  if (!m) return null;
  let value = toNumber(m[0].trim());
  if (!Number.isFinite(value)) return null;
  const rest = s.slice(m.index + m[0].length);
  for (const [re, mult] of MULTIPLIERS) {
    if (re.test(rest)) {
      value *= mult;
      break;
    }
  }
  return value;
}

const NO_FEE_FULL =
  /^(?:none|none stated|no|nil|zero|free|gratis|libre|walang bayad|tanpa biaya|tidak ada biaya|bebas biaya|gratis biaya|ฟรี|ไม่มีค่าใช้จ่าย|ไม่มีค่าธรรมเนียม|ไม่เสียค่าใช้จ่าย|အခမဲ့|ကြေးမရှိ|ငွေမယူပါ|ငွေမယူ)$/i;
const NO_FEE_START =
  /^(?:no (?:(?:placement|agency|recruitment|service|processing|hidden) )?(?:fees?|charges?|costs?|deposits?|payment)\b|free (?:of charge|placement|recruitment)|zero (?:fees?|cost))/i;

export type FeeReading = 'none' | 'positive' | 'unknown';

/** Reads a workerFee value: an explicit "none", a positive amount, or neither. */
export function readFee(value: string | null | undefined): FeeReading {
  if (!value) return 'unknown';
  const v = value
    .trim()
    .toLowerCase()
    .replace(/[.!,;:]+$/, '');
  const amount = parseAmount(v);
  if (amount !== null && amount > 0) return 'positive';
  if (NO_FEE_FULL.test(v) || NO_FEE_START.test(v) || amount === 0) return 'none';
  return 'unknown';
}

const CURRENCIES: Array<[RegExp, string]> = [
  [/^(?:thb|baht|฿|บาท|ဘတ်)$/i, 'THB'],
  [/^(?:usd|us\$|\$|dollars?|ဒေါ်လာ|ดอลลาร์)$/i, 'USD'],
  [/^(?:mmk|kyats?|ks|ကျပ်)$/i, 'MMK'],
  [/^(?:idr|rp|rupiah)$/i, 'IDR'],
  [/^(?:php|₱|pesos?|piso)$/i, 'PHP'],
  [/^(?:myr|rm|ringgit)$/i, 'MYR'],
  [/^(?:sgd|s\$)$/i, 'SGD'],
  [/^(?:khr|riels?)$/i, 'KHR'],
  [/^(?:lak|kip)$/i, 'LAK'],
  [/^(?:krw|won|₩)$/i, 'KRW'],
  [/^(?:jpy|yen|¥|円)$/i, 'JPY'],
  [/^(?:twd|nt\$)$/i, 'TWD'],
  [/^(?:hkd|hk\$)$/i, 'HKD'],
  [/^(?:aed|dirhams?)$/i, 'AED'],
  [/^(?:sar|riyals?)$/i, 'SAR'],
];

export function normalizeCurrency(raw: string | null | undefined): string {
  const t = (raw ?? '').trim();
  return CURRENCIES.find(([re]) => re.test(t))?.[1] ?? t.toUpperCase();
}

/** Monthly amount for monthly or yearly salaries; other periods are compared only with themselves. */
function comparable(s: SalaryValue): { amount: number; currency: string; period: SalaryPeriod } | null {
  const amount = parseAmount(s.amount);
  if (amount === null || amount <= 0 || s.period === 'unknown') return null;
  const currency = normalizeCurrency(s.currency);
  if (!currency) return null;
  if (s.period === 'yearly') return { amount: amount / 12, currency, period: 'monthly' };
  return { amount, currency, period: s.period };
}

export const SALARY_TOLERANCE = 0.25;

/** True when both salaries are comparable and the chat differs from the ad by more than 25%. */
export function salaryDiffers(ad: SalaryValue, chat: SalaryValue): boolean {
  const a = comparable(ad);
  const c = comparable(chat);
  if (!a || !c || a.currency !== c.currency || a.period !== c.period) return false;
  return Math.abs(c.amount - a.amount) / a.amount > SALARY_TOLERANCE;
}

const COMPANY_WORDS = [
  'co',
  'ltd',
  'limited',
  'company',
  'companies',
  'corp',
  'corporation',
  'inc',
  'incorporated',
  'llc',
  'plc',
  'pte',
  'pt',
  'cv',
  'sdn',
  'bhd',
  'tbk',
  'group',
  'บริษัท',
  'จำกัด',
  'มหาชน',
  'หจก',
  'ကုမ္ပဏီ',
  'လီမိတက်',
  'လိမိတက်',
];
const COMPANY_RE = new RegExp(`(?:^|\\s)(?:${COMPANY_WORDS.join('|')})(?=\\s|$)`, 'giu');

/** Lowercase, no punctuation, no legal-form words such as Co., Ltd., Sdn Bhd, บริษัท, ကုမ္ပဏီ. */
export function normalizeEmployer(name: string): string {
  let s = name.normalize('NFC').replace(/บริษัท|จำกัด|\(มหาชน\)|ကုမ္ပဏီ|လီမိတက်/gu, ' ');
  s = s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, '');
  s = s.replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ');
  for (let i = 0; i < 3; i++) s = s.replace(COMPANY_RE, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0] ?? 0;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j] ?? 0;
      prev[j] = Math.min((prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length] ?? 0;
}

/** Same employer after normalising legal forms, allowing a short typo or a dropped trailing word. */
export function sameEmployer(a: string, b: string): boolean {
  const x = normalizeEmployer(a);
  const y = normalizeEmployer(b);
  if (!x || !y) return true;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  if (short.length >= 4 && (long.startsWith(`${short} `) || long.endsWith(` ${short}`))) return true;
  const allowed = Math.min(2, Math.floor(long.length / 6));
  return editDistance(x.replace(/\s/g, ''), y.replace(/\s/g, '')) <= allowed;
}

const BORDER_TOWNS = [
  'mae sot',
  'maesot',
  'myawaddy',
  'myawadi',
  'tachileik',
  'tachilek',
  'mae sai',
  'poipet',
  'shwe kokko',
  'kk park',
  'laukkaing',
  'golden triangle',
  "o'smach",
  'osmach',
  'မဲဆောက်',
  'မြဝတီ',
  'တာချီလိတ်',
  'ရွှေကုက္ကို',
  'လောက်ကိုင်',
  'แม่สอด',
  'เมียวดี',
  'ท่าขี้เหล็ก',
  'แม่สาย',
  'ปอยเปต',
  'สามเหลี่ยมทองคำ',
];

export function mentionsBorderTown(text?: string | null): boolean {
  if (!text) return false;
  const lower = text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u200b-\u200d]/g, '');
  return BORDER_TOWNS.some((town) => lower.includes(town));
}

/** Whitespace, zero-width and case-insensitive form used to check that a quote appears in its source. */
export function quoteKey(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function quoteInSource(quote: string, source: string): boolean {
  const q = quoteKey(quote);
  return q.length > 0 && quoteKey(source).includes(q);
}
