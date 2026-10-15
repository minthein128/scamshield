import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { createStreamingExtractor, parseEntities, scanObject } from '../src/extract-stream.js';
import { createMockCorrelator } from '../src/mock.js';
import { createPipeline } from '../src/pipeline.js';

const cfg = loadConfig({ MOCK: '0', GEMINI_API_KEY: 'k' });
const answer = {
  entities: { companies: ['Golden Star Co.'], phones: [], domains: [], country: 'Thailand' },
  sender: { phones: [], handles: ['@hr'], accounts: [] },
  flags: [{ family: 'pressure', label: 'Urgent', evidence: 'leave this week', severity: 'medium' }],
  scamType: 'job_trafficking',
  verdictDraft: 'careful',
  unsolicited: true,
  summary: 's',
  spokenWarning: 'w',
  urls: [],
};
const json = JSON.stringify(answer);
const chunksOf = (text: string, n: number) => Array.from({ length: Math.ceil(text.length / n) }, (_, i) => text.slice(i * n, (i + 1) * n));

function fakeClient(chunks: string[], gap = 0, seen: string[] = []) {
  return {
    models: {
      generateContentStream: async () =>
        (async function* () {
          for (const c of chunks) {
            if (gap) await new Promise((r) => setTimeout(r, gap));
            seen.push('chunk');
            yield { text: c };
          }
        })(),
    },
  } as never;
}

describe('scanObject', () => {
  it('returns the object only once it is closed, ignoring braces in strings', () => {
    const text = '{"entities":{"companies":["A } B"],"phones":[]},"flags":[';
    expect(scanObject(text.slice(0, 40), 'entities')).toBeUndefined();
    expect(scanObject(text, 'entities')).toBe('{"companies":["A } B"],"phones":[]}');
    expect(parseEntities(scanObject(text, 'entities') as string)?.companies).toEqual(['A } B']);
  });
});

describe('streaming extractor', () => {
  it('reports entities before the stream ends and returns the parsed extraction', async () => {
    const seen: string[] = [];
    const ex = createStreamingExtractor(cfg, fakeClient(chunksOf(json, 12), 0, seen));
    let at = -1;
    const out = await ex.extract({ kind: 'job', language: 'en', text: 'x' }, {
      onEntities: (e: { companies: string[] }) => {
        at = seen.length;
        expect(e.companies).toEqual(['Golden Star Co.']);
      },
    } as never);
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(seen.length);
    expect(out.scamType).toBe('job_trafficking');
    expect(out.entities.country).toBe('Thailand');
  });

  it('turns a failed stream into an upstream error', async () => {
    const client = {
      models: {
        generateContentStream: async () => {
          throw new Error('boom');
        },
      },
    } as never;
    await expect(createStreamingExtractor(cfg, client).extract({ kind: 'job', language: 'en', text: 'x' })).rejects.toMatchObject({
      code: 'upstream',
    });
  });
});

describe('pipeline with early grounding', () => {
  it('starts grounding before extraction finishes', async () => {
    const order: string[] = [];
    const ex = createStreamingExtractor(cfg, fakeClient(chunksOf(json, 12), 5));
    const p = createPipeline({
      extractor: {
        extract: async (r, o) => {
          const out = await ex.extract(r, o);
          order.push('extract-end');
          return out;
        },
      },
      correlator: createMockCorrelator(),
      grounder: {
        ground: async () => {
          order.push('ground-start');
          return { flags: [], sources: [] };
        },
      },
      model: 'm',
    });
    await p.run({ kind: 'job', language: 'en', text: 'job' });
    expect(order).toEqual(['ground-start', 'extract-end']);
  });
});
