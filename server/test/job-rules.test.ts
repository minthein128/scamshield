import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collectFlags, detectConflicts, STRONG_CONFLICTS, scoreJob, singleSourceFlags, stillUnclear } from '../src/job/rules.js';
import type { JobFacts } from '../src/job/types.js';
import { f, facts, refused } from './helpers/job.js';

const assess = (ad: JobFacts | null, chat: JobFacts | null) => {
  const conflicts = detectConflicts(ad, chat);
  const flags = collectFlags(ad, chat, conflicts);
  return { conflicts, ...scoreJob(flags, conflicts) };
};

const salary = (amount: number, currency: string, period: 'monthly' | 'yearly' | 'daily') => f({ amount, currency, period }, `${amount}`);

describe('conflict rules', () => {
  it('fee: ad says none, chat states a positive amount', () => {
    const c = detectConflicts(facts({ workerFee: f('none', 'No fee') }), facts({ workerFee: f('300 USD', 'pay 300 USD') }));
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ field: 'workerFee', code: 'fee_vs_no_fee', family: 'payment_route', severity: 'high' });
    expect(c[0]?.description).toContain('300 USD');
  });

  it('fee: no conflict when both say no fee, or the ad fee contains a zero digit', () => {
    expect(detectConflicts(facts({ workerFee: f('none') }), facts({ workerFee: f('no fee') }))).toEqual([]);
    expect(detectConflicts(facts({ workerFee: f('500 USD fee') }), facts({ workerFee: f('500 USD') }))).toEqual([]);
    expect(detectConflicts(facts({ workerFee: f('none') }), facts({ workerFee: f('deposit, amount not stated') }))).toEqual([]);
  });

  it('fee: Burmese and Thai digits count as a positive amount', () => {
    expect(detectConflicts(facts({ workerFee: f('none') }), facts({ workerFee: f('၃၀၀,၀၀၀ ကျပ်') }))[0]?.code).toBe('fee_vs_no_fee');
    expect(detectConflicts(facts({ workerFee: f('ฟรี') }), facts({ workerFee: f('๑๕,๐๐๐ บาท') }))[0]?.code).toBe('fee_vs_no_fee');
  });

  it('documents: passport photo and passport hold in chat against no documents in the ad', () => {
    const ad = facts({ documentRequest: f('none' as const) });
    expect(detectConflicts(ad, facts({ documentRequest: f('passport_photo' as const) }))[0]).toMatchObject({
      code: 'documents_passport_photo',
      family: 'trafficking',
      severity: 'high',
    });
    expect(detectConflicts(ad, facts({ documentRequest: f('passport_hold' as const) }))[0]?.code).toBe('documents_passport_hold');
    expect(detectConflicts(ad, facts({ documentRequest: f('id_copy' as const) }))[0]).toMatchObject({
      code: 'documents_id_copy',
      severity: 'medium',
    });
  });

  it('documents: an ad that mentions no documents counts against a passport photo or hold in the chat', () => {
    const photo = detectConflicts(
      facts({ employer: f('Golden Lotus') }),
      facts({ documentRequest: f('passport_photo' as const, 'send passport photo') }),
    );
    expect(photo).toEqual([
      expect.objectContaining({
        code: 'documents_passport_photo',
        adValue: 'not_mentioned',
        adQuote: '',
        chatQuote: 'send passport photo',
      }),
    ]);
    expect(detectConflicts(facts(), facts({ documentRequest: f('passport_hold' as const) }))[0]?.code).toBe('documents_passport_hold');
    expect(detectConflicts(facts(), facts({ documentRequest: f('id_copy' as const) }))).toEqual([]);
    expect(
      detectConflicts(facts({ documentRequest: f('passport_photo' as const) }), facts({ documentRequest: f('passport_photo' as const) })),
    ).toEqual([]);
    expect(detectConflicts(null, facts({ documentRequest: f('passport_photo' as const) }))).toEqual([]);
  });

  it('contract: official in the ad against later, none or pay first in the chat', () => {
    const ad = facts({ contract: f('official' as const) });
    expect(detectConflicts(ad, facts({ contract: f('later' as const) }))[0]?.code).toBe('contract_later');
    expect(detectConflicts(ad, facts({ contract: f('none' as const) }))[0]?.code).toBe('contract_later');
    expect(detectConflicts(ad, facts({ paymentRequest: f('before_contract' as const) }))[0]).toMatchObject({
      code: 'contract_pay_first',
      family: 'payment_route',
    });
  });

  it('visa: work visa in the ad against tourist or none in the chat', () => {
    const ad = facts({ visaOrPermit: f('work_visa' as const) });
    expect(detectConflicts(ad, facts({ visaOrPermit: f('tourist' as const) }))[0]).toMatchObject({
      code: 'visa_tourist',
      severity: 'high',
    });
    expect(detectConflicts(ad, facts({ visaOrPermit: f('none' as const) }))[0]?.code).toBe('visa_none');
  });

  it('meeting point: workplace in the ad against driver, border or unnamed in the chat', () => {
    const ad = facts({ meetingPoint: f('workplace' as const) });
    for (const v of ['driver_pickup', 'border', 'unnamed'] as const) {
      expect(detectConflicts(ad, facts({ meetingPoint: f(v) }))[0]).toMatchObject({ code: 'meeting_informal', severity: 'medium' });
    }
    expect(detectConflicts(ad, facts({ meetingPoint: f('airport' as const) }))).toEqual([]);
  });

  it('employer: normalises legal forms and small typos before comparing', () => {
    const ad = facts({ employer: f('Golden Lotus Garment Co., Ltd.') });
    expect(detectConflicts(ad, facts({ employer: f('golden lotus garment company') }))).toEqual([]);
    expect(detectConflicts(ad, facts({ employer: f('Golden Lotus Garmant') }))).toEqual([]);
    expect(detectConflicts(facts({ employer: f('บริษัท ดาวเหนือ จำกัด') }), facts({ employer: f('ดาวเหนือ') }))).toEqual([]);
    expect(detectConflicts(facts({ employer: f('ရွှေကြာ ကုမ္ပဏီ') }), facts({ employer: f('ရွှေကြာ') }))).toEqual([]);
    expect(detectConflicts(facts({ employer: f('Mekong Star Sdn Bhd') }), facts({ employer: f('Mekong Star') }))).toEqual([]);
    expect(detectConflicts(ad, facts({ employer: f('Silver Moon Trading') }))[0]).toMatchObject({
      code: 'employer_different',
      family: 'identity',
      severity: 'medium',
    });
  });

  it('employer and workplace: a refusal flagged by the model is a conflict, keyword text is not needed', () => {
    const ad = facts({ employer: f('Golden Lotus Garment'), workplace: f('Bangna, Bangkok') });
    const chat = facts({ employer: refused('ကုမ္ပဏီနာမည် နောက်မှပြောမယ်'), workplace: refused('ရောက်မှ လိပ်စာပေးမယ်') });
    expect(detectConflicts(ad, chat).map((c) => c.code)).toEqual(['employer_refused', 'workplace_refused']);
    const later = facts({ workplace: f('Office will move later this year', 'Office will move later this year') });
    expect(detectConflicts(ad, later)).toEqual([]);
  });

  it('salary: same currency and period, more than 25% apart', () => {
    const ad = facts({ salary: salary(12000, 'THB', 'monthly') });
    expect(detectConflicts(ad, facts({ salary: salary(18000, 'THB', 'monthly') }))[0]).toMatchObject({
      code: 'salary_different',
      family: 'too_good',
      severity: 'low',
    });
    expect(detectConflicts(ad, facts({ salary: salary(14000, 'baht', 'monthly') }))).toEqual([]);
  });

  it('salary: monthly against yearly is normalised, other mismatches are not compared', () => {
    const ad = facts({ salary: salary(12000, 'THB', 'monthly') });
    expect(detectConflicts(ad, facts({ salary: salary(144000, 'THB', 'yearly') }))).toEqual([]);
    expect(detectConflicts(ad, facts({ salary: salary(400, 'USD', 'monthly') }))).toEqual([]);
    expect(detectConflicts(ad, facts({ salary: salary(500, 'THB', 'daily') }))).toEqual([]);
  });

  it('one source only: no conflict', () => {
    const chat = facts({ workerFee: f('300 USD'), visaOrPermit: f('tourist' as const), contract: f('later' as const) });
    expect(detectConflicts(null, chat)).toEqual([]);
    expect(detectConflicts(facts(), chat)).toEqual([]);
  });

  it('same value on both sides: no conflict', () => {
    const same = facts({
      employer: f('Golden Lotus Garment'),
      workerFee: f('none'),
      contract: f('official' as const),
      visaOrPermit: f('work_visa' as const),
      meetingPoint: f('workplace' as const),
      documentRequest: f('none' as const),
      salary: salary(12000, 'THB', 'monthly'),
    });
    expect(detectConflicts(same, same)).toEqual([]);
    expect(assess(same, same).verdict).toBe('safe');
  });

  it('localises the conflict text and keeps both quotes', () => {
    const c = detectConflicts(facts({ workerFee: f('none', 'အခမဲ့') }), facts({ workerFee: f('300000 MMK', 'ငွေ ၃ သိန်း ပေးရမယ်') }), 'my');
    expect(c[0]?.fieldLabel).toBe('အလုပ်သမားပေးရသည့်ကြေး');
    expect(c[0]?.description).toMatch(/ကြော်ငြာ/);
    expect(c[0]).toMatchObject({ adQuote: 'အခမဲ့', chatQuote: 'ငွေ ၃ သိန်း ပေးရမယ်' });
  });
});

