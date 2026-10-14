import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { buildCandidates, mergeCandidates } from '../src/feedback/candidates.js';
import { classify, createFeedback, tallyIncrements } from '../src/feedback/service.js';
import { createMemoryFeedbackStore } from '../src/feedback/store.js';
import { formatTallies, tallyRows } from '../src/feedback/tally.js';
import { parseFeedback } from '../src/feedback/validate.js';
import { createIntel } from '../src/intel/service.js';
import { createMemoryStore } from '../src/intel/store.js';
import { CONFIRMED_WEIGHT, CONTRADICTED_WEIGHT } from '../src/intel/weights.js';
import { createMockCorrelator, createMockExtractor, createMockGrounder } from '../src/mock.js';
import { createPipeline } from '../src/pipeline.js';
import { createMockSpeaker } from '../src/speak.js';
import { ApiError } from '../src/types.js';

const NOW = new Date('2026-10-14T10:00:00Z');
const SCAM = 'Customer service job in Thailand, salary USD 1800, send passport today. Telegram @gold_hr_agent';
const SAFE = 'hello, lunch at noon? thanks';

function setup(env: Record<string, string> = {}) {
  const cfg = loadConfig({ MOCK: '1', ...env });
  const store = createMemoryStore();
  const fstore = createMemoryFeedbackStore();
  const intel = createIntel({ store, pepper: 'p', now: () => NOW });
  const feedback = createFeedback({ intel, store: fstore, pepper: 'p', now: () => NOW });
  const pipeline = createPipeline({
    extractor: createMockExtractor(),
    correlator: createMockCorrelator(),
    grounder: createMockGrounder(),
    model: cfg.model,
    intel,
    feedback,
  });
  const verifier = async (t: string) => (t.startsWith('u:') ? { uid: t, anonymous: false } : null);
  const app = createApp(cfg, pipeline, createMockSpeaker(cfg), intel, verifier, feedback);
  const post = (path: string, body: unknown, token?: string) =>
    app.request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  const check = async (text: string, extra: Record<string, unknown> = {}, token?: string) =>
    (await (await post('/v1/check', { kind: 'job', language: 'en', text, ...extra }, token)).json()) as { id: string; verdict: string };
  const days = (id: string) => Object.values(store.aggs.get(id)?.real.days ?? {}).reduce((a, b) => a + b, 0);
  return { app, post, check, store, fstore, intel, feedback, days };
}

describe('classify', () => {
  it('maps feedback to an outcome', () => {
    const risky = { verdict: 'danger', scamType: 'job_trafficking' } as const;
    const safe = { verdict: 'safe', scamType: 'none' } as const;
    expect(classify(risky, { checkId: 'x', correct: true })).toBe('right');
    expect(classify(risky, { checkId: 'x', correct: false, actualVerdict: 'safe' })).toBe('false_alarm');
    expect(classify(risky, { checkId: 'x', correct: false, actualScamType: 'investment' })).toBe('wrong_type');
    expect(classify(risky, { checkId: 'x', correct: false, actualScamType: 'job_trafficking' })).toBe('wrong');
    expect(classify(risky, { checkId: 'x', correct: false })).toBe('wrong');
    expect(classify(safe, { checkId: 'x', correct: false, actualVerdict: 'danger' })).toBe('missed_scam');
    expect(classify(safe, { checkId: 'x', correct: false, actualScamType: 'investment' })).toBe('missed_scam');
    expect(classify(safe, { checkId: 'x', correct: false })).toBe('wrong');
  });

  it('builds tally increments', () => {
    expect(tallyIncrements('missed_scam', 'investment')).toEqual({ n: 1, wrong: 1, missed: 1, missedAs_investment: 1 });
    expect(tallyIncrements('right')).toEqual({ n: 1, right: 1 });
  });
});

describe('parseFeedback', () => {
  it('accepts the contract and drops detail on a thumbs up', () => {
    expect(parseFeedback({ checkId: 'chk_abc123', correct: true, actualVerdict: 'safe' })).toEqual({
      checkId: 'chk_abc123',
      correct: true,
    });
    expect(parseFeedback({ checkId: 'chk_abc123', correct: false, actualVerdict: 'safe', actualScamType: 'none' })).toMatchObject({
      actualVerdict: 'safe',
    });
  });
  it('rejects free text, unknown keys and bad ids', () => {
    for (const body of [
      { checkId: 'chk_abc123', correct: false, comment: 'it was my aunt' },
      { checkId: 'nope', correct: true },
      { checkId: 'chk_abc123' },
      { checkId: 'chk_abc123', correct: false, actualScamType: 'made_up' },
    ]) {
      expect(() => parseFeedback(body)).toThrow(ApiError);
    }
  });
});

