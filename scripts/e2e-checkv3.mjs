#!/usr/bin/env node
// Screenshots Home (shield off, on, web) and every Check v3 state in en and my.
// Start the app first: EXPO_PUBLIC_OFFLINE_MOCK=1 npx expo start --web --port 8161
// The shield "on" state is faked in dev web through ?shieldStub=on (src/hooks/useHomeShield.ts).
// Usage: node scripts/e2e-checkv3.mjs --url=http://localhost:8163 --out=pitch/e2e --image=/tmp/shot.png
import { readFileSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const arg = (name, def) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def;
const URL_ = arg('url', 'http://localhost:8163');
const OUT = arg('out', 'pitch/e2e');
const IMAGE = arg('image', '/tmp/shot.png');
const LANGS = arg('langs', 'en,my').split(',');
mkdirSync(OUT, { recursive: true });

const AD = {
  en: 'URGENT! Factory workers needed in Bangkok. 35,000 THB a month. No experience. Free visa. Contact agent on Viber.',
  my: 'အမြန်! ဘန်ကောက် စက်ရုံ အလုပ်သမား လိုသည်။ လစာ 35,000 THB။ အတွေ့အကြုံ မလို။ ဗီဇာ အခမဲ့။ Viber မှ ဆက်သွယ်ပါ။',
};
const CHAT = {
  en: 'Please pay a travel deposit today. We will keep your passport after arrival.',
  my: 'ဒီနေ့ ခရီးစရိတ် စရံ ပေးပါ။ ရောက်ရင် ပတ်စပို့ကို ကျွန်တော်တို့ သိမ်းထားမယ်။',
};
const RECENT = {
  en: [['Urgent hiring near Myawaddy', 'danger', 60], ['agency-jobs.example/apply', 'careful', 300], ['Warehouse job in Chonburi', 'safe', 1800], ['Send 300 USD for your visa', 'danger', 2880], ['Factory work, Bangkok', 'careful', 4320], ['Shop selling phones on Facebook', 'safe', 10080], ['Hotel jobs in Phuket', 'safe', 14400]],
  my: [['မြဝတီ အနီး အရေးပေါ် အလုပ်ခေါ်စာ', 'danger', 60], ['agency-jobs.example/apply', 'careful', 300], ['ဈေးဝယ် ရှိပိုး အလုပ်', 'safe', 1800], ['ဗီဇာအတွက် 300 USD ပို့ပါ', 'danger', 2880], ['ဘန်ကောက် စက်ရုံ အလုပ်', 'careful', 4320], ['Facebook မှ ဖုန်းရောင်းသည့် ဆိုင်', 'safe', 10080], ['ဖူးကက် ဟိုတယ် အလုပ်', 'safe', 14400]],
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const tab = lang => JSON.parse(readFileSync(`src/i18n/locales/${lang}/common.json`, 'utf8')).tabs.check;
const sel = id => `[data-testid="${id}"]`;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/tmp/chrome-ns.sh', headless: true, args: ['--no-sandbox'] });

const history = lang => RECENT[lang].map(([source, verdict, minutes], i) => ({
  id: `seed-${i}`,
  createdAt: new Date(Date.now() - minutes * 60000).toISOString(),
  language: lang,
  source,
  result: { id: `seed-${i}`, createdAt: new Date().toISOString(), kind: 'job', verdict, score: 50, title: source, summary: '', spokenWarning: '', scamType: 'other', flags: [], linkChecks: [], actions: [], model: 'mock' },
}));

async function open(lang, w, h, query = '') {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((l, hist) => {
    localStorage.setItem('saferoute.uiLanguage.v1', l);
    localStorage.setItem('saferoute.profile.v1', JSON.stringify({ onboarded: true, shareSignals: false, sharingAsked: true, keepHistory: true, homeCountry: 'MM', destinationCountry: 'TH' }));
    localStorage.setItem('saferoute.history.v1', JSON.stringify(hist));
  }, lang, history(lang));
  page.on('pageerror', e => console.log('pageerror', e.message.slice(0, 160)));
  await page.goto(`${URL_}/${query}`, { waitUntil: 'networkidle2', timeout: 240000 });
  await page.waitForSelector(sel('home-check-button'), { timeout: 120000 });
  await sleep(600);
  return page;
}

async function gotoCheck(page, lang) {
  await page.evaluate(label => {
    const els = [...document.querySelectorAll('[role=tab],[role=button],a')].filter(e => e.textContent?.replace(/[\u200B\s]/g, '') === label.replace(/\s/g, ''));
    els[els.length - 1].click();
  }, tab(lang));
  await page.waitForSelector(sel('check-mode-message'), { timeout: 30000 });
  await sleep(500);
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
const shot = (page, name) => page.screenshot({ path: `${OUT}/checkv3-${name}.png` });

for (const lang of LANGS) {
  for (const [state, query] of [['off', '?shieldStub=off'], ['on', '?shieldStub=on'], ['web', '']]) {
    const page = await open(lang, 390, lang === 'my' ? 1850 : 1500, query);
    await shot(page, `home-${state}-${lang}`);
    await page.close();
  }
  const tablet = await open(lang, 768, 1024, '?shieldStub=on');
  await shot(tablet, `home-on-${lang}-768`);
  await tablet.close();

  for (const [w, h] of [[390, 1250], [768, 1024]]) {
    const sfx = w === 768 ? '-768' : '';
    const page = await open(lang, w, h, '?shieldStub=off');
    await gotoCheck(page, lang);
    await click(page, 'check-mode-message'); await sleep(300);
    await shot(page, `mode-message-${lang}${sfx}`);
    if (w === 768) { await page.close(); continue; }
    await click(page, 'check-mode-shop'); await sleep(300); await shot(page, `mode-shop-${lang}`);
    await click(page, 'check-mode-general'); await sleep(300); await shot(page, `mode-not-${lang}`);
    await click(page, 'check-mode-message'); await click(page, 'check-more'); await sleep(400); await shot(page, `mode-details-${lang}`);
    await click(page, 'check-more');
    await click(page, 'check-mode-job'); await sleep(300); await shot(page, `job-empty-${lang}`);
    const [chooser] = await Promise.all([page.waitForFileChooser(), click(page, 'job-ad-pick')]);
    await chooser.accept([IMAGE]);
    await page.waitForSelector(sel('job-ad-file'), { timeout: 30000 });
    await fill(page, 'job-chat-text', CHAT[lang]);
    await sleep(500); await shot(page, `job-filled-${lang}`);
    await page.close();
  }
  const clip = await open(lang, 390, 1250, '?shieldStub=off&clipStub=1');
  await gotoCheck(clip, lang);
  await click(clip, 'check-mode-message'); await sleep(300);
  await shot(clip, `clip-${lang}`);
  await clip.close();
}
{
  const page = await open('en', 390, 1000, '?shieldStub=off');
  await gotoCheck(page, 'en');
  await shot(page, 'entry-tab-en');
  await page.evaluate(label => [...document.querySelectorAll('[role=tab],[role=button],a')].filter(e => e.textContent?.trim() === label).pop().click(), 'Home');
  await sleep(800);
  await page.evaluate(() => [...document.querySelectorAll('[role=button]')].find(e => e.getAttribute('aria-label') === 'Link').click());
  await page.waitForSelector(sel('check-mode-message'), { timeout: 30000 });
  await sleep(800);
  await shot(page, 'entry-home-link-en');
  await page.close();
}
await browser.close();
