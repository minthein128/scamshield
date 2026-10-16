import { MOCK_COPY } from './mockCopy';
import { ApiError } from './errors';
import type {
  CheckAction,
  CheckClient,
  CheckRequest,
  CheckResponse,
  Flag,
  JobAssessRequest,
  JobConflict,
  JobExtractRequest,
  JobFacts,
  LinkCheck,
  ScamType,
  Verdict,
} from './types';
import { hasInput } from './validate';

export interface MockOptions {
  delayMs?: number;
}

interface Rule {
  family: Flag['family'];
  label: string;
  severity: Flag['severity'];
  pattern: RegExp;
  weight: number;
}

const RULES: Rule[] = [
  { family: 'too_good', label: 'Pay far above normal', severity: 'high', pattern: /high salary|\$\s?\d{3,}|gaji tinggi|mataas na sahod|per day|free flight|no experience/i, weight: 22 },
  { family: 'pressure', label: 'Pressure to act fast', severity: 'medium', pattern: /urgent|today only|limited slots|segera|hurry|act now|within 24/i, weight: 15 },
  { family: 'payment_route', label: 'Asks for upfront payment', severity: 'high', pattern: /processing fee|deposit|transfer|pay first|bayar dulu|gcash|crypto|usdt|bank transfer/i, weight: 28 },
  { family: 'identity', label: 'Contact only on private chat apps', severity: 'medium', pattern: /telegram|whatsapp|viber|dm us|wechat/i, weight: 16 },
  { family: 'trafficking', label: 'No visa or work permit mentioned', severity: 'high', pattern: /visa provided|free visa|tourist visa|thailand|cambodia|myanmar|laos|passport/i, weight: 24 },
  { family: 'known_bad', label: 'Matches a known scam script', severity: 'high', pattern: /data entry|customer service.*abroad|online chat staff|task commission/i, weight: 20 },
];

const URL_PATTERN = /https?:\/\/[^\s)]+/gi;
const BAD_LINK = /bit\.ly|tinyurl|\.top\b|\.xyz\b|\.click\b|-fee|parcel|track-|claim/i;

function pickScamType(request: CheckRequest, families: Set<string>): ScamType {
  if (families.has('trafficking') || (request.kind === 'job' && families.size > 1)) return 'job_trafficking';
  if (request.kind === 'shop') return 'marketplace_fraud';
  if (request.kind === 'agency') return 'fake_agency';
  if (request.kind === 'link' || /parcel|delivery|warehouse/i.test(request.text ?? '')) return 'parcel_phishing';
  if (/invest|profit|trading/i.test(request.text ?? '')) return 'investment';
  return families.size ? 'other' : 'none';
}

function verdictFromScore(score: number): Verdict {
  if (score >= 70) return 'danger';
  if (score >= 35) return 'careful';
  return 'safe';
}

function extractUrls(request: CheckRequest): string[] {
  const found = new Set<string>();
  if (request.url?.trim()) found.add(request.url.trim());
  for (const match of request.text?.match(URL_PATTERN) ?? []) found.add(match);
  return [...found];
}

function checkLink(url: string): LinkCheck {
  const bad = BAD_LINK.test(url);
  return bad
    ? { url, webRisk: 'social_engineering', domainAgeDays: 9, registrar: 'NameCheap, Inc.' }
    : { url, webRisk: 'clean', domainAgeDays: 2400 };
}

function snippet(text: string, pattern: RegExp): string {
  const match = pattern.exec(text);
  if (!match) return text.slice(0, 80);
  const before = text.slice(0, match.index).split(/\s+/).slice(-4).join(' ');
  const after = text.slice(match.index + match[0].length).split(/\s+/).slice(0, 4).join(' ');
  return `"${`${before} ${match[0]} ${after}`.trim()}"`;
}

