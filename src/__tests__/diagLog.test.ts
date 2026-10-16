import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DIAG_KEY,
  DIAG_MAX_AGE_MS,
  DIAG_MAX_ENTRIES,
  clearLog,
  diag,
  readLog,
  resetDiagMemory,
  sanitizeDetails,
  sanitizeValue,
  shortHash,
  type DiagEntry,
} from '../lib/diagLog';
import { logUncaught, topFrame } from '../lib/diagGlobal';
import { buildDiagnosticsReport } from '../lib/diagReport';

beforeEach(async () => {
  await AsyncStorage.clear();
  resetDiagMemory();
});

describe('sanitizer', () => {
  it('keeps short codes, numbers and booleans', () => {
    expect(sanitizeValue('auth/network-request-failed')).toBe('auth/network-request-failed');
    expect(sanitizeValue('timeout')).toBe('timeout');
    expect(sanitizeValue('12500')).toBe('12500');
    expect(sanitizeValue(412)).toBe(412);
    expect(sanitizeValue(true)).toBe(true);
  });

  it('redacts digit runs of six or more, emails, urls and paths', () => {
    expect(sanitizeValue('959123456789')).toBe('[redacted]');
    expect(sanitizeValue('+95 9 123 456')).toBe('[redacted]');
    expect(sanitizeValue('ko.aung@example.com')).toBe('[redacted]');
    expect(sanitizeValue('https://scam.example/pay?id=1')).toBe('[redacted]');
    expect(sanitizeValue('scam.example/pay')).toBe('[redacted]');
    expect(sanitizeValue('users/abc')).toBe('[redacted]');
    expect(sanitizeValue(1234567)).toBe('[redacted]');
  });

  it('redacts long text, tokens, quotes and non-latin text', () => {
    expect(sanitizeValue('please send the deposit to this account today')).toBe('[redacted]');
    expect(sanitizeValue('eyJhbGciOiJIUzI1NiIsInR5cCI6')).toBe('[redacted]');
    expect(sanitizeValue("can't read 'x'")).toBe('[redacted]');
    expect(sanitizeValue('မင်္ဂလာပါ')).toBe('[redacted]');
  });

  it('drops empty values, objects and bad keys, and caps the key count', () => {
    expect(sanitizeValue('')).toBeNull();
    expect(sanitizeValue({ a: 1 })).toBeNull();
    expect(sanitizeValue(Number.NaN)).toBeNull();
    const many = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`k${i}`, i]));
    expect(Object.keys(sanitizeDetails({ ...many, 'bad key': 1, nested: { a: 1 } }))).toHaveLength(8);
    expect(sanitizeDetails({ 'bad key': 1, Email: 'x' })).toEqual({});
  });

  it('hashes ids to a short code with no digit run', () => {
    const h = shortHash('uid-1234567890abcdef');
    expect(h).toMatch(/^h[0-9a-f]{5}$/);
    expect(sanitizeValue(h)).toBe(h);
  });
});

describe('log store', () => {
  it('stores entries with version, platform, area, event and clean details', async () => {
    diag.error('auth', 'failed', { method: 'google', code: '10', note: 'ko.aung@example.com' });
    const [e] = await readLog();
    expect(e).toMatchObject({ level: 'error', area: 'auth', event: 'failed', d: { method: 'google', code: '10', note: '[redacted]' } });
    expect(typeof e.v).toBe('string');
    expect(typeof e.p).toBe('string');
    expect(typeof e.t).toBe('number');
  });

  it('keeps only the last 300 entries', async () => {
    for (let i = 0; i < DIAG_MAX_ENTRIES + 25; i++) diag.info('app', 'tick', { n: i });
    const list = await readLog();
    expect(list).toHaveLength(DIAG_MAX_ENTRIES);
    expect(list[0].d.n).toBe(25);
    expect(list[list.length - 1].d.n).toBe(DIAG_MAX_ENTRIES + 24);
    expect(JSON.parse((await AsyncStorage.getItem(DIAG_KEY)) ?? '[]')).toHaveLength(DIAG_MAX_ENTRIES);
  });

  it('drops entries older than seven days on load and on write', async () => {
    const old: DiagEntry = { t: Date.now() - DIAG_MAX_AGE_MS - 60_000, v: '1', p: 'android', level: 'info', area: 'app', event: 'old', d: {} };
    const fresh: DiagEntry = { ...old, t: Date.now() - 1000, event: 'fresh' };
    await AsyncStorage.setItem(DIAG_KEY, JSON.stringify([old, fresh]));
    expect((await readLog()).map(e => e.event)).toEqual(['fresh']);
    resetDiagMemory();
    await AsyncStorage.setItem(DIAG_KEY, JSON.stringify([old, fresh]));
    diag.info('app', 'new');
    expect((await readLog()).map(e => e.event)).toEqual(['fresh', 'new']);
  });

  it('survives corrupt storage and clears on request', async () => {
    await AsyncStorage.setItem(DIAG_KEY, '{nope');
    expect(await readLog()).toEqual([]);
    diag.info('app', 'x');
    expect(await readLog()).toHaveLength(1);
    await clearLog();
    expect(await readLog()).toEqual([]);
    expect(await AsyncStorage.getItem(DIAG_KEY)).toBeNull();
  });

  it('never throws into callers', () => {
    expect(() => diag.error('app', 'x', { a: { b: 1 } } as never)).not.toThrow();
  });
});

describe('unhandled errors', () => {
  it('logs the error name and top function, never the message', async () => {
    const e = new TypeError('send 300 USD to 959123456789');
    e.stack = 'TypeError: send 300 USD\n    at onPress (index.bundle:1:2)';
    logUncaught(e, true);
    const [entry] = await readLog();
    expect(entry).toMatchObject({ area: 'app', event: 'js_error', d: { name: 'TypeError', fn: 'onPress', fatal: true } });
    expect(JSON.stringify(entry)).not.toMatch(/USD|9591/);
    expect(topFrame(undefined)).toBe('unknown');
  });
});

describe('report', () => {
  it('has device, language, connection and entries newest first', async () => {
    diag.info('app', 'first');
    diag.warn('connection', 'health', { host: 'api.example.com', ok: false });
    const report = await buildDiagnosticsReport('my', async () => 'chosen api.example.com');
    expect(report).toContain('SafeRoute diagnostics report');
    expect(report).toContain('language my');
    expect(report).toContain('chosen api.example.com');
    expect(report.indexOf('connection.health')).toBeLessThan(report.indexOf('app.first'));
    expect(report).toContain('host=api.example.com ok=false');
  });

  it('caps the log at the last 100 entries', async () => {
    for (let i = 0; i < 130; i++) diag.info('app', 'tick', { n: i });
    const report = await buildDiagnosticsReport('en', async () => 'c');
    expect(report).toContain('log (100 newest first)');
    expect(report).toContain('n=129');
    expect(report).not.toContain('n=29 ');
  });
});
