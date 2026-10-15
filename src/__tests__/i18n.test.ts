import AsyncStorage from '@react-native-async-storage/async-storage';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import i18n, { restoreUiLanguage, setUiLanguage, t } from '../i18n';
import { checkLanguageFor, pickDefaultLanguage } from '../i18n/languages';
import { UI_LANGUAGE_KEY } from '../i18n/storage';
import { seenLine } from '../lib/radar';
import { formatRelative } from '../lib/time';
import { errorCopy, ApiError } from '../api';

const LOCALES = join(__dirname, '../i18n/locales');
const TARGETS = ['my', 'id', 'tl', 'th'] as const;

beforeEach(async () => {
  await AsyncStorage.clear();
  await i18n.changeLanguage('en');
});

describe('typed keys', () => {
  it('rejects unknown keys and namespaces at compile time', () => {
    // @ts-expect-error the key does not exist in the common namespace
    expect(t('common:does.not.exist')).toBe('does.not.exist');
    // @ts-expect-error the namespace does not exist
    t('nowhere:title');
    // @ts-expect-error plural keys need the base name, not a suffix that is absent
    t('common:time.weeksAgo', { count: 2 });
    expect(t('common:actions.back')).toBe('Go back');
  });
});

describe('interpolation and plurals', () => {
  it('interpolates values', () => {
    expect(t('check:screenshot.ready', { kb: 42 })).toBe('42 KB, ready to send');
  });

  it('picks singular and plural forms in English', () => {
    expect(seenLine(1)).toBe('Reported 1 time by other SafeRoute users in the last 30 days');
    expect(seenLine(19)).toBe('Reported 19 times by other SafeRoute users in the last 30 days');
    expect(t('common:time.daysAgo', { count: 1 })).toBe('1 day ago');
    expect(t('common:time.daysAgo', { count: 3 })).toBe('3 days ago');
  });

  it('uses one and other for Tagalog and only other for Burmese, Indonesian and Thai', () => {
    expect(new Intl.PluralRules('tl').select(1)).toBe('one');
    for (const lang of ['my', 'id', 'th']) expect(new Intl.PluralRules(lang).select(1)).toBe('other');
    const my = t('radar:reports', { count: 1, days: 30, lng: 'my' });
    expect(my).toContain('1');
    expect(my).toContain('30');
    expect(t('radar:reports', { count: 1, days: 30, lng: 'tl' })).toContain('1');
  });

  it('formats relative time and API errors through the active language', async () => {
    const now = new Date('2026-10-14T12:00:00Z');
    expect(formatRelative('2026-10-14T11:30:00Z', now)).toBe('30 min ago');
    expect(errorCopy(new ApiError('network', 'x')).title).toBe('You are offline');
    await i18n.changeLanguage('id');
    expect(errorCopy(new ApiError('network', 'x')).title).not.toBe('You are offline');
  });
});

describe('learn content', () => {
  it('follows the active language', async () => {
    const { SCAM_TYPES, RED_FLAGS, findScamType } = require('../screens/learn/content') as typeof import('../screens/learn/content');
    const jobs = findScamType('jobs');
    expect(jobs?.title).toBe('Risky job offers and trafficking');
    expect(SCAM_TYPES[0]).toBe(jobs);
    await i18n.changeLanguage('my');
    expect(jobs?.title).not.toBe('Risky job offers and trafficking');
    expect(jobs?.signs[0].text).toBeTruthy();
    expect(RED_FLAGS[0].explain).not.toBe('Pay or perks far above normal, with no experience needed.');
  });
});

describe('language switch', () => {
  it('changes strings at once and persists the choice', async () => {
    expect(t('common:tabs.home')).toBe('Home');
    await setUiLanguage('my');
    expect(i18n.language).toBe('my');
    expect(t('common:tabs.home')).not.toBe('Home');
    expect(await AsyncStorage.getItem(UI_LANGUAGE_KEY)).toBe('my');

    await i18n.changeLanguage('en');
    expect(await restoreUiLanguage()).toBe('my');
    expect(i18n.language).toBe('my');
  });

  it('ignores a corrupt saved value', async () => {
    await AsyncStorage.setItem(UI_LANGUAGE_KEY, 'xx');
    expect(await restoreUiLanguage()).toBe('en');
  });

  it('checks in Thai for the Thai UI', () => {
    expect(checkLanguageFor('th')).toBe('th');
    expect(checkLanguageFor('my')).toBe('my');
  });
});

