import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createJobExtractor } from '../src/job/extract.js';
import { emptyFacts } from '../src/job/types.js';
import { createMockCorrelator, createMockExtractor, createMockGrounder } from '../src/mock.js';
import { createPipeline } from '../src/pipeline.js';
import { createMockSpeaker } from '../src/speak.js';

const adText = 'Golden Lotus Garment Co., Ltd. Sewing staff, Bangkok. No fee for workers. Official contract.';
const chatText = 'Send passport photo now and pay 15,000 baht before the contract.';
const modelOut = {
  ad: {
    ...emptyFacts(),
    employer: { value: 'Golden Lotus Garment Co., Ltd.', quote: 'Golden Lotus Garment Co., Ltd.', confidence: 0.9 },
    workerFee: { value: 'none', quote: 'No fee for workers', confidence: 0.9 },
    contract: { value: 'official', quote: 'Official contract', confidence: 0.9 },
  },
  chat: {
    ...emptyFacts(),
    documentRequest: { value: 'passport_photo', quote: 'Send passport photo now', confidence: 0.9 },
    workerFee: { value: '15000 THB', quote: 'pay 15,000 baht', confidence: 0.9 },
    paymentRequest: { value: 'before_contract', quote: 'pay 15,000 baht before the contract', confidence: 0.9 },
  },
};

function make(reply?: string) {
  const cfg = loadConfig({ MOCK: '1' });
  const pipeline = createPipeline({
    extractor: createMockExtractor(),
    correlator: createMockCorrelator(),
    grounder: createMockGrounder(),
    model: cfg.model,
  });
  const client = reply === undefined ? undefined : { models: { generateContent: vi.fn(async () => ({ text: reply })) } };
  const extractor = createJobExtractor(cfg, client as never);
  return createApp(cfg, pipeline, createMockSpeaker(cfg), undefined, undefined, undefined, undefined, undefined, undefined, extractor);
}

const post = (app: ReturnType<typeof make>, path: string, body: unknown) =>
  app.request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('Job Shield API', () => {
  it('extracts, then assesses from the stored extraction', async () => {
    const app = make(JSON.stringify(modelOut));
    const ex = await post(app, '/v1/job/extract', { ad: { text: adText }, chat: { text: chatText }, language: 'en' });
    expect(ex.status).toBe(200);
    const facts = await ex.json();
    expect(facts.jobId).toMatch(/^job_/);
    expect(facts.chat.documentRequest.value).toBe('passport_photo');

    const as = await post(app, '/v1/job/assess', { jobId: facts.jobId, facts: { ad: facts.ad, chat: facts.chat }, language: 'en' });
    expect(as.status).toBe(200);
    const res = await as.json();
    expect(res).toMatchObject({ kind: 'job', usedStoredExtraction: true, attention: 'pause' });
    expect(res.conflicts.map((c: { code: string }) => c.code)).toEqual(['fee_vs_no_fee', 'contract_pay_first']);
    expect(res.adFacts.workerFee.quote).toBe('No fee for workers');
  });

  it('returns 502, not invented facts, when the model is not configured', async () => {
    const res = await post(make(), '/v1/job/extract', { ad: { text: adText }, language: 'en' });
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe('upstream');
  });

  it('returns 502 when the model returns invalid JSON', async () => {
    const res = await post(make('{"ad": '), '/v1/job/extract', { ad: { text: adText }, language: 'en' });
    expect(res.status).toBe(502);
  });

  it('rejects an extract request without ad or chat', async () => {
    const res = await post(make(), '/v1/job/extract', { language: 'en' });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('bad_request');
  });

  it.each([
    ['an enum value outside the codes', { chat: { visaOrPermit: { value: 'tourist visa', quote: '', confidence: 1, edited: true } } }],
    ['a free-text salary', { ad: { salary: { value: '12000 THB a month', quote: '', confidence: 1 } } }],
    [
      'a salary period outside the codes',
      { ad: { salary: { value: { amount: 1, currency: 'THB', period: 'fortnightly' }, quote: '', confidence: 1 } } },
    ],
    ['a non-boolean secrecy value', { chat: { secrecyRequest: { value: 'yes', quote: '', confidence: 1 } } }],
    ['a fact without a value', { chat: { employer: { quote: 'x' } } }],
    ['facts that are not an object', 'everything is fine'],
  ])('answers 400 for %s', async (_name, facts) => {
    const res = await post(make(), '/v1/job/assess', { facts, language: 'en' });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('bad_request');
  });

  it('answers 400 for an unknown jobId without facts', async () => {
    const res = await post(make(), '/v1/job/assess', { jobId: 'job_unknown', language: 'en' });
    expect(res.status).toBe(400);
  });

  it('accepts typed edits and partial facts', async () => {
    const res = await post(make(), '/v1/job/assess', {
      facts: {
        ad: {
          salary: { value: { amount: '12,000', currency: 'THB', period: 'monthly' }, quote: '12,000 THB', confidence: 0.9 },
          visaOrPermit: { value: 'work_visa', quote: 'work permit', confidence: 0.9 },
        },
        chat: {
          salary: { value: { amount: 144000, currency: 'THB', period: 'yearly' }, quote: '144,000 a year', confidence: 0.9, edited: true },
          visaOrPermit: { value: 'not_mentioned', quote: 'work permit later', confidence: 0.9, edited: true },
        },
      },
      language: 'th',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conflicts).toEqual([]);
    expect(body.chatFacts.visaOrPermit).toBeNull();
    expect(body.adFacts.salary.value.amount).toBe(12000);
    expect(body.title).toBe('พบสัญญาณเตือนไม่มาก แต่อาจยังขาดรายละเอียดสำคัญ');
  });

  it('keeps /v1/check for kind job unchanged', async () => {
    const res = await post(make(), '/v1/check', { kind: 'job', text: 'Factory job in Bangkok', language: 'en' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attention).toBeUndefined();
    expect(body.kind).toBe('job');
  });
});