export function buildMockResponse(request: CheckRequest, now: Date = new Date()): CheckResponse {
  const haystack = [request.text, request.url, request.context?.destination].filter(Boolean).join(' ');
  const flags: Flag[] = [];
  let score = 8;
  for (const rule of RULES) {
    if (rule.pattern.test(haystack)) {
      flags.push({ family: rule.family, label: rule.label, severity: rule.severity, evidence: snippet(haystack, rule.pattern) });
      score += rule.weight;
    }
  }
  const linkChecks = extractUrls(request).map(checkLink);
  for (const link of linkChecks) {
    if (link.webRisk !== 'clean') {
      flags.push({ family: 'link_risk', label: 'Link looks like a trap', severity: 'high', evidence: link.url });
      score += 30;
    }
  }
  if (!request.text?.trim() && !request.url?.trim() && request.imageBase64) {
    flags.push({ family: 'identity', label: 'Could not verify the sender from the screenshot', severity: 'low', evidence: 'Screenshot only, no readable contact details' });
    score = Math.max(score, 40);
  }
  score = Math.min(score, 98);
  const verdict = verdictFromScore(score);
  const copy = MOCK_COPY[request.language][verdict];
  const actions: CheckAction[] = [{ label: 'Share this warning', type: 'share' }];
  if (verdict !== 'safe') {
    actions.unshift({ label: 'Call hotline', type: 'call' });
    actions.push({ label: 'Block the sender', type: 'block' });
  }
  actions.push({ label: 'Learn how this scam works', type: 'learn' });

  return {
    id: `chk_mock_${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now.toISOString(),
    kind: request.kind,
    verdict,
    score,
    title: copy.title,
    summary: copy.summary,
    spokenWarning: copy.spoken,
    scamType: verdict === 'safe' ? 'none' : pickScamType(request, new Set(flags.map(f => f.family))),
    flags,
    linkChecks,
    actions,
    model: 'mock-heuristic-v1',
  };
}

export function createMockClient(options: MockOptions = {}): CheckClient {
  const delayMs = options.delayMs ?? 3200;

  const wait = (signal?: AbortSignal, ms = delayMs) =>
    new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(new ApiError('cancelled', 'Request cancelled'));
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new ApiError('cancelled', 'Request cancelled'));
      });
    });

  return {
    isMock: true,
    async check(request, opts) {
      if (!hasInput(request)) throw new ApiError('bad_request', 'Nothing to check');
      const onUpdate = opts?.onUpdate;
      if (!onUpdate) {
        await wait(opts?.signal);
        return buildMockResponse(request);
      }
      const first = Math.round(delayMs * 0.4);
      await wait(opts?.signal, first);
      const result = buildMockResponse(request);
      onUpdate({ type: 'verdict', response: { ...result, sources: [] } });
      await wait(opts?.signal, delayMs - first);
      onUpdate({ type: 'final', response: result });
      return result;
    },
    async speak() {
      throw new ApiError('upstream', 'No speech service in mock mode');
    },
    async feedback(request) {
      if (!/^chk_\w{4,48}$/.test(request.checkId)) throw new ApiError('bad_request', 'Unknown check');
    },
    async insights(country) {
      return { country, days: 30, generatedAt: new Date().toISOString(), k: 3, risks: [], domains: [] };
    },
    async health() {
      return { ok: true, model: 'mock-heuristic-v1', mock: true };
    },
    async extractJob(request: JobExtractRequest, opts) {
      await wait(opts?.signal, Math.round(delayMs * 0.5));
      const adText = request.ad?.text ?? '';
      const chatText = request.chat?.text ?? '';

      const ad: JobFacts = {
        employer: adText ? { value: 'Bangkok Logistics Co., Ltd.', quote: 'Bangkok Logistics', confidence: 0.9 } : null,
        jobTitle: adText ? { value: 'Customer Service Representative', quote: 'Customer Service', confidence: 0.95 } : null,
        workplace: adText ? { value: 'Bangkok, Thailand', quote: 'Bangkok branch', confidence: 0.85 } : null,
        destinationCountry: adText ? { value: 'Thailand', quote: 'Thailand', confidence: 0.95 } : null,
        salary: adText ? { value: { amount: '35000', currency: 'THB', period: 'monthly' }, quote: '35,000 THB/month', confidence: 0.9 } : null,
        workerFee: adText ? { value: 'none stated', quote: 'No agency fees, free placement', confidence: 0.9 } : null,
        contract: adText ? { value: 'official', quote: 'Official employment contract provided', confidence: 0.9 } : null,
        visaOrPermit: adText ? { value: 'work_visa', quote: 'Company sponsors Non-B work permit', confidence: 0.9 } : null,
        travelArrangedBy: adText ? { value: 'Company flight provided', quote: 'Free airfare to Bangkok', confidence: 0.85 } : null,
        route: null,
        meetingPoint: adText ? { value: 'airport', quote: 'Suvarnabhumi Airport meeting point', confidence: 0.8 } : null,
        documentRequest: null,
        paymentRequest: null,
        urgency: null,
        contactChannel: adText ? { value: 'company_channel', quote: 'hr@bangkoklogistics.example.com', confidence: 0.85 } : null,
        secrecyRequest: null,
      };

      const hasChat = Boolean(request.chat?.text || request.chat?.imageBase64);
      const chatFee = chatText.toLowerCase().includes('deposit') || chatText.toLowerCase().includes('fee') || chatText.toLowerCase().includes('pay') || chatText.toLowerCase().includes('ငွေ');
      const chatPassport = chatText.toLowerCase().includes('passport') || chatText.toLowerCase().includes('ပတ်စပို့');
      const chatTourist = chatText.toLowerCase().includes('tourist') || chatText.toLowerCase().includes('ဗီဇာမလို');
      const chatBorder = chatText.toLowerCase().includes('border') || chatText.toLowerCase().includes('driver') || chatText.toLowerCase().includes('mae sot') || chatText.toLowerCase().includes('မဲဆောက်');
      const chatSecret = chatText.toLowerCase().includes('secret') || chatText.toLowerCase().includes('do not tell') || chatText.toLowerCase().includes('မပြောပါနှင့်');

      const chat: JobFacts | null = hasChat
        ? {
            employer: { value: 'Golden Star Office', quote: 'talk to me at Golden Star', confidence: 0.8 },
            jobTitle: { value: 'Online Marketing', quote: 'marketing work', confidence: 0.8 },
            workplace: { value: 'Shared after border crossing', quote: 'we will take you there from border', confidence: 0.8 },
            destinationCountry: { value: 'Thailand / Border', quote: 'border office', confidence: 0.8 },
            salary: { value: { amount: '1500', currency: 'USD', period: 'monthly' }, quote: 'USD 1,500 + bonus', confidence: 0.85 },
            workerFee: chatFee ? { value: 'Deposit required', quote: chatText.slice(0, 60), confidence: 0.85 } : null,
            contract: { value: 'later', quote: 'sign contract upon arrival', confidence: 0.85 },
            visaOrPermit: chatTourist ? { value: 'tourist', quote: 'enter as tourist first', confidence: 0.9 } : null,
            travelArrangedBy: { value: 'Driver pickup', quote: 'driver will meet you', confidence: 0.85 },
            route: chatBorder ? { value: 'Mae Sot border route', quote: 'van to Mae Sot', confidence: 0.85 } : null,
            meetingPoint: chatBorder ? { value: 'driver_pickup', quote: 'driver meets you at border', confidence: 0.9 } : null,
            documentRequest: chatPassport ? { value: 'passport_photo', quote: 'send passport photo now', confidence: 0.9 } : null,
            paymentRequest: chatFee ? { value: 'before_contract', quote: 'send deposit to reserve seat', confidence: 0.85 } : null,
            urgency: { value: 'Depart this week', quote: 'must leave within 3 days', confidence: 0.8 },
            contactChannel: { value: 'personal_chat_app', quote: 'Telegram @recruiter', confidence: 0.9 },
            secrecyRequest: chatSecret ? { value: true, quote: 'do not inform family or authorities', confidence: 0.95 } : null,
          }
        : null;

      return {
        jobId: `job_${Math.random().toString(36).slice(2, 12)}`,
        ad: request.ad ? ad : null,
        chat,
      };
    },
    async assessJob(request: JobAssessRequest, opts) {
      await wait(opts?.signal, Math.round(delayMs * 0.5));
      const ad = request.facts.ad;
      const chat = request.facts.chat;

      const conflicts: JobConflict[] = [];
      if (ad?.workerFee && chat?.workerFee && ad.workerFee.value.includes('none') && chat.workerFee.value.includes('Deposit')) {
        conflicts.push({
          field: 'workerFee',
          fieldLabel: 'Worker Fee',
          adValue: ad.workerFee.value,
          adQuote: ad.workerFee.quote,
          chatValue: chat.workerFee.value,
          chatQuote: chat.workerFee.quote,
          description: 'The ad advertised no fee or free placement, but the recruiter asks for payment or a deposit.',
          family: 'payment_route',
          severity: 'high',
        });
      }
      if (ad?.contract && chat?.contract && ad.contract.value === 'official' && chat.contract.value === 'later') {
        conflicts.push({
          field: 'contract',
          fieldLabel: 'Employment Contract',
          adValue: ad.contract.value,
          adQuote: ad.contract.quote,
          chatValue: chat.contract.value,
          chatQuote: chat.contract.quote,
          description: 'The ad promised an official employment contract, but the recruiter says it will be signed later.',
          family: 'payment_route',
          severity: 'high',
        });
      }
      if (ad?.visaOrPermit && chat?.visaOrPermit && ad.visaOrPermit.value === 'work_visa' && chat.visaOrPermit.value === 'tourist') {
        conflicts.push({
          field: 'visaOrPermit',
          fieldLabel: 'Visa and Work Permit',
          adValue: ad.visaOrPermit.value,
          adQuote: ad.visaOrPermit.quote,
          chatValue: chat.visaOrPermit.value,
          chatQuote: chat.visaOrPermit.quote,
          description: 'The ad promised an official work visa, but the recruiter instructs entering on a tourist visa.',
          family: 'trafficking',
          severity: 'high',
        });
      }

      const hasPauseRisks = conflicts.some(c => c.severity === 'high') || chat?.documentRequest?.value === 'passport_hold' || chat?.secrecyRequest?.value === true;
      const tier = hasPauseRisks ? 'pause' : conflicts.length > 0 ? 'verify' : 'lower';
      const verdict: Verdict = tier === 'pause' ? 'danger' : tier === 'verify' ? 'careful' : 'safe';
      const score = tier === 'pause' ? 82 : tier === 'verify' ? 52 : 18;

      const flags: Flag[] = conflicts.map(c => ({
        family: c.family,
        label: c.description,
        evidence: `Ad: "${c.adQuote}" vs Chat: "${c.chatQuote}"`,
        severity: c.severity,
      }));

      const headline =
        tier === 'pause'
          ? 'Pause before you pay, send documents or travel'
          : tier === 'verify'
          ? 'Some details do not add up, check them before you go'
          : 'Few warning signs found, but important details may still be missing';

      const summary =
        tier === 'pause'
          ? 'Significant discrepancies and coercive instructions detected between the advertised job and recruiter demands. Pause before making payments, sending documents, or traveling.'
          : tier === 'verify'
          ? 'Some details do not match or remain unconfirmed between the job ad and chat messages. Verify the recruitment agency official licence before proceeding.'
          : 'Few warning signs found between the ad and chat, though critical details may still need independent verification.';

      return {
        id: request.jobId || `chk_${Math.random().toString(36).slice(2, 12)}`,
        createdAt: new Date().toISOString(),
        kind: 'job',
        verdict,
        score,
        attention: tier,
        attentionHeadline: headline,
        title: headline,
        summary,
        spokenWarning: summary,
        scamType: 'job_trafficking',
        flags,
        linkChecks: [],
        sources: [],
        actions: [
          { label: 'Call hotline', type: 'call', value: '1300' },
          { label: 'Warn family or friends', type: 'share' },
        ],
        model: 'mock-job-shield-v1',
        conflicts,
        stillUnclear: [
          'No verifiable workplace address or physical facility location was provided.',
          'No legal work visa or registered work permit pathway was confirmed.',
        ],
        adFacts: ad ?? null,
        chatFacts: chat ?? null,
      };
    },
  };
}
