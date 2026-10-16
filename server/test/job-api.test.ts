import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createMockCorrelator, createMockExtractor, createMockGrounder } from '../src/mock.js';
import { createPipeline } from '../src/pipeline.js';
import { createMockSpeaker } from '../src/speak.js';

function make() {
  const cfg = loadConfig({ MOCK: '1' });
  const pipeline = createPipeline({
    extractor: createMockExtractor(),
    correlator: createMockCorrelator(),
    grounder: createMockGrounder(),
    model: cfg.model,
  });
  return createApp(cfg, pipeline, createMockSpeaker(cfg));
}

describe('Job Shield API endpoints', () => {
  it('extracts job facts from ad and chat via /v1/job/extract', async () => {
    const app = make();
    const res = await app.request('/v1/job/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ad: { text: 'Bangkok Logistics Co. Customer Service. 35,000 THB/month. Free placement, no fee.' },
        chat: { text: 'Hello, please send 300 USD deposit to secure seat, meet driver at border.' },
        language: 'en',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jobId).toBeDefined();
    expect(data.ad).toBeDefined();
    expect(data.chat).toBeDefined();
  });

  it('rejects /v1/job/extract when neither ad nor chat is provided', async () => {
    const app = make();
    const res = await app.request('/v1/job/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ language: 'en' }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('bad_request');
  });

  it('assesses facts and reports conflicts and attention tier via /v1/job/assess', async () => {
    const app = make();
    const res = await app.request('/v1/job/assess', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        facts: {
          ad: {
            employer: { value: 'Thai Beverage Logistics', quote: 'Thai Beverage Logistics', confidence: 0.9 },
            workerFee: { value: 'none stated', quote: 'Zero fee, no deposit', confidence: 0.95 },
            contract: { value: 'official', quote: 'Official contract', confidence: 0.9 },
            visaOrPermit: { value: 'work_visa', quote: 'Work permit', confidence: 0.9 },
          },
          chat: {
            employer: { value: 'Thai Beverage Logistics', quote: 'Thai Beverage HR', confidence: 0.9 },
            workerFee: { value: 'Deposit required', quote: 'Send 500 USD advance deposit', confidence: 0.9 },
            contract: { value: 'later', quote: 'Contract given later at destination', confidence: 0.9 },
            visaOrPermit: { value: 'tourist', quote: 'Come on tourist visa', confidence: 0.95 },
          },
        },
        language: 'en',
        context: { destination: 'Thailand' },
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.kind).toBe('job');
    expect(data.attention).toBe('pause');
    expect(data.conflicts.length).toBeGreaterThanOrEqual(2);
    expect(data.stillUnclear).toBeDefined();
    expect(data.spokenWarning).toBeDefined();
    expect(data.actions.length).toBeGreaterThan(0);
  });

  it('assesses consistent facts as lower risk via /v1/job/assess', async () => {
    const app = make();
    const res = await app.request('/v1/job/assess', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        facts: {
          ad: {
            employer: { value: 'Siam Commercial', quote: 'Siam Commercial', confidence: 0.9 },
            workplace: { value: 'Bangkok, Rama 9', quote: 'Rama 9 office', confidence: 0.9 },
            contract: { value: 'official', quote: 'Official contract', confidence: 0.9 },
            visaOrPermit: { value: 'work_visa', quote: 'Work permit', confidence: 0.9 },
          },
          chat: {
            employer: { value: 'Siam Commercial', quote: 'Siam Commercial HR', confidence: 0.9 },
            workplace: { value: 'Bangkok, Rama 9', quote: 'Rama 9 building', confidence: 0.9 },
            contract: { value: 'official', quote: 'Contract sent to your email', confidence: 0.9 },
            visaOrPermit: { value: 'work_visa', quote: 'Legal Non-B visa processed', confidence: 0.9 },
          },
        },
        language: 'en',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.attention).toBe('lower');
    expect(data.conflicts).toHaveLength(0);
  });
});
