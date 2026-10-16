import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COUNTRIES, HOTLINES } from '../src/data/hotlines.generated.js';
import { buildActions, hotlineFor } from '../src/explain.js';

const script = new URL('../../scripts/sync-hotlines.mjs', import.meta.url);

describe('hotline data', () => {
  it('every entry has a source and a unique id', () => {
    const ids = HOTLINES.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const h of HOTLINES) {
      expect(h.sourceUrl).toMatch(/^https:\/\//);
      expect(Boolean(h.dial || h.reportUrl)).toBe(true);
    }
  });

  it.skipIf(!existsSync(script))('matches the app data in src/data', () => {
    execFileSync('node', ['--no-warnings', fileURLToPath(script), '--check'], { stdio: 'pipe' });
  });
});

describe('hotlineFor', () => {
  it('picks the destination country anti-trafficking line from the shared data', () => {
    expect(hotlineFor('Bangkok, Thailand', {})).toBe('1599');
    expect(hotlineFor('Hanoi', {})).toBe('111');
  });

  it('falls back to the police line when a country has no trafficking line', () => {
    expect(hotlineFor('Kuala Lumpur', {})).toBe('999');
    expect(hotlineFor('Jakarta', {})).toBe('110');
  });

  it('returns nothing for unknown places, unless a default is configured', () => {
    expect(hotlineFor('Paris', {})).toBeUndefined();
    expect(hotlineFor(undefined, { DEFAULT_HOTLINE: '112' })).toBe('112');
  });

  it('puts the number on the call action', () => {
    const call = buildActions('danger', 'job_trafficking', 'en', 'Thailand').find((a) => a.type === 'call');
    expect(call?.value).toBe('1599');
  });
});
