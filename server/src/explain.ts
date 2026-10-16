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

export function countryOf(destination: string | undefined): string | undefined {
  const d = destination?.toLowerCase();
  return d ? COUNTRIES.find((c) => c.aliases.some((a) => d.includes(a)))?.code : undefined;
}

let hotlineSource: () => Hotline[] = () => HOTLINES;

/** Points hotline lookups at the published list. The bundled list stays the default. */
export function setHotlineSource(source: () => Hotline[]): void {
  hotlineSource = source;
}

export function hotlineFor(destination: string | undefined, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const country = countryOf(destination);
  const pick = (category: HotlineCategory) => hotlineSource().find((h) => h.country === country && h.category === category && h.dial);
  const hit = country ? (pick('trafficking') ?? pick('police')) : undefined;
  return hit?.dial ?? (env.DEFAULT_HOTLINE || undefined);
}

export function titleFor(verdict: Verdict, lang: Lang): string {
  return TITLES[verdict][lang];
}

export function withWebRiskNote(summary: string, links: LinkCheck[], lang: Lang): string {
  const hit = links.some((l) => l.webRisk !== 'clean' && l.webRisk !== 'unknown');
  return hit ? `${summary} ${WEB_RISK_NOTE[lang]}`.trim() : summary;
}

export function buildActions(verdict: Verdict, scamType: ScamType, lang: Lang, destination?: string): Action[] {
  if (verdict === 'safe') return [{ label: LABELS.learn[lang], type: 'learn', value: 'scam_basics' }];
  const actions: Action[] = [];
  const hotline = hotlineFor(destination);
  if (verdict === 'danger' || scamType === 'job_trafficking') {
    actions.push(hotline ? { label: LABELS.call[lang], type: 'call', value: hotline } : { label: LABELS.call[lang], type: 'call' });
  }
  actions.push({ label: LABELS.block[lang], type: 'block' });
  actions.push({ label: LABELS.share[lang], type: 'share' });
  actions.push({ label: LABELS.learn[lang], type: 'learn', value: scamType });
  return actions;
}
