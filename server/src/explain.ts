import { COUNTRIES, HOTLINES, type Hotline, type HotlineCategory } from './data/hotlines.generated.js';
import type { Action, Lang, LinkCheck, ScamType, Verdict } from './types.js';

const TITLES: Record<Verdict, Record<Lang, string>> = {
  danger: {
    en: 'Many warning signs: please pause and check first',
    id: 'Banyak tanda bahaya: berhenti dulu dan periksa',
    tl: 'Maraming babala: huminto muna at mag-verify',
    my: 'သတိပေးလက္ခဏာ များစွာ တွေ့ရသည်: ခဏရပ်ပြီး စစ်ဆေးပါ',
    th: 'พบสัญญาณเตือนหลายอย่าง: โปรดหยุดและตรวจสอบก่อน',
  },
  careful: {
    en: 'Some warning signs: please verify first',
    id: 'Ada beberapa tanda bahaya: periksa dulu',
    tl: 'May ilang babala: i-verify muna',
    my: 'သတိပေးလက္ခဏာ အချို့ တွေ့ရသည်: အရင်စစ်ဆေးပါ',
    th: 'พบสัญญาณเตือนบางอย่าง: โปรดตรวจสอบก่อน',
  },
  safe: {
    en: 'We found no major warning signs',
    id: 'Kami tidak menemukan tanda bahaya besar',
    tl: 'Wala kaming nakitang malaking babala',
    my: 'အရေးကြီးသော သတိပေးချက် မတွေ့ရပါ',
    th: 'เราไม่พบสัญญาณเตือนสำคัญ',
  },
};

const WEB_RISK_NOTE: Record<Lang, string> = {
  en: 'Google Web Risk flags a link in this message as unsafe.',
  id: 'Google Web Risk menandai tautan dalam pesan ini sebagai tidak aman.',
  tl: 'Namarkahan ng Google Web Risk na hindi ligtas ang isang link sa mensaheng ito.',
  my: 'ဤစာထဲရှိ လင့်ခ်တစ်ခုကို Google Web Risk က မလုံခြုံဟု အမှတ်အသားပြုထားသည်။',
  th: 'Google Web Risk ทำเครื่องหมายว่าลิงก์หนึ่งในข้อความนี้ไม่ปลอดภัย',
};

const UNCHECKED_NOTE: Record<Lang, string> = {
  en: 'We could not check the link in this message against Google lists. It is not verified. Do not open it unless you trust the sender.',
  id: 'Kami tidak dapat memeriksa tautan dalam pesan ini dengan daftar Google. Tautan ini belum diverifikasi. Jangan buka kecuali Anda percaya pengirimnya.',
  tl: 'Hindi namin nasuri ang link sa mensaheng ito sa mga listahan ng Google. Hindi ito na-verify. Huwag itong buksan maliban kung pinagkakatiwalaan mo ang nagpadala.',
  my: 'ဤစာထဲရှိ လင့်ခ်ကို Google စာရင်းများနှင့် မစစ်ဆေးနိုင်ခဲ့ပါ။ အတည်မပြုရသေးပါ။ ပို့သူကို မယုံကြည်ပါက မဖွင့်ပါနှင့်။',
  th: 'เราตรวจสอบลิงก์ในข้อความนี้กับรายการของ Google ไม่ได้ จึงยังไม่ได้ยืนยัน อย่าเปิดหากไม่ไว้ใจผู้ส่ง',
};

const LABELS: Record<'call' | 'share' | 'block' | 'learn', Record<Lang, string>> = {
  call: { en: 'Call hotline', id: 'Hubungi hotline', tl: 'Tawagan ang hotline', my: 'ဟော့လိုင်း ခေါ်ဆိုရန်', th: 'โทรสายด่วน' },
  share: {
    en: 'Warn family or friends',
    id: 'Peringatkan keluarga atau teman',
    tl: 'Balaan ang pamilya o kaibigan',
    my: 'မိသားစု သို့မဟုတ် သူငယ်ချင်းကို သတိပေးရန်',
    th: 'เตือนครอบครัวหรือเพื่อน',
  },
  block: {
    en: 'Block and report this sender',
    id: 'Blokir dan laporkan pengirim',
    tl: 'I-block at i-report ang nagpadala',
    my: 'ပို့သူကို ပိတ်ပင်ပြီး တိုင်ကြားရန်',
    th: 'บล็อกและรายงานผู้ส่ง',
  },
  learn: {
    en: 'Learn how scams like this work',
    id: 'Pelajari cara kerja penipuan seperti ini',
    tl: 'Alamin kung paano gumagana ang mga scam na tulad nito',
    my: 'ဤကဲ့သို့သော လိမ်လည်မှုများ လုပ်ပုံကို လေ့လာရန်',
    th: 'เรียนรู้วิธีการทำงานของกลโกงแบบนี้',
  },
};

