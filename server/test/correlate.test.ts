import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.js';
import { createCorrelator, parseRdap } from '../src/correlate.js';

const cfg = loadConfig({ WEB_RISK_API_KEY: 'k', MOCK: '0', GEMINI_API_KEY: 'g' });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('correlator', () => {
  it('maps a Web Risk threat and RDAP age', async () => {
    const fetchFn = vi.fn(async (u: string | URL | Request) => {
      const url = String(u);
      if (url.includes('webrisk')) return json({ threat: { threatTypes: ['SOCIAL_ENGINEERING'] } });
      return json({
        events: [{ eventAction: 'registration', eventDate: new Date(Date.now() - 10 * 86_400_000).toISOString() }],
        entities: [{ roles: ['registrar'], vcardArray: ['vcard', [['fn', {}, 'text', 'NameCheap']]] }],
      });
    });
    const [r] = await createCorrelator(cfg, { fetchFn: fetchFn as typeof fetch }).checkAll(['https://evil.xyz/a']);
    expect(r).toMatchObject({ webRisk: 'social_engineering', domainAgeDays: 10, registrar: 'NameCheap' });
    const first = String(fetchFn.mock.calls[0]?.[0]);
    expect(first).toContain('threatTypes=MALWARE');
    expect(first).toContain('key=k');
    const rdapCall = fetchFn.mock.calls.find((c) => String(c[0]).includes('rdap.org')) as unknown as [string, RequestInit];
    expect((rdapCall[1].headers as Record<string, string>)['user-agent']).toContain('SafeRoute');
  });

  it('returns clean for an empty Web Risk response', async () => {
    const fetchFn = async (u: string | URL | Request) => (String(u).includes('webrisk') ? json({}) : json({}, 404));
    const [r] = await createCorrelator(cfg, { fetchFn: fetchFn as typeof fetch }).checkAll(['https://ok.com/']);
    expect(r).toEqual({ url: 'https://ok.com/', webRisk: 'clean' });
  });

  it('degrades to unknown on errors and timeouts', async () => {
    const fetchFn = async () => {
      throw new Error('network down');
    };
    const [r] = await createCorrelator(cfg, { fetchFn: fetchFn as typeof fetch }).checkAll(['https://ok.com/']);
    expect(r).toEqual({ url: 'https://ok.com/', webRisk: 'unknown' });
  });

  it('uses ADC bearer token when no API key is set', async () => {
    const noKey = loadConfig({ MOCK: '0', GEMINI_API_KEY: 'g' });
    const fetchFn = vi.fn(async () => json({}));
    await createCorrelator(noKey, { fetchFn: fetchFn as typeof fetch, getToken: async () => 'tok' }).checkAll(['https://ok.com/']);
    const init = fetchFn.mock.calls.find((c) => String((c as unknown[])[0]).includes('webrisk')) as unknown as [string, RequestInit];
    expect((init[1].headers as Record<string, string>).authorization).toBe('Bearer tok');
  });

  it('parseRdap ignores missing data', () => {
    expect(parseRdap({})).toEqual({});
  });

  describe('Safe Browsing fallback', () => {
    const sbCfg = loadConfig({ SAFE_BROWSING_API_KEY: 'sb', MOCK: '0', GEMINI_API_KEY: 'g' });
    const deps = (fetchFn: unknown) => ({ fetchFn: fetchFn as typeof fetch, getToken: async () => 'tok' });
    const route = (sb: () => Response) =>
      vi.fn(async (u: string | URL | Request, _init?: RequestInit) => {
        const url = String(u);
        if (url.includes('webrisk')) return json({ error: { status: 'PERMISSION_DENIED' } }, 403);
        if (url.includes('safebrowsing')) return sb();
        return json({}, 404);
      });

    it('maps a match when Web Risk is unavailable', async () => {
      const fetchFn = route(() => json({ matches: [{ threatType: 'SOCIAL_ENGINEERING' }] }));
      const [r] = await createCorrelator(sbCfg, deps(fetchFn)).checkAll(['http://bad.example/']);
      expect(r?.webRisk).toBe('social_engineering');
    });

    it('returns clean when there is no match', async () => {
      const fetchFn = route(() => json({}));
      const [r] = await createCorrelator(sbCfg, deps(fetchFn)).checkAll(['https://ok.example/']);
      expect(r?.webRisk).toBe('clean');
    });

    it('returns unknown (not checked) when both sources fail', async () => {
      const fetchFn = route(() => json({ error: {} }, 500));
      const [r] = await createCorrelator(sbCfg, deps(fetchFn)).checkAll(['https://ok.example/']);
      expect(r?.webRisk).toBe('unknown');
    });

    it('sends only the URL and skips Web Risk after a 403', async () => {
      const fetchFn = route(() => json({}));
      const c = createCorrelator({ ...sbCfg, cacheEnabled: false }, deps(fetchFn));
      await c.checkAll(['https://one.example/p']);
      await c.checkAll(['https://two.example/p']);
      const calls = fetchFn.mock.calls.map((x) => ({ url: String(x[0]), init: x[1] }));
      expect(calls.filter((x) => x.url.includes('webrisk'))).toHaveLength(1);
      const sb = calls.filter((x) => x.url.includes('safebrowsing'));
      expect(sb).toHaveLength(2);
      const body = JSON.parse(String(sb[0]?.init?.body));
      expect(body.threatInfo.threatEntries).toEqual([{ url: 'https://one.example/p' }]);
      expect(Object.keys(body)).toEqual(['client', 'threatInfo']);
    });

    it('does not call Safe Browsing when no key is set', async () => {
      const fetchFn = route(() => json({}));
      const noKey = loadConfig({ MOCK: '0', GEMINI_API_KEY: 'g' });
      const [r] = await createCorrelator(noKey, deps(fetchFn)).checkAll(['https://ok.example/']);
      expect(r?.webRisk).toBe('unknown');
      expect(fetchFn.mock.calls.some((x) => String(x[0]).includes('safebrowsing'))).toBe(false);
    });
  });
});
