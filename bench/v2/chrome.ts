import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

function newest(root: string, rel: string): string | undefined {
  if (!existsSync(root)) return undefined;
  for (const d of readdirSync(root).sort().reverse()) {
    const p = join(root, d, rel);
    if (existsSync(p)) return p;
  }
  return undefined;
}

/** Headless Chrome: $CHROME, else the Puppeteer or Playwright cache. */
export function findChrome(): string {
  const found =
    process.env.CHROME ??
    newest(join(homedir(), '.cache/ms-playwright'), 'chrome-headless-shell-linux64/chrome-headless-shell') ??
    newest(join(homedir(), '.cache/puppeteer/chrome-headless-shell'), 'chrome-headless-shell-linux64/chrome-headless-shell') ??
    newest(join(homedir(), '.cache/puppeteer/chrome'), 'chrome-linux64/chrome') ??
    newest(join(homedir(), '.cache/ms-playwright'), 'chrome-linux64/chrome');
  if (!found) throw new Error('No headless Chrome found. Set CHROME, or run "npx playwright install chromium-headless-shell".');
  return found;
}

const FLAGS = ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions'];

function withPage<T>(html: string, fn: (url: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'bench-v2-'));
  const page = join(dir, 'page.html');
  writeFileSync(page, html);
  try {
    return fn(`file://${page}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function screenshot(html: string, out: string, width: number, height: number, scale = 2): void {
  withPage(html, (url) =>
    execFileSync(
      findChrome(),
      [...FLAGS, `--force-device-scale-factor=${scale}`, `--window-size=${width},${height}`, `--screenshot=${out}`, url],
      { stdio: 'ignore', timeout: 60_000 },
    ),
  );
}

/** Loads the page and returns the DOM after its scripts ran. */
export function dumpDom(html: string): string {
  return withPage(html, (url) =>
    execFileSync(findChrome(), [...FLAGS, '--virtual-time-budget=3000', '--dump-dom', url], {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 120_000,
    }),
  );
}
