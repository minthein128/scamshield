import { ApiError } from './errors';
import { JOB_MOCK_COPY, type JobMockCopy } from './mockJobCopy';
import type {
  AttentionTier,
  FactField,
  Flag,
  FlagFamily,
  JobAssessRequest,
  JobAssessResponse,
  JobConflict,
  JobExtractRequest,
  JobExtractResponse,
  JobFacts,
  JobFactKey,
  SalaryValue,
  Severity,
  Verdict,
} from './types';
import { hasJobInput } from './validate';

const KEYS: JobFactKey[] = ['employer', 'jobTitle', 'workplace', 'destinationCountry', 'salary', 'workerFee', 'contract', 'visaOrPermit', 'travelArrangedBy', 'route', 'meetingPoint', 'documentRequest', 'paymentRequest', 'urgency', 'contactChannel', 'secrecyRequest'];

const BURMESE_DIGITS = '၀၁၂၃၄၅၆၇၈၉';
const asciiDigits = (s: string) => s.replace(/[၀-၉]/g, d => String(BURMESE_DIGITS.indexOf(d)));

interface Hit {
  quote: string;
  match: RegExpExecArray;
}

const BOUNDARY = /(?<!\b(?:Co|Ltd|Inc|Mr|Ms|St|No))[.!?။](?=\s|$)|\n/g;

function sentenceAround(text: string, index: number): string {
  let start = 0;
  let end = text.length;
  for (const m of text.matchAll(BOUNDARY)) {
    const at = (m.index ?? 0) + m[0].length;
    if (at <= index) start = at;
    else {
      end = at;
      break;
    }
  }
  return text.slice(start, end).trim();
}

/** First match of `pattern` with the sentence it sits in, taken word for word from the text. */
function find(text: string, pattern: RegExp): Hit | null {
  const flat = asciiDigits(text);
  const match = new RegExp(pattern.source, pattern.flags.replace('g', '')).exec(flat);
  if (!match) return null;
  const quote = sentenceAround(text, match.index);
  return { quote: quote.length > 160 ? text.slice(Math.max(match.index - 60, 0), match.index + 100).trim() : quote, match };
}

const field = <T>(value: T, hit: Hit, confidence = 0.9, extra: Partial<FactField<T>> = {}): FactField<T> => ({ value, quote: hit.quote, confidence, ...extra });

const COUNTRIES: [RegExp, string][] = [
  [/thailand|ထိုင်း/i, 'Thailand'],
  [/malaysia|မလေးရှား/i, 'Malaysia'],
  [/singapore|စင်ကာပူ/i, 'Singapore'],
  [/japan|ဂျပန်/i, 'Japan'],
  [/korea|ကိုရီးယား/i, 'South Korea'],
  [/cambodia|ကမ္ဘောဒီးယား/i, 'Cambodia'],
  [/taiwan/i, 'Taiwan'],
  [/dubai|uae|emirates/i, 'United Arab Emirates'],
];

const TITLES: [RegExp, string][] = [
  [/customer service|ဖောက်သည်ဝန်ဆောင်/i, 'Customer service'],
  [/online (chat|marketing)|အွန်လိုင်း/i, 'Online chat or marketing'],
  [/factory|စက်ရုံ/i, 'Factory worker'],
  [/cook|chef|restaurant|waiter|စားဖိုမှူး/i, 'Restaurant staff'],
  [/housekeep|cleaner|maid/i, 'Housekeeping'],
  [/construction|builder/i, 'Construction'],
  [/caregiver|nanny/i, 'Caregiver'],
  [/data entry/i, 'Data entry'],
];

function salaryOf(text: string): FactField<SalaryValue> | null {
  const hit = find(text, /(?:(?:usd|thb|myr|sgd)\s?|\$\s?)(\d[\d,. ]*\d|\d)|(\d[\d,. ]*\d|\d)\s?(usd|thb|baht|myr|sgd|dollars?|\$|ks|kyat|ကျပ်|ဒေါ်လာ|ဘတ်)/i);
  if (!hit || /deposit|fee|booking|ကြိုတင်|စရံ|စရန်/i.test(hit.quote)) return null;
  const m = hit.match;
  const raw = (m[1] ?? m[2]).replace(/[ ,]/g, '');
  const unit = (m[3] ?? m[0].slice(0, 3)).toLowerCase();
  const currency = /usd|\$|dollar|ဒေါ်လာ/.test(unit) ? 'USD' : /baht|thb|ဘတ်/.test(unit) ? 'THB' : /myr/.test(unit) ? 'MYR' : /sgd/.test(unit) ? 'SGD' : /ks|kyat|ကျပ်/.test(unit) ? 'MMK' : unit.toUpperCase();
  const around = hit.quote.toLowerCase();
  const period = /day|daily|တစ်ရက်/.test(around) ? 'daily' : /week/.test(around) ? 'weekly' : /hour/.test(around) ? 'hourly' : /year|annual/.test(around) ? 'yearly' : 'monthly';
  return field({ amount: Number(raw), currency, period }, hit, /month|day|hour|year|လ|ရက်|လစာ/.test(around) ? 0.9 : 0.6);
}

