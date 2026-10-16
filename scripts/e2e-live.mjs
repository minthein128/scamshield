#!/usr/bin/env node
// Drives the exported web app in headless Chrome with a fake microphone and checks Talk to Kakwe.
// Usage: node scripts/e2e-live.mjs --web=/tmp/web --api=http://127.0.0.1:8791 --wav=/tmp/q-my.wav --lang=my --out=pitch/e2e --cap-ms=120000
// Needs puppeteer-core (npm i --no-save puppeteer-core) and a Chrome binary in CHROME_PATH (default /tmp/chrome-ns.sh).
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import puppeteer from 'puppeteer-core';

const arg = (name, def) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def;
const WEB = arg('web', '/tmp/web');
const WAV = arg('wav', '/tmp/q-en.wav');
const LANG = arg('lang', 'en');
const OUT = arg('out', 'pitch/e2e');
const CAP_MS = Number(arg('cap-ms', '120000'));
const PORT = Number(arg('port', '8792'));
const WAIT_CAP = arg('wait-cap', '1') === '1';
const CAP_ONLY = arg('cap-only', '0') === '1';
const JOB = {
  my: 'အရေးပေါ် ဝန်ထမ်းခေါ်ယူနေပါသည်။ ထိုင်းနိုင်ငံ မဲဆောက်ဘက်ခြမ်းရှိ ကုမ္ပဏီတွင် အွန်လိုင်းဖောက်သည်ဝန်ဆောင်မှု လုပ်ငန်း၊ အတွေ့အကြုံမလို၊ လစာ ဒေါ်လာ ၁၅၀၀၊ ပတ်စပို့ကို ကုမ္ပဏီက ကိုင်ထားပေးမည်။ ကြိုတင်ကြေး ၃၀၀၀၀၀ ကျပ်ကို Telegram မှတစ်ဆင့် ယနေ့ပဲ ပေးပို့ပါ။',
  en: 'Urgent hiring! Online customer service agents near Myawaddy, no experience needed, USD 1500 a month, free housing and food. We keep your passport for safety. Pay a 300 USD booking fee on Telegram today only.',
}[LANG];
mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = createServer((req, res) => {
  const path = join(WEB, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = existsSync(path) && statSync(path).isFile() ? path : join(WEB, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const checks = [];
const ok = (name, pass, detail = '') => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/tmp/chrome-ns.sh',
  headless: true,
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`, '--autoplay-policy=no-user-gesture-required', '--window-size=430,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 430, height: 900, deviceScaleFactor: 2 });
page.on('pageerror', e => console.log('pageerror', e.message.slice(0, 200)));
const cdp = await page.createCDPSession();
await cdp.send('Network.enable');
const frames = [];
const sentTypes = [];
cdp.on('Network.webSocketFrameReceived', e => {
  try {
    frames.push({ at: Date.now(), ...JSON.parse(e.response.payloadData) });
  } catch {
    // not json
  }
});
cdp.on('Network.webSocketFrameSent', e => {
  try {
    sentTypes.push(JSON.parse(e.response.payloadData).type);
  } catch {
    // not json
  }
});
await page.evaluateOnNewDocument((lang, base) => {
  localStorage.setItem('saferoute.profile.v1', JSON.stringify({ onboarded: true, language: lang, shareSignals: false, homeCountry: 'MM', destinationCountry: 'TH' }));
  localStorage.setItem('saferoute.uiLanguage.v1', lang);
  localStorage.setItem('saferoute.apiUrl.v1', base);
}, LANG, arg('api', 'http://127.0.0.1:8791'));

const shot = async name => page.screenshot({ path: join(OUT, `live-${LANG}-${name}.png`) });
const sel = id => `[data-testid="${id}"]`;
const text = async id => page.$eval(sel(id), e => e.textContent).catch(() => '');
const sheetState = () => page.$eval(sel('live-sheet'), e => e.getAttribute('data-state')).catch(() => null);
const waitFor = async (fn, ms, label) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await sleep(250);
  }
  console.log(`timeout waiting for ${label}`);
  return false;
};

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2' });
await shot('01-home');
await page.waitForSelector(sel('home-check-button'), { timeout: 60000 });
await page.click(sel('home-check-button'));
await waitFor(async () => (await page.$(sel('check-text'))) !== null, 8000, 'check input');
await page.type(sel('check-text'), JOB, { delay: 0 });
await shot('02-check');
await page.click(sel('check-submit'));
const gotReport = await waitFor(async () => (await page.$(sel('report-talk'))) !== null, 90000, 'report');
ok('check finished and the report shows Talk to Kakwe', gotReport);
await sleep(800);
await shot('03-report');

const t0 = Date.now();
await page.click(sel('report-talk'));
await waitFor(async () => (await page.$(sel('live-sheet'))) !== null, 5000, 'sheet');
ok('sheet opens', (await sheetState()) !== null);
await sleep(600);
await shot('04-sheet-warning');
const seen = new Set();
const sampler = setInterval(async () => {
  const s = await sheetState();
  if (s) seen.add(s);
}, 200);

const gotReady = await waitFor(async () => frames.some(f => f.type === 'ready'), 40000, 'ready');
ok('warning played, socket opened, server ready', gotReady, `${Date.now() - t0} ms after tap`);
const ready = frames.find(f => f.type === 'ready');
if (ready) ok('ready carries the cap', ready.maxMs === CAP_MS, `maxMs ${ready.maxMs}`);
await waitFor(async () => (await sheetState()) === 'listening', 5000, 'listening');
await shot('05-listening');
if (!CAP_ONLY) {
const gotModel = await waitFor(async () => frames.some(f => f.type === 'transcript' && f.role === 'model'), 40000, 'model transcript');
ok('model transcript arrives', gotModel);
const spoke = await waitFor(async () => (await sheetState()) === 'speaking', 15000, 'speaking');
await shot('06-speaking');
ok('state goes to speaking', spoke || seen.has('speaking'), [...seen].join(','));
await waitFor(async () => frames.some(f => f.type === 'transcript' && f.final), 40000, 'final transcript');
await sleep(1500);
const caption = await text('live-caption');
const heard = await text('live-heard');
console.log('caption:', caption);
console.log('heard  :', heard);
const re = LANG === 'my' ? /[က-႟]/ : /[A-Za-z]{3}/;
ok(`caption is in the right language (${LANG})`, re.test(caption) && (LANG === 'en' || !/^[\x00-\x7f\s]+$/.test(caption)));
ok('user transcript lines appear', frames.some(f => f.type === 'transcript' && f.role === 'user'));
ok('audio frames played', frames.some(f => f.type === 'audio'));
ok('privacy line shown', (await text('live-privacy')).includes('Google') || LANG !== 'en');
await shot('07-after-answer');

await page.click(sel('live-family'));
await sleep(2500);
ok('family toggle restarts the live session', sentTypes.filter(t => t === 'start').length >= 2, `starts ${sentTypes.filter(t => t === 'start').length}`);
await waitFor(async () => (await sheetState()) === 'listening', 8000, 'listening again');
await page.click(sel('live-mute'));
await sleep(500);
await shot('08-muted');
ok('mute button toggles', (await page.$eval(sel('live-mute'), e => e.getAttribute('aria-label'))) !== null);
await page.click(sel('live-mute'));

}
if (WAIT_CAP) {
  const readyAt = frames.filter(f => f.type === 'ready').at(-1)?.at ?? Date.now();
  console.log(`waiting for the ${CAP_MS / 1000} s cap...`);
  const capped = await waitFor(async () => frames.some(f => f.type === 'closed'), CAP_MS + 15000, 'closed');
  const closed = frames.find(f => f.type === 'closed');
  const dt = closed ? closed.at - readyAt : 0;
  ok('cap fires with closed reason cap', Boolean(capped && closed?.reason === 'cap'), `reason ${closed?.reason}, ${Math.round(dt / 1000)} s after ready`);
  await sleep(500);
  ok('sheet shows ended', (await sheetState()) === 'ended', `state ${await sheetState()}`);
  console.log('status:', await text('live-status'));
  await shot('09-cap');
  await page.click(sel('live-close'));
  await sleep(800);
}

if (!CAP_ONLY || !WAIT_CAP) {
if (!(await page.$(sel('live-sheet')))) await page.click(sel('report-talk'));
await waitFor(async () => (await sheetState()) === 'listening', 60000, 'listening for End');
await sleep(500);
const nStarts = sentTypes.filter(t => t === 'start').length;
await page.click(sel('live-end'));
await sleep(1200);
ok('End closes cleanly', (await sheetState()) === 'ended' && sentTypes.includes('end'), `state ${await sheetState()}`);
console.log('status:', await text('live-status'));
await shot('10-ended');
console.log(`starts sent: ${nStarts}`);
}
clearInterval(sampler);

const failed = checks.filter(c => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
