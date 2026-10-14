import type { Extraction, Family, Kind, Lang, ScamType, Severity, Verdict } from '../types.js';
import type { Intel } from './service.js';
import type { Prepared } from './signal.js';

/**
 * Synthetic, clearly fictional reports for the demo. Every name carries "Demo", every number uses
 * a 000 block and every domain uses the reserved .example TLD. The text goes through the real
 * redaction and signal path. Names and companies are replaced by placeholders here, standing in
 * for the model pass. Phones, handles, accounts, links and amounts stay raw so the deterministic
 * pass has to remove them.
 */

interface Scenario {
  id: string;
  scamType: ScamType;
  kind: Kind;
  campaign: string;
  count: number;
  trend: 'rising' | 'falling' | 'flat';
  homes: string[];
  dests: string[];
  lang: 'en' | 'id' | 'tl' | 'my';
  texts: string[];
  flags: Array<[Family, Severity]>;
  verdict: Verdict;
  score: [number, number];
  phones: string[];
  handles: string[];
  accounts: string[];
  domains: string[];
  hotAges?: number[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'maesot-job',
    scamType: 'job_trafficking',
    kind: 'job',
    campaign: 'Mae Sot data-entry job',
    count: 34,
    trend: 'rising',
    homes: ['MM'],
    dests: ['TH'],
    lang: 'en',
    texts: [
      'Hello {name}, {recruiter} from {company}. Urgent hiring for data entry and customer service staff in Mae Sot, Thailand. Salary {amount} per month, no experience, no degree. Free flight and housing. Send a passport photo today, a car picks you up at the border, no visa needed. Do not tell your family. Contact {phone} or Telegram {handle}',
      'Hi {name}, {company} is hiring data entry staff near Mae Sot, Thailand. Pay {amount} a month with a bonus, no experience needed. We arrange free transport and a room. Send your passport copy today, a car will meet you at the border. Keep this private. WhatsApp {phone}, Telegram {handle}',
    ],
    flags: [
      ['too_good', 'high'],
      ['trafficking', 'high'],
      ['pressure', 'medium'],
      ['identity', 'medium'],
    ],
    verdict: 'danger',
    score: [82, 96],
    phones: ['+66 90 000 0101', '090-000-0102', '+95 9 400 000 103'],
    handles: ['@demo_hr_goldenbridge', '@demo_maesot_jobs'],
    accounts: [],
    domains: ['goldenbridge-hiring.example'],
    hotAges: [0, 1, 2, 3, 4, 6, 7, 9, 11, 13, 16, 19, 22, 26],
  },
  {
    id: 'maesot-job-my',
    scamType: 'job_trafficking',
    kind: 'job',
    campaign: 'Mae Sot data-entry job',
    count: 8,
    trend: 'rising',
    homes: ['MM'],
    dests: ['TH'],
    lang: 'my',
    texts: [
      'ထိုင်းနိုင်ငံ မဲဆောက်ရှိ ကုမ္ပဏီအတွက် Data Entry ဝန်ထမ်းများ အရေးပေါ် ခေါ်ယူနေပါသည်။ လစာ ဒေါ်လာ ၁၅၀၀၊ အတွေ့အကြုံ မလို။ လေယာဉ်လက်မှတ်နှင့် အိပ်စရာ အခမဲ့။ ပတ်စပို့ ဓာတ်ပုံကို ယနေ့ပို့ပါ၊ နယ်စပ်တွင် ကားဖြင့် လာကြိုမည်။ မိသားစုကို မပြောပါနှင့်။ ဆက်သွယ်ရန် {phone} သို့မဟုတ် Telegram {handle}',
    ],
    flags: [
      ['too_good', 'high'],
      ['trafficking', 'high'],
      ['pressure', 'medium'],
    ],
    verdict: 'danger',
    score: [80, 94],
    phones: ['+95 9 400 000 103', '09 400 000 104'],
    handles: ['@demo_maesot_jobs'],
    accounts: [],
    domains: [],
  },
  {
    id: 'poipet-job',
    scamType: 'job_trafficking',
    kind: 'job',
    campaign: 'Poipet online customer-service job',
    count: 18,
    trend: 'flat',
    homes: ['MM', 'TH'],
    dests: ['KH'],
    lang: 'en',
    texts: [
      'We need online customer service agents in Poipet, Cambodia. Salary {amount}, accommodation and meals free. No work permit needed, we handle the border crossing. Reply today with your passport number {passport} and your name {name}. Seats are limited. Line ID: {handle}',
      '{company} is recruiting chat agents for our office in Poipet. Earn {amount} monthly, no experience. We keep your passport safe during the process. Contact {recruiter} on {phone}',
    ],
    flags: [
      ['too_good', 'high'],
      ['trafficking', 'high'],
      ['identity', 'medium'],
    ],
    verdict: 'danger',
    score: [78, 92],
    phones: ['+855 90 000 201', '+855 90 000 202'],
    handles: ['demo_poipet_hr', 'demo_poipet_line'],
    accounts: [],
    domains: ['poipet-staff.example'],
  },
  {
    id: 'romance-crypto',
    scamType: 'romance_pig_butchering',
    kind: 'message',
    campaign: 'Wrong-number romance then crypto platform',
    count: 26,
    trend: 'rising',
    homes: ['PH', 'ID', 'TH'],
    dests: [],
    lang: 'en',
    texts: [
      'Hi {name}, sorry, wrong number? You seem very kind. I am {recruiter}, I trade crypto and my uncle taught me a platform with 30% weekly profit. Join with a small deposit, I will guide you. Download at {domain} and message me on WhatsApp {phone}',
      'Hello {name}, is this still your number? I just moved to your city. I make steady profit on a trading app, the withdrawal is guaranteed. Deposit {amount} to start. Link {domain}, Telegram {handle}',
    ],
    flags: [
      ['identity', 'medium'],
      ['too_good', 'high'],
      ['payment_route', 'medium'],
      ['link_risk', 'medium'],
    ],
    verdict: 'danger',
    score: [70, 88],
    phones: ['+63 900 000 0301', '0900 000 0302', '+62 811 000 0303'],
    handles: ['@demo_lovely_trader'],
    accounts: [],
    domains: ['coinwave-invest.example', 'bullmarket-pro.example'],
  },
  {
    id: 'jnt-parcel',
    scamType: 'parcel_phishing',
    kind: 'message',
    campaign: 'Courier parcel fee link',
    count: 24,
    trend: 'rising',
    homes: ['ID'],
    dests: [],
    lang: 'id',
    texts: [
      'Yth {name}, paket Anda tertahan. Mohon bayar biaya pengiriman {amount} sebelum 24 jam melalui {domain} atau paket dikembalikan. Info: {phone}',
      'Halo {name}, paket J&T Anda gagal dikirim karena alamat tidak lengkap. Konfirmasi dan bayar ongkir {amount} di {domain}. Batas waktu hari ini.',
    ],
    flags: [
      ['pressure', 'medium'],
      ['link_risk', 'high'],
      ['identity', 'medium'],
      ['payment_route', 'medium'],
    ],
    verdict: 'danger',
    score: [70, 86],
    phones: ['0812 000 0401', '+62 812 000 0402'],
    handles: [],
    accounts: ['1234000401'],
    domains: ['jnt-paket-bayar.example', 'cek-resi-jnt.example'],
  },
  {
    id: 'thaipost-customs',
    scamType: 'parcel_phishing',
    kind: 'message',
    campaign: 'Customs fee parcel SMS',
    count: 14,
    trend: 'flat',
    homes: ['TH'],
    dests: [],
    lang: 'en',
    texts: [
      'Dear {name}, your parcel is held at customs. Pay a release fee of {amount} within 24 hours at {domain} or it will be returned. Call {phone}',
      'Thailand Post notice for {name}: delivery failed. Confirm your address and pay {amount} at {domain}. Last chance today.',
    ],
    flags: [
      ['pressure', 'medium'],
      ['link_risk', 'high'],
      ['identity', 'medium'],
    ],
    verdict: 'careful',
    score: [48, 69],
    phones: ['02-000-0501', '+66 2 000 0502'],
    handles: [],
    accounts: [],
    domains: ['thpost-customs-fee.example'],
  },
  {
    id: 'task-scam',
    scamType: 'investment',
    kind: 'message',
    campaign: 'Like-and-rate task top-up scam',
    count: 20,
    trend: 'falling',
    homes: ['PH', 'TH'],
    dests: [],
    lang: 'tl',
    texts: [
      'Kumusta {name}! Part-time job po: mag-like ng videos at kumita ng {amount} bawat araw. Para ma-withdraw ang kita, mag-top up muna ng {amount} sa account {account}. Mag-message sa Telegram {handle}',
      'Hi {name}, kumita ng extra sa pag-rate ng products. Kailangan mag-deposit para ma-unlock ang task, GCash {phone}. Limitado ang slots, ngayon lang.',
    ],
    flags: [
      ['too_good', 'high'],
      ['payment_route', 'high'],
      ['pressure', 'medium'],
    ],
    verdict: 'danger',
    score: [72, 90],
    phones: ['0900 000 0601', '+63 900 000 0602'],
    handles: ['@demo_task_manager', '@demo_rate_jobs'],
    accounts: ['9000000601'],
    domains: [],
  },
  {
    id: 'dmw-agency',
    scamType: 'fake_agency',
    kind: 'agency',
    campaign: 'Unlicensed overseas placement agency',
    count: 18,
    trend: 'flat',
    homes: ['PH'],
    dests: ['AE', 'SA'],
    lang: 'tl',
    texts: [
      'Magandang araw {name}. {company} ay may bakante sa Dubai, sahod {amount}. Placement fee {amount} ang kailangan bayaran ngayon sa BDO account {account}. Walang DMW license pero sigurado ang alis. Contact {recruiter} sa {phone}',
      'Hiring ng domestic helper sa Saudi, direct hire. Mag-deposit ng {amount} sa account {account} para sa slot. Brgy. Demo, Quezon City office. Viber {phone}',
    ],
    flags: [
      ['payment_route', 'high'],
      ['identity', 'medium'],
      ['too_good', 'medium'],
    ],
    verdict: 'danger',
    score: [66, 84],
    phones: ['0900 000 0701', '+63 900 000 0702'],
    handles: [],
    accounts: ['9000000701', '9000000702'],
    domains: ['dubaijobs-ph.example'],
  },
  {
    id: 'overpay-buyer',
    scamType: 'marketplace_fraud',
    kind: 'message',
    campaign: 'Fake payment proof from buyer',
    count: 12,
    trend: 'flat',
    homes: ['ID', 'PH'],
    dests: [],
    lang: 'id',
    texts: [
      'Halo kak {name}, saya sudah transfer {amount} tapi kelebihan. Ini bukti transfer di {domain}. Tolong kirim barang dulu dan kembalikan kelebihan ke rekening {account}. WA {phone}',
    ],
    flags: [
      ['payment_route', 'high'],
      ['pressure', 'medium'],
      ['link_risk', 'medium'],
    ],
    verdict: 'danger',
    score: [68, 84],
    phones: ['0813 000 0801'],
    handles: [],
    accounts: ['3330000801'],
    domains: ['bukti-transfer-bank.example'],
  },
  {
    id: 'signals-group',
    scamType: 'investment',
    kind: 'message',
    campaign: 'Guaranteed-return trading signals group',
    count: 12,
    trend: 'falling',
    homes: ['ID'],
    dests: [],
    lang: 'id',
    texts: [
      'Selamat {name}, Anda diundang ke grup sinyal saham VIP. Profit pasti 5% per hari, modal minimal {amount}. Daftar di {domain}, admin {handle}, hubungi {phone}',
    ],
    flags: [
      ['too_good', 'high'],
      ['link_risk', 'medium'],
      ['pressure', 'low'],
    ],
    verdict: 'careful',
    score: [52, 72],
    phones: ['0857 000 0901'],
    handles: ['@demo_vip_signal'],
    accounts: [],
    domains: ['vipsignal-saham.example'],
  },
  {
    id: 'bank-otp',
    scamType: 'other',
    kind: 'message',
    campaign: 'Bank impersonation OTP call',
    count: 14,
    trend: 'flat',
    homes: ['TH'],
    dests: [],
    lang: 'en',
    texts: [
      'Your bank account is suspended. Verify now at {domain} and give the OTP sent to {phone}. Contact the bank officer {recruiter} on {phone2}. National ID {id}.',
    ],
    flags: [
      ['identity', 'high'],
      ['pressure', 'high'],
      ['link_risk', 'medium'],
    ],
    verdict: 'danger',
    score: [70, 88],
    phones: ['02-000-1001'],
    handles: [],
    accounts: [],
    domains: ['secure-kbank-verify.example'],
  },
];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Somchai', 'Aung', 'Siti', 'Budi', 'Maria', 'Juan', 'Nang', 'Kyaw', 'Dewi', 'Ana'];
const AMOUNTS: Record<Scenario['lang'], string[]> = {
  en: ['USD 1,500', 'USD 1,800', '60,000 THB', '$2000', 'THB 45,000', '5,000 baht'],
  id: ['Rp 150.000', 'Rp 2.500.000', 'IDR 350000', 'Rp 99.000'],
  tl: ['PHP 1,500', '₱3,000', '5,000 pesos', 'PHP 800'],
  my: ['ဒေါ်လာ ၁၅၀၀', '၁၅၀၀ ဒေါ်လာ'],
};