describe('default language', () => {
  it('is English on web whatever the browser locale is', () => {
    expect(pickDefaultLanguage('web', ['my-MM', 'id'])).toBe('en');
    expect(pickDefaultLanguage('web', ['th-TH'])).toBe('en');
  });

  it('follows the device on native when supported, else English', () => {
    expect(pickDefaultLanguage('android', ['my-MM'])).toBe('my');
    expect(pickDefaultLanguage('android', ['fil-PH'])).toBe('tl');
    expect(pickDefaultLanguage('android', ['in-ID'])).toBe('id');
    expect(pickDefaultLanguage('android', ['fr-FR', 'th-TH'])).toBe('th');
    expect(pickDefaultLanguage('android', ['fr-FR'])).toBe('en');
    expect(pickDefaultLanguage('android', [])).toBe('en');
  });

  it('starts the web app in English even when the device speaks Burmese', () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
    jest.doMock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'my-MM', languageCode: 'my' }] }));
    const web = require('../i18n') as typeof import('../i18n');
    expect(web.default.language).toBe('en');
    expect(web.defaultLanguage()).toBe('en');
    jest.dontMock('react-native');
    jest.dontMock('expo-localization');
  });
});

describe('locale files', () => {
  const read = (lang: string, file: string): Record<string, unknown> => JSON.parse(readFileSync(join(LOCALES, lang, file), 'utf8'));
  const flat = (obj: Record<string, unknown>, prefix = ''): Record<string, string> =>
    Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
      if (k === '_meta') return acc;
      const key = prefix ? `${prefix}.${k}` : k;
      return typeof v === 'object' && v ? { ...acc, ...flat(v as Record<string, unknown>, key) } : { ...acc, [key]: String(v) };
    }, {});
  const files = readdirSync(join(LOCALES, 'en')).filter(f => f.endsWith('.json'));
  const base = (k: string) => k.replace(/_(zero|one|two|few|many|other)$/, '');
  const placeholders = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map(p => p.replace(/\s/g, '')).sort().join();

  it.each(TARGETS)('%s has every key, the right plural forms and the same placeholders', lang => {
    const cats = new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
    for (const file of files) {
      expect(existsSync(join(LOCALES, lang, file))).toBe(true);
      const en = flat(read('en', file));
      const tr = flat(read(lang, file));
      for (const [key, text] of Object.entries(en)) {
        const isPlural = /_(one|other)$/.test(key);
        if (isPlural) {
          const cat = key.split('_').pop() as string;
          if (!cats.includes(cat as Intl.LDMLPluralRule)) {
            expect(tr[key]).toBeUndefined();
            continue;
          }
        }
        expect({ file, key, ok: Boolean(tr[key]) }).toEqual({ file, key, ok: true });
        expect(placeholders(tr[key])).toBe(placeholders(text));
      }
      expect(Object.keys(tr).filter(k => !(k in en) && !cats.some(c => en[`${base(k)}_${c}`] || en[`${base(k)}_other`]))).toEqual([]);
    }
  });

  it.each(TARGETS)('%s files carry a _meta.reviewed flag', lang => {
    for (const file of files) {
      const meta = (read(lang, file)._meta ?? {}) as { reviewed?: unknown };
      expect(typeof meta.reviewed).toBe('boolean');
    }
  });

  it('keeps hedged wording in the English verdict copy', () => {
    const copy = JSON.stringify([read('en', 'common.json').scamTypes, read('en', 'checking.json').verdict]);
    expect(copy).not.toMatch(/\b(fake|scammer|confirmed)\b/i);
    expect(copy).not.toMatch(/This is a scam/i);
  });
});
