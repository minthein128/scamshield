import { GoogleAuth } from 'google-auth-library';
import { createTtlLru, memoize } from './cache.js';
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

const SB_THREAT_TYPES = ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'];
const WEB_RISK_BACKOFF_MS = 10 * 60_000;

let auth: GoogleAuth | undefined;
async function adcToken(): Promise<string | undefined> {
  auth ??= new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  return (await auth.getAccessToken()) ?? undefined;
}

type RdapInfo = { domainAgeDays?: number; registrar?: string };

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
  const caching = cfg.cacheEnabled && cfg.linkCacheTtlMs > 0;
  const wrCache = createTtlLru<Promise<WebRiskResult>>({ max: 2000, ttlMs: cfg.linkCacheTtlMs });
  let webRiskDownUntil = 0;
  const rdapCache = createTtlLru<Promise<RdapInfo>>({ max: 2000, ttlMs: cfg.linkCacheTtlMs });

  async function webRiskOnly(url: string): Promise<WebRiskResult> {
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
        if (res.status === 403 && cfg.safeBrowsingApiKey) webRiskDownUntil = Date.now() + WEB_RISK_BACKOFF_MS;
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

  // Only the URL leaves the server: no page text, user id or other context.
  async function safeBrowsingLookup(url: string): Promise<WebRiskResult> {
    try {
      const res = await fetchFn(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(cfg.safeBrowsingApiKey ?? '')}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            client: { clientId: 'saferoute', clientVersion: '1.0' },
            threatInfo: {
              threatTypes: SB_THREAT_TYPES,
              platformTypes: ['ANY_PLATFORM'],
              threatEntryTypes: ['URL'],
              threatEntries: [{ url }],
            },
          }),
          signal: AbortSignal.timeout(cfg.linkTimeoutMs),
        },
      );
      if (!res.ok) {
        log('WARNING', 'safe_browsing_http_error', { status: res.status });
        return 'unknown';
      }
      const body = (await res.json()) as { matches?: Array<{ threatType?: string }> };
      if (!body.matches?.length) return 'clean';
      const mapped = body.matches.map((m) => THREAT_MAP[m.threatType ?? '']).filter((t): t is WebRiskResult => Boolean(t));
      return THREAT_ORDER.find((t) => mapped.includes(t)) ?? 'unknown';
    } catch (err) {
      log('WARNING', 'safe_browsing_failed', { error: (err as Error).message });
      return 'unknown';
    }
  }

  async function webRiskLookup(url: string): Promise<WebRiskResult> {
    const first = Date.now() < webRiskDownUntil ? 'unknown' : await webRiskOnly(url);
    if (first !== 'unknown' || !cfg.safeBrowsingApiKey) return first;
    return safeBrowsingLookup(url);
  }

  async function rdapLookup(url: string): Promise<RdapInfo> {
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

  const webRisk = (url: string) =>
    caching
      ? memoize(
          wrCache,
          url,
          () => webRiskLookup(url),
          (v) => v !== 'unknown',
        )
      : webRiskLookup(url);
  const rdap = (url: string) =>
    caching
      ? memoize(
          rdapCache,
          registrableDomain(url),
          () => rdapLookup(url),
          (v) => Object.keys(v).length > 0,
        )
      : rdapLookup(url);

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
