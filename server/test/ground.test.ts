import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.js';
import { buildGroundingPrompt, createGrounder, needsGrounding, parseFindings } from '../src/ground.js';
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

  it('prompt names the entities and the language', () => {
    const p = buildGroundingPrompt(base, 'my');
    expect(p).toContain('Acme Recruit');
    expect(p).toContain('USD 3000');
    expect(p).toContain('Burmese');
  });
});
