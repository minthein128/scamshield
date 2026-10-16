import { buildMockResponse, createMockClient } from '../api/mock';
import { isCheckResponse } from '../api/validate';

describe('mock backend', () => {
  it('flags a trafficking-style job post as danger', () => {
    const r = buildMockResponse({
      kind: 'job',
      language: 'en',
      text: 'Urgent! Data entry staff needed in Thailand. High salary, free flight. DM us on Telegram. Pay processing fee first.',
    });
    expect(isCheckResponse(r)).toBe(true);
    expect(r.verdict).toBe('danger');
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.flags.map(f => f.family)).toEqual(expect.arrayContaining(['pressure', 'payment_route', 'identity']));
    expect(r.scamType).toBe('job_trafficking');
  });

  it('marks a suspicious link', () => {
    const r = buildMockResponse({ kind: 'link', language: 'en', url: 'https://track-parcel-fee.top/claim' });
    expect(r.linkChecks[0].webRisk).toBe('social_engineering');
    expect(r.verdict).not.toBe('safe');
  });

  it('returns safe for plain text and localizes copy', () => {
    const r = buildMockResponse({ kind: 'message', language: 'id', text: 'See you at lunch tomorrow' });
    expect(r.verdict).toBe('safe');
    expect(r.title).toBe('Risiko rendah');
    expect(r.scamType).toBe('none');
  });

  it('keeps score and verdict consistent with the contract bands', () => {
    for (const text of ['hello', 'urgent telegram', 'urgent telegram high salary deposit thailand data entry']) {
      const r = buildMockResponse({ kind: 'job', language: 'en', text });
      const expected = r.score >= 70 ? 'danger' : r.score >= 35 ? 'careful' : 'safe';
      expect(r.verdict).toBe(expected);
    }
  });

  it('client rejects empty input and answers health', async () => {
    const client = createMockClient({ delayMs: 0 });
    await expect(client.check({ kind: 'job', language: 'en' })).rejects.toMatchObject({ code: 'bad_request' });
    await expect(client.health()).resolves.toMatchObject({ mock: true });
    const r = await client.check({ kind: 'job', language: 'en', text: 'hi' });
    expect(r.id).toMatch(/^chk_/);
  });
});
