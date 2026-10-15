// Drives the mock build (npm run build:mock) in headless Chrome and saves screenshots.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { homedir } from 'node:os';
import puppeteer from 'puppeteer-core';

const DIST = new URL('../dist-mock/', import.meta.url).pathname;
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };

const chromeRoot = join(homedir(), '.cache/puppeteer/chrome');
const ver = readdirSync(chromeRoot).sort().at(-1);
const executablePath = join(chromeRoot, ver, 'chrome-linux64/chrome');

const mock = spawn('node', ['mock/server.mjs'], { stdio: 'ignore' });
const web = createServer(async (req, res) => {
  let f = join(DIST, new URL(req.url, 'http://x').pathname);
  if (!existsSync(f) || f.endsWith('/')) f = join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'application/octet-stream' }).end(await readFile(f));
}).listen(4175);

let failed = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(SHOTS, { recursive: true });
await sleep(1500);
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 860 });
page.on('pageerror', (e) => check(`no page error: ${e.message}`, false));
const shot = (n) => page.screenshot({ path: join(SHOTS, `${n}.png`) });
const T = (id) => `[data-testid="${id}"]`;
const count = (sel) => page.$$eval(sel, (e) => e.length);
const click = async (sel) => { await page.waitForSelector(sel); await page.click(sel); };
const clearType = async (sel, text) => {
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  if (text) await page.type(sel, text);
};
const nav = async (id) => { await click(T(`nav-${id}`)); await sleep(300); };

try {
  await page.goto('http://localhost:4175/', { waitUntil: 'networkidle0' });

  // Hotlines
  await page.waitForSelector(T('hotline-row'));
  check('hotlines table shows 52 rows', (await count(T('hotline-row'))) === 52);
  await shot('01-hotlines');
  await page.select('select[aria-label="Country"]', 'TH');
  const th = await count(T('hotline-row'));
  check('country filter narrows the table', th > 0 && th < 52);
  await page.select('select[aria-label="Country"]', '');
  await page.type('input[aria-label="Search"]', '1599');
  check('search finds the 1599 line', (await count(T('hotline-row'))) >= 1 && (await count(T('hotline-row'))) < 5);

  // Edit -> draft with validation
  await click(`${T('hotline-row')} .link`);
  await page.waitForSelector(T('panel'));
  await clearType('input[name="sourceUrl"]', '');
  await click(T('save-draft'));
  check('validation: source URL required with a number', (await page.$$eval('.err', (e) => e.map((x) => x.textContent).join('|'))).includes('source URL is required'));
  await shot('02-edit-validation');
  await page.type('input[name="sourceUrl"]', 'https://example.org/official');
  await clearType('input[name="reason"]', 'Source page moved');
  await click(T('save-draft'));
  await page.waitForSelector(T('toast'));
  check('edit creates a draft', (await page.$eval(T('toast'), (e) => e.textContent)).includes('Draft created'));
  await shot('03-edit-saved-draft');

  // Find with AI -> Use as draft
  await page.waitForSelector(T('panel'), { hidden: true });
  await clearType('input[aria-label="Search"]', '');
  await click('button::-p-text(Find with AI)');
  await click(T('find-run'));
  await page.waitForSelector(`${T('candidates')} .candidate`);
  check('find returns candidates with sources', (await count('.candidate .sources li')) >= 2);
  await shot('04-find-with-ai');
  await click('.candidate button::-p-text(Use as draft)');
  await page.waitForSelector(T('ai-attached'));
  check('candidate fills the panel with aiSource attached', (await page.$eval('input[name="name"]', (e) => e.value)).length > 3);
  await shot('05-use-as-draft');
  await click(T('save-draft'));
  await page.waitForSelector(T('toast'));
  await page.waitForSelector(T('panel'), { hidden: true });

  // Verify with AI
  await click('button::-p-text(Verify with AI)');
  await page.waitForSelector(T('verdict'));
  check('verify shows a verdict', true);
  await shot('06-verify-with-ai');
  await click('button::-p-text(Close)');

  // Drafts
  await nav('drafts');
  await page.waitForSelector(T('draft'));
  check('drafts queue has 3 pending', (await count(T('draft'))) === 3);
  check('AI draft shows an AI badge', (await page.$$eval('.draft .badge.ai', (e) => e.length)) >= 1);
  await shot('07-drafts');
  await click(T('approve'));
  await page.waitForFunction(() => document.querySelector('[data-testid="toast"]')?.textContent?.includes('version'));
  check('approve shows the new version', (await page.$eval(T('toast'), (e) => e.textContent)).includes('version 2'));
  await shot('08-draft-approved');

  // Notices
  await nav('notices');
  await page.waitForSelector(T('notices-table'));
  await shot('09-notices');
  await click('button::-p-text(Add notice)');
  await clearType('input[name="title"]', 'Beware of fake recruiters');
  await page.type('input[name="instruction"]', 'Warn about recruiters who ask for fees');
  await click(T('draft-ai'));
  await page.waitForSelector(T('ai-note'));
  check('notice AI draft shows the hedging note', (await page.$eval(T('ai-note'), (e) => e.textContent)).includes('Hedging note'));
  check('notice body is filled', (await page.$eval('textarea[name="body"]', (e) => e.value)).includes('may be a scam'));
  await shot('10-notice-draft-with-ai');
  await click(T('save-notice'));
  await page.waitForSelector(T('toast'));

  // Content
  await nav('content');
  await page.waitForSelector(T('content-table'));
  await shot('11-content');
  await click('.content tbody .link');
  await click(T('translate'));
  await page.waitForFunction(() => document.querySelector('textarea[name="id"]')?.value);
  check('translate fills other languages', (await page.$eval('textarea[name="tl"]', (e) => e.value)).startsWith('[tl]'));
  await shot('12-content-translate');
  await clearType('.panel-body .field:last-of-type input', 'Add translations');
  await click(T('save-content'));
  await page.waitForSelector(T('toast'));

  // Approve the rest, then audit
  await nav('drafts');
  await page.waitForSelector(T('approve'));
  for (let n = await count(T('approve')); n > 0; n--) {
    await click(T('approve'));
    await sleep(500);
  }
  check('queue is empty after approving', (await count(T('approve'))) === 0);
  await shot('13-drafts-after-approval');
  await nav('audit');
  await page.waitForSelector(T('audit-table'));
  check('audit lists approvals', (await count('[data-testid="audit-table"] tbody tr')) >= 4);
  await page.select('select[aria-label="Collection"]', 'notices');
  check('audit filter by collection', (await count('[data-testid="audit-table"] tbody tr')) === 1);
  await page.select('select[aria-label="Collection"]', '');
  await click('[data-testid="audit-table"] tbody .btn');
  await shot('14-audit');
  await nav('admins');
  await page.waitForSelector('table');
  await shot('15-admins');
  await nav('hotlines');
  await page.waitForSelector(T('hotline-row'));
  check('hotlines count grew after approving a new hotline', (await count(T('hotline-row'))) === 53);
  await page.setViewport({ width: 820, height: 1000 });
  await shot('16-hotlines-tablet');
} catch (e) {
  console.error(e);
  failed++;
  await page.screenshot({ path: join(SHOTS, 'failure.png') });
}
await browser.close();
mock.kill();
web.close();
console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exit(failed ? 1 : 0);
