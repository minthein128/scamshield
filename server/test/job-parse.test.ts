import { describe, expect, it } from 'vitest';
import {
  asciiDigits,
  mentionsBorderTown,
  normalizeCurrency,
  normalizeEmployer,
  parseAmount,
  quoteInSource,
  readFee,
  salaryDiffers,
  sameEmployer,
} from '../src/job/parse.js';

describe('job parsing', () => {
  it('converts Burmese and Thai digits', () => {
    expect(asciiDigits('၁၂၃၄၅၆၇၈၉၀')).toBe('1234567890');
    expect(asciiDigits('๑๒๓๔๕๖๗๘๙๐')).toBe('1234567890');
  });

  it('parses amounts with separators and multipliers', () => {
    expect(parseAmount('15,000 THB')).toBe(15000);
    expect(parseAmount('Rp 1.500.000')).toBe(1500000);
    expect(parseAmount('USD 1,500.50')).toBe(1500.5);
    expect(parseAmount('15k baht')).toBe(15000);
    expect(parseAmount('၃ သိန်း')).toBe(300000);
    expect(parseAmount('၁၅၀,၀၀၀ ကျပ်')).toBe(150000);
    expect(parseAmount('๑๕,๐๐๐ บาท')).toBe(15000);
    expect(parseAmount('3 หมื่นบาท')).toBe(30000);
    expect(parseAmount('2 juta')).toBe(2000000);
    expect(parseAmount('no amount')).toBeNull();
    expect(parseAmount(1200)).toBe(1200);
  });

  it('reads a fee as none, positive or unknown', () => {
    expect(readFee('none')).toBe('none');
    expect(readFee('none stated')).toBe('none');
    expect(readFee('No placement fee')).toBe('none');
    expect(readFee('ฟรี')).toBe('none');
    expect(readFee('အခမဲ့')).toBe('none');
    expect(readFee('0')).toBe('none');
    expect(readFee('500 USD fee')).toBe('positive');
    expect(readFee('300 USD')).toBe('positive');
    expect(readFee('၅၀,၀၀၀ ကျပ်')).toBe('positive');
    expect(readFee('nominal fee')).toBe('unknown');
    expect(readFee('deposit, amount not stated')).toBe('unknown');
    expect(readFee('')).toBe('unknown');
  });

  it('normalises currencies', () => {
    expect(normalizeCurrency('baht')).toBe('THB');
    expect(normalizeCurrency('บาท')).toBe('THB');
    expect(normalizeCurrency('ကျပ်')).toBe('MMK');
    expect(normalizeCurrency('Rp')).toBe('IDR');
    expect(normalizeCurrency('usd')).toBe('USD');
  });

  it('compares salaries only when comparable', () => {
    const m = (amount: number, currency = 'THB', period: 'monthly' | 'yearly' | 'daily' | 'unknown' = 'monthly') => ({
      amount,
      currency,
      period,
    });
    expect(salaryDiffers(m(10000), m(12600))).toBe(true);
    expect(salaryDiffers(m(10000), m(12400))).toBe(false);
    expect(salaryDiffers(m(10000), m(120000, 'THB', 'yearly'))).toBe(false);
    expect(salaryDiffers(m(10000), m(240000, 'baht', 'yearly'))).toBe(true);
    expect(salaryDiffers(m(10000), m(500, 'THB', 'daily'))).toBe(false);
    expect(salaryDiffers(m(10000), m(50000, 'USD'))).toBe(false);
    expect(salaryDiffers(m(10000), m(50000, 'THB', 'unknown'))).toBe(false);
  });

  it('normalises employer names', () => {
    expect(normalizeEmployer('Golden Lotus Garment Co., Ltd.')).toBe('golden lotus garment');
    expect(normalizeEmployer('PT Sinar Laut Abadi Tbk')).toBe('sinar laut abadi');
    expect(normalizeEmployer('บริษัท ดาวเหนือ จำกัด (มหาชน)')).toBe('ดาวเหนือ');
    expect(normalizeEmployer('ရွှေကြာ ကုမ္ပဏီ လီမိတက်')).toBe('ရွှေကြာ');
    expect(normalizeEmployer('Mekong Star Pte. Ltd.')).toBe('mekong star');
    expect(sameEmployer('Mekong Star Sdn. Bhd.', 'MEKONG STAR')).toBe(true);
    expect(sameEmployer('Mekong Star', 'Silver Moon')).toBe(false);
  });

  it('finds border towns in several scripts', () => {
    expect(mentionsBorderTown('van to Mae Sot')).toBe(true);
    expect(mentionsBorderTown('ไปแม่สอด')).toBe(true);
    expect(mentionsBorderTown('မြဝတီ')).toBe(true);
    expect(mentionsBorderTown('Bangkok')).toBe(false);
  });

  it('checks quotes against the source after whitespace normalisation', () => {
    expect(quoteInSource('pay  300\nUSD', 'Please pay 300 USD today')).toBe(true);
    expect(quoteInSource('ငွေ ၃ သိန်း', 'ငွေ\u200b ၃ သိန်း ပေးရမယ်')).toBe(true);
    expect(quoteInSource('pay 500 USD', 'Please pay 300 USD today')).toBe(false);
    expect(quoteInSource('', 'anything')).toBe(false);
  });
});