export interface SeedCheck {
  when: Date;
  prepareInput: { kind: Kind; language: string; home?: string; destination?: string };
  extraction: Extraction;
  score: number;
  verdict: Verdict;
  scamType: ScamType;
  fictional: string[];
}

export function generateSeedChecks(now: Date, seed = 20261018): SeedCheck[] {
  const rand = rng(seed);
  const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)] as T;
  const out: SeedCheck[] = [];
  for (const sc of SCENARIOS) {
    for (let i = 0; i < sc.count; i++) {
      const hot = i < (sc.hotAges?.length ?? 0);
      const u = rand();
      const age = hot
        ? (sc.hotAges?.[i] ?? 0)
        : Math.min(89, Math.floor(89 * (sc.trend === 'rising' ? u ** 2.2 : sc.trend === 'falling' ? 1 - u ** 2.2 : u)));
      const fictional: string[] = [];
      const name = `${pick(FIRST)} Demo`;
      const recruiter = `${pick(FIRST)} Demo`;
      const company = `${pick(['Golden', 'Sunrise', 'Blue', 'Star'])} ${pick(['Bridge', 'Overseas', 'Staff', 'Link'])} Demo Co.`;
      const phone = hot ? (sc.phones[0] as string) : rand() < 0.7 ? (sc.phones[0] as string) : pick(sc.phones);
      const phone2 = pick(sc.phones);
      const handle = sc.handles.length ? pick(sc.handles) : '@demo_handle_000';
      const account = sc.accounts.length ? pick(sc.accounts) : '9000000999';
      const domain = sc.domains.length ? pick(sc.domains) : 'demo-link.example';
      const amount = pick(AMOUNTS[sc.lang]);
      const passport = `AD${String(1000000 + Math.floor(rand() * 8999999))}`;
      const nid = `3${String(100000000000 + Math.floor(rand() * 899999999999))}`;
      const fill: Record<string, string> = { name, recruiter, company, phone, phone2, handle, account, domain, amount, passport, id: nid };
      const base = pick(sc.texts);
      const template = base.replace(/\{(\w+)\}/g, (_, k: string) => {
        if (k === 'name') return '[VICTIM_NAME]';
        if (k === 'recruiter') return '[PERSON]';
        if (k === 'company') return '[COMPANY]';
        return fill[k] ?? '';
      });
      fictional.push(name, recruiter, company, phone, phone2, account, passport, nid);
      if (sc.texts.some((t) => t.includes(`{handle}`)) || sc.handles.length) fictional.push(handle.replace(/^@/, ''));
      const when = new Date(now.getTime() - age * 86_400_000);
      const home = sc.homes.length ? pick(sc.homes) : undefined;
      const dest = sc.dests.length ? pick(sc.dests) : undefined;
      const sender = {
        phones: [phone],
        handles: sc.handles.length && base.includes('{handle}') ? [handle] : [],
        accounts: base.includes('{account}') ? [account] : [],
      };
      const urlsList = base.includes('{domain}') ? [`https://${domain}/x`] : [];
      out.push({
        when,
        prepareInput: { kind: sc.kind, language: sc.lang, home, destination: dest },
        extraction: {
          entities: { companies: [], phones: [], domains: [], ...(dest ? { country: dest } : {}) },
          flags: sc.flags.map(([family, severity]) => ({ family, severity, label: family, evidence: '' })),
          scamType: sc.scamType,
          verdictDraft: sc.verdict,
          unsolicited: true,
          summary: '',
          spokenWarning: '',
          urls: urlsList,
          template,
          templateSafe: true,
          campaign: sc.campaign,
          inputLanguage: sc.lang,
          sender,
        },
        score: sc.score[0] + Math.floor(rand() * (sc.score[1] - sc.score[0] + 1)),
        verdict: sc.verdict,
        scamType: sc.scamType,
        fictional,
      });
    }
  }
  return out.sort((a, b) => a.when.getTime() - b.when.getTime());
}

export interface SeedResult {
  recorded: number;
  duplicate: number;
  skipped: number;
  fictional: string[];
}

/** Push synthetic checks through prepare() and record() with seed: true. */
export async function runSeed(intel: Intel, now = new Date(), onProgress?: (n: number) => void): Promise<SeedResult> {
  const checks = generateSeedChecks(now);
  const res: SeedResult = { recorded: 0, duplicate: 0, skipped: 0, fictional: [] };
  let n = 0;
  for (const c of checks) {
    const p: Prepared = intel.prepare(
      {
        kind: c.prepareInput.kind,
        language: c.prepareInput.language as Lang,
        context: { destination: c.prepareInput.destination, home: c.prepareInput.home },
      },
      c.extraction,
    );
    const r = await intel.record(
      p,
      { verdict: c.verdict, score: c.score, scamType: c.scamType, flags: c.extraction.flags },
      { now: c.when, seed: true },
    );
    res[r]++;
    res.fictional.push(...c.fictional);
    onProgress?.(++n);
  }
  return res;
}
