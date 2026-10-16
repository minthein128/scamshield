import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.js';
import { buildGroundingPrompt, createGrounder, groundingQuery, needsGrounding, parseFindings } from '../src/ground.js';
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

  it('degrades to empty on SDK errors', async () => {
    const generateContent = vi.fn(async () => {
      throw new Error('boom');
    });
    expect(await createGrounder(cfg, { models: { generateContent } } as never).ground(req, base, 5000)).toEqual({ flags: [], sources: [] });
  });

  it('is disabled by GROUNDING=0 or a tiny budget', async () => {
    const generateContent = vi.fn();
    const off = createGrounder(loadConfig({ GEMINI_API_KEY: 'g', GROUNDING: '0' }), { models: { generateContent } } as never);
    expect((await off.ground(req, base, 5000)).flags).toEqual([]);
    expect((await createGrounder(cfg, { models: { generateContent } } as never).ground(req, base, 200)).flags).toEqual([]);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('parseFindings rejects bad families and junk', () => {
    expect(parseFindings('no json here')).toEqual([]);
    expect(parseFindings('{"findings":[{"family":"trafficking","label":"a","evidence":"b"}]}')).toEqual([]);
  });

  it('prompt names the companies, country and language, not the salary or role', () => {
    const p = buildGroundingPrompt(base, 'my');
    expect(p).toContain('Acme Recruit');
    expect(p).toContain('Thailand');
    expect(p).toContain('Burmese');
    expect(p).not.toContain('USD 3000');
    expect(p).not.toContain('cook');
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
