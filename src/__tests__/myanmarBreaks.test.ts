import { breakMyanmar } from '../theme/myanmarBreaks';
import home from '../i18n/locales/my/home.json';
import check from '../i18n/locales/my/check.json';

const ZW = '​';
const parts = (s: string) => breakMyanmar(s).split(ZW);

describe('breakMyanmar', () => {
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
    expect(breakMyanmar('SafeRoute Android')).toBe('SafeRoute Android');
    expect(breakMyanmar('စစ်ဆေး SafeRoute')).toBe('စစ်\u200Bဆေး SafeRoute');
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
