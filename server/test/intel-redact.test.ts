import { describe, expect, it } from 'vitest';
import { leaks } from '../eval/leak.js';
import { PII_SET } from '../eval/pii-set.js';
import { ibanValid, luhn, nikValid, redactDeterministic, thaiIdValid } from '../src/intel/redact.js';
import { finalizeTemplate } from '../src/intel/template.js';

describe('validators', () => {
  it('checks Luhn, Thai ID, NIK and IBAN', () => {
    expect(luhn('4111111111111111')).toBe(true);
    expect(luhn('4111111111111112')).toBe(false);
    expect(thaiIdValid('1101700123456')).toBe(true);
    expect(thaiIdValid('1101700123451')).toBe(false);
    expect(nikValid('3171011506900001')).toBe(true);
    expect(nikValid('9999999999999999')).toBe(false);
    expect(ibanValid('DE89 3704 0044 0532 0130 00')).toBe(true);
  });
});

describe('deterministic redaction', () => {
  const core = PII_SET.filter((c) => !c.hard);
  const hard = PII_SET.filter((c) => c.hard);

  it.each(core.map((c) => [c.id, c] as const))('removes structured PII in %s', (_id, c) => {
    const out = redactDeterministic(c.text).text;
    for (const p of c.pii.filter((x) => x.type !== 'name')) {
      expect(leaks(p.value, out), `${p.type} ${p.value} -> ${out}`).toBe(false);
    }
    for (const k of c.keep ?? []) expect(out).toContain(k);
  });

  it('keeps at least 85% of the hard set items out of the output', () => {
    const items = hard.flatMap((c) => c.pii.filter((x) => x.type !== 'name').map((p) => ({ c, p })));
    const missed = items.filter(({ c, p }) => leaks(p.value, redactDeterministic(c.text).text));
    expect(1 - missed.length / items.length).toBeGreaterThanOrEqual(0.85);
  });

  it('uses typed placeholders', () => {
    const r = redactDeterministic('Call +66 81 234 5678, mail a@b.co, pay THB 5000 to account 1234567890');
    expect(r.text).toBe('Call [PHONE], mail [EMAIL], pay [AMOUNT] to account [ACCOUNT]');
  });

  it('does not touch plain scam wording', () => {
    const t = 'Urgent hiring in Mae Sot, no experience, leave this week';
    expect(redactDeterministic(t).text).toBe(t);
  });

  it('turns leftover long digit runs into [NUMBER]', () => {
    expect(redactDeterministic('ref 99887766554').text).toBe('ref [NUMBER]');
  });
});

describe('template finalisation', () => {
  it('runs the regex pass over the model template', () => {
    const t = finalizeTemplate('Hello [VICTIM_NAME], call 081-234-5678 about the job in Mae Sot', true);
    expect(t).toBe('Hello [VICTIM_NAME], call [PHONE] about the job in Mae Sot');
  });

  it('drops the template when the model says it is not safe', () => {
    expect(finalizeTemplate('Hello [VICTIM_NAME], send passport today please', false)).toBeUndefined();
  });

  it('rewrites unknown bracket tokens that could hide a name', () => {
    expect(finalizeTemplate('Hello [John Smith], send your passport today please', true)).toContain('[REDACTED]');
  });

  it('caps the length and never cuts a placeholder in half', () => {
    const t = finalizeTemplate(`${'word '.repeat(70)}[VICTIM_NAME] end`, true) ?? '';
    expect([...t].length).toBeLessThanOrEqual(300);
    expect(t).not.toMatch(/\[[A-Z_]*$/);
  });

  it('drops a template that is too short to be useful', () => {
    expect(finalizeTemplate('hi', true)).toBeUndefined();
  });
});