function feeOf(text: string, source: 'ad' | 'chat'): FactField<string> | null {
  const none = find(text, /no (agency |recruitment |placement )?fees?\b|free (placement|of charge)|without (any )?fees?|ကြေးမလို|အခမဲ့/i);
  if (none && source === 'ad') return field('none', none);
  const ask = find(text, /(?:pay|send|transfer|deposit|booking fee|processing fee|registration fee)[^.!?\n]{0,60}(?:\d|fee|deposit)|(?:\d[\d,. ]*\s?(?:usd|thb|baht|ks|\$|ကျပ်|ဒေါ်လာ))[^.!?\n]{0,40}(?:fee|deposit|booking|ကြိုတင်)|ကြိုတင်ကြေး|စရံ|စရန်ငွေ/i);
  if (ask && !(none && /no |free|without/i.test(none.quote) && source === 'chat')) {
    const sum = /(\d[\d,. ]*\d|\d)\s?(usd|thb|baht|myr|sgd|\$|ks|ကျပ်|ဒေါ်လာ)/i.exec(asciiDigits(ask.quote));
    return field(sum ? `${sum[1].replace(/\s/g, '')} ${sum[2].toUpperCase()}` : ask.quote.slice(0, 60), ask, 0.85);
  }
  return none ? field('none', none) : null;
}

