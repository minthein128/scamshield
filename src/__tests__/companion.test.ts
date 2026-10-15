import { COMPANION_STRING_KEYS } from 'shield-module';
import i18n from '../i18n';
import { screenFromUrl } from '../lib/shield';
import { companionStrings } from '../lib/companionStrings';
import en from '../i18n/locales/en/live.json';

describe('voice companion strings', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('has an English entry for every native key', () => {
    const strings = companionStrings();
    expect(Object.keys(strings).sort()).toEqual([...COMPANION_STRING_KEYS].sort());
    for (const key of COMPANION_STRING_KEYS) {
      expect((en.companion as Record<string, string>)[key]).toBeTruthy();
      expect(strings[key]).toBe((en.companion as Record<string, string>)[key]);
      expect(strings[key].length).toBeLessThanOrEqual(160);
    }
  });

  it('follows the UI language', async () => {
    await i18n.changeLanguage('my');
    const strings = companionStrings();
    expect(strings.listening).toBeTruthy();
    expect(Object.keys(strings)).toHaveLength(COMPANION_STRING_KEYS.length);
  });

  it('keeps hedged wording', () => {
    expect(JSON.stringify(en.companion)).not.toMatch(/\b(fake|scammer|confirmed)\b|This is a scam/i);
  });
});

describe('shield deep links', () => {
  it('maps help and shield links to screens', () => {
    expect(screenFromUrl('saferoute://help')).toBe('GetHelp');
    expect(screenFromUrl('saferoute://shield/')).toBe('Shield');
    expect(screenFromUrl('saferoute://report/chk_1')).toBeNull();
    expect(screenFromUrl('https://help')).toBeNull();
    expect(screenFromUrl(null)).toBeNull();
  });
});
