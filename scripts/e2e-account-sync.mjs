#!/usr/bin/env node
// Signs up, adds contacts, signs out, runs a check, signs in again, then signs in on a fresh browser profile.
// Prints what each device shows. Needs a throwaway email account; delete it afterwards.
// Start the app first: EXPO_PUBLIC_OFFLINE_MOCK=1 npx expo start --web --port 8131
// Usage: node scripts/e2e-account-sync.mjs --url=http://localhost:8131 --email=x@example.com --password=... --out=/tmp/e2e
// Needs puppeteer-core and a Chrome binary in CHROME_PATH (default /tmp/chrome-ns.sh).
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const arg = (name, def) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def;
const URL_ = arg('url', 'http://localhost:8131');
const OUT = arg('out', '/tmp/e2e-account-sync');
const EMAIL = arg('email');
const PASSWORD = arg('password');
if (!EMAIL || !PASSWORD) throw new Error('--email and --password are required');
mkdirSync(OUT, { recursive: true });

const settings = JSON.parse(readFileSync('src/i18n/locales/en/settings.json', 'utf8'));
const SYNC_TEXT = Object.fromEntries(Object.entries(settings.sync).map(([k, v]) => [v, k]));
const CONTACTS = [
  { name: 'Test Sister', phone: '+66 81 000 0001' },
  { name: 'Test Brother', phone: '+95 9 000 000 002' },
];
const JOB = 'Urgent hiring! Online customer service agents near Myawaddy, no experience needed, USD 1500 a month. Pay a 300 USD booking fee on Telegram today only.';
const sel = id => `[data-testid="${id}"]`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/tmp/chrome-ns.sh', headless: true, args: ['--no-sandbox'] });

async function fill(page, id, text) {
  await page.waitForSelector(sel(id), { timeout: 30000 });
  await page.evaluate((s, v) => {
    const el = document.querySelector(s);
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, sel(id), text);
}

async function click(page, id) {
  await page.waitForSelector(sel(id), { timeout: 30000 });
  await page.evaluate(s => document.querySelector(s).click(), sel(id));
}

async function home(page) {
  await page.goto(URL_, { waitUntil: 'networkidle2', timeout: 180000 });
  await sleep(2500);
  await page.evaluate(() => {
    if (document.querySelector('[data-testid="home-check-button"]')) return;
    [...document.querySelectorAll('[role="button"]')].at(-1)?.click();
  });
  await page.waitForSelector(sel('home-check-button'), { timeout: 120000 });
}

async function runCheck(page) {
  await home(page);
  await click(page, 'home-check-button');
  await page.waitForSelector(sel('check-text'), { timeout: 15000 });
  await page.type(sel('check-text'), JOB, { delay: 0 });
  await click(page, 'check-submit');
  await page.waitForSelector(sel('report-warn'), { timeout: 120000 });
}

async function openAccount(page, mode) {
  await home(page);
  await click(page, 'open-settings');
  await click(page, 'settings-signup');
  await page.waitForSelector(sel('account-email'), { timeout: 15000 });
  if (mode === 'signIn') await click(page, 'account-toggle');
  await fill(page, 'account-email', EMAIL);
  await fill(page, 'account-password', PASSWORD);
  await click(page, 'account-submit');
  await page.waitForFunction(() => !document.querySelector('[data-testid="account-email"]'), { timeout: 30000 }).catch(async () => {
    const err = await page.$eval(sel('account-error'), e => e.textContent).catch(() => 'no error shown');
    throw new Error(`${mode} did not finish: ${err}`);
  });
}

async function syncStatus(page) {
  await home(page);
  await click(page, 'open-settings');
  await page.waitForSelector(sel('settings-signout'), { timeout: 30000 });
  await page.waitForFunction(t => !document.querySelector('[data-testid="sync-status"]') || document.querySelector('[data-testid="sync-status"]').textContent !== t, { timeout: 30000 }, settings.sync.syncing).catch(() => undefined);
  const text = await page.$eval(sel('sync-status'), e => e.textContent).catch(() => null);
  return text ? (SYNC_TEXT[text] ?? text) : 'none';
}

async function openContacts(page) {
  await home(page);
  await page.evaluate(() => document.querySelectorAll('[role="tab"]')[2]?.click());
  await page.waitForSelector(`${sel('contacts-empty')}, ${sel('contact-name')}`, { timeout: 30000 });
}

async function shownContacts(page, label) {
  await openContacts(page);
  await page.waitForFunction(n => document.querySelectorAll('[data-testid="contact-name"]').length >= n, { timeout: 15000 }, CONTACTS.length).catch(() => undefined);
  await page.screenshot({ path: join(OUT, `${label}-contacts.png`) });
  return page.$$eval(sel('contact-name'), els => els.length);
}

const stored = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const syncLog = async page =>
  ((await stored(page, 'saferoute.diag.v1')) ?? []).filter(e => e.area === 'sync').map(e => `${e.event}${e.d?.code ? `:${e.d.code}` : ''}${e.d?.step ? `:${e.d.step}` : ''}`);

async function device(label, profile) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('dialog', d => d.accept());
  page.on('console', m => { if (/sync|permission/i.test(m.text())) console.log(`[${label}] console`, m.text().slice(0, 200)); });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(p => {
    if (!localStorage.getItem('saferoute.profile.v1')) localStorage.setItem('saferoute.profile.v1', JSON.stringify(p));
    localStorage.setItem('saferoute.uiLanguage.v1', 'en');
  }, profile);
  return { context, page };
}

const result = {};
const base = { onboarded: true, shareSignals: false, sharingAsked: true, keepHistory: true };

const a = await device('A', { ...base, homeCountry: 'MM', destinationCountry: 'TH' });
await openAccount(a.page, 'signUp');
result.aAfterSignUpSync = await syncStatus(a.page);
await openContacts(a.page);
for (const c of CONTACTS) {
  await fill(a.page, 'contact-name-input', c.name);
  await fill(a.page, 'contact-phone-input', c.phone);
  await click(a.page, 'contact-add');
  await sleep(800);
}
result.aAdded = await shownContacts(a.page, 'a1-added');
await home(a.page);
await click(a.page, 'open-settings');
await click(a.page, 'settings-signout');
await a.page.waitForSelector(sel('settings-signup'), { timeout: 30000 });
await a.page.waitForFunction(() => localStorage.getItem('saferoute.contacts.v1') === null, { timeout: 30000 });
result.aAfterSignOut = await shownContacts(a.page, 'a2-signed-out');
await runCheck(a.page);
await openAccount(a.page, 'signIn');
result.aSignInAgainSync = await syncStatus(a.page);
result.aSignInAgain = await shownContacts(a.page, 'a3-signed-in-again');
result.aSyncLog = await syncLog(a.page);
await a.context.close();

const b = await device('B', base);
await runCheck(b.page);
result.bLocalHistory = (await stored(b.page, 'saferoute.history.v1'))?.length ?? 0;
await openAccount(b.page, 'signIn');
result.bSync = await syncStatus(b.page);
await b.page.screenshot({ path: join(OUT, 'b1-settings.png') });
result.bContacts = await shownContacts(b.page, 'b2-second-device');
const bProfile = await stored(b.page, 'saferoute.profile.v1');
result.bProfileCountries = `${bProfile?.homeCountry ?? '-'}/${bProfile?.destinationCountry ?? '-'}`;
result.bSyncLog = await syncLog(b.page);
await b.context.close();

await browser.close();
console.log(JSON.stringify(result, null, 2));
