import AsyncStorage from '@react-native-async-storage/async-storage';
import { HOTLINES } from '../data/hotlines';
import i18n from '../i18n';
import { currentHotlines, hotlinesForCountry, mergeHotlines, primaryHotline } from '../lib/hotlines';
import { dismissNotice, loadDismissed, pickNotice } from '../lib/notices';
import {
  CONFIG_KEYS,
  loadCachedConfig,
  parseContent,
  parseHotlines,
  parseNotices,
  refreshConfig,
  resetRuntimeConfig,
  runtimeHotlines,
  runtimeNotices,
  type RuntimeNotice,
} from '../lib/runtimeConfig';

const th = HOTLINES.find(h => h.id === 'th-rtp-ahtd-1599')!;
const reply = (body: unknown, ok = true) => ({ ok, json: async () => body });
const route = (map: Record<string, unknown>): typeof fetch =>
  jest.fn(async (url: string) => {
    const hit = Object.entries(map).find(([k]) => String(url).endsWith(k));
    return hit ? reply(hit[1]) : reply(null, false);
  }) as unknown as typeof fetch;

beforeEach(async () => {
  await AsyncStorage.clear();
  resetRuntimeConfig();
  await i18n.changeLanguage('en');
});

describe('hotline merge', () => {
  it('uses the bundled list when there is no runtime data', () => {
    expect(currentHotlines()).toBe(HOTLINES);
    expect(mergeHotlines(HOTLINES, [])).toBe(HOTLINES);
  });

  it('merges runtime fields over bundled ones by id and drops ids the server no longer lists', () => {
    const merged = mergeHotlines(HOTLINES, [{ ...th, hours: 'Mon to Fri' }, { ...th, id: 'th-new', dial: '1234' }]);
    expect(merged.map(h => h.id)).toEqual(['th-rtp-ahtd-1599', 'th-new']);
    expect(merged[0].name).toBe(th.name);
    expect(merged[0].hours).toBe('Mon to Fri');
  });

  it('the access functions read the published list after a refresh', async () => {
    const body = { version: 3, items: [{ ...th, dial: '1599', id: 'th-rtp-ahtd-1599', name: 'Renamed line' }] };
    expect(await refreshConfig(route({ '/v1/config/hotlines': body }), 'https://api.example')).toBe(true);
    expect(currentHotlines()).toHaveLength(1);
    expect(primaryHotline('TH', 'MM')?.name).toBe('Renamed line');
    expect(hotlinesForCountry('MM')).toEqual([]);
  });
});

describe('fetch and cache', () => {
  const published = { version: 2, items: HOTLINES.slice(0, 3) };

  it('caches a good reply and reads it back offline', async () => {
    await refreshConfig(route({ '/v1/config/hotlines': published }), 'https://api.example');
    expect(JSON.parse((await AsyncStorage.getItem(CONFIG_KEYS.hotlines)) as string).version).toBe(2);
    resetRuntimeConfig();
    expect(runtimeHotlines()).toBeNull();
    await loadCachedConfig();
    expect(runtimeHotlines()).toHaveLength(3);
  });

  it('keeps the current copy when the network fails or the reply is malformed', async () => {
    await refreshConfig(route({ '/v1/config/hotlines': published }), 'https://api.example');
    const down = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    expect(await refreshConfig(down, 'https://api.example')).toBe(false);
    expect(await refreshConfig(route({ '/v1/config/hotlines': { nope: true } }), 'https://api.example')).toBe(false);
    expect(runtimeHotlines()).toHaveLength(3);
  });

  it('ignores an empty published list so the app never loses its hotlines', async () => {
    await refreshConfig(route({ '/v1/config/hotlines': { version: 4, items: [] } }), 'https://api.example');
    expect(currentHotlines()).toBe(HOTLINES);
  });

  it('drops invalid items', () => {
    const snap = parseHotlines({
      version: 1,
      items: [th, { ...th, id: 'x1', sourceUrl: 'http://insecure' }, { ...th, id: 'x2', country: 'ZZ' }, { ...th, id: 'x3', dial: 'call me' }, 'junk'],
    });
    expect(snap?.items.map(h => h.id)).toEqual(['th-rtp-ahtd-1599']);
    expect(parseHotlines(null)).toBeNull();
  });
});

describe('notices', () => {
  const base: RuntimeNotice = { id: 'n1', title: 'T', body: 'B', severity: 'info' };
  const audience = { countries: ['MM', 'TH'], language: 'en' };

  it('parses notices and fetches them', async () => {
    const body = { version: 1, items: [{ ...base, severity: 'warning' }, { id: 'bad' }] };
    expect(parseNotices(body)?.items).toHaveLength(1);
    await refreshConfig(route({ '/v1/config/notices': body }), 'https://api.example');
    expect(runtimeNotices()[0].severity).toBe('warning');
  });

  it('picks by country, language and window, warnings first, skipping dismissed', () => {
    const now = Date.parse('2026-10-15T00:00:00Z');
    const items: RuntimeNotice[] = [
      { ...base, id: 'kh', country: ['KH'] },
      { ...base, id: 'th-info', country: ['TH'] },
      { ...base, id: 'my-lang', language: ['my'] },
      { ...base, id: 'future', startsAt: '2027-01-01T00:00:00Z' },
      { ...base, id: 'past', endsAt: '2026-01-01T00:00:00Z' },
      { ...base, id: 'warn', severity: 'warning' },
    ];
    expect(pickNotice(items, audience, [], now)?.id).toBe('warn');
    expect(pickNotice(items, audience, ['warn'], now)?.id).toBe('th-info');
    expect(pickNotice(items, audience, ['warn', 'th-info'], now)).toBeUndefined();
  });

  it('remembers dismissals', async () => {
    expect(await loadDismissed()).toEqual([]);
    await dismissNotice('n1');
    await dismissNotice('n2');
    expect(await loadDismissed()).toEqual(['n1', 'n2']);
  });
});

describe('content overrides', () => {
  it('applies override text for existing keys only, and restores nothing it did not touch', async () => {
    const body = {
      version: 1,
      items: {
        'home:notice.dismiss': { en: 'Got it', my: 'ပိတ်ပါ' },
        'home:does.not.exist': { en: 'ignored' },
      },
    };
    expect(parseContent(body)?.items['home:notice.dismiss']?.my).toBe('ပိတ်ပါ');
    await refreshConfig(route({ '/v1/config/content': body }), 'https://api.example');
    expect(i18n.t('home:notice.dismiss')).toBe('Got it');
    expect(i18n.exists('home:does.not.exist')).toBe(false);
    await i18n.changeLanguage('my');
    expect(i18n.t('home:notice.dismiss')).toBe('ပိတ်ပါ');
    await i18n.changeLanguage('id');
    expect(i18n.t('home:notice.dismiss')).toBe('Tutup');
  });
});
