#!/usr/bin/env node
// Runs one check in the exported web app on a fresh profile (no cached API URL) and screenshots the result.
// Usage: node scripts/e2e-reach.mjs --web=/tmp/web --expect=report|unreachable --name=ok --out=pitch/e2e
// Needs puppeteer-core (npm i --no-save puppeteer-core) and a Chrome binary in CHROME_PATH.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import puppeteer from 'puppeteer-core';

const arg = (name, def) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def;
const WEB = arg('web', '/tmp/web');
const EXPECT = arg('expect', 'report');
const NAME = arg('name', EXPECT);
const OUT = arg('out', 'pitch/e2e');
const PORT = Number(arg('port', '8793'));
const JOB = 'Urgent hiring! Online customer service agents near Myawaddy, no experience needed, USD 1500 a month. We keep your passport for safety. Pay a 300 USD booking fee on Telegram today only.';
mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png' };
const server = createServer((req, res) => {
  const path = join(WEB, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = existsSync(path) && statSync(path).isFile() ? path : join(WEB, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const sel = id => `[data-testid="${id}"]`;
const waitFor = async (fn, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await sleep(250);
  }
  return false;
};

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/tmp/chrome-ns.sh', headless: true, args: ['--window-size=430,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 430, height: 900, deviceScaleFactor: 2 });
const hosts = new Set();
page.on('request', r => hosts.add(new URL(r.url()).host));
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('saferoute.profile.v1', JSON.stringify({ onboarded: true, language: 'en', shareSignals: false, homeCountry: 'MM', destinationCountry: 'TH' }));
  localStorage.setItem('saferoute.uiLanguage.v1', 'en');
});
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2' });
await page.waitForSelector(sel('home-check-button'), { timeout: 60000 });
await page.click(sel('home-check-button'));
await page.waitForSelector(sel('check-text'), { timeout: 8000 });
await page.type(sel('check-text'), JOB, { delay: 0 });
await page.click(sel('check-submit'));
const done = await waitFor(async () => (await page.$(sel(EXPECT === 'report' ? 'report-talk' : 'checking-error'))) !== null, 120000);
await sleep(800);
await page.screenshot({ path: join(OUT, `reach-${NAME}.png`) });
const errorText = await page.$eval(sel('checking-error'), e => e.textContent).catch(() => '');
console.log(`${done ? 'PASS' : 'FAIL'}  expected ${EXPECT}${errorText ? `  message: ${errorText}` : ''}`);
console.log('hosts contacted:', [...hosts].filter(h => !h.startsWith('127.0.0.1')).join(', '));
await browser.close();
server.close();
process.exit(done ? 0 : 1);