export function countryOf(place: string | undefined): string | undefined {
  const raw = place?.trim();
  if (!raw) return undefined;
  if (COUNTRIES.some((c) => c.code === raw.toUpperCase())) return raw.toUpperCase();
  const d = raw.toLowerCase();
  return COUNTRIES.find((c) => c.name.toLowerCase() === d || c.aliases.some((a) => d.includes(a)))?.code;
}

let hotlineSource: () => Hotline[] = () => HOTLINES;

/** Points hotline lookups at the published list. The bundled list stays the default. */
export function setHotlineSource(source: () => Hotline[]): void {
  hotlineSource = source;
}

const DIAL_PREFIX: Record<string, string> = { TH: '66', MM: '95', KH: '855', LA: '856', MY: '60', ID: '62', PH: '63', VN: '84' };

/** Country a dial string rings in: the international prefix, or the owner country for a local number. */
export function dialCountry(h: Pick<Hotline, 'country' | 'dial'>): string | undefined {
  const dial = h.dial ?? '';
  if (!dial.startsWith('+')) return h.country;
  const digits = dial.slice(1);
  return Object.entries(DIAL_PREFIX)
    .sort((a, b) => b[1].length - a[1].length)
    .find(([, p]) => digits.startsWith(p))?.[0];
}

const callableFrom = (h: Hotline, where: string | undefined) => !h.domesticOnly || h.dial?.startsWith('+') || where === h.country;

/** Destination trafficking or police line, else a home consular line there, else a home line. */
export function hotlineFor(destination: string | undefined, env: NodeJS.ProcessEnv = process.env, home?: string): string | undefined {
  const dest = countryOf(destination);
  const own = countryOf(home);
  const list = hotlineSource().filter((h) => h.dial);
  const first = (pred: (h: Hotline) => boolean) => list.find(pred);
  const of = (country: string | undefined, category: HotlineCategory) => (h: Hotline) => h.country === country && h.category === category;
  const where = dest ?? own;
  const homeOrder: HotlineCategory[] = ['trafficking', 'police', 'consular', 'cybercrime', 'ngo'];
  const hit =
    (dest && (first(of(dest, 'trafficking')) ?? first(of(dest, 'police')))) ||
    (dest && own && dest !== own && first((h) => h.country === own && h.category === 'consular' && dialCountry(h) === dest)) ||
    (own &&
      (homeOrder.map((c) => first((h) => of(own, c)(h) && callableFrom(h, where))).find(Boolean) ??
        homeOrder.map((c) => first(of(own, c))).find(Boolean))) ||
    undefined;
  return hit?.dial ?? (env.DEFAULT_HOTLINE || undefined);
}

export function titleFor(verdict: Verdict, lang: Lang): string {
  return TITLES[verdict][lang];
}

export function withWebRiskNote(summary: string, links: LinkCheck[], lang: Lang): string {
  const hit = links.some((l) => l.webRisk !== 'clean' && l.webRisk !== 'unknown');
  if (hit) return `${summary} ${WEB_RISK_NOTE[lang]}`.trim();
  const unchecked = links.some((l) => l.webRisk === 'unknown');
  return unchecked ? `${summary} ${UNCHECKED_NOTE[lang]}`.trim() : summary;
}

export function buildActions(verdict: Verdict, scamType: ScamType, lang: Lang, destination?: string, home?: string): Action[] {
  if (verdict === 'safe') return [{ label: LABELS.learn[lang], type: 'learn', value: 'scam_basics' }];
  const actions: Action[] = [];
  const hotline = hotlineFor(destination, process.env, home);
  if (verdict === 'danger' || scamType === 'job_trafficking') {
    actions.push(hotline ? { label: LABELS.call[lang], type: 'call', value: hotline } : { label: LABELS.call[lang], type: 'call' });
  }
  actions.push({ label: LABELS.block[lang], type: 'block' });
  actions.push({ label: LABELS.share[lang], type: 'share' });
  actions.push({ label: LABELS.learn[lang], type: 'learn', value: scamType });
  return actions;
}
