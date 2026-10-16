#!/usr/bin/env node
// Screenshots the five onboarding steps in the web dev build against the offline mock.
// Start the app first with EXPO_PUBLIC_OFFLINE_MOCK=1 EXPO_PUBLIC_GOOGLE_SIGNIN=1 EXPO_PUBLIC_FACEBOOK_APP_ID=1
// and dummy EXPO_PUBLIC_FIREBASE_* values: npx expo start --web --port 8099
// Usage: node scripts/e2e-onboarding.mjs --url=http://localhost:8099 --out=pitch/e2e
// Needs puppeteer-core and a Chrome binary in CHROME_PATH (default /tmp/chrome-ns.sh).
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const arg = (name, def) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def;
const URL_ = arg('url', 'http://localhost:8099');
const OUT = arg('out', 'pitch/e2e');
mkdirSync(OUT, { recursive: true });

const STEPS = ['language', 'account', 'countries', 'how', 'sharing'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sel = id => `[data-testid="${id}"]`;
const click = async (page, id) => {
  await page.waitForSelector(sel(id), { timeout: 120000 });
  await page.evaluate(s => document.querySelector(s).click(), sel(id));
  await sleep(500);
};

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/tmp/chrome-ns.sh', headless: true, args: ['--no-sandbox'] });

async function run(lang, [w, h], only) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(l => localStorage.setItem('saferoute.uiLanguage.v1', l), lang);
  page.on('pageerror', err => console.log('pageerror', err.message.slice(0, 160)));
  await page.goto(URL_, { waitUntil: 'networkidle2', timeout: 240000 });
  await page.waitForSelector(sel('onboarding-hero'), { timeout: 120000 });
  await sleep(1200);
  const suffix = only ? `-${w}x${h}` : '';
  const shot = async i => {
    if (!only || only === STEPS[i]) await page.screenshot({ path: `${OUT}/onb2-${i + 1}-${STEPS[i]}-${lang}${suffix}.png` });
  };
  await shot(0);
  await click(page, 'onboarding-next');
  await sleep(600);
  await shot(1);
  await click(page, 'onboarding-anonymous');
  await page.evaluate(() => [...document.querySelectorAll('[role="button"]')].find(b => /Myanmar|မြန်မာ/.test(b.textContent))?.click());
  await sleep(400);
  await shot(2);
  await click(page, 'onboarding-next');
  await sleep(400);
  await shot(3);
  await click(page, 'onboarding-next');
  await sleep(400);
  await shot(4);
  await page.close();
}

for (const lang of ['en', 'my']) await run(lang, [390, 844]);
await run('en', [768, 1024], 'account');
await browser.close();
