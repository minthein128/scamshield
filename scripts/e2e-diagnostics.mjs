#!/usr/bin/env node
// Screenshots Settings > Diagnostics log in the web dev build against the offline mock.
// Start the app first: EXPO_PUBLIC_OFFLINE_MOCK=1 npx expo start --web --port 8099
// Usage: node scripts/e2e-diagnostics.mjs --url=http://localhost:8099 --out=pitch/e2e
// Needs puppeteer-core and a Chrome binary in CHROME_PATH (default /tmp/chrome-ns.sh).
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const arg = (name, def) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def;
const URL_ = arg('url', 'http://localhost:8099');
const OUT = arg('out', 'pitch/e2e');
const LANGS = arg('langs', 'en,my').split(',');
const [W, H] = arg('size', '390x844').split('x').map(Number);
mkdirSync(OUT, { recursive: true });

const now = Date.now();
const e = (minsAgo, level, area, event, d = {}) => ({ t: now - minsAgo * 60_000, v: '1.0.0', p: 'android', level, area, event, d });
const SAMPLE = [
  e(50, 'info', 'app', 'start'),
  e(49, 'info', 'connection', 'url_resolved', { host: 'saferoute-api.akkhayar.com', ms: 412 }),
  e(48, 'info', 'auth', 'state', { kind: 'anonymous', uid: 'h3fa21' }),
  e(40, 'info', 'api', 'request', { endpoint: 'check', status: 200, ms: 6120 }),
  e(32, 'info', 'auth', 'attempt', { method: 'google' }),
  e(32, 'error', 'auth', 'google_native_error', { stage: 'googleSignIn', code: '10' }),
  e(32, 'error', 'auth', 'failed', { method: 'google', code: '10', ms: 1840 }),
  e(25, 'warn', 'api', 'request_failed', { endpoint: 'check', kind: 'rate_limited', ms: 310, status: 429 }),
  e(18, 'error', 'api', 'request_failed', { endpoint: 'jobExtract', kind: 'timeout', ms: 75000 }),
  e(18, 'error', 'jobShield', 'extract_failed', { code: 'timeout', unreadable: false }),
  e(9, 'error', 'live', 'error', { code: 'unavailable', fallback: true, ms: 8001 }),
  e(5, 'error', 'sync', 'pull_failed', { code: 'permission-denied' }),
  e(2, 'info', 'connection', 'health', { host: 'saferoute-api.akkhayar.com', ok: true, ms: 188, status: 200 }),
].sort((a, b) => a.t - b.t);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const sel = id => `[data-testid="${id}"]`;
const click = async (page, id) => {
  await page.waitForSelector(sel(id), { timeout: 60000 });
  await page.evaluate(s => document.querySelector(s).click(), sel(id));
};

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/tmp/chrome-ns.sh', headless: true, args: ['--no-sandbox'] });
for (const lang of LANGS) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((l, sample) => {
    localStorage.setItem('saferoute.uiLanguage.v1', l);
    localStorage.setItem('saferoute.profile.v1', JSON.stringify({ onboarded: true, shareSignals: false, sharingAsked: true, keepHistory: true, homeCountry: 'MM', destinationCountry: 'TH' }));
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('saferoute.diag.v1', JSON.stringify(sample));
      sessionStorage.setItem('seeded', '1');
    }
  }, lang, SAMPLE);
  page.on('pageerror', err => console.log('pageerror', err.message.slice(0, 160)));
  await page.goto(URL_, { waitUntil: 'networkidle2', timeout: 180000 });
  await click(page, 'open-settings');
  await page.waitForSelector(sel('settings-open-log'), { timeout: 60000 });
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel('settings-open-log'));
  await sleep(600);
  await page.screenshot({ path: `${OUT}/diagnostics-settings-${lang}-${W}x${H}.png` });
  await click(page, 'settings-open-log');
  await page.waitForSelector(sel('diagnostics-list'), { timeout: 60000 });
  await sleep(800);
  await page.screenshot({ path: `${OUT}/diagnostics-log-${lang}-${W}x${H}.png` });
  await click(page, 'diagnostics-filter-errors');
  await sleep(500);
  await page.screenshot({ path: `${OUT}/diagnostics-errors-${lang}-${W}x${H}.png` });
  await page.close();
}
await browser.close();
