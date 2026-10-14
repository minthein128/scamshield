import { describe, expect, it } from 'vitest';
import { countCertainty, findCertainty, guardExtraction, guardFlags, isHeavy, rewriteCertainty } from '../src/language-guard.js';
import type { Extraction } from '../src/types.js';

describe('language guard', () => {
  it.each([
    ['This job offer is a dangerous human trafficking trap.', 'en', 'looks like a possible human trafficking trap'],
    ['This is a scam.', 'en', 'This looks like a scam.'],
    ['These messages are scams.', 'en', 'look like scams'],
    ['The shop is definitely fake.', 'en', 'looks fake'],
    ['Acme Ltd is a criminal company.', 'en', 'may be linked to scam reports'],
    ['I am 100% sure.', 'en', 'likely concerning'],
    ['A stranger pushes you into a fake crypto site.', 'en', 'a possibly fake crypto site'],
    ['Tawaran ini adalah penipuan.', 'id', 'kemungkinan penipuan'],
    ['Ini pasti jebakan.', 'id', 'kemungkinan besar jebakan'],
    ['Ang alok na ito ay scam.', 'tl', 'ay mukhang scam'],
    ['Siguradong peke ito.', 'tl', 'posibleng peke'],
    ['ဤအလုပ်ကမ်းလှမ်းချက်သည် လိမ်လည်မှု ဖြစ်သည်။', 'my', 'လိမ်လည်မှု ဖြစ်နိုင်ပါသည်'],
  ] as const)('rewrites %s', (input, lang, expected) => {
    const r = rewriteCertainty(input, lang);
    expect(r.hits).toBeGreaterThan(0);
    expect(r.text).toContain(expected);
    expect(findCertainty(r.text, lang)).toEqual([]);
  });

  it.each([
    ['This could be a fake parcel fee. It looks like a fake shop.', 'en'],
    ['This offer shows several warning signs of trafficking. We could not find a licence record.', 'en'],
    ['The message was not confirmed by the courier. Please verify.', 'en'],
    ['Pastikan Anda memeriksa izin agensi. Kami tidak pasti.', 'id'],
    ['Mukhang may mga senyales ng panloloko. Posibleng scam ito.', 'tl'],
    ['ဒီအလုပ်ကမ်းလှမ်းချက်မှာ သတိပေးလက္ခဏာတချို့ တွေ့နေရပါတယ်။', 'my'],
  ] as const)('leaves hedged text alone: %s', (input, lang) => {
    expect(findCertainty(input, lang)).toEqual([]);
    expect(rewriteCertainty(input, lang).text).toBe(input);
  });

  it('detects Burmese certainty it cannot rewrite', () => {
    const t = 'ဒါ ကျိန်းသေ ဖြစ်သည်၊ မလွဲဧကန်၊ ၁၀၀% အတည်ပြုပြီး';
    expect(findCertainty(t, 'my').length).toBeGreaterThanOrEqual(3);
    expect(isHeavy(findCertainty(t, 'my').length)).toBe(true);
  });

  const base: Extraction = {
    flags: [{ family: 'pressure', label: 'This is a scam', evidence: 'This is a scam quoted from the input', severity: 'high' }],
    scamType: 'other',
    verdictDraft: 'danger',
    unsolicited: true,
    summary: 'This is a scam and definitely fake.',
    spokenWarning: 'Danger.',
    urls: [],
    entities: { companies: [], phones: [], domains: [] },
  };

  it('guards model fields but leaves quoted evidence alone', () => {
    const { extraction, stats } = guardExtraction(base, 'en');
    expect(extraction.summary).not.toMatch(/is a scam|definitely/i);
    expect(extraction.flags[0]?.label).toBe('This looks like a scam');
    expect(extraction.flags[0]?.evidence).toBe(base.flags[0]?.evidence);
    expect(stats.before).toBe(3);
    expect(isHeavy(stats.before)).toBe(true);
  });

  it('guards grounding evidence too', () => {
    const { flags } = guardFlags([{ family: 'known_bad', label: 'X', evidence: 'Acme is a scammer', severity: 'low' }], 'en');
    expect(flags[0]?.evidence).toBe('Acme may be linked to scam reports');
  });

  it('counts certainty in a response', () => {
    const res = { title: 'ok', summary: 'It is a scam', spokenWarning: 'fine', flags: [] };
    expect(countCertainty(res, 'en')).toBe(1);
  });
});
