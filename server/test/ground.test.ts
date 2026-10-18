import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.js';
import {
  buildGroundingRequest,
  createGrounder,
  extractSources,
  GROUND_EXAMPLES,
  groundingQuery,
  needsGrounding,
  parseCompanyFound,
  parseFindings,
  sourceHost,
} from '../src/ground.js';
import type { Extraction } from '../src/types.js';

const cfg = loadConfig({ GEMINI_API_KEY: 'g' });
const base: Extraction = {
  flags: [],
  scamType: 'other',
  verdictDraft: 'careful',
  unsolicited: true,
  summary: '',
  spokenWarning: '',
  urls: [],
  entities: {
    companies: ['Acme Recruit'],
    phones: ['+66 81 000 0000'],
    domains: [],
    role: 'cook',
    country: 'Thailand',
    salaryClaim: 'USD 3000',
  },
};
const reply = (text: string, chunks: unknown[] = []) => ({
  text,
  candidates: [{ groundingMetadata: { groundingChunks: chunks } }],
});
const req = { kind: 'job', language: 'tl', text: 'x' } as const;

describe('grounding', () => {
  it('only grounds when an entity is named', () => {
    expect(needsGrounding(base)).toBe(true);
    expect(needsGrounding({ ...base, entities: { companies: [], phones: [], domains: [] } })).toBe(false);
  });

  it('skips the model call without entities', async () => {
    const generateContent = vi.fn();
    const g = createGrounder(cfg, { models: { generateContent } } as never);
    const out = await g.ground(req, { ...base, entities: { companies: [], phones: [], domains: [] } }, 5000);
    expect(out).toEqual({ flags: [], sources: [] });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('uses the Google Search tool and returns findings and deduped sources', async () => {
    const generateContent = vi.fn(async () =>
      reply('```json\n{"findings":[{"family":"identity","label":"Walang lisensya","evidence":"Not in DMW list","severity":"high"}]}\n```', [
        { web: { title: 'DMW', uri: 'https://dmw.gov.ph/a' } },
        { web: { uri: 'https://dmw.gov.ph/a' } },
        { web: { uri: 'https://scamwatch.example/b' } },
      ]),
    );
    const out = await createGrounder(cfg, { models: { generateContent } } as never).ground(req, base, 5000);
    const arg = (generateContent.mock.calls[0] as unknown as [{ config: { tools: unknown[] } }])[0];
    expect(arg.config.tools).toEqual([{ googleSearch: {} }]);
    expect(out.sources).toEqual([
      { title: 'DMW', url: 'https://dmw.gov.ph/a' },
      { title: 'scamwatch.example', url: 'https://scamwatch.example/b' },
    ]);
    expect(out.flags).toHaveLength(1);
    expect(out.flags[0]?.severity).toBe('low');
  });

  it('names redirect sources by the site behind them, never the redirect host', () => {
    const redirect = 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AbC123';
    const res = {
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [
              { web: { title: 'thaipost.net', uri: redirect } },
              { web: { uri: 'https://www.google.com/url?q=https://www.dsi.go.th/x&sa=U' } },
              { web: { uri: `${redirect}2` } },
            ],
          },
        },
      ],
    };
    expect(extractSources(res)).toEqual([
      { title: 'thaipost.net', url: redirect },
      { title: 'www.dsi.go.th', url: 'https://www.google.com/url?q=https://www.dsi.go.th/x&sa=U' },
    ]);
    expect(sourceHost('https://dmw.gov.ph/a')).toBe('dmw.gov.ph');
    expect(sourceHost(redirect)).toBeUndefined();
  });

  it('drops findings when the model ran no search', async () => {
    const memory =
      '{"findings":[{"family":"identity","label":"We could not find a licence record for Acme Recruit","evidence":"No record"}]}';
    for (const res of [{ text: memory }, reply(memory), { text: memory, candidates: [{ groundingMetadata: {} }] }]) {
      const generateContent = vi.fn(async () => res);
      expect(await createGrounder(cfg, { models: { generateContent } } as never).ground(req, base, 5000)).toEqual({
        flags: [],
        sources: [],
      });
    }
  });

  it('keeps findings when the model searched but cited no page', async () => {
    const generateContent = vi.fn(async () => ({
      text: '{"findings":[{"family":"identity","label":"x","evidence":"y"}]}',
      candidates: [{ groundingMetadata: { webSearchQueries: ['Acme Recruit licence Thailand'] } }],
    }));
    expect((await createGrounder(cfg, { models: { generateContent } } as never).ground(req, base, 5000)).flags).toHaveLength(1);
  });

  it('degrades to empty on SDK errors', async () => {
    const generateContent = vi.fn(async () => {
      throw new Error('boom');
    });
    expect(await createGrounder(cfg, { models: { generateContent } } as never).ground(req, base, 5000)).toEqual({
      flags: [],
      sources: [],
      incomplete: true,
    });
  });

  it('is disabled by GROUNDING=0 or a tiny budget', async () => {
    const generateContent = vi.fn();
    const off = createGrounder(loadConfig({ GEMINI_API_KEY: 'g', GROUNDING: '0' }), { models: { generateContent } } as never);
    expect((await off.ground(req, base, 5000)).flags).toEqual([]);
    expect((await createGrounder(cfg, { models: { generateContent } } as never).ground(req, base, 200)).flags).toEqual([]);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('answers companyFound only when the company check is asked for', async () => {
    const generateContent = vi.fn(async () =>
      reply('Found it. {"findings":[],"companyFound":true}', [{ web: { title: 'DBD', uri: 'https://dbd.go.th/x' } }]),
    );
    const g = createGrounder(cfg, { models: { generateContent } } as never);
    expect(await g.ground(req, base, 5000, { companyCheck: true })).toMatchObject({ flags: [], companyFound: true });
    expect(await g.ground(req, base, 5000)).toEqual({ flags: [], sources: [{ title: 'DBD', url: 'https://dbd.go.th/x' }] });
    const system = (generateContent.mock.calls as unknown as Array<[{ config: { systemInstruction: string } }]>).map(
      (c) => c[0].config.systemInstruction,
    );
    expect(system[0]).toContain('"companyFound"');
    expect(system[1]).not.toContain('companyFound');
  });

  it('parseCompanyFound reads a boolean or nothing', () => {
    expect(parseCompanyFound('{"findings":[],"companyFound":false}')).toBe(false);
    expect(parseCompanyFound('{"findings":[]}')).toBeUndefined();
    expect(parseCompanyFound('{"companyFound":"yes"}')).toBeUndefined();
    expect(parseCompanyFound(undefined)).toBeUndefined();
  });

  it('parseFindings rejects bad families and junk', () => {
    expect(parseFindings('no json here')).toEqual([]);
    expect(parseFindings('{"findings":[{"family":"trafficking","label":"a","evidence":"b"}]}')).toEqual([]);
  });

  it('prompt names the companies, country and language, not the salary or role', () => {
    const r = buildGroundingRequest(base, 'my');
    const p = `${r.system}\n${r.question}`;
    expect(r.question).toContain('Acme Recruit');
    expect(r.question).not.toContain('JSON');
    expect(p).toContain('Acme Recruit');
    expect(p).toContain('Thailand');
    expect(p).toContain('Burmese');
    expect(p).not.toMatch(/[\u0E00-\u0E7F]/);
    expect(buildGroundingRequest(base, 'th').system).toMatch(/[\u0E00-\u0E7F]/);
    expect(p).not.toContain('USD 3000');
    expect(p).not.toContain('cook');
  });

  it('gives the evidence example sentences in the report language only', () => {
    for (const lang of ['my', 'th', 'id', 'tl'] as const) {
      const { system } = buildGroundingRequest(base, lang);
      expect(system).toContain(GROUND_EXAMPLES[lang].reports);
      expect(system).not.toContain(GROUND_EXAMPLES.en.reports);
      expect(system).not.toContain(GROUND_EXAMPLES.en.licence);
      expect(system).toMatch(/Evidence is your own note about the source/);
    }
    expect(buildGroundingRequest(base, 'my').system).toMatch(/one short Burmese sentence/);
    expect(buildGroundingRequest(base, 'en').system).toContain(GROUND_EXAMPLES.en.reports);
  });

  it('sends no phone number, chat handle, account number or person name to search', async () => {
    const identifiers = [
      '+66 81 234 5678',
      '0812345678',
      '@fastjob_th',
      'line:agentmay',
      '1234567890123',
      'Mr. Somchai Jaidee',
      'somchai@example.com',
    ];
    const report: Extraction = {
      ...base,
      entities: {
        companies: ['Acme Recruit', 'Mr. Somchai Jaidee', '@fastjob_th', 'Acct 1234567890123', '+66 81 234 5678', 'somchai@example.com'],
        phones: ['+66 81 234 5678', '0812345678', '@fastjob_th', 'line:agentmay'],
        domains: ['https://acme-jobs.example/apply?ref=0812345678&u=agentmay', 'wa.me/66812345678'],
        role: 'cook',
        country: 'Thailand',
        salaryClaim: 'USD 3000',
      },
      sender: { phones: ['0812345678'], handles: ['@fastjob_th', 'line:agentmay'], accounts: ['1234567890123'] },
    };
    expect(groundingQuery(report)).toEqual({ companies: ['Acme Recruit'], domains: ['acme-jobs.example', 'wa.me'], country: 'Thailand' });
    const generateContent = vi.fn(async () => reply('{"findings":[]}'));
    await createGrounder(cfg, { models: { generateContent } } as never).ground(req, report, 5000);
    const sent = JSON.stringify(generateContent.mock.calls[0]);
    expect(sent).toContain('Acme Recruit');
    for (const id of identifiers) expect(sent).not.toContain(id);
    expect(sent).not.toMatch(/\d{6,}/);
    expect(sent).not.toMatch(/Somchai|agentmay|fastjob/i);
  });

  it('does not ground on phone numbers alone', () => {
    expect(needsGrounding({ ...base, entities: { companies: [], phones: ['+66 81 234 5678'], domains: [] } })).toBe(false);
  });
});