describe('feedback weighting', () => {
  it('a false alarm lowers a signal from 1 to the contradicted weight, once', async () => {
    const t = setup();
    const c = await t.check(SCAM);
    const typeId = 'type:GLOBAL:job_trafficking';
    expect(t.days(typeId)).toBe(CONFIRMED_WEIGHT);
    const res = await t.post('/v1/feedback', { checkId: c.id, correct: false, actualVerdict: 'safe' });
    expect(res.status).toBe(200);
    expect(t.days(typeId)).toBeCloseTo(CONTRADICTED_WEIGHT);
    await t.post('/v1/feedback', { checkId: c.id, correct: false, actualVerdict: 'safe' });
    expect(t.days(typeId)).toBeCloseTo(CONTRADICTED_WEIGHT);
    const sig = [...t.store.signals.values()][0];
    expect(sig?.w).toBe(CONTRADICTED_WEIGHT);
  });

  it('contradicted signals no longer reach k-anonymity', async () => {
    const t = setup();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      ids.push((await t.check(`${SCAM} ${i}`, {}, `u:${i}`)).id);
    }
    expect((await t.intel.insights('GLOBAL', 30)).risks.find((r) => r.scamType === 'job_trafficking')?.count).toBe(3);
    for (const [i, id] of ids.entries()) await t.post('/v1/feedback', { checkId: id, correct: false, actualVerdict: 'safe' }, `u:${i}`);
    const after = await t.intel.insights('GLOBAL', 30);
    expect(after.risks.find((r) => r.scamType === 'job_trafficking')).toBeUndefined();
  });

  it('a different-scam answer moves the type count and keeps the indicators', async () => {
    const t = setup();
    const c = await t.check(SCAM);
    await t.post('/v1/feedback', { checkId: c.id, correct: false, actualVerdict: 'danger', actualScamType: 'investment' });
    expect(t.days('type:GLOBAL:job_trafficking')).toBeCloseTo(CONTRADICTED_WEIGHT);
    expect(t.days('type:GLOBAL:investment')).toBe(CONFIRMED_WEIGHT);
    const ind = [...t.store.aggs.values()].filter((a) => a.kind === 'ind');
    expect(ind.length).toBeGreaterThan(0);
    for (const a of ind) expect(Object.values(a.real.days)[0]).toBe(1);
  });

  it('a missed scam on a safe verdict becomes a confirmed signal at weight 1', async () => {
    const t = setup();
    const c = await t.check(SAFE);
    expect(c.verdict).toBe('safe');
    expect(t.store.signals.size).toBe(0);
    await t.post('/v1/feedback', { checkId: c.id, correct: false, actualVerdict: 'danger', actualScamType: 'parcel_phishing' }, 'u:1');
    const [sig] = [...t.store.signals.values()];
    expect(sig).toMatchObject({ confirmed: true, src: 'feedback', scamType: 'parcel_phishing' });
    expect(sig?.w).toBeUndefined();
    expect(t.days('type:GLOBAL:parcel_phishing')).toBe(1);
  });

  it('thumbs up and unspecified thumbs down change no weight', async () => {
    const t = setup();
    const c = await t.check(SCAM);
    await t.post('/v1/feedback', { checkId: c.id, correct: true });
    expect(t.days('type:GLOBAL:job_trafficking')).toBe(1);
    const d = await t.check(`${SCAM} again`, {}, 'u:9');
    await t.post('/v1/feedback', { checkId: d.id, correct: false }, 'u:9');
    expect(t.days('type:GLOBAL:job_trafficking')).toBe(2);
  });
});

describe('feedback storage and limits', () => {
  it('stores only redacted data and no raw input, uid or check id', async () => {
    const t = setup();
    const c = await t.check(`${SAFE} call +66 81 234 5678`);
    await t.post('/v1/feedback', { checkId: c.id, correct: false, actualVerdict: 'danger' }, 'u:secret-uid');
    const dump = JSON.stringify({
      checks: [...t.fstore.checks],
      fb: [...t.fstore.feedback],
      tallies: [...t.fstore.tallies],
      sigs: [...t.store.signals.values()],
    });
    for (const needle of ['81 234 5678', '812345678', 'secret-uid', c.id, 'lunch at noon']) expect(dump).not.toContain(needle);
  });

  it('keeps the check link for 7 days and answers 404 after that', async () => {
    const t = setup();
    const c = await t.check(SCAM);
    const [rec] = [...t.fstore.checks.values()];
    expect((rec?.expireAt.getTime() ?? 0) - NOW.getTime()).toBe(7 * 86_400_000);
    t.fstore.checks.forEach((r) => {
      r.expireAt = new Date(NOW.getTime() - 1);
    });
    const res = await t.post('/v1/feedback', { checkId: c.id, correct: true });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('not_found');
    expect(await t.fstore.sweepExpired(NOW)).toBe(1);
  });

  it('writes no link when the check opted out of sharing', async () => {
    const t = setup();
    const c = await t.check(SCAM, { shareSignals: false });
    expect(t.fstore.checks.size).toBe(0);
    expect((await t.post('/v1/feedback', { checkId: c.id, correct: true })).status).toBe(404);
  });

  it('rate limits per uid', async () => {
    const t = setup({ FEEDBACK_LIMIT_PER_HOUR: '2' });
    const c = await t.check(SCAM);
    const codes: number[] = [];
    for (let i = 0; i < 3; i++) codes.push((await t.post('/v1/feedback', { checkId: c.id, correct: true }, 'u:1')).status);
    expect(codes).toEqual([200, 200, 429]);
    expect((await t.post('/v1/feedback', { checkId: c.id, correct: true }, 'u:2')).status).toBe(200);
  });

  it('400 on free text', async () => {
    const t = setup();
    const c = await t.check(SCAM);
    expect((await t.post('/v1/feedback', { checkId: c.id, correct: false, note: 'hi' })).status).toBe(400);
  });
});

