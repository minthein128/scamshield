import { describe, expect, it, vi } from 'vitest';
import type { Grounder } from '../src/ground.js';
import { assessJobOffer, mergeFacts } from '../src/job/assess.js';
import type { JobExtraction } from '../src/job/types.js';
import { findJobBanned } from '../src/language-guard.js';
import type { Flag } from '../src/types.js';
import { f, facts } from './helpers/job.js';

const fakeGrounder = (companyFound: boolean | undefined, flags: Flag[] = []) => {
  const ground = vi.fn(async () => ({
    flags,
    sources: [{ title: 'Registry', url: 'https://registry.example/x' }],
    ...(companyFound === undefined ? {} : { companyFound }),
  }));
  return { ground } satisfies Grounder;
};

const legitAd = facts({
  employer: f('Golden Lotus Garment Co., Ltd.'),
  workplace: f('Bangna, Bangkok'),
  destinationCountry: f('Thailand'),
  contract: f('official' as const),
  visaOrPermit: f('work_visa' as const),
  salary: f({ amount: 12000, currency: 'THB', period: 'monthly' as const }, '12,000 THB'),
});
const recruiterChat = facts({
  employer: f('Golden Lotus Garment'),
  contactChannel: f('personal_chat_app' as const, 'add me on LINE: ko_aung_99, call 0812345678'),
});

