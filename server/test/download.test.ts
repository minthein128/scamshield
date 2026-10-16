import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createMockCorrelator, createMockExtractor, createMockGrounder } from '../src/mock.js';
import { createPipeline } from '../src/pipeline.js';
import { createMockSpeaker } from '../src/speak.js';

const dir = mkdtempSync(join(tmpdir(), 'apk-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const bytes = Buffer.from(Array.from({ length: 5000 }, (_, i) => i % 251));
const file = join(dir, 'a.apk');
writeFileSync(file, bytes);

function appOf(env: Record<string, string>) {
  const cfg = loadConfig({ MOCK: '1', ...env });
  const pipeline = createPipeline({
    extractor: createMockExtractor(),
    correlator: createMockCorrelator(),
    grounder: createMockGrounder(),
    model: cfg.model,
  });
  return createApp(cfg, pipeline, createMockSpeaker(cfg));
}

describe('apk download', () => {
  it('returns 404 JSON when the APK file is missing', async () => {
    const res = await appOf({ APK_PATH: join(dir, 'missing.apk') }).request('/download/saferoute.apk');
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('bad_request');
  });

  it('redirects to the hosted APK with no-store when APK_PATH is unset', async () => {
    const app = appOf({});
    for (const path of ['/download', '/download/saferoute.apk']) {
      const res = await app.request(path);
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('https://saferoute-aibc.web.app/saferoute.apk');
      expect(res.headers.get('cache-control')).toBe('no-store');
    }
  });

  it('streams the file with the right headers and bytes', async () => {
    const res = await appOf({ APK_PATH: file }).request('/download/saferoute.apk');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/vnd.android.package-archive');
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="Kakwe.apk"');
    expect(res.headers.get('content-length')).toBe('5000');
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(res.headers.get('etag')).toMatch(/^"[0-9a-f]+-1388"$/);
    expect(Buffer.from(await res.arrayBuffer()).equals(bytes)).toBe(true);
  });

  it('answers HEAD with headers and no body', async () => {
    const res = await appOf({ APK_PATH: file }).request('/download/saferoute.apk', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-length')).toBe('5000');
    expect((await res.arrayBuffer()).byteLength).toBe(0);
  });

  it('limits downloads per IP per hour', async () => {
    const app = appOf({ APK_PATH: file, APK_LIMIT_PER_HOUR: '2' });
    const get = () => app.request('/download/saferoute.apk', { method: 'HEAD', headers: { 'x-forwarded-for': '1.2.3.4' } });
    expect((await get()).status).toBe(200);
    expect((await get()).status).toBe(200);
    expect((await get()).status).toBe(429);
  });

  it('renders the page with version, size and link', async () => {
    const res = await appOf({ APK_PATH: file, APK_VERSION: '1.2.3' }).request('/download');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Version 1.2.3');
    expect(html).toContain('0.0 MB');
    expect(html).toContain('href="/download/saferoute-1.2.3.apk"');
    expect(html).toContain('ဒေါင်းလုဒ်');
  });

  it('redirects the unversioned URL with no-store and serves the versioned one immutably', async () => {
    const app = appOf({ APK_PATH: file, APK_VERSION: '1.2.3' });
    const redir = await app.request('/download/saferoute.apk');
    expect(redir.status).toBe(302);
    expect(redir.headers.get('location')).toBe('/download/saferoute-1.2.3.apk');
    expect(redir.headers.get('cache-control')).toBe('no-store');
    const res = await app.request('/download/saferoute-1.2.3.apk');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(Buffer.from(await res.arrayBuffer()).equals(bytes)).toBe(true);
    expect((await app.request('/download/saferoute-9.9.apk')).status).toBe(404);
  });

  it('serves the unversioned URL directly when no version is set', async () => {
    const res = await appOf({ APK_PATH: file }).request('/download/saferoute.apk');
    expect(res.status).toBe(200);
  });
});