describe('reported scams', () => {
  it('records a confirmed signal even when the model said safe, and tallies lostMoney', async () => {
    const t = setup();
    const r = await t.check(SAFE, { reported: true, reportedType: 'investment', lostMoney: true }, 'u:7');
    expect(r.verdict).toBe('safe');
    const [sig] = [...t.store.signals.values()];
    expect(sig).toMatchObject({ confirmed: true, src: 'reported', scamType: 'investment' });
    expect(sig?.w).toBeUndefined();
    expect(JSON.stringify(sig)).not.toContain('lostMoney');
    expect(t.fstore.tallies.get('reported:investment')).toEqual({ reports: 1, lostMoneyYes: 1 });
    expect(t.fstore.checks.size).toBe(0);
  });

  it('counts once per reporter and day, like any reporter', async () => {
    const t = setup();
    await t.check(`${SCAM} one`, { reported: true, reportedType: 'job_trafficking' }, 'u:7');
    await t.check(`${SCAM} two`, { reported: true, reportedType: 'job_trafficking' }, 'u:7');
    expect(t.days('type:GLOBAL:job_trafficking')).toBe(1);
  });

  it('still redacts: no phone or handle in storage', async () => {
    const t = setup();
    await t.check(`${SCAM} +66 81 234 5678`, { reported: true, reportedType: 'job_trafficking' });
    const dump = JSON.stringify([...t.store.signals.values()]);
    expect(dump).not.toContain('81 234 5678');
    expect(dump).not.toContain('gold_hr_agent');
  });

  it('requires a scam type', async () => {
    const t = setup();
    expect((await t.post('/v1/check', { kind: 'message', text: SCAM, reported: true })).status).toBe(400);
  });
});

describe('tally and export', () => {
  it('keeps a tally per scam type and per language', async () => {
    const t = setup();
    const a = await t.check(SCAM);
    const b = await t.check(`${SCAM} two`);
    await t.post('/v1/feedback', { checkId: a.id, correct: true });
    await t.post('/v1/feedback', { checkId: b.id, correct: false, actualVerdict: 'safe' });
    const tallies = await t.fstore.listTallies();
    const type = tallyRows(tallies, 'type').find((r) => r.key === 'job_trafficking');
    expect(type).toMatchObject({ n: 2, right: 1, wrong: 1, falseAlarm: 1, accuracy: 0.5 });
    expect(tallyRows(tallies, 'lang')[0]?.n).toBe(2);
    expect(formatTallies(tallies)).toContain('job_trafficking');
  });

  it('exports false alarms and misses as labelled redacted cases', () => {
    const base = {
      v: 1 as const,
      correct: false,
      verdict: 'danger' as const,
      scamType: 'other' as const,
      kind: 'message' as const,
      language: 'en',
      day: '20261014',
      expireAt: NOW,
    };
    const docs = [
      { ...base, outcome: 'false_alarm' as const, template: 'Your bank statement for [MONTH] is ready in the app, no action needed.' },
      {
        ...base,
        outcome: 'missed_scam' as const,
        verdict: 'safe' as const,
        template: 'Pay the [AMOUNT] release fee to [ACCOUNT] to get your prize today.',
      },
      { ...base, outcome: 'wrong_type' as const, template: 'Pay the [AMOUNT] release fee to [ACCOUNT] to get your prize today.' },
      { ...base, outcome: 'false_alarm' as const, template: 'Call me on 0812345678 about the invoice please' },
      { ...base, outcome: 'false_alarm' as const },
    ];
    const out = buildCandidates(docs);
    expect(out.map((c) => c.expect).sort()).toEqual(['risky', 'safe', 'safe']);
    expect(out.some((c) => c.text.includes('[PHONE]'))).toBe(true);
    expect(JSON.stringify(out)).not.toContain('0812345678');
    const kept = mergeCandidates([{ ...out[0], expect: 'risky' } as (typeof out)[number]], out);
    expect(kept.find((c) => c.id === out[0]?.id)?.expect).toBe('risky');
  });
});
