import { GoogleAuth } from 'google-auth-library';
import type { Config } from './config.js';
import { log } from './log.js';
import type { LinkCheck, WebRiskResult } from './types.js';
import { registrableDomain } from './urls.js';

type Fetch = typeof fetch;

const THREAT_MAP: Record<string, WebRiskResult> = {
  MALWARE: 'malware',
  SOCIAL_ENGINEERING: 'social_engineering',
  UNWANTED_SOFTWARE: 'unwanted_software',
};
const THREAT_ORDER: WebRiskResult[] = ['malware', 'social_engineering', 'unwanted_software'];

let auth: GoogleAuth | undefined;
async function adcToken(): Promise<string | undefined> {
  auth ??= new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  return (await auth.getAccessToken()) ?? undefined;
}

export interface Correlator {
  checkAll(urls: string[]): Promise<LinkCheck[]>;
}

export interface CorrelatorDeps {
  fetchFn?: Fetch;
  getToken?: () => Promise<string | undefined>;
}

export function createCorrelator(cfg: Config, deps: CorrelatorDeps = {}): Correlator {
  const fetchFn = deps.fetchFn ?? fetch;
  const getToken = deps.getToken ?? adcToken;

  async function webRisk(url: string): Promise<WebRiskResult> {
    try {
      const qs = new URLSearchParams({ uri: url });
      for (const t of Object.keys(THREAT_MAP)) qs.append('threatTypes', t);
      const headers: Record<string, string> = {};
      if (cfg.webRiskApiKey) qs.set('key', cfg.webRiskApiKey);
      else {
        const token = await getToken();
        if (!token) return 'unknown';
        headers.authorization = `Bearer ${token}`;
      }
      const res = await fetchFn(`https://webrisk.googleapis.com/v1/uris:search?${qs}`, {
        headers,
        signal: AbortSignal.timeout(cfg.linkTimeoutMs),
      });
      if (!res.ok) {
        log('WARNING', 'web_risk_http_error', { status: res.status });
        return 'unknown';
      }
      const body = (await res.json()) as { threat?: { threatTypes?: string[] } };
      const types = body.threat?.threatTypes;
      if (!types?.length) return 'clean';
      const mapped = types.map((t) => THREAT_MAP[t]).filter((t): t is WebRiskResult => Boolean(t));
      return THREAT_ORDER.find((t) => mapped.includes(t)) ?? 'unknown';
    } catch (err) {
      log('WARNING', 'web_risk_failed', { error: (err as Error).message });
      return 'unknown';
    }
  }

  async function rdap(url: string): Promise<{ domainAgeDays?: number; registrar?: string }> {
    try {
      const res = await fetchFn(`https://rdap.org/domain/${registrableDomain(url)}`, {
        headers: { accept: 'application/rdap+json, application/json', 'user-agent': 'SafeRoute/1.0 (scam-check)' },
        redirect: 'follow',
        signal: AbortSignal.timeout(cfg.linkTimeoutMs),
      });
      if (!res.ok) return {};
      return parseRdap(await res.json());
    } catch (err) {
      log('WARNING', 'rdap_failed', { error: (err as Error).message });
      return {};
    }
  }

  return {
    checkAll(urls) {
      return Promise.all(
        urls.map(async (url) => {
          const [wr, rd] = await Promise.all([webRisk(url), rdap(url)]);
          const check: LinkCheck = { url, webRisk: wr };
          if (rd.domainAgeDays !== undefined) check.domainAgeDays = rd.domainAgeDays;
          if (rd.registrar) check.registrar = rd.registrar;
          return check;
        }),
      );
    },
  };
}

interface RdapEntity {
  roles?: string[];
  vcardArray?: [string, Array<[string, unknown, string, unknown]>];
}

export function parseRdap(body: unknown, now = Date.now()): { domainAgeDays?: number; registrar?: string } {
  const b = body as { events?: Array<{ eventAction?: string; eventDate?: string }>; entities?: RdapEntity[] };
  const out: { domainAgeDays?: number; registrar?: string } = {};
  const reg = b.events?.find((e) => e.eventAction === 'registration')?.eventDate;
  const t = reg ? Date.parse(reg) : NaN;
  if (!Number.isNaN(t) && t <= now) out.domainAgeDays = Math.floor((now - t) / 86_400_000);
  const registrar = b.entities?.find((e) => e.roles?.includes('registrar'));
  const fn = registrar?.vcardArray?.[1]?.find((p) => p[0] === 'fn')?.[3];
  if (typeof fn === 'string' && fn) out.registrar = fn;
  return out;
}
