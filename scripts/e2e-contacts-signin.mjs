#!/usr/bin/env node
// Screenshots the sign-in prompt for trusted contacts (Contacts tab and Warn my family sheet).
// Usage: node scripts/e2e-contacts-signin.mjs --url=http://localhost:8099 --out=pitch/e2e
// Needs puppeteer-core and a Chrome binary in CHROME_PATH. The app must run as a dev web build with the offline mock.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const arg = (name, def) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def;
const URL_ = arg('url', 'http://localhost:8099');
const OUT = arg('out', 'pitch/e2e');
mkdirSync(OUT, { recursive: true });
const sel = id => `[data-testid="${id}"]`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const JOB = 'Urgent hiring! Online customer service agents near Myawaddy, no experience needed, USD 1500 a month. We keep your passport for safety. Pay a 300 USD booking fee on Telegram today only.';
const dismissConsent = async page => {
  await sleep(2500);
  await page.evaluate(() => {
    if (document.querySelector('[data-testid="home-check-button"]')) return;
    [...document.querySelectorAll('[role="button"]')].at(-1)?.click();
  });
  await sleep(600);
};

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/tmp/chrome-ns.sh', headless: true });
for (const lang of ['en', 'my']) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument(l => {
    localStorage.setItem('saferoute.profile.v1', JSON.stringify({ onboarded: true, language: l, shareSignals: false, homeCountry: 'MM', destinationCountry: 'TH' }));
    localStorage.setItem('saferoute.uiLanguage.v1', l);
  }, lang);
  await page.goto(URL_, { waitUntil: 'networkidle2' });
  await dismissConsent(page);
  await page.waitForSelector(sel('home-check-button'), { timeout: 120000 });

  await page.evaluate(() => document.querySelectorAll('[role="tab"]')[2]?.click());
  await page.waitForSelector(sel('contact-add-gated'), { timeout: 20000 });
  await page.$eval(sel('contact-add-gated'), e => e.click());
  await page.waitForSelector(sel('contacts-gate'));
  await sleep(500);
  await page.screenshot({ path: join(OUT, `contacts-signin-contacts-${lang}.png`) });

  await page.goto(URL_, { waitUntil: 'networkidle2' });
  await dismissConsent(page);
  await page.waitForSelector(sel('home-check-button'), { timeout: 60000 });
  await page.$eval(sel('home-check-button'), e => e.click());
  await page.waitForSelector(sel('check-text'), { timeout: 8000 });
  await page.type(sel('check-text'), JOB, { delay: 0 });
  await page.$eval(sel('check-submit'), e => e.click());
  await page.waitForSelector(sel('report-warn'), { timeout: 120000 });
  await page.$eval(sel('report-warn'), e => e.click());
  await page.waitForSelector(sel('warn-add'));
  await page.$eval(sel('warn-add'), e => e.click());
  await page.waitForSelector(sel('contacts-gate'));
  await sleep(600);
  await page.screenshot({ path: join(OUT, `contacts-signin-warn-${lang}.png`) });
  await page.close();
}
await browser.close();