describe('job assessment', () => {
  it('reports company found and recruiter not confirmed as two findings; company found never lowers risk', async () => {
    const without = await assessJobOffer({ facts: { ad: legitAd, chat: recruiterChat }, language: 'en' });
    const g = fakeGrounder(true);
    const withFound = await assessJobOffer({ facts: { ad: legitAd, chat: recruiterChat }, language: 'en' }, { grounder: g });
    expect(withFound.findings).toEqual([
      { code: 'company_found', label: 'We found a company with this name' },
      { code: 'recruiter_not_confirmed', label: 'We could not confirm this recruiter works for that company' },
    ]);
    expect(withFound.score).toBe(without.score);
    expect(without.findings.map((x) => x.code)).toEqual(['company_not_checked', 'recruiter_not_confirmed']);

    const risky = facts({ ...recruiterChat, paymentRequest: f('before_contract' as const) });
    const a = await assessJobOffer({ facts: { ad: legitAd, chat: risky }, language: 'en' });
    const b = await assessJobOffer({ facts: { ad: legitAd, chat: risky }, language: 'en' }, { grounder: fakeGrounder(true) });
    expect(b.score).toBe(a.score);
  });

  it('sends only organisation names, company hostnames and the country to search', async () => {
    const g = fakeGrounder(false);
    const chat = facts({
      employer: f('Golden Lotus Garment'),
      contactChannel: f('company_channel' as const, 'hr@goldenlotus.example.co.th'),
    });
    const res = await assessJobOffer({ facts: { ad: legitAd, chat }, language: 'th' }, { grounder: g });
    const [req, extraction, , opts] = g.ground.mock.calls[0] as unknown as [unknown, { entities: unknown }, number, unknown];
    expect(req).toEqual({ language: 'th' });
    expect(extraction).toEqual({
      entities: { companies: ['Golden Lotus Garment Co., Ltd.'], phones: [], domains: ['goldenlotus.example.co.th'], country: 'Thailand' },
    });
    expect(opts).toEqual({ companyCheck: true });
    expect(res.findings[0]).toEqual({ code: 'company_not_found', label: 'เราไม่พบบริษัทที่มีชื่อนี้' });

    const gmail = fakeGrounder(true);
    const personal = facts({ employer: f('Golden Lotus'), contactChannel: f('email' as const, 'koaung@gmail.com') });
    await assessJobOffer({ facts: { ad: null, chat: personal }, language: 'en' }, { grounder: gmail });
    expect((gmail.ground.mock.calls[0] as unknown as [unknown, { entities: { domains: string[] } }])[1].entities.domains).toEqual([]);
  });

  it('skips search and findings without an employer, and survives a search failure', async () => {
    const g = fakeGrounder(true);
    const res = await assessJobOffer({ facts: { chat: facts({ visaOrPermit: f('tourist' as const) }) }, language: 'en' }, { grounder: g });
    expect(g.ground).not.toHaveBeenCalled();
    expect(res.findings).toEqual([]);
    const broken: Grounder = { ground: async () => Promise.reject(new Error('down')) };
    const out = await assessJobOffer({ facts: { ad: legitAd }, language: 'en' }, { grounder: broken });
    expect(out.findings[0]?.code).toBe('company_not_checked');
  });

  it('guards wording that comes back from search', async () => {
    const g = fakeGrounder(true, [
      { family: 'identity', label: 'This agency is safe and verified job offers', evidence: 'No risk detected', severity: 'low' },
    ]);
    const res = await assessJobOffer({ facts: { ad: legitAd }, language: 'en' }, { grounder: g });
    for (const fl of res.flags) {
      expect(findJobBanned(fl.label, 'en')).toEqual([]);
      expect(findJobBanned(fl.evidence, 'en')).toEqual([]);
    }
  });

  it('maps tiers and uses the spec wording', async () => {
    const lower = await assessJobOffer({ facts: { ad: legitAd, chat: recruiterChat }, language: 'en' });
    expect(lower).toMatchObject({
      attention: 'lower',
      verdict: 'safe',
      title: 'Few warning signs found, but important details may still be missing',
      attentionHeadline: 'Few warning signs found, but important details may still be missing',
      scamType: 'none',
    });
    const pause = await assessJobOffer({ facts: { chat: facts({ documentRequest: f('passport_hold' as const) }) }, language: 'en' });
    expect(pause).toMatchObject({ attention: 'pause', verdict: 'danger', title: 'Pause before you pay, send documents or travel' });
    expect(pause.actions.some((a) => a.type === 'call')).toBe(true);
  });

  it('localises every user-facing string', async () => {
    const chat = facts({
      employer: f('Silver Moon Trading'),
      workerFee: f('300000 MMK', 'ငွေ ၃ သိန်း'),
      documentRequest: f('passport_photo' as const, 'ပတ်စပို့ ဓာတ်ပုံ ပို့ပါ'),
    });
    const ad = facts({ employer: f('Golden Lotus'), workerFee: f('none', 'အခမဲ့') });
    for (const lang of ['my', 'th'] as const) {
      const res = await assessJobOffer({ facts: { ad, chat }, language: lang }, { grounder: fakeGrounder(true) });
      const strings = [
        res.title,
        res.summary,
        res.spokenWarning,
        ...res.flags.map((x) => x.label),
        ...res.conflicts.flatMap((c) => [c.fieldLabel, c.description]),
        ...res.stillUnclear,
        ...res.findings.map((x) => x.label),
        ...res.actions.map((a) => a.label),
      ];
      for (const s of strings) expect(s, `${lang}: ${s}`).not.toMatch(/^[A-Za-z]/);
      expect(res.conflicts.map((c) => c.chatValue)).toContain('300000 MMK');
    }
  });

  it('assesses from the stored extraction when the jobId is known', async () => {
    const stored: JobExtraction = {
      ad: facts({ workerFee: f('none', 'No fee'), employer: f('Golden Lotus', 'Golden Lotus Co') }),
      chat: facts({ workerFee: f('15000 THB', 'pay 15,000 baht'), visaOrPermit: f('tourist' as const, 'come as tourist') }),
    };
    const res = await assessJobOffer(
      {
        jobId: 'job_abc',
        facts: {
          ad: { employer: { value: 'Golden Lotus Garment', quote: 'tampered quote', confidence: 1, edited: true } },
          chat: { visaOrPermit: { value: 'not_mentioned', quote: '', confidence: 1, edited: true } },
        },
        language: 'en',
      },
      { getStored: (id) => (id === 'job_abc' ? stored : undefined) },
    );
    expect(res.usedStoredExtraction).toBe(true);
    expect(res.id).toBe('job_abc');
    expect(res.adFacts?.employer).toEqual({ value: 'Golden Lotus Garment', quote: 'Golden Lotus Co', confidence: 0.9, edited: true });
    expect(res.adFacts?.workerFee?.quote).toBe('No fee');
    expect(res.chatFacts?.visaOrPermit).toBeNull();
    expect(res.conflicts.map((c) => c.code)).toEqual(['fee_vs_no_fee']);
  });

  it('falls back to the request facts when the jobId is unknown, and needs facts then', async () => {
    const res = await assessJobOffer(
      { jobId: 'job_gone', facts: { chat: facts({ visaOrPermit: f('tourist' as const) }) }, language: 'en' },
      { getStored: () => undefined },
    );
    expect(res.usedStoredExtraction).toBe(false);
    expect(res.attention).toBe('pause');
    await expect(assessJobOffer({ jobId: 'job_gone', language: 'en' }, { getStored: () => undefined })).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe('mergeFacts', () => {
  const stored = facts({ employer: f('A Co', 'A Co quote'), contract: f('official' as const, 'contract quote') });

  it('keeps stored facts for missing keys, removes nulls, applies edits with the stored quote', () => {
    const out = mergeFacts(stored, {
      contract: null,
      salary: { value: { amount: 9000, currency: 'THB', period: 'monthly' }, quote: 'user', confidence: 1, edited: true },
    });
    expect(out?.employer).toEqual(stored.employer);
    expect(out?.contract).toBeNull();
    expect(out?.salary).toEqual({ value: { amount: 9000, currency: 'THB', period: 'monthly' }, quote: '', confidence: 1, edited: true });
  });

  it('ignores unedited values that differ from the stored extraction', () => {
    const out = mergeFacts(stored, { employer: { value: 'Other', quote: 'x', confidence: 1 } });
    expect(out?.employer).toEqual(stored.employer);
  });

  it('returns stored facts when the request leaves the source out, null when it clears it', () => {
    expect(mergeFacts(stored, undefined)).toBe(stored);
    expect(mergeFacts(stored, null)).toBeNull();
  });
});
