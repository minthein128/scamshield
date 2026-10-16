import { readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { createAiAssist } from '../src/admin/ai.js';
import { createAiRoutes } from '../src/admin/ai-routes.js';
import { GLOSSARY } from '../src/admin/glossary.js';
import { checkPage, isOfficialHost, numberAppears, safeToFetch } from '../src/admin/sources.js';
import { loadConfig } from '../src/config.js';
import { ApiError } from '../src/types.js';

const cfg = loadConfig({ MOCK: '1' });

const reply = (json: unknown, domains: string[] = []) => ({
  text: JSON.stringify(json),
  candidates: [{ groundingMetadata: { groundingChunks: domains.map((title) => ({ web: { title } })) } }],
});
const clientOf = (...replies: unknown[]) => {
  const generateContent = vi.fn();
  for (const r of replies) generateContent.mockResolvedValueOnce(r);
  return { client: { models: { generateContent } } as never, generateContent };
};
const page = (body: string) => (async () => new Response(body, { headers: { 'content-type': 'text/html' } })) as unknown as typeof fetch;
const publicDns = async () => ['93.184.216.34'];

describe('source helpers', () => {
  it('recognises official hosts', () => {
    for (const h of [
      'humantrafficking.police.go.th',
      'www.iom.int',
      'thailand.iom.int',
      'ncct.gov.kh',
      'mfa.gov.la',
      'state.gov',
      'kemlu.go.id',
      'myanmar-embassy.example.org',
    ]) {
      expect(isOfficialHost(h), h).toBe(true);
    }
    for (const h of ['facebook.com', 'blog.example.com', 'hotlines-directory.com', 'govinfo-fake.com'])
      expect(isOfficialHost(h), h).toBe(false);
  });

  it('finds numbers regardless of spacing and country code', () => {
    expect(numberAppears('Call 1599 any time', '1599')).toBe(true);
    expect(numberAppears('code 15990 is unrelated', '1599')).toBe(false);
    expect(numberAppears('Tel: 063-481-8121', '+66634818121')).toBe(true);
    expect(numberAppears('Tel: +66 63 481 8121', '+66634818121')).toBe(true);
    expect(numberAppears('Tel: 063-481-8199', '+66634818121')).toBe(false);
  });

  it('refuses to fetch private or non-https targets', async () => {
    expect(await safeToFetch('http://example.org/')).toBe(false);
    expect(await safeToFetch('https://127.0.0.1/')).toBe(false);
    expect(await safeToFetch('https://metadata.google.internal/')).toBe(false);
    expect(await safeToFetch('https://intranet.example.org/', async () => ['10.0.0.5'])).toBe(false);
    expect(await safeToFetch('https://example.org/', publicDns)).toBe(true);
    expect(await checkPage('https://localhost/', '1599', undefined)).toBe('blocked');
  });

  it('checks a page for the number', async () => {
    expect(await checkPage('https://x.example.org/', '1599', undefined, page('<p>Hotline <b>1599</b></p>'), publicDns)).toBe(
      'number_found',
    );
    expect(await checkPage('https://x.example.org/', '1599', undefined, page('<p>nothing</p>'), publicDns)).toBe('number_not_found');
  });
});

describe('find-hotline', () => {
  const candidate = (url: string, quote: string) => ({
    candidates: [{ name: 'Anti-Human Trafficking Division', number: '1599', dial: '1599', sources: [{ title: 'Contact', url, quote }] }],
  });

  it('rates an official, grounded source that quotes the number as high', async () => {
    const { client } = clientOf(
      reply(candidate('https://humantrafficking.police.go.th/en/contact', 'Hotline 1599, 24 hours'), ['humantrafficking.police.go.th']),
    );
    const ai = createAiAssist({ cfg, client, fetchFn: page('1599'), resolve: publicDns });
    const out = await ai.findHotline({ country: 'TH', category: 'trafficking' });
    expect(out.candidates[0]).toMatchObject({ dial: '1599', confidence: 'high' });
    expect(out.candidates[0]?.sources[0]).toMatchObject({ official: true, grounded: true, pageCheck: 'number_found' });
  });

  it('rates a non-official source low with a reason', async () => {
    const { client } = clientOf(reply(candidate('https://blog.example.com/hotlines', 'Call 1599'), ['blog.example.com']));
    const ai = createAiAssist({ cfg, client, checkPages: false });
    const out = await ai.findHotline({ country: 'TH', category: 'trafficking' });
    expect(out.candidates[0]?.confidence).toBe('low');
    expect(out.candidates[0]?.reason).toMatch(/official/);
  });

  it('rates an official source whose quote lacks the number low', async () => {
    const { client } = clientOf(reply(candidate('https://www.mfa.go.th/contact', 'Contact the ministry'), ['mfa.go.th']));
    const ai = createAiAssist({ cfg, client, checkPages: false });
    expect((await ai.findHotline({ country: 'TH', category: 'trafficking' })).candidates[0]?.confidence).toBe('low');
  });

  it('drops candidates with an unusable dial and survives bad JSON', async () => {
    const bad = { candidates: [{ name: 'Some line', number: 'unknown', dial: 'n/a', sources: [] }] };
    const { client } = clientOf(reply(bad), { text: 'sorry, no json' }, { text: 'still nothing' });
    const ai = createAiAssist({ cfg, client, checkPages: false });
    expect((await ai.findHotline({ country: 'LA', category: 'police' })).candidates).toEqual([]);
    expect((await ai.findHotline({ country: 'LA', category: 'police' })).candidates).toEqual([]);
  });

  it('asks Google Search and carries no write path', async () => {
    const { client, generateContent } = clientOf(reply({ candidates: [] }), reply({ candidates: [] }));
    await createAiAssist({ cfg, client }).findHotline({ country: 'MM', category: 'trafficking' });
    expect(generateContent).toHaveBeenCalledTimes(2);
    const arg = generateContent.mock.calls[0]?.[0];
    expect(arg.config.tools).toEqual([{ googleSearch: {} }]);
    expect(arg.contents[0].parts[0].text).toMatch(/official or authoritative/);
  });
});

describe('verify-hotline', () => {
  const item = { name: 'AHTD', country: 'TH', category: 'trafficking', number: '1599', dial: '1599' };
  it('downgrades confirmed when no official source shows the number', async () => {
    const { client } = clientOf(
      reply({ verdict: 'confirmed', note: 'ok', sources: [{ title: 't', url: 'https://blog.example.com/x', quote: '1599' }] }),
    );
    const out = await createAiAssist({ cfg, client, checkPages: false }).verifyHotline(item);
    expect(out.verdict).toBe('unverified');
  });
  it('keeps confirmed with an official quote', async () => {
    const { client } = clientOf(
      reply({ verdict: 'confirmed', note: 'ok', sources: [{ title: 't', url: 'https://www.police.go.th/x', quote: 'call 1599' }] }),
    );
    expect((await createAiAssist({ cfg, client, checkPages: false }).verifyHotline(item)).verdict).toBe('confirmed');
  });
});

describe('draft-content and translate', () => {
  it('re-asks once on certainty wording, then rewrites what is left', async () => {
    const { client, generateContent } = clientOf({ text: 'This is a scam.' }, { text: 'This is definitely a scam.' });
    const out = await createAiAssist({ cfg, client }).draftContent({
      key: 'report:x',
      instruction: 'warn about fee demands',
      language: 'en',
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(out.note).toMatch(/rewritten/);
    expect(out.text).not.toMatch(/is a scam|definitely/i);
  });

  it('translates per language and flags placeholder drift', async () => {
    const { client } = clientOf({ text: JSON.stringify({ text: 'Hati-hati {{name}}' }) }, { text: JSON.stringify({ text: 'Mag-ingat' }) });
    const out = await createAiAssist({ cfg, client }).translate({ text: 'Be careful {{name}}', from: 'en', to: ['id', 'tl'] });
    expect(out.translations).toEqual({ id: 'Hati-hati {{name}}', tl: 'Mag-ingat' });
    expect(out.warnings).toEqual(['tl: placeholders differ from the source']);
  });

  it('keeps the glossary in step with scripts/translate.mjs', () => {
    const script = readFileSync(new URL('../../scripts/translate.mjs', import.meta.url), 'utf8');
    for (const [term, tr] of Object.entries(GLOSSARY)) {
      expect(script).toContain(term);
      for (const v of Object.values(tr)) if (v) expect(script).toContain(v);
    }
  });
});

describe('ai routes', () => {
  it('limits each uid and validates the body', async () => {
    const ai = { model: 'm', findHotline: vi.fn(async () => ({ candidates: [] })) } as never;
    const app = new Hono();
    app.use('*', async (c, next) => {
      c.set('admin' as never, { uid: c.req.header('x-uid') ?? 'u1', email: 'e', role: 'editor' } as never);
      await next();
    });
    app.route('/ai', createAiRoutes(ai, 3));
    app.onError((err, c) => (err instanceof ApiError ? c.json({}, err.status) : c.json({}, 500)));
    const post = (uid: string, body: unknown) =>
      app.request('/ai/find-hotline', {
        method: 'POST',
        headers: { 'x-uid': uid, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    const ok = { country: 'TH', category: 'consular' };
    expect((await post('u1', { country: 'ZZ', category: 'consular' })).status).toBe(400);
    for (let i = 0; i < 2; i++) expect((await post('u1', ok)).status).toBe(200);
    expect((await post('u1', ok)).status).toBe(429);
    expect((await post('u2', ok)).status).toBe(200);
  });
});
