import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: process.env.HOME + '/.cache/puppeteer/chrome/linux-154.0.8037.57/chrome-linux64/chrome', headless: true, args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 1100, height: 700 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('https://saferoute-admin.web.app/', { waitUntil: 'networkidle0' });
console.log(await p.$eval('h1', (e) => e.textContent), errs);
await p.screenshot({ path: '/home/ubuntu/work/scamshield-admin-ui/admin/screenshots/17-signin-deployed.png' });
await b.close();
