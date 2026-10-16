import { breakMyanmar, syllableRuns } from '../theme/myanmarBreaks';
import home from '../i18n/locales/my/home.json';
import check from '../i18n/locales/my/check.json';

const ZW = '​';
const parts = (s: string) => breakMyanmar(s).split(ZW);

describe('breakMyanmar', () => {
  it('splits only at syllable boundaries for the reviewed words', () => {
    expect(parts('မြန့်')).toEqual(['မြန့်']);
    expect(parts('သင့်')).toEqual(['သင့်']);
    expect(parts('ပြင်ဆင့်')).toEqual(['ပြင်', 'ဆင့်']);
    expect(parts('အင်္ဂလိပ်')).toEqual(['အင်္ဂ', 'လိပ်']);
  });

  it('keeps လင့်ခ် whole inside the hero string', () => {
    const hero = home.check.title;
    const pieces = breakMyanmar(hero).split(/[\u200B ]/);
    expect(pieces).toContain('လင့်ခ်');
    expect(pieces.every(p => !/^[\u1036\u1037\u103A\u1039]/.test(p))).toBe(true);
    expect(breakMyanmar(hero).split('\u200B').join('')).toBe(hero);
  });

  it('syllableRuns keeps each run whole and rebuilds the text', () => {
    const runs = syllableRuns('လင့်ခ်ကို စစ်ဆေး');
    expect(runs).toEqual(['လင့်ခ်', '\u200B', 'ကို', ' ', 'စစ်', '\u200B', 'ဆေး']);
    expect(runs.join('').replace(/\u200B/g, '')).toBe('လင့်ခ်ကို စစ်ဆေး');
  });

  it('keeps the link word whole, with dot-below and asat codas', () => {
    expect(parts('လင့်ခ်ကို')).toEqual(['လင့်ခ်', 'ကို']);
    expect(parts('လင်ခ်ကို')).toEqual(['လင်ခ်', 'ကို']);
  });

  it('keeps stacked consonants and medials together', () => {
    expect(parts('ကျွန်ုပ်')).toEqual(['ကျွန်ုပ်']);
    expect(parts('ပြဿနာ')).toEqual(['ပြဿ', 'နာ']);
    expect(parts('မင်္ဂလာ')).toEqual(['မင်္ဂ', 'လာ']);
  });

  it('leaves Latin text, spaces and digits alone', () => {
    expect(breakMyanmar('Kakwe Android')).toBe('Kakwe Android');
    expect(breakMyanmar('စစ်ဆေး Kakwe')).toBe('စစ်\u200Bဆေး Kakwe');
  });

  it('never leaves a lone asat, virama or vowel sign at the start of a piece', () => {
    const values = [...Object.values(home), ...Object.values(check)].flatMap(function walk(v: unknown): string[] {
      if (typeof v === 'string') return [v];
      if (v && typeof v === 'object') return Object.values(v).flatMap(walk);
      return [];
    });
    expect(values.length).toBeGreaterThan(10);
    for (const value of values) {
      for (const piece of breakMyanmar(value).split(ZW).slice(1)) {
        if (!/[က-႟]/.test(piece[0])) continue;
        expect(piece[0]).toMatch(/[က-အဥ-ဧဿ၀-၉၊-၏]/);
      }
    }
  });

  it('is removable without changing the text', () => {
    const s = 'အလုပ်ကမ်းလှမ်းချက်၊ မက်ဆေ့ချ် သို့မဟုတ် လင့်ခ်ကို စစ်ဆေးပါ';
    expect(breakMyanmar(s).split(ZW).join('')).toBe(s);
    expect(breakMyanmar(breakMyanmar(s))).toBe(breakMyanmar(s));
  });
});
