import { describe, expect, it } from 'vitest';
import { createHasher, hashIndicators, normalizeAccount, normalizeHandle, normalizePhone, publicHost } from '../src/intel/indicators.js';

describe('indicator normalisation', () => {
  it('maps every spelling of one phone number to one value', () => {
    const forms = ['+66 81 234 5678', '081-234-5678', '0812345678', '66812345678', '+66 (0)81 234 5678', '00 66 81 234 5678'];
    expect(new Set(forms.map(normalizePhone)).size).toBe(1);
    expect(normalizePhone('+95 9 123 456 789')).toBe(normalizePhone('၀၉၁၂၃၄၅၆၇၈၉'));
    expect(normalizePhone('+62 812 3456 7890')).toBe(normalizePhone('0812-3456-7890'));
  });

  it('normalises handles and strips link prefixes', () => {
    expect(normalizeHandle('@Demo_HR')).toBe('demo_hr');
    expect(normalizeHandle('https://t.me/Demo_HR')).toBe('demo_hr');
    expect(normalizeHandle('x')).toBeNull();
  });

  it('keeps digits only for accounts', () => {
    expect(normalizeAccount('123-4-56789-0')).toBe('1234567890');
    expect(normalizeAccount('12')).toBeNull();
  });

  it('keeps public hosts and drops common platforms', () => {
    expect(publicHost('https://www.Fee-Pay.example/x?y=1')).toBe('fee-pay.example');
    expect(publicHost('https://facebook.com/page')).toBeNull();
    expect(publicHost('t.me/someone')).toBeNull();
    expect(publicHost('not a url')).toBeNull();
  });
});

describe('keyed hashing', () => {
  const raw = { phones: ['+66 81 234 5678'], handles: ['@demo_hr'], accounts: ['123-4-56789-0'] };

  it('is stable for one pepper and equal across spellings', () => {
    const h = createHasher('pepper-a');
    const a = hashIndicators(raw, h);
    const b = hashIndicators({ phones: ['0812345678'], handles: ['t.me/demo_hr'], accounts: ['1234567890'] }, h);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
  });

  it('changes with the pepper and never contains the value', () => {
    const a = hashIndicators(raw, createHasher('pepper-a'));
    const b = hashIndicators(raw, createHasher('pepper-b'));
    expect(a).not.toEqual(b);
    const json = JSON.stringify(a);
    expect(json).not.toContain('812345678');
    expect(json).not.toContain('demo_hr');
    for (const i of a) expect(i.h).toMatch(/^[0-9a-f]{32}$/);
  });

  it('puts chat ids given as phones into the handle bucket', () => {
    const [i] = hashIndicators({ phones: ['@demo_hr'], handles: [], accounts: [] }, createHasher('p'));
    expect(i?.t).toBe('handle');
  });
});
