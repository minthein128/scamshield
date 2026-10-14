import { describe, expect, it } from 'vitest';
import { findUrls, mergeUrls, registrableDomain } from '../src/urls.js';

describe('urls', () => {
  it('finds urls and bare domains, trimming punctuation', () => {
    expect(findUrls('see https://a.example.com/x?y=1, and www.b.vip.')).toEqual(['https://a.example.com/x?y=1', 'https://www.b.vip/']);
  });
  it('dedupes and caps', () => {
    expect(mergeUrls(2, ['https://a.com', 'https://a.com/'], ['b.com', 'c.com'])).toEqual(['https://a.com/', 'https://b.com/']);
  });
  it('computes the registrable domain', () => {
    expect(registrableDomain('https://x.y.example.com/p')).toBe('example.com');
    expect(registrableDomain('https://shop.example.co.th/')).toBe('example.co.th');
  });
});
