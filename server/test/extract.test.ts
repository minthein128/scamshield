import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.js';
import { createGeminiExtractor } from '../src/extract.js';
import { ApiError } from '../src/types.js';

const cfg = loadConfig({ GEMINI_API_KEY: 'g', GEMINI_MODEL: 'gemini-test' });
const good = {
  flags: [{ family: 'pressure', label: 'Urgent', evidence: 'today only', severity: 'medium' }],
  scamType: 'other',
  verdictDraft: 'careful',
  unsolicited: true,
  summary: 's',
  spokenWarning: 'w',
  urls: ['evil.xyz'],
};
const client = (text: string | Error) => ({
  models: {
    generateContent: vi.fn(async () => {
      if (text instanceof Error) throw text;
      return { text };
    }),
  },
});

describe('gemini extractor', () => {
  it('sends text, image, schema and model; merges urls from text', async () => {
    const c = client(JSON.stringify(good));
    const out = await createGeminiExtractor(cfg, c as never).extract({
      kind: 'message',
      language: 'my',
      text: 'visit https://other.com now',
      imageBase64: 'QUJD',
      imageMimeType: 'image/png',
    });
    const call = c.models.generateContent.mock.calls[0] as unknown as [
      { model: string; contents: { parts: unknown[] }[]; config: { responseSchema: unknown; responseMimeType: string } },
    ];
    expect(call[0].model).toBe('gemini-test');
    expect(call[0].config.responseMimeType).toBe('application/json');
    expect(call[0].config.responseSchema).toBeTruthy();
    expect((call[0].config as { thinkingConfig?: unknown }).thinkingConfig).toEqual({ thinkingLevel: 'LOW' });
    expect(call[0].contents[0]?.parts).toHaveLength(2);
    expect(JSON.stringify(call[0].contents)).toContain('Burmese');
    expect(out.urls).toEqual(['https://evil.xyz/', 'https://other.com/']);
  });

  it('raises upstream error on invalid JSON', async () => {
    await expect(
      createGeminiExtractor(cfg, client('not json') as never).extract({ kind: 'job', language: 'en', text: 'x' }),
    ).rejects.toMatchObject({ code: 'upstream' });
  });

  it('raises upstream error when the SDK throws', async () => {
    const p = createGeminiExtractor(cfg, client(new Error('quota')) as never).extract({ kind: 'job', language: 'en', text: 'x' });
    await expect(p).rejects.toBeInstanceOf(ApiError);
    await expect(p).rejects.toThrow(/quota/);
  });

  it('rejects flags with an unknown family', async () => {
    const bad = { ...good, flags: [{ ...good.flags[0], family: 'made_up' }] };
    await expect(
      createGeminiExtractor(cfg, client(JSON.stringify(bad)) as never).extract({ kind: 'job', language: 'en', text: 'x' }),
    ).rejects.toMatchObject({ code: 'upstream' });
  });
});
