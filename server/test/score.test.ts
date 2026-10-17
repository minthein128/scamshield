import { describe, expect, it } from 'vitest';
import { derivedFlags, score, verdictFor } from '../src/score.js';
import type { Flag, LinkCheck } from '../src/types.js';

const f = (family: Flag['family'], severity: Flag['severity'] = 'medium'): Flag => ({ family, label: family, evidence: 'x', severity });
const clean: LinkCheck = { url: 'https://a.com/', webRisk: 'clean', domainAgeDays: 4000 };

describe('verdictFor', () => {
  it('uses the contract thresholds', () => {
    expect(verdictFor(34)).toBe('safe');
    expect(verdictFor(35)).toBe('careful');
    expect(verdictFor(69)).toBe('careful');
    expect(verdictFor(70)).toBe('danger');
  });
});

describe('score', () => {
  it('scores no flags as safe 0', () => {
    expect(score({ flags: [], linkChecks: [], unsolicited: true })).toMatchObject({ score: 0, verdict: 'safe' });
  });

  it('applies the unsolicited base only when flags exist', () => {
    const a = score({ flags: [f('identity')], linkChecks: [], unsolicited: false });
    const b = score({ flags: [f('identity')], linkChecks: [], unsolicited: true });
    expect(a.points).toBeGreaterThan(b.points);
  });

  it('counts one family once at its strongest severity', () => {
    const r = score({ flags: [f('pressure', 'low'), f('pressure', 'high'), f('pressure')], linkChecks: [], unsolicited: false });
    expect(r.points).toBe(0.9);
  });

  it('reproduces the illustrative app example as danger', () => {
    const r = score({
      flags: [f('identity'), f('link_risk'), f('too_good'), f('pressure')],
      linkChecks: [clean],
      unsolicited: true,
    });
    expect(r.points).toBe(3.2);
    expect(r.verdict).toBe('danger');
  });

  it('caps a single non-hard family below danger', () => {
    const r = score({ flags: [f('payment_route', 'high'), f('payment_route', 'high')], linkChecks: [], unsolicited: false });
    expect(r.score).toBe(56);
    const big = score({ flags: [f('too_good', 'high')], linkChecks: [], unsolicited: false });
    expect(big.verdict).toBe('careful');
  });

  it('forces danger on a Web Risk hit', () => {
    const r = score({
      flags: [],
      linkChecks: [{ url: 'https://bad.example/', webRisk: 'social_engineering' }],
      unsolicited: false,
    });
    expect(r.verdict).toBe('danger');
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.flags[0]).toMatchObject({ family: 'known_bad', severity: 'high' });
    expect(r.overrides).toContain('web_risk_hit');
  });

  it('ignores unknown Web Risk results', () => {
    const r = score({ flags: [], linkChecks: [{ url: 'https://x.com/', webRisk: 'unknown' }], unsolicited: false });
    expect(r.score).toBe(0);
  });

  it('adds link_risk for young domains, stronger under 30 days', () => {
    const young = score({ flags: [], linkChecks: [{ url: 'https://a.xyz/', webRisk: 'clean', domainAgeDays: 90 }], unsolicited: false });
    const fresh = score({ flags: [], linkChecks: [{ url: 'https://a.xyz/', webRisk: 'clean', domainAgeDays: 5 }], unsolicited: false });
    expect(young.flags[0]?.severity).toBe('medium');
    expect(fresh.flags[0]?.severity).toBe('high');
    expect(fresh.score).toBeGreaterThan(young.score);
  });

  it('does not flag old domains', () => {
    expect(score({ flags: [], linkChecks: [clean], unsolicited: false }).flags).toHaveLength(0);
  });

  it('trafficking high is danger by itself', () => {
    const r = score({ flags: [f('trafficking', 'high')], linkChecks: [], unsolicited: true });
    expect(r.verdict).toBe('danger');
  });

  it('the model alone cannot push a flagless input past safe', () => {
    expect(score({ flags: [], linkChecks: [], unsolicited: true, llmVerdict: 'danger' }).verdict).toBe('safe');
  });

  it('floors a named scam pattern with evidence at careful', () => {
    const r = score({ flags: [f('identity')], linkChecks: [], unsolicited: true, scamType: 'romance_pig_butchering' });
    expect(r.score).toBe(35);
    expect(r.overrides).toContain('scam_pattern_floor');
  });

  it('does not floor without flags or for none/other', () => {
    expect(score({ flags: [], linkChecks: [], unsolicited: true, scamType: 'fake_agency' }).score).toBe(0);
    expect(score({ flags: [f('identity')], linkChecks: [], unsolicited: true, scamType: 'none' }).score).toBe(0);
    expect(score({ flags: [f('identity')], linkChecks: [], unsolicited: true, scamType: 'other' }).score).toBe(0);
  });

  it('keeps score within 0..100', () => {
    const all = (['too_good', 'pressure', 'payment_route', 'identity', 'link_risk', 'known_bad', 'trafficking'] as const).map((x) =>
      f(x, 'high'),
    );
    expect(score({ flags: all, linkChecks: [], unsolicited: false }).score).toBe(100);
  });
});

describe('derivedFlags', () => {
  const bad: LinkCheck = { url: 'http://x.test/p', webRisk: 'social_engineering', domainAgeDays: 3 };
  it('writes the labels in the report language without raw threat codes', () => {
    const my = derivedFlags([bad], 'my');
    expect(my.map((f) => f.label)).toEqual(['Google က ဤလင့်ခ်ကို မလုံခြုံဟု သတ်မှတ်ထားသည်', 'ဤဝက်ဘ်ဆိုက်ကို လွန်ခဲ့သော 3 ရက်ကမှ မှတ်ပုံတင်ထားသည်']);
    expect(my[0]?.evidence).toBe('http://x.test/p');
    expect(derivedFlags([bad])[0]?.label).toBe('Google lists this link as unsafe');
    for (const lang of ['id', 'tl', 'th'] as const) expect(derivedFlags([bad], lang)[0]?.label).not.toMatch(/Google lists/);
  });
});
