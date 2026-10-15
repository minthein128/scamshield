import { createHttpClient } from '../api/http';
import { ApiError, codeFromStatus } from '../api/errors';
import { createMockClient } from '../api/mock';
import { SCAM_CHOICES, buildFeedback, buildReportRequest, canGiveFeedback, markAnswered, reportReady, wasAnswered } from '../lib/feedback';

const result = { id: 'chk_abc123def456', createdAt: '2026-10-14T00:00:00Z' };

describe('buildFeedback', () => {
  it('maps each answer to the contract body', () => {
    expect(buildFeedback(result, { kind: 'right' })).toEqual({ checkId: result.id, correct: true });
    expect(buildFeedback(result, { kind: 'safe' })).toEqual({ checkId: result.id, correct: false, actualVerdict: 'safe' });
    expect(buildFeedback(result, { kind: 'scam' })).toEqual({ checkId: result.id, correct: false, actualVerdict: 'danger' });
    expect(buildFeedback(result, { kind: 'scam', scamType: 'investment' })).toMatchObject({ actualScamType: 'investment' });
    expect(buildFeedback(result, { kind: 'different', scamType: 'fake_agency' })).toEqual({
      checkId: result.id,
      correct: false,
      actualVerdict: 'danger',
      actualScamType: 'fake_agency',
    });
  });

  it('has no free-text field', () => {
    const keys = Object.keys(buildFeedback(result, { kind: 'different', scamType: 'other' }));
    expect(keys.sort()).toEqual(['actualScamType', 'actualVerdict', 'checkId', 'correct']);
  });
});

describe('canGiveFeedback', () => {
  const now = Date.parse('2026-10-16T00:00:00Z');
  it('allows a fresh check and blocks one older than 7 days', () => {
    expect(canGiveFeedback(result, now)).toBe(true);
    expect(canGiveFeedback(result, Date.parse('2026-10-22T00:00:00Z'))).toBe(false);
  });
  it('ignores checks that did not come from the server', () => {
    expect(canGiveFeedback({ id: 'local_1', createdAt: result.createdAt }, now)).toBe(false);
  });
  it('remembers an answer for the session', () => {
    expect(wasAnswered('chk_zzz')).toBe(false);
    markAnswered('chk_zzz');
    expect(wasAnswered('chk_zzz')).toBe(true);
  });
});

describe('buildReportRequest', () => {
  const base = { text: '  Pay the fee now  ', scamType: 'parcel_phishing' as const, lostMoney: null, language: 'en' as const };

  it('keeps the normal kinds and adds the report fields', () => {
    expect(buildReportRequest(base)).toEqual({ kind: 'message', language: 'en', text: 'Pay the fee now', reported: true, reportedType: 'parcel_phishing' });
    expect(buildReportRequest({ ...base, scamType: 'job_trafficking' })?.kind).toBe('job');
    expect(buildReportRequest({ ...base, scamType: 'marketplace_fraud' })?.kind).toBe('shop');
    expect(buildReportRequest({ ...base, text: 'https://pay-fee.example/x' })).toMatchObject({ kind: 'link', url: 'https://pay-fee.example/x' });
  });

  it('sends lostMoney as yes or no only', () => {
    expect(buildReportRequest({ ...base, lostMoney: true })?.lostMoney).toBe(true);
    expect(buildReportRequest({ ...base, lostMoney: false })?.lostMoney).toBe(false);
    expect(buildReportRequest(base)).not.toHaveProperty('lostMoney');
  });

  it('needs input and a type, and takes a screenshot instead of text', () => {
    expect(buildReportRequest({ ...base, scamType: null })).toBeNull();
    expect(buildReportRequest({ ...base, text: ' ' })).toBeNull();
    expect(reportReady({ text: '', scamType: 'other', imageBase64: 'abc' })).toBe(true);
    expect(buildReportRequest({ ...base, text: '', imageBase64: 'abc' })).toMatchObject({ imageBase64: 'abc', imageMimeType: 'image/jpeg' });
  });

  it('offers every scam type except none', () => {
    expect(SCAM_CHOICES.map(c => c.type)).not.toContain('none');
    expect(SCAM_CHOICES).toHaveLength(7);
  });
});

describe('feedback client', () => {
  it('posts to /v1/feedback and treats 200 as success', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    const client = createHttpClient({ baseUrl: 'https://api.test/', fetchImpl, getToken: async () => 'tok' });
    await expect(client.feedback({ checkId: 'chk_abc123', correct: true })).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.test/v1/feedback',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ checkId: 'chk_abc123', correct: true }), headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
    );
  });

  it('maps 404 and 429', async () => {
    const mk = (status: number, code: string) =>
      createHttpClient({ baseUrl: 'https://api.test', fetchImpl: jest.fn().mockResolvedValue({ ok: false, status, json: async () => ({ error: { code, message: 'm' } }) }) });
    await expect(mk(404, 'not_found').feedback({ checkId: 'chk_abc123', correct: true })).rejects.toMatchObject({ code: 'not_found' });
    await expect(mk(429, 'rate_limited').feedback({ checkId: 'chk_abc123', correct: true })).rejects.toMatchObject({ code: 'rate_limited' });
    expect(codeFromStatus(404)).toBe('not_found');
  });

  it('the mock client accepts feedback and rejects a bad id', async () => {
    const client = createMockClient({ delayMs: 0 });
    await expect(client.feedback({ checkId: 'chk_mock_abc', correct: false, actualVerdict: 'safe' })).resolves.toBeUndefined();
    await expect(client.feedback({ checkId: 'x', correct: true })).rejects.toBeInstanceOf(ApiError);
  });

  it('the mock client answers a report with the normal response', async () => {
    const client = createMockClient({ delayMs: 0 });
    const res = await client.check({ kind: 'message', language: 'en', text: 'Pay the processing fee', reported: true, reportedType: 'parcel_phishing' });
    expect(res.id).toMatch(/^chk_/);
  });
});
