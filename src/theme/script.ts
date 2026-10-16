import type { TextStyle } from 'react-native';
import { fonts } from './theme';

export type Script = 'latin' | 'myanmar' | 'thai';
export type FontWeight = 'regular' | 'medium' | 'semiBold' | 'bold' | 'extraBold';

const MYANMAR = /[က-႟ꧠ-꧿ꩠ-ꩿ]/;
const THAI = /[฀-๿]/;

export function scriptOf(text: string | undefined | null): Script {
  if (!text) return 'latin';
  if (MYANMAR.test(text)) return 'myanmar';
  if (THAI.test(text)) return 'thai';
  return 'latin';
}

/** Font and line height for `text`. Latin keeps Plus Jakarta Sans at `weight`. */
export function scriptStyle(text: string | undefined | null, weight: FontWeight = 'regular', lineHeight?: number): TextStyle {
  const script = scriptOf(text);
  const heavy = weight === 'bold' || weight === 'extraBold' || weight === 'semiBold';
  if (script === 'latin') return { fontFamily: fonts[weight], ...(lineHeight ? { lineHeight } : {}) };
  const family = script === 'myanmar' ? (heavy ? fonts.myanmarBold : fonts.myanmar) : heavy ? fonts.thaiBold : fonts.thai;
  const scale = script === 'myanmar' ? 1.2 : 1.15;
  return { fontFamily: family, ...(lineHeight ? { lineHeight: Math.round(lineHeight * scale) } : {}) };
}