describe('strong conflicts', () => {
  const strong: Array<[string, JobFacts, JobFacts]> = [
    ['fee_vs_no_fee', facts({ workerFee: f('none') }), facts({ workerFee: f('300 USD') })],
    ['documents_passport_photo', facts(), facts({ documentRequest: f('passport_photo' as const) })],
    ['documents_passport_hold', facts({ documentRequest: f('none' as const) }), facts({ documentRequest: f('passport_hold' as const) })],
    ['contract_later', facts({ contract: f('official' as const) }), facts({ contract: f('later' as const) })],
    ['contract_pay_first', facts({ contract: f('official' as const) }), facts({ paymentRequest: f('before_contract' as const) })],
    ['visa_tourist', facts({ visaOrPermit: f('work_visa' as const) }), facts({ visaOrPermit: f('tourist' as const) })],
  ];

  it('covers exactly the strong rows of the spec table', () => {
    expect([...STRONG_CONFLICTS].sort()).toEqual(strong.map(([code]) => code).sort());
  });

  it.each(strong)('%s alone reaches pause', (code, ad, chat) => {
    const r = assess(ad, chat);
    expect(r.conflicts.map((c) => c.code)).toEqual([code]);
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.verdict).toBe('danger');
  });

  it('fee vs no fee with contract later, all payment_route, reaches pause', () => {
    const r = assess(
      facts({ workerFee: f('none'), contract: f('official' as const) }),
      facts({ workerFee: f('18000 THB'), contract: f('later' as const) }),
    );
    expect(r.verdict).toBe('danger');
    expect(r.overrides).toContain('strong_conflict');
  });

  it('medium and soft conflicts do not force pause', () => {
    expect(assess(facts({ meetingPoint: f('workplace' as const) }), facts({ meetingPoint: f('driver_pickup' as const) })).verdict).toBe(
      'careful',
    );
    expect(assess(facts({ employer: f('Golden Lotus') }), facts({ employer: f('Silver Moon') })).verdict).toBe('careful');
    const salary = (amount: number) => f({ amount, currency: 'THB', period: 'monthly' as const }, String(amount));
    expect(assess(facts({ salary: salary(10000) }), facts({ salary: salary(20000) })).verdict).not.toBe('danger');
  });

  it('the legit eval pairs, as extracted live, stay at lower', () => {
    const pairs = JSON.parse(readFileSync(new URL('./fixtures/job-legit-extractions.json', import.meta.url), 'utf8')) as Record<
      string,
      { ad: JobFacts; chat: JobFacts }
    >;
    expect(Object.keys(pairs)).toHaveLength(5);
    for (const [id, p] of Object.entries(pairs)) {
      const r = assess(p.ad, p.chat);
      expect(r.conflicts, id).toEqual([]);
      expect(r.verdict, id).toBe('safe');
    }
  });
});

