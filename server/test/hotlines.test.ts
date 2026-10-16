import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { COUNTRIES, HOTLINES } from '../src/data/hotlines.generated.js';
import { buildActions, dialCountry, hotlineFor, setHotlineSource } from '../src/explain.js';

const script = new URL('../../scripts/sync-hotlines.mjs', import.meta.url);

describe('hotline data', () => {
  it('every entry has a source and a unique id', () => {
    const ids = HOTLINES.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const h of HOTLINES) {
      expect(h.sourceUrl).toMatch(/^https:\/\//);
      expect(Boolean(h.dial || h.reportUrl)).toBe(true);
    }
  });

  it.skipIf(!existsSync(script))('matches the app data in src/data', () => {
    execFileSync('node', ['--no-warnings', fileURLToPath(script), '--check'], { stdio: 'pipe' });
  });
});

describe('hotlineFor', () => {
  it('picks the destination country anti-trafficking line from the shared data', () => {
    expect(hotlineFor('Bangkok, Thailand', {})).toBe('1599');
    expect(hotlineFor('Hanoi', {})).toBe('111');
  });

  it('falls back to the police line when a country has no trafficking line', () => {
    expect(hotlineFor('Kuala Lumpur', {})).toBe('999');
    expect(hotlineFor('Jakarta', {})).toBe('110');
  });

  it('returns nothing for unknown places, unless a default is configured', () => {
    expect(hotlineFor('Paris', {})).toBeUndefined();
    expect(hotlineFor(undefined, { DEFAULT_HOTLINE: '112' })).toBe('112');
  });

  it('puts the number on the call action', () => {
    const call = buildActions('danger', 'job_trafficking', 'en', 'Thailand').find((a) => a.type === 'call');
    expect(call?.value).toBe('1599');
  });
});

describe('hotlineFor with home and destination', () => {
  afterEach(() => setHotlineSource(() => HOTLINES));
  const without = (...countries: string[]) => setHotlineSource(() => HOTLINES.filter((h) => !countries.includes(h.country)));
  const withoutLines = (country: string) =>
    setHotlineSource(() => HOTLINES.filter((h) => !(h.country === country && (h.category === 'trafficking' || h.category === 'police'))));

  it.each([
    ['Myanmar', 'Thailand', '1599'],
    ['Philippines', 'Malaysia', '999'],
    ['Indonesia', 'Cambodia', '1288'],
    ['Vietnam', 'Laos', '1191'],
    ['Thailand', 'Thailand', '1599'],
  ])('home %s, destination %s: the destination line comes first', (home, dest, dial) => {
    expect(hotlineFor(dest, {}, home)).toBe(dial);
  });

  it.each([
    ['Myanmar', '+9567412555'],
    ['Philippines', '1343'],
    ['Indonesia', '110'],
    ['Thailand', '1599'],
    ['Vietnam', '111'],
    ['Cambodia', '1288'],
    ['Laos', '1191'],
    ['Malaysia', '999'],
  ])('home %s with no destination: the home line', (home, dial) => {
    expect(hotlineFor(undefined, {}, home)).toBe(dial);
    expect(hotlineFor('', {}, home)).toBe(dial);
  });

  it('accepts ISO codes as well as names', () => {
    expect(hotlineFor('TH', {}, 'MM')).toBe('1599');
    expect(hotlineFor(undefined, {}, 'ph')).toBe('1343');
  });

  it('uses the home consular or labour line that rings in the destination when the destination has none', () => {
    withoutLines('TH');
    expect(hotlineFor('Mae Sot', {}, 'Myanmar')).toBe('+66948845484');
    expect(hotlineFor('Bangkok', {}, 'Philippines')).toBe('+66831376167');
    withoutLines('LA');
    expect(hotlineFor('Vientiane', {}, 'Philippines')).toBe('+8562055535878');
  });

  it('skips home numbers that only work inside the home country when the user is abroad', () => {
    without('VN');
    expect(hotlineFor('Hanoi', {}, 'Thailand')).toBe('+6625728442');
    expect(hotlineFor(undefined, {}, 'Thailand')).toBe('1599');
  });

  it('never leaves the call action empty when either country has a line', () => {
    for (const home of COUNTRIES) {
      for (const dest of [undefined, ...COUNTRIES]) {
        const call = buildActions('danger', 'other', 'en', dest?.name, home.name).find((a) => a.type === 'call');
        expect(call?.value, `${home.code} -> ${dest?.code}`).toBeTruthy();
      }
    }
  });

  it('keeps the old behaviour without a home country', () => {
    expect(hotlineFor('Bangkok, Thailand', {})).toBe('1599');
    expect(hotlineFor('Paris', {}, undefined)).toBeUndefined();
    expect(hotlineFor('Paris', {}, 'Myanmar')).toBe('+9567412555');
  });

  it('reads the country a number rings in from its prefix', () => {
    expect(dialCountry({ country: 'MM', dial: '+66948845484' })).toBe('TH');
    expect(dialCountry({ country: 'PH', dial: '+8562055535878' })).toBe('LA');
    expect(dialCountry({ country: 'TH', dial: '1599' })).toBe('TH');
  });
});
