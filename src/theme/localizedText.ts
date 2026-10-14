import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import type { ReactNode } from 'react';
import { fonts } from './theme';
import { scriptOf, scriptStyle, type FontWeight } from './script';

const WEIGHT_BY_FAMILY: Record<string, FontWeight> = {
  [fonts.regular]: 'regular',
  [fonts.medium]: 'medium',
  [fonts.semiBold]: 'semiBold',
  [fonts.bold]: 'bold',
  [fonts.extraBold]: 'extraBold',
};

/** Joins the string and number parts of `children`, ignoring nested elements. */
export function plainText(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(plainText).join('');
  return '';
}

/**
 * Style layer for text in `text`. Latin and mono text stay as they are. Burmese and Thai get
 * the Noto family for the weight, a taller line height and Android font padding so marks fit.
 */
export function localizedStyle(text: string, style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  if (scriptOf(text) === 'latin') return style;
  const flat = StyleSheet.flatten(style) ?? {};
  const weight = flat.fontFamily ? WEIGHT_BY_FAMILY[flat.fontFamily] : 'regular';
  if (!weight) return style;
  const base = flat.lineHeight ?? (flat.fontSize ? Math.round(flat.fontSize * 1.25) : undefined);
  return [style, scriptStyle(text, weight, base), { includeFontPadding: true }];
}