describe('single-source signals and scoring', () => {
  it('passport hold alone reaches pause', () => {
    const r = assess(null, facts({ documentRequest: f('passport_hold' as const, 'we keep your passport') }));
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.verdict).toBe('danger');
  });

  it('tourist visa alone reaches pause', () => {
    const r = assess(facts(), facts({ visaOrPermit: f('tourist' as const, 'come on a tourist visa') }));
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.verdict).toBe('danger');
  });

  it('passport hold and tourist visa together reach pause', () => {
    const r = assess(null, facts({ documentRequest: f('passport_hold' as const), visaOrPermit: f('tourist' as const) }));
    expect(r.score).toBeGreaterThanOrEqual(80);
  });

  it('high trafficking still forces 80 with a border-town route', () => {
    const chat = facts({ documentRequest: f('passport_hold' as const), route: f('via Mae Sot', 'via Mae Sot') });
    expect(assess(null, chat).score).toBeGreaterThanOrEqual(80);
  });

  it('a chat request for a passport photo is trafficking medium on its own', () => {
    const r = assess(null, facts({ documentRequest: f('passport_photo' as const, 'send passport photo') }));
    expect(r.flags).toEqual([expect.objectContaining({ family: 'trafficking', severity: 'medium' })]);
    expect(r.verdict).toBe('careful');
  });

  it('an ID copy in the chat is trafficking medium; in the ad it is not a signal', () => {
    expect(singleSourceFlags(facts({ documentRequest: f('id_copy' as const) }), 'chat')[0]).toMatchObject({
      family: 'trafficking',
      severity: 'medium',
    });
    expect(singleSourceFlags(facts({ documentRequest: f('id_copy' as const) }), 'ad')).toEqual([]);
  });

  it('secrecy, driver pickup and border pickup are non-geographic trafficking signals', () => {
    for (const chat of [
      facts({ secrecyRequest: f(true, 'do not tell your family') }),
      facts({ meetingPoint: f('driver_pickup' as const, 'a driver will pick you up') }),
      facts({ meetingPoint: f('border' as const, 'meet at the bridge') }),
    ]) {
      const r = assess(null, chat);
      expect(r.flags.some((x) => x.family === 'trafficking')).toBe(true);
      expect(r.verdict).not.toBe('safe');
    }
  });

  it('border-only: a border-town route alone does not raise the result', () => {
    for (const chat of [
      facts({ route: f('Yangon to Mae Sot by bus', 'Yangon to Mae Sot by bus') }),
      facts({ workplace: f('แม่สอด', 'โรงงานที่แม่สอด') }),
      facts({ route: f('မြဝတီ', 'မြဝတီ ကနေ ဖြတ်မယ်') }),
    ]) {
      const r = assess(facts(), chat);
      expect(r.score).toBe(0);
      expect(r.verdict).toBe('safe');
      expect(r.overrides).toContain('border_context_only');
    }
  });

  it('a border-town route counts once another non-geographic signal is present', () => {
    const base = facts({ paymentRequest: f('before_contract' as const, 'pay first') });
    const withRoute = facts({ ...base, route: f('via Mae Sot', 'via Mae Sot') });
    expect(assess(null, withRoute).score).toBeGreaterThan(assess(null, base).score);
  });

  it('does not repeat a chat signal that a conflict already covers', () => {
    const r = assess(facts({ documentRequest: f('none' as const) }), facts({ documentRequest: f('passport_hold' as const) }));
    expect(r.flags.filter((x) => x.family === 'trafficking')).toHaveLength(1);
  });

  it('payment before contract and a fee in the chat are payment_route signals', () => {
    const r = assess(null, facts({ paymentRequest: f('before_contract' as const), workerFee: f('15000 THB') }));
    expect(r.flags.every((x) => x.family === 'payment_route')).toBe(true);
    expect(r.verdict).toBe('careful');
  });

  it('localises single-source labels', () => {
    const [flag] = singleSourceFlags(facts({ documentRequest: f('passport_hold' as const, 'ပတ်စပို့ ထားခဲ့ရမယ်') }), 'chat', 'th');
    expect(flag?.label).toBe('มีการขอเก็บพาสปอร์ตของคุณไว้');
    expect(flag?.evidence).toBe('แชท: "ပတ်စပို့ ထားခဲ့ရမယ်"');
  });
});

describe('still unclear', () => {
  it('lists important fields neither source states, refusals included', () => {
    const r = stillUnclear(facts({ employer: f('Golden Lotus') }), facts({ workplace: refused('address later') }));
    expect(r.fields).toEqual(['workplace', 'contract', 'visaOrPermit', 'salary']);
    expect(r.text[0]).toBe('No workplace address was given');
  });

  it('is localised', () => {
    expect(stillUnclear(null, null, 'my').text[0]).toBe('အလုပ်နေရာလိပ်စာ မပေးထားပါ');
  });
});

describe('evidence for facts the user typed', () => {
  it('names the source without an empty quote', () => {
    const ad = facts({ contract: f('official' as const, 'Official contract') });
    const chat = facts({ contract: { ...f('later' as const, ''), edited: true } });
    const flags = collectFlags(ad, chat, detectConflicts(ad, chat));
    const ev = flags.find((x) => x.field === 'contract')?.evidence;
    expect(ev).toBe('Ad: "Official contract" / Chat');
    expect(flags.every((x) => !x.evidence.includes('""'))).toBe(true);
  });
});
