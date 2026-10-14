import { COUNTRIES } from '../data/countries';
import { HOTLINES } from '../data/hotlines';
import { allSections, helpSections, hotlineByDial, hotlinesForCountry, primaryHotline, resolveCallTarget } from '../lib/hotlines';
import { defaultScope, seenLine, reportCountText } from '../lib/radar';
import { countryFromText } from '../lib/countries';
import { smsUrl, telLink, validateContact, normalizePhone } from '../lib/contacts';

describe('hotline data', () => {
  it('has a unique id, an https source and something to dial for every entry', () => {
    expect(new Set(HOTLINES.map(h => h.id)).size).toBe(HOTLINES.length);
    for (const h of HOTLINES) {
      expect(h.sourceUrl).toMatch(/^https:\/\//);
      expect(h.dial || h.reportUrl).toBeTruthy();
      expect(COUNTRIES.some(c => c.code === h.country)).toBe(true);
    }
  });
});

describe('hotline filter', () => {
  it('lists the destination first, then the home country', () => {
    const sections = helpSections('TH', 'MM');
    expect(sections.map(s => s.country)).toEqual(['TH', 'MM']);
    expect(sections[0].entries.every(h => h.country === 'TH')).toBe(true);
  });

  it('shows citizen help lines only for the home country', () => {
    const sections = helpSections('TH', 'PH');
    expect(sections[0].entries.some(h => h.category === 'consular')).toBe(false);
    expect(sections[1].entries.some(h => h.category === 'consular')).toBe(true);
  });

  it('dedupes when home and destination match, and handles one or none', () => {
    expect(helpSections('MY', 'MY').length).toBe(1);
    expect(helpSections(undefined, 'VN').map(s => s.country)).toEqual(['VN']);
    expect(helpSections(undefined, undefined)).toEqual([]);
  });

  it('keeps a country with no verified entries so the screen can say so', () => {
    const sparse = helpSections('KH', undefined, []);
    expect(sparse).toEqual([{ country: 'KH', entries: [] }]);
  });

  it('orders entries trafficking first', () => {
    const order = hotlinesForCountry('TH').map(h => h.category);
    expect(order.indexOf('trafficking')).toBeLessThan(order.indexOf('police'));
  });

  it('can list every country', () => {
    expect(allSections().length).toBe(COUNTRIES.length);
  });
});

describe('call target', () => {
  it('prefers the destination anti-trafficking line, then home trafficking, then police', () => {
    expect(primaryHotline('TH', 'MM')?.id).toBe('th-rtp-ahtd-1599');
    expect(primaryHotline('LA', 'VN')?.id).toBe('vn-111');
    expect(primaryHotline('PH', 'VN')?.id).toBe('ph-1343-actionline');
    expect(primaryHotline('MY', undefined)?.id).toBe('my-pdrm-999');
    expect(primaryHotline('MY', 'PH')?.id).toBe('ph-1343-actionline');
    expect(primaryHotline(undefined, undefined)).toBeUndefined();
  });

  it('uses the number the server sent when the shared data knows it', () => {
    expect(hotlineByDial('1599')?.country).toBe('TH');
    expect(resolveCallTarget('111', 'TH', 'MM')?.id).toBe('vn-111');
    expect(resolveCallTarget('1343', 'TH', 'MM')?.country).toBe('PH');
    expect(resolveCallTarget('00000', 'TH', 'MM')?.id).toBe('th-rtp-ahtd-1599');
    expect(resolveCallTarget(undefined, undefined, undefined)).toBeUndefined();
  });

  it('maps free-text destinations to countries', () => {
    expect(countryFromText('Bangkok, Thailand')).toBe('TH');
    expect(countryFromText('somewhere')).toBeUndefined();
  });
});

describe('contact links', () => {
  it('builds tel and sms links', () => {
    expect(telLink('+95 9 123 456')).toBe('tel:+959123456');
    expect(smsUrl('+66 81 234', 'Stop & call me')).toBe('sms:+6681234?body=Stop%20%26%20call%20me');
    expect(smsUrl('0812345', 'hi', 'ios')).toBe('sms:0812345&body=hi');
    expect(normalizePhone(' (081) 234-567 ')).toBe('081234567');
  });

  it('validates name and number', () => {
    expect(validateContact({ name: '', phone: '+959123456' })).toMatch(/name/i);
    expect(validateContact({ name: 'A', phone: '12' })).toMatch(/phone/i);
    expect(validateContact({ name: 'A', phone: '+959123456' })).toBeNull();
  });
});

describe('radar helpers', () => {
  it('defaults to destination, then home, then global', () => {
    expect(defaultScope('TH', 'MM')).toBe('TH');
    expect(defaultScope(undefined, 'MM')).toBe('MM');
    expect(defaultScope()).toBe('GLOBAL');
    expect(seenLine(19)).toBe('Reported 19 times by other SafeRoute users in the last 30 days');
    expect(seenLine(1)).toMatch(/1 time by/);
    expect(seenLine(undefined)).toBeNull();
    expect(reportCountText(1)).toBe('1 report in 30 days');
  });
});
