import { foldDigits } from '../../server/src/intel/redact.js';

export { foldDigits };

const ZERO_WIDTH = /[​-‍⁠﻿]/g;
const MYANMAR = /[က-႟ꩠ-ꩿ]/;
const THAI = /[฀-๿]/;
const LATIN = /[A-Za-zÀ-ɏ]/;

/** True for text that is written without spaces between words (Burmese, Thai). */
export const isUnspaced = (s: string) => MYANMAR.test(s) || THAI.test(s);

/** Joins 3-digit groups split by one consistent separator (1,800 / 1.500.000); "1.5" stays. */
export function collapseNumbers(s: string): string {
  return s.replace(/\d{1,3}(?:[,.   ]\d{3})+(?!\d)/g, (m) => {
    const seps = new Set(m.replace(/\d/g, ''));
    return seps.size === 1 ? m.replace(/\D/g, '') : m;
  });
}

/** NFC, lower case, ASCII digits, joined thousands, punctuation and symbols folded to spaces. */
export function canonical(s: string): string {
  const base = collapseNumbers(foldDigits(s.normalize('NFC').replace(ZERO_WIDTH, '').toLowerCase()));
  return base
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Canonical text without any spaces, for scripts where spacing is unreliable or absent. */
export const squash = (s: string) => canonical(s).replace(/ /g, '');

/** Every number in the text, as plain ASCII digits with thousands separators removed. */
export function numbersIn(s: string): string[] {
  return [...collapseNumbers(foldDigits(s.normalize('NFC'))).matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0].replace(',', '.'));
}

export function scriptShare(s: string): { latin: number; myanmar: number; thai: number; letters: number } {
  let latin = 0;
  let myanmar = 0;
  let thai = 0;
  for (const ch of s) {
    if (MYANMAR.test(ch)) myanmar++;
    else if (THAI.test(ch)) thai++;
    else if (LATIN.test(ch)) latin++;
  }
  const letters = latin + myanmar + thai;
  return letters
    ? { latin: latin / letters, myanmar: myanmar / letters, thai: thai / letters, letters }
    : { latin: 0, myanmar: 0, thai: 0, letters };
}

/** Best similarity (0-1) of the needle to any substring of the haystack, by edit distance. */
export function partialSimilarity(needle: string, haystack: string): number {
  const a = [...needle];
  const b = [...haystack];
  if (!a.length) return 1;
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1);
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const sub = (prev[j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1);
      cur[j] = Math.min(sub, (prev[j] as number) + 1, (cur[j - 1] as number) + 1);
    }
    prev = cur;
  }
  return Math.max(0, 1 - Math.min(...prev) / a.length);
}

export function sentences(s: string): string[] {
  return s
    .split(/(?<=[.!?။])\s+|။|(?<=[฀-๿])\s+(?=[฀-๿])|\n+/u)
    .map((x) => x.trim())
    .filter((x) => x.length > 1);
}

export const graphemeLength = (s: string) => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].length;
