import { COUNTRIES, HOTLINES, type HotlineCategory } from './data/hotlines.generated.js';
import type { Action, Lang, LinkCheck, ScamType, Verdict } from './types.js';

const TITLES: Record<Verdict, Record<Lang, string>> = {
  danger: {
    en: 'High risk: do not continue',
    id: 'Risiko tinggi: jangan lanjutkan',
    tl: 'Mataas na panganib: huwag ituloy',
    my: 'အန္တရာယ်မြင့်မားသည်: ဆက်မလုပ်ပါနှင့်',
  },
  careful: {
    en: 'Be careful: verify first',
    id: 'Hati-hati: periksa dulu',
    tl: 'Mag-ingat: i-verify muna',
    my: 'သတိထားပါ: အရင်စစ်ဆေးပါ',
  },
  safe: {
    en: 'No major warning signs found',
    id: 'Tidak ada tanda bahaya besar',
    tl: 'Walang malaking babala',
    my: 'အရေးကြီးသော သတိပေးချက် မတွေ့ပါ',
  },
};

const WEB_RISK_NOTE: Record<Lang, string> = {
  en: 'Google Web Risk lists a link in this message as dangerous.',
  id: 'Google Web Risk menandai tautan dalam pesan ini sebagai berbahaya.',
  tl: 'Itinuturing ng Google Web Risk na mapanganib ang isang link sa mensaheng ito.',
  my: 'ဤစာထဲရှိ လင့်ခ်တစ်ခုကို Google Web Risk က အန္တရာယ်ရှိသည်ဟု သတ်မှတ်ထားသည်။',
};

const LABELS: Record<'call' | 'share' | 'block' | 'learn', Record<Lang, string>> = {
  call: { en: 'Call hotline', id: 'Hubungi hotline', tl: 'Tawagan ang hotline', my: 'ဟော့လိုင်း ခေါ်ဆိုရန်' },
  share: {
    en: 'Warn family or friends',
    id: 'Peringatkan keluarga atau teman',
    tl: 'Balaan ang pamilya o kaibigan',
    my: 'မိသားစု သို့မဟုတ် သူငယ်ချင်းကို သတိပေးရန်',
  },
  block: {
    en: 'Block and report the sender',
    id: 'Blokir dan laporkan pengirim',
    tl: 'I-block at i-report ang nagpadala',
    my: 'ပို့သူကို ပိတ်ပင်ပြီး တိုင်ကြားရန်',
  },
  learn: {
    en: 'Learn how this scam works',
    id: 'Pelajari cara penipuan ini',
    tl: 'Alamin kung paano gumagana ang scam',
    my: 'ဤလိမ်လည်မှု လုပ်ပုံကို လေ့လာရန်',
  },
};

export function countryOf(destination: string | undefined): string | undefined {
  const d = destination?.toLowerCase();
  return d ? COUNTRIES.find((c) => c.aliases.some((a) => d.includes(a)))?.code : undefined;
}

export function hotlineFor(destination: string | undefined, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const country = countryOf(destination);
  const pick = (category: HotlineCategory) => HOTLINES.find((h) => h.country === country && h.category === category && h.dial);
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
