import { describe, expect, it } from 'vitest';
import { APP_NAMES, appNameFor } from '../src/brand.js';
import { reportedEvidence } from '../src/intel/messages.js';
import { buildSystemInstruction } from '../src/live-prompt.js';
import { SYSTEM_PROMPT } from '../src/prompt.js';

describe('app name', () => {
  it('is Kakwe in Latin languages and ကာကွယ် in Burmese', () => {
    expect(appNameFor('my')).toBe('ကာကွယ်');
    for (const l of ['en', 'id', 'tl', 'th'] as const) expect(APP_NAMES[l]).toBe('Kakwe');
  });

  it('shows in the spoken network line of each language', () => {
    expect(reportedEvidence('my', 2)).toContain('ကာကွယ်');
    expect(reportedEvidence('th', 2)).toContain('Kakwe');
    expect(reportedEvidence('en', 2)).not.toMatch(/SafeRoute/);
  });

  it('tells the models how to name the app', () => {
    expect(SYSTEM_PROMPT).toContain('ကာကွယ်');
    const p = buildSystemInstruction({
      report: { verdict: 'careful', score: 50, title: 't', summary: 's', scamType: 'other', flags: [], sources: [] },
      language: 'my',
      mode: 'self',
    });
    expect(p).toContain('NAME: The app is called Kakwe');
    expect(p).toContain('ကာကွယ်');
    expect(p).not.toMatch(/SafeRoute|Pyit|Kakwe Voice/);
    expect(p).toContain('You are Kakwe,');
  });
});
