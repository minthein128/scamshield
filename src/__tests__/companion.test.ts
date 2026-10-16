import { COMPANION_STRING_KEYS } from 'shield-module';
import i18n, { t } from '../i18n';
import { screenFromUrl } from '../lib/shield';
import { companionStrings } from '../lib/companionStrings';
import en from '../i18n/locales/en/live.json';

describe('voice companion strings', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  const reused = ['verdictSafe', 'verdictCareful', 'verdictDanger', 'dismiss'];

  it('has an English entry for every native key', () => {
    const strings = companionStrings();
    expect(Object.keys(strings).sort()).toEqual([...COMPANION_STRING_KEYS].sort());
    for (const key of COMPANION_STRING_KEYS) {
      if (!reused.includes(key)) expect(strings[key]).toBe((en.companion as Record<string, string>)[key]);
      expect(strings[key]).toBeTruthy();
      expect(strings[key].length).toBeLessThanOrEqual(160);
    }
  });

  it('uses the app verdict words, so the overlay never says "Safe"', () => {
    const strings = companionStrings();
    expect([strings.verdictSafe, strings.verdictCareful, strings.verdictDanger]).toEqual([
      t('common:verdict.safe'),
      t('common:verdict.careful'),
      t('common:verdict.danger'),
    ]);
    expect(strings.verdictSafe).toBe('Low risk');
    expect(Object.values(strings).join(' ')).not.toMatch(/\bSafe\b(?!Route)/);
  });

  it('gives Burmese chips and buttons in Burmese', async () => {
    await i18n.changeLanguage('my');
    const strings = companionStrings();
    expect(Object.keys(strings)).toHaveLength(COMPANION_STRING_KEYS.length);
    for (const key of ['verdictSafe', 'verdictCareful', 'verdictDanger', 'chipOffline', 'chipNotChecked', 'tapToRetry', 'fullReport', 'dismiss', 'listening'] as const) {
      expect(strings[key]).toMatch(/[\u1000-\u109F]/);
    }
    expect(strings.verdictSafe).toBe(t('common:verdict.safe', { lng: 'my' }));
    const spoken = ['a11yCheckScreen', 'a11yChecking', 'a11yShowDetails', 'a11yExpanded', 'errNoConnection', 'errTooMany', 'errBusy', 'errTooLarge', 'errCapture', 'errCaptureDenied', 'errFailed'] as const;
    for (const key of spoken) expect(strings[key]).toMatch(/[\u1000-\u109F]/);
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
