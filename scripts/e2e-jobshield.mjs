#!/usr/bin/env node
// Screenshots the Job Shield flow in the web dev build against the offline mock.
// Start the app first: EXPO_PUBLIC_OFFLINE_MOCK=1 npx expo start --web --port 8099
// Usage: node scripts/e2e-jobshield.mjs --url=http://localhost:8099 --out=pitch/e2e
// Needs puppeteer-core (npm i --no-save puppeteer-core) and a Chrome binary in CHROME_PATH (default /tmp/chrome-ns.sh).
import { readFileSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const arg = (name, def) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def;
const URL_ = arg('url', 'http://localhost:8099');
const OUT = arg('out', 'pitch/e2e');
const LANGS = arg('langs', 'en,my').split(',');
const SIZES = arg('sizes', '390x844,768x1024').split(',').map(s => s.split('x').map(Number));
mkdirSync(OUT, { recursive: true });

const AD = {
  en: 'Bangkok Logistics Co., Ltd. needs customer service staff in Bangkok, Thailand. Salary 35,000 THB per month. No agency fees. Official contract and work visa provided. Meet at our office on Silom Road.',
  my: 'Bangkok Logistics Co., Ltd. သည် ထိုင်းနိုင်ငံ ဘန်ကောက်မြို့တွင် ဖောက်သည်ဝန်ဆောင်မှု ဝန်ထမ်းများ ခေါ်ယူနေပါသည်။ လစာ 35,000 THB လစဉ်။ ကြေးမလို။ တရားဝင်စာချုပ်နှင့် အလုပ်ဗီဇာ ပါဝင်ပါသည်။ ကျွန်ုပ်တို့ရုံးတွင် တွေ့ဆုံပါမည်။',
};
const CHAT = {
  en: 'Hi, please send a photo of your passport today. Pay a 300 USD deposit to reserve your seat. A driver will pick you up at the border. Do not tell your family. You will enter as a tourist first.',
  my: 'မင်္ဂလာပါ၊ ယနေ့ပဲ သင့်ပတ်စပို့ဓာတ်ပုံ ပို့ပေးပါ။ နေရာယူရန် 300 USD စရံငွေ ပေးပါ။ ယာဉ်မောင်းက နယ်စပ်တွင် လာကြိုပါမည်။ မိသားစုကို မပြောပါနှင့်။ ခရီးသွားဗီဇာဖြင့် အရင်ဝင်ရပါမည်။',
};
const AD_CLEAN = {
  en: 'Sunrise Hotel Co., Ltd. needs housekeeping staff in Phuket, Thailand. Salary 15,000 THB per month. No agency fees. Official contract and work visa provided. Meet at our office at 12 Beach Road.',
  my: 'Sunrise Hotel Co., Ltd. သည် ထိုင်းနိုင်ငံ ဖူးကက်မြို့တွင် အိမ်ထိန်းဝန်ထမ်းများ ခေါ်ယူနေပါသည်။ လစာ 15,000 THB လစဉ်။ ကြေးမလို။ တရားဝင်စာချုပ်နှင့် အလုပ်ဗီဇာ ပါဝင်ပါသည်။ ကျွန်ုပ်တို့ရုံးတွင် တွေ့ဆုံပါမည်။',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const tab = (lang) => JSON.parse(readFileSync(`src/i18n/locales/${lang}/common.json`, 'utf8')).tabs.check;

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/tmp/chrome-ns.sh', headless: true, args: ['--no-sandbox'] });
const sel = id => `[data-testid="${id}"]`;

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

async function scrollAll(page, y) {
  await page.evaluate(top => {
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50) el.scrollTo(0, top < 0 ? el.scrollHeight : top);
    }
  }, y);
  await sleep(400);
}

async function run(lang, [w, h], scenario) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((l) => {
    localStorage.setItem('saferoute.uiLanguage.v1', l);
    localStorage.setItem('saferoute.profile.v1', JSON.stringify({ onboarded: true, shareSignals: false, sharingAsked: true, keepHistory: true, homeCountry: 'MM', destinationCountry: 'TH' }));
  }, lang);
  page.on('pageerror', e => console.log('pageerror', e.message.slice(0, 160)));
  const name = (step) => `${OUT}/jobshield-${step}-${scenario}-${lang}-${w}x${h}.png`;
  await page.goto(URL_, { waitUntil: 'networkidle2', timeout: 180000 });
  await page.waitForFunction(label => [...document.querySelectorAll('[role=tab],[role=button],a,div')].some(e => e.textContent?.trim() === label), { timeout: 120000 }, tab(lang));
  await page.evaluate(label => {
    const els = [...document.querySelectorAll('[role=tab],[role=button],a')].filter(e => e.textContent?.trim() === label);
    els[els.length - 1].click();
  }, tab(lang));
  await fill(page, 'job-ad-text', scenario === 'pause' ? AD[lang] : AD_CLEAN[lang]);
  if (scenario === 'pause') await fill(page, 'job-chat-text', CHAT[lang]);
  await sleep(500);
  await page.screenshot({ path: name('input') });
  await scrollAll(page, -1);
  await page.screenshot({ path: name('input-bottom') });
  await click(page, 'check-submit');
  await page.waitForSelector(sel('facts-submit'), { timeout: 60000 });
  await sleep(800);
  await page.screenshot({ path: name('facts') });
  await scrollAll(page, 700);
  await page.screenshot({ path: name('facts-scrolled') });
  if (scenario === 'pause') {
    await click(page, 'fact-chat-contract-edit');
    await sleep(500);
    await page.screenshot({ path: name('facts-editing') });
    await click(page, 'fact-chat-contract-select');
    await sleep(500);
    await page.screenshot({ path: name('facts-select') });
    await click(page, 'fact-chat-contract-select-later');
    await sleep(300);
  }
  await click(page, 'facts-submit');
  await page.waitForSelector('[data-testid^="verdict-"]', { timeout: 90000 }).catch(() => undefined);
  await page.waitForSelector(sel('report-warn'), { timeout: 90000 });
  await sleep(1200);
  await page.screenshot({ path: name('result') });
  await scrollAll(page, 650);
  await page.screenshot({ path: name('result-scrolled') });
  await scrollAll(page, -1);
  await page.screenshot({ path: name('result-bottom') });
  await page.close();
}

for (const lang of LANGS) for (const size of SIZES) for (const scenario of (arg('scenarios', 'pause,lower')).split(',')) {
  console.log('shoot', lang, size.join('x'), scenario);
  await run(lang, size, scenario).catch(e => console.log('FAILED', lang, size.join('x'), scenario, e.message.slice(0, 200)));
}
await browser.close();
