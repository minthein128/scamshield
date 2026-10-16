import i18n from '../i18n';
import { createMockClient } from '../api/mock';
import type { FactField, JobFacts } from '../api/types';
import {
  FIELD_DEFS,
  draftFromFacts,
  enumOptions,
  isUnclear,
  resetFact,
  setNotMentioned,
  setValue,
  toFacts,
  valueLabel,
} from '../lib/jobFacts';

const AD = 'Bangkok Logistics Co., Ltd. needs customer service staff in Bangkok, Thailand. Salary 35,000 THB per month. No agency fees. Official contract and work visa provided.';
const CHAT = 'Please send a photo of your passport today. Pay 300 USD deposit to reserve your seat. Do not tell your family. You will enter as a tourist.';

const fact = <T,>(value: T, quote: string, confidence = 0.9, extra: Partial<FactField<T>> = {}): FactField<T> => ({ value, quote, confidence, ...extra });
const empty = (): JobFacts => Object.fromEntries(FIELD_DEFS.map(d => [d.key, null])) as unknown as JobFacts;

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('fact editing', () => {
  const facts: JobFacts = {
    ...empty(),
    contract: fact('later' as const, 'We sign the contract when you arrive'),
    salary: fact({ amount: '35000', currency: 'THB', period: 'monthly' }, '35,000 THB / month', 0.5),
    employer: fact('Golden Star', 'talk to Golden Star office', 0.4),
  };

  it('changes an enum field to another allowed code and keeps the original quote', () => {
    const next = setValue(draftFromFacts(facts), 'contract', 'official');
    const out = toFacts(next);
    expect(out.contract).toMatchObject({ value: 'official', quote: 'We sign the contract when you arrive', edited: true });
    expect(next.contract.original?.value).toBe('later');
  });

  it('offers translated labels for the allowed codes and never free text', () => {
    const options = enumOptions('visaOrPermit');
    expect(options.map(o => o.value)).toEqual(['work_visa', 'tourist', 'none', 'not_mentioned']);
    expect(options.map(o => o.label)).toEqual(['A work visa', 'A tourist visa', 'No visa', 'Not mentioned']);
    expect(enumOptions('contactChannel').map(o => o.value)).toEqual(['company_channel', 'personal_chat_app', 'phone', 'email']);
  });

  it('translates enum values into the interface language', async () => {
    await i18n.changeLanguage('my');
    expect(valueLabel('meetingPoint', 'driver_pickup')).not.toBe('driver_pickup');
    expect(valueLabel('meetingPoint', 'driver_pickup')).not.toBe('A driver picks you up');
  });

  it('edits salary as amount, currency and period', () => {
    const next = setValue(draftFromFacts(facts), 'salary', { amount: ' 1,200 ', currency: 'usd', period: 'daily' });
    expect(toFacts(next).salary).toMatchObject({ value: { amount: '1,200', currency: 'USD', period: 'daily' }, quote: '35,000 THB / month', edited: true });
    expect(valueLabel('salary', { amount: '1200', currency: 'USD', period: 'daily' })).toBe('1200 USD per day');
  });

  it('treats an emptied salary as not mentioned', () => {
    const next = setValue(draftFromFacts(facts), 'salary', { amount: '  ', currency: 'USD', period: 'daily' });
    expect(toFacts(next).salary).toBeNull();
  });

  it('marks a fact not mentioned without losing the quote, and restores it', () => {
    const marked = setNotMentioned(draftFromFacts(facts), 'contract', true);
    expect(toFacts(marked).contract).toBeNull();
    expect(marked.contract.original?.quote).toBe('We sign the contract when you arrive');
    expect(toFacts(resetFact(marked, 'contract')).contract).toEqual(facts.contract);
  });

  it('lets the user add a value the model did not find, with no quote', () => {
    const next = setValue(draftFromFacts(facts), 'secrecyRequest', true);
    expect(toFacts(next).secrecyRequest).toEqual({ value: true, quote: '', confidence: 1, edited: true });
  });

  it('highlights low confidence and refused facts until the user acts on them', () => {
    const draft = draftFromFacts({ ...facts, workplace: fact('', 'address will be shared later', 0.5, { refused: true }) });
    expect(isUnclear(draft.employer)).toBe(true);
    expect(isUnclear(draft.workplace)).toBe(true);
    expect(isUnclear(draft.contract)).toBe(false);
    expect(isUnclear(setValue(draft, 'employer', 'Golden Star Co.').employer)).toBe(false);
    expect(isUnclear(setNotMentioned(draft, 'workplace', true).workplace)).toBe(false);
  });

  it('sends unedited facts exactly as they were read', () => {
    expect(toFacts(draftFromFacts(facts))).toEqual(facts);
  });

  it('covers every field the spec lists', () => {
    const keys = FIELD_DEFS.map(d => d.key);
    for (const k of ['secrecyRequest', 'paymentRequest', 'route', 'meetingPoint', 'contactChannel']) expect(keys).toContain(k);
    expect(keys).toHaveLength(16);
  });
});

