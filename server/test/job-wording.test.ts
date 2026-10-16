import { describe, expect, it } from 'vitest';
import { ALL_TABLES, TIER_HEADLINE } from '../src/job/text.js';
import { findJobBanned, findMaleForms, guardJobText } from '../src/language-guard.js';
import { LANGS } from '../src/types.js';

describe('Job Shield wording', () => {
  it('every table has all five languages and no banned or certainty phrase', () => {
    for (const table of ALL_TABLES) {
      for (const [key, entry] of Object.entries(table)) {
        for (const lang of LANGS) {
          const text = entry?.[lang];
          expect(text, `${key}.${lang}`).toBeTruthy();
          expect(findJobBanned(text ?? '', lang), `${key}.${lang}: ${text}`).toEqual([]);
          expect(findMaleForms(text ?? '', lang), `${key}.${lang}`).toEqual([]);
        }
      }
    }
  });

  it('non-English tables are not English', () => {
    for (const table of ALL_TABLES) {
      for (const [key, entry] of Object.entries(table)) {
        for (const lang of ['my', 'th'] as const) expect(entry?.[lang], `${key}.${lang}`).not.toMatch(/^[A-Za-z]/);
      }
    }
  });

  it('uses the spec text for the lower tier', () => {
    expect(TIER_HEADLINE.lower.en).toBe('Few warning signs found, but important details may still be missing');
  });

  it.each([
    ['en', 'This job looks safe and is a verified job. No risk detected.'],
    ['en', 'Scam confirmed: coercive instructions detected.'],
    ['id', 'Pekerjaan ini aman. Tidak ada risiko terdeteksi. Pekerjaan terverifikasi.'],
    ['tl', 'Ligtas ang trabahong ito. Beripikadong trabaho. Walang natukoy na panganib.'],
    ['my', 'ဤအလုပ်သည် လုံခြုံပါသည်။ အန္တရာယ်မရှိပါ။ အတည်ပြုပြီးသောအလုပ်'],
    ['th', 'งานนี้ปลอดภัย ไม่พบความเสี่ยง ตรวจพบการหลอกลวง'],
  ] as const)('finds and rewrites banned phrases (%s)', (lang, text) => {
    expect(findJobBanned(text, lang).length).toBeGreaterThan(0);
    const out = guardJobText(text, lang);
    expect(out.hits).toBeGreaterThan(0);
    expect(findJobBanned(out.text, lang)).toEqual([]);
  });

  it('leaves negated warnings alone', () => {
    expect(findJobBanned('This is not safe to pay.', 'en')).toEqual([]);
    expect(findJobBanned('ไม่ปลอดภัย', 'th')).toEqual([]);
    expect(findJobBanned('tidak aman', 'id')).toEqual([]);
    expect(findJobBanned('hindi ligtas', 'tl')).toEqual([]);
    expect(findJobBanned('မလုံခြုံပါ', 'my')).toEqual([]);
  });
});
