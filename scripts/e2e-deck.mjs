#!/usr/bin/env node
// Captures the submission deck screens (Home, Check, High risk report, Job Shield) at 2x.
// Start the app first against the live API: EXPO_PUBLIC_API_URL=<api> npx expo start --web --port 8162
// Usage: node scripts/e2e-deck.mjs --url=http://localhost:8161 --out=/tmp/kakwe-shots
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const arg = (name, def) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def;
const URL_ = arg('url', 'http://localhost:8162');
const OUT = arg('out', '/tmp/kakwe-shots');
mkdirSync(OUT, { recursive: true });

const MESSAGE = 'Hello sister! Factory job in Mae Sot, Thailand. Salary 18,000 baht per month, free food and room. No experience needed. We take care of the passport and visa. Send a photo of your passport today to book your seat. A car leaves Myawaddy on Friday night. Only 3 places left. Do not tell other people about this job.';
const AD = 'Kinnari Thread Works Co., Ltd. is hiring sewing machine operators in Mae Sot, Thailand. Salary 12,000 THB per month. No agency fees. Official contract and work permit provided. Apply at our office.';
const CHAT = 'Hi sister, to keep your place please pay a 300 USD deposit today to this account. Also send a clear photo of your passport. We sign the contract after you arrive.';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const sel = id => `[data-testid="${id}"]`;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/tmp/chrome-ns.sh', headless: true, args: ['--no-sandbox'] });

async function open(lang, query = '') {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument(l => {
    localStorage.setItem('saferoute.uiLanguage.v1', l);
    localStorage.setItem('saferoute.profile.v1', JSON.stringify({ onboarded: true, shareSignals: false, sharingAsked: true, keepHistory: true, homeCountry: 'MM', destinationCountry: 'TH' }));
  }, lang);
  page.on('pageerror', e => console.log('pageerror', e.message.slice(0, 160)));
  await page.goto(`${URL_}/${query}`, { waitUntil: 'networkidle2', timeout: 240000 });
  await page.waitForSelector(sel('home-check-button'), { timeout: 120000 });
  await sleep(800);
  return page;
}

const click = (page, id) => page.evaluate(s => document.querySelector(s).click(), sel(id));
async function fill(page, id, text) {
  await page.evaluate((s, v) => {
    const el = document.querySelector(s);
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, sel(id), text);
}
const shot = (page, name) => page.screenshot({ path: `${OUT}/deck-${name}.png` });

async function toCheck(page) {
  await click(page, 'home-check-button');
  await page.waitForSelector(sel('check-mode-message'), { timeout: 30000 });
  await sleep(500);
}

for (const lang of ['en', 'my']) {
  const home = await open(lang, '?shieldStub=on');
  await shot(home, `home-on-${lang}`);
  await toCheck(home);
  await click(home, 'check-mode-message');
  await fill(home, 'check-text', MESSAGE);
  await sleep(400);
  await shot(home, `check-message-${lang}`);
  await click(home, 'check-submit');
  await home.waitForSelector(sel('report-talk'), { timeout: 90000 });
  await sleep(5000);
  await shot(home, `report-danger-${lang}`);
  await home.close();

  const job = await open(lang, '?shieldStub=off');
  await toCheck(job);
  await click(job, 'check-mode-job');
  await sleep(300);
  await fill(job, 'job-ad-text', AD);
  await fill(job, 'job-chat-text', CHAT);
  await sleep(400);
  await shot(job, `check-job-${lang}`);
  await click(job, 'check-submit');
  await job.waitForSelector(sel('facts-submit'), { timeout: 90000 });
  await sleep(800);
  await shot(job, `job-facts-${lang}`);
  await click(job, 'facts-submit');
  await job.waitForSelector(sel('report-conflicts'), { timeout: 90000 });
  await sleep(5000);
  await shot(job, `job-result-${lang}`);
  await job.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'start' }), sel('report-conflicts'));
  await sleep(800);
  await shot(job, `job-conflicts-${lang}`);
  await job.close();
}
await browser.close();