describe('offline job mock', () => {
  const client = createMockClient({ delayMs: 0 });
  const run = async (ad?: string, chat?: string) => {
    const extracted = await client.extractJob({ ad: ad ? { text: ad } : undefined, chat: chat ? { text: chat } : undefined, language: 'en' });
    const assessed = await client.assessJob({ jobId: extracted.jobId, facts: { ad: extracted.ad, chat: extracted.chat }, language: 'en' });
    return { extracted, assessed };
  };

  it('quotes the real text and invents nothing', async () => {
    const { extracted } = await run(AD, CHAT);
    for (const [source, text] of [[extracted.ad, AD], [extracted.chat, CHAT]] as const) {
      for (const f of Object.values(source ?? {})) if (f) expect(text).toContain(f.quote);
    }
    const none = await client.extractJob({ ad: { text: 'Hello, are you free tomorrow?' }, language: 'en' });
    expect(Object.values(none.ad ?? {}).every(v => v === null)).toBe(true);
    expect(none.chat).toBeNull();
  });

  it('rejects an empty request', async () => {
    await expect(client.extractJob({ language: 'en' })).rejects.toMatchObject({ code: 'bad_request' });
  });

  it('pauses when the chat contradicts the ad and shows both quotes', async () => {
    const { assessed } = await run(AD, CHAT);
    expect(assessed.attention).toBe('pause');
    expect(assessed.verdict).toBe('danger');
    const fee = assessed.conflicts.find(c => c.field === 'workerFee');
    expect(fee).toMatchObject({ adQuote: expect.stringContaining('No agency fees'), chatQuote: expect.stringContaining('deposit') });
    expect(assessed.conflicts.map(c => c.field)).toEqual(expect.arrayContaining(['visaOrPermit']));
  });

  it('does not call it a conflict when only one source states a value', async () => {
    const { assessed } = await run('Cashier needed in Bangkok. Salary 20000 THB per month.', 'Call me on +66 81 234 5678');
    expect(assessed.conflicts).toEqual([]);
    expect(assessed.attention).toBe('lower');
    expect(assessed.stillUnclear.length).toBeGreaterThan(0);
  });

  it('does not raise the tier for a border town alone', async () => {
    const { assessed } = await run('Cook wanted near Mae Sot. Salary 12000 THB per month.', 'We will meet in Mae Sot.');
    expect(assessed.attention).toBe('lower');
  });

  it('never calls a job result safe', async () => {
    const { assessed } = await run(AD, 'Looks fine, see you at the office.');
    expect(JSON.stringify([assessed.title, assessed.summary, assessed.attentionHeadline])).not.toMatch(/\bsafe\b|proceed with caution|no major conflicts/i);
  });
});

describe('attention tiers', () => {
  const { resultWord, stepWord, tierHeadline, TIER_VERDICT } = require('../lib/attention') as typeof import('../lib/attention');

  it('maps lower, verify and pause onto the three verdict steps', () => {
    expect(TIER_VERDICT).toEqual({ lower: 'safe', verify: 'careful', pause: 'danger' });
    expect([stepWord('safe', 'lower'), stepWord('careful', 'lower'), stepWord('danger', 'lower')]).toEqual(['Fewer signs', 'Check first', 'Pause']);
  });

  it('uses the spec wording and never a reassuring word', async () => {
    expect(tierHeadline('lower')).toBe('Few warning signs found, but important details may still be missing');
    expect(tierHeadline('verify')).toBe('Some details do not add up, check them before you go');
    expect(tierHeadline('pause')).toBe('Pause before you pay, send documents or travel');
    expect(resultWord({ verdict: 'safe', attention: 'lower' })).not.toMatch(/low risk|safe/i);
    expect(resultWord({ verdict: 'safe' })).toBe('Low risk');
    for (const lang of ['en', 'my', 'id', 'tl', 'th']) {
      await i18n.changeLanguage(lang);
      const all = JSON.stringify((['lower', 'verify', 'pause'] as const).map(tierHeadline).concat(['lower', 'verify', 'pause'].map(k => i18n.t(`report:attention.note.${k}` as never)).filter(Boolean)));
      expect(all).not.toMatch(/proceed with caution|no major conflicts|\bsafe\b/i);
    }
  });
});