function extractOne(raw: string | undefined, source: 'ad' | 'chat'): JobFacts {
  const text = raw?.trim() ?? '';
  const out = Object.fromEntries(KEYS.map(k => [k, null])) as unknown as Record<JobFactKey, FactField<unknown> | null>;
  if (!text) return out as unknown as JobFacts;

  const employer = find(text, /\b([A-Z][\w&.-]*(?:\s[A-Z][\w&.-]*){0,3}\s(?:Co\.?,?\s?Ltd\.?|Ltd\.?|Company|Limited|Group|Logistics|Agency|Factory|Hotel|Restaurant))/);
  if (employer) out.employer = field(employer.match[1], employer);
  const title = TITLES.map(([re, value]) => ({ value, hit: find(text, re) })).find(x => x.hit);
  if (title?.hit) out.jobTitle = field(title.value, title.hit);
  const country = COUNTRIES.map(([re, value]) => ({ value, hit: find(text, re) })).find(x => x.hit);
  if (country?.hit) out.destinationCountry = field(country.value, country.hit);
  const place = find(text, /\b(Bangkok|Chiang Mai|Phuket|Kuala Lumpur|Johor|Penang|Mae Sot|Myawaddy|Tachileik|Poipet|Singapore|Seoul|Tokyo)\b|ဘန်ကောက်|မဲဆောက်|မြဝတီ/i);
  const refused = find(text, /address[^.!?\n]{0,30}(later|soon|not (shared|given))|(location|address) (will be|is) (shared|given|sent) (later|after)|လိပ်စာ[^.!?\n]{0,20}(နောက်မှ|ပြီးမှ)/i);
  if (refused) out.workplace = field('', refused, 0.5, { refused: true });
  else if (place) out.workplace = field(place.match[0], place, /Mae Sot|Myawaddy|Tachileik|Poipet|မဲဆောက်|မြဝတီ/i.test(place.match[0]) ? 0.6 : 0.9);
  out.salary = salaryOf(text);
  out.workerFee = feeOf(text, source);

  const later = find(text, /contract[^.!?\n]{0,30}(later|after|on arrival|upon arrival)|(sign|get)[^.!?\n]{0,20}contract[^.!?\n]{0,20}(after|on arrival|upon arrival)|စာချုပ်[^.!?\n]{0,20}(နောက်မှ|ရောက်မှ|ရောက်ပြီး)/i);
  const official = find(text, /official (employment )?contract|written (employment )?contract|contract provided|တရားဝင်စာချုပ်/i);
  if (later) out.contract = field('later', later);
  else if (official) out.contract = field('official', official);

  const tourist = find(text, /tourist|visa[- ]free|no visa|ခရီးသွားဗီဇာ|ဗီဇာမလို/i);
  const work = find(text, /work (visa|permit)|non-?b|visa (is )?(provided|sponsored)|အလုပ်ဗီဇာ/i);
  if (tourist) out.visaOrPermit = field('tourist', tourist);
  else if (work) out.visaOrPermit = field('work_visa', work);

  const driver = find(text, /driver|pick ?up|ယာဉ်မောင်း/i);
  const border = find(text, /border|နယ်စပ်/i);
  const airport = find(text, /airport|လေဆိပ်/i);
  const office = find(text, /(meet|office|located|address)[^.!?\n]{0,40}(office|road|street|building)|our office/i);
  if (driver && source === 'chat') out.meetingPoint = field('driver_pickup', driver);
  else if (border) out.meetingPoint = field('border', border);
  else if (airport) out.meetingPoint = field('airport', airport);
  else if (office) out.meetingPoint = field('workplace', office, 0.8);
  const travel = find(text, /(company|we|agency|employer)[^.!?\n]{0,25}(arrange|book|provide|pay for)[^.!?\n]{0,25}(flight|ticket|travel|transport)|free (flight|airfare|ticket)/i);
  if (travel) out.travelArrangedBy = field(/free|company|employer/i.test(travel.quote) ? 'The company' : 'The recruiter', travel, 0.8);
  const route = find(text, /(?:via|through|cross(?:ing)?|van to|go to)\s+([A-Z][a-z]+(?: [A-Z][a-z]+)?)/);
  if (route) out.route = field(route.match[1], route, 0.75);

  const hold = find(text, /(keep|hold|retain|safekeep)[^.!?\n]{0,30}passport|passport[^.!?\n]{0,30}(kept|held|with us)|ပတ်စပို့[^.!?\n]{0,30}(ကိုင်ထား|သိမ်း)/i);
  const photo = find(text, /(send|share|photo|picture|copy)[^.!?\n]{0,25}passport|passport[^.!?\n]{0,15}(photo|picture|copy)|ပတ်စပို့[^.!?\n]{0,20}(ဓာတ်ပုံ|ပို့)/i);
  const idCopy = find(text, /\b(id card|nrc|national id)\b[^.!?\n]{0,20}(copy|photo)|(copy|photo)[^.!?\n]{0,15}\b(id card|nrc)\b/i);
  if (hold) out.documentRequest = field('passport_hold', hold);
  else if (photo) out.documentRequest = field('passport_photo', photo);
  else if (idCopy) out.documentRequest = field('id_copy', idCopy, 0.8);

  const personal = find(text, /gcash|kbz ?pay|wave ?pay|usdt|crypto|personal (bank )?account|my account/i);
  const before = find(text, /(pay|deposit|send money)[^.!?\n]{0,40}(before|first|to reserve)|booking fee|ကြိုတင်ကြေး|စရံ/i);
  if (personal) out.paymentRequest = field('personal_account', personal, 0.85);
  else if (before && source === 'chat') out.paymentRequest = field('before_contract', before, 0.85);

  const urgency = find(text, /urgent|today only|within \d+ (hours|days)|(this|next) week|limited (slots|seats)|အရေးပေါ်|ယနေ့/i);
  if (urgency) out.urgency = field(urgency.match[0], urgency, 0.85);

  const app = find(text, /telegram|whatsapp|viber|wechat|line id|messenger|ဗိုက်ဘာ/i);
  const mail = find(text, /[\w.+-]+@[\w-]+\.[\w.-]+/);
  const phone = find(text, /\+?\d[\d -]{8,}\d/);
  if (app) out.contactChannel = field('personal_chat_app', app);
  else if (mail) out.contactChannel = field(/gmail|yahoo|hotmail|outlook/i.test(mail.match[0]) ? 'personal_chat_app' : 'company_channel', mail, 0.7);
  else if (phone) out.contactChannel = field('phone', phone, 0.8);

  const secret = find(text, /(do not|don't|dont|never) (tell|inform|share)|keep (it|this) (secret|private|quiet)|secret|မပြောပါနှင့်|မပြောနဲ့|လျှို့ဝှက်/i);
  if (secret) out.secrecyRequest = field(true, secret, 0.9);

  return out as unknown as JobFacts;
}

export function mockExtractJob(request: JobExtractRequest): JobExtractResponse {
  if (!hasJobInput(request.ad) && !hasJobInput(request.chat)) throw new ApiError('bad_request', 'Nothing to read');
  const imageOnly = (s?: JobExtractRequest['ad']) => Boolean(s?.imageBase64 && !s.text?.trim());
  return {
    jobId: `job_mock_${Math.random().toString(36).slice(2, 12)}`,
    ad: hasJobInput(request.ad) ? (imageOnly(request.ad) ? extractOne(undefined, 'ad') : extractOne(request.ad?.text, 'ad')) : null,
    chat: hasJobInput(request.chat) ? (imageOnly(request.chat) ? extractOne(undefined, 'chat') : extractOne(request.chat?.text, 'chat')) : null,
  };
}

const norm = (s: string) => s.toLowerCase().replace(/\b(co|ltd|limited|company|inc|group)\b\.?/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const asNumber = (s: SalaryValue) => Number(s.amount ?? 0);
const perMonth = (s: SalaryValue) => asNumber(s) * ({ hourly: 160, daily: 26, weekly: 4.3, monthly: 1, yearly: 1 / 12 }[s.period] ?? 1);
const RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2 };

interface Found {
  field: JobFactKey;
  code?: string;
  family: FlagFamily;
  severity: Severity;
  text: string;
  ad?: FactField<unknown>;
  chat?: FactField<unknown>;
}

const show = (f: FactField<unknown> | undefined) => (f ? (typeof f.value === 'string' ? f.value : f.value && typeof f.value === 'object' ? `${(f.value as SalaryValue).amount ?? ''} ${(f.value as SalaryValue).currency}`.trim() : String(f.value)) : '');

function conflictsOf(ad: JobFacts | null | undefined, chat: JobFacts | null | undefined, c: JobMockCopy): Found[] {
  const found: Found[] = [];
  if (!ad || !chat) return found;
  if (ad.workerFee?.value === 'none' && chat.workerFee && chat.workerFee.value !== 'none') found.push({ field: 'workerFee', code: 'fee_vs_no_fee', family: 'payment_route', severity: 'high', text: c.fee, ad: ad.workerFee, chat: chat.workerFee });
  const docs = chat.documentRequest?.value;
  if ((docs === 'passport_photo' || docs === 'passport_hold') && (!ad.documentRequest || ad.documentRequest.value === 'none' || ad.documentRequest.value === 'not_mentioned'))
    found.push({ field: 'documentRequest', code: docs === 'passport_hold' ? 'documents_passport_hold' : 'documents_passport_photo', family: 'trafficking', severity: 'high', text: c.documents, ad: ad.documentRequest ?? undefined, chat: chat.documentRequest ?? undefined });
  if (ad.contract?.value === 'official' && chat.contract?.value === 'later') found.push({ field: 'contract', code: 'contract_later', family: 'payment_route', severity: 'high', text: c.contract, ad: ad.contract, chat: chat.contract });
  if (ad.visaOrPermit?.value === 'work_visa' && chat.visaOrPermit?.value === 'tourist') found.push({ field: 'visaOrPermit', code: 'visa_tourist', family: 'trafficking', severity: 'high', text: c.visa, ad: ad.visaOrPermit, chat: chat.visaOrPermit });
  if (ad.meetingPoint?.value === 'workplace' && chat.meetingPoint && ['driver_pickup', 'border', 'unnamed'].includes(chat.meetingPoint.value)) found.push({ field: 'meetingPoint', code: 'meeting_informal', family: 'trafficking', severity: 'medium', text: c.meeting, ad: ad.meetingPoint, chat: chat.meetingPoint });
  if (ad.employer && chat.employer && norm(ad.employer.value) !== norm(chat.employer.value) && !norm(ad.employer.value).includes(norm(chat.employer.value)) && !norm(chat.employer.value).includes(norm(ad.employer.value)))
    found.push({ field: 'employer', code: 'employer_different', family: 'identity', severity: 'medium', text: c.employer, ad: ad.employer, chat: chat.employer });
  if (ad.salary && chat.salary && ad.salary.value.currency === chat.salary.value.currency) {
    const a = perMonth(ad.salary.value);
    const b = perMonth(chat.salary.value);
    if (a > 0 && b > 0 && Math.abs(a - b) / a > 0.3) found.push({ field: 'salary', code: 'salary_different', family: 'too_good', severity: 'low', text: c.salary, ad: ad.salary, chat: chat.salary });
  }
  return found;
}

function singleSignals(chat: JobFacts | null | undefined, c: JobMockCopy): Found[] {
  if (!chat) return [];
  const out: Found[] = [];
  if (chat.documentRequest?.value === 'passport_hold') out.push({ field: 'documentRequest', family: 'trafficking', severity: 'high', text: c.passportHold, chat: chat.documentRequest });
  if (chat.documentRequest?.value === 'passport_photo') out.push({ field: 'documentRequest', family: 'trafficking', severity: 'medium', text: c.passportPhoto, chat: chat.documentRequest });
  if (chat.secrecyRequest?.value === true) out.push({ field: 'secrecyRequest', family: 'pressure', severity: 'medium', text: c.secrecy, chat: chat.secrecyRequest });
  if (chat.paymentRequest?.value === 'before_contract') out.push({ field: 'paymentRequest', family: 'payment_route', severity: 'high', text: c.payBefore, chat: chat.paymentRequest });
  return out;
}

const WEIGHT: Record<Severity, number> = { high: 40, medium: 22, low: 10 };

const STRONG = new Set(['fee_vs_no_fee', 'documents_passport_photo', 'documents_passport_hold', 'contract_later', 'contract_pay_first', 'visa_tourist']);

function tierOf(all: Found[]): { tier: AttentionTier; score: number } {
  const byFamily = new Map<FlagFamily, Severity>();
  for (const f of all) if (!byFamily.has(f.family) || RANK[f.severity] > RANK[byFamily.get(f.family) as Severity]) byFamily.set(f.family, f.severity);
  let score = 8 + [...byFamily.values()].reduce((sum, s) => sum + WEIGHT[s], 0);
  if (byFamily.get('trafficking') === 'high') score = Math.max(score, 82);
  if (all.some(f => f.code && STRONG.has(f.code))) score = Math.max(score, 70);
  score = Math.min(score, 98);
  return { tier: score >= 70 ? 'pause' : score >= 35 ? 'verify' : 'lower', score };
}

const VERDICT: Record<AttentionTier, Verdict> = { lower: 'safe', verify: 'careful', pause: 'danger' };

export function mockAssessJob(request: JobAssessRequest): JobAssessResponse {
  const c = JOB_MOCK_COPY[request.language] ?? JOB_MOCK_COPY.en;
  const { ad, chat } = request.facts;
  const conflicts = conflictsOf(ad, chat, c);
  const taken = new Set(conflicts.map(f => f.field));
  const all = [...conflicts, ...singleSignals(chat, c).filter(f => !taken.has(f.field))];
  const { tier, score } = tierOf(all);
  const seen = new Set<string>();
  const flags: Flag[] = all
    .filter(f => !seen.has(`${f.field}${f.text}`) && seen.add(`${f.field}${f.text}`))
    .map(f => ({ family: f.family, label: f.text, severity: f.severity, evidence: (f.chat ?? f.ad)?.quote ?? '' }));
  const conflictList: JobConflict[] = conflicts.map(f => ({
    field: f.field,
    ...(f.code ? { code: f.code } : {}),
    fieldLabel: c.fieldLabels[f.field as keyof JobMockCopy['fieldLabels']] ?? f.field,
    adValue: f.ad ? show(f.ad) : 'not_mentioned',
    adQuote: f.ad?.quote ?? '',
    chatValue: show(f.chat),
    chatQuote: f.chat?.quote ?? '',
    description: f.text,
    family: f.family,
    severity: f.severity,
  }));
  const important: (keyof JobMockCopy['unclear'])[] = ['workplace', 'employer', 'contract', 'workerFee', 'visaOrPermit'];
  const stillUnclear = important.filter(k => !ad?.[k] && !chat?.[k]).map(k => c.unclear[k]);
  const summary = c.summary[tier];
  return {
    id: `chk_mock_job${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    kind: 'job',
    verdict: VERDICT[tier],
    score,
    attention: tier,
    attentionHeadline: summary,
    title: summary,
    summary,
    spokenWarning: summary,
    scamType: tier === 'lower' ? 'none' : 'job_trafficking',
    flags,
    linkChecks: [],
    sources: [],
    actions: [{ label: 'Call hotline', type: 'call' }, { label: 'Share this warning', type: 'share' }],
    model: 'mock-job-v1',
    conflicts: conflictList,
    stillUnclear,
    findings: (ad?.employer || chat?.employer ? [{ code: 'company_not_checked', label: c.findings.notChecked }, { code: 'recruiter_not_confirmed', label: c.findings.recruiter }] : []),
    adFacts: ad ?? null,
    chatFacts: chat ?? null,
  };
}
