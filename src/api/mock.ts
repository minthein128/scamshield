import { MOCK_COPY } from './mockCopy';
import { ApiError } from './errors';
import type {
  CheckAction,
  CheckClient,
  CheckRequest,
  CheckResponse,
  Flag,
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

  const wait = (signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(new ApiError('cancelled', 'Request cancelled'));
      const timer = setTimeout(resolve, delayMs);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new ApiError('cancelled', 'Request cancelled'));
      });
    });

  return {
    isMock: true,
    async check(request, opts) {
      if (!hasInput(request)) throw new ApiError('bad_request', 'Nothing to check');
      await wait(opts?.signal);
      return buildMockResponse(request);
    },
    async speak() {
      throw new ApiError('upstream', 'No speech service in mock mode');
    },
    async insights(country) {
      return { country, days: 30, generatedAt: new Date().toISOString(), k: 3, risks: [], domains: [] };
    },
    async health() {
      return { ok: true, model: 'mock-heuristic-v1', mock: true };
    },
  };
}
