import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';
import { Text } from './Text';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const BrandMark: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Svg width={size * (76 / 98)} height={size} viewBox="12 0 76 98" accessibilityElementsHidden importantForAccessibility="no">
    <Defs>
      <Mask id="saferoute-mark-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
        <Rect width="100" height="100" fill="#fff" />
        <Path d="M50 19 L67 25 L67 40 Q67 53 50 60 Q33 53 33 40 L33 25 Z" fill="#000" stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      </Mask>
    </Defs>
    <G mask="url(#saferoute-mark-cut)">
      <Path d="M50 95 C40 82 16 60 16 38 A34 34 0 0 1 84 38 C84 60 60 82 50 95 Z" fill={colors.accent} stroke={colors.accent} strokeWidth={1.5} strokeLinejoin="round" />
    </G>
    <Circle cx={50} cy={38} r={7} fill="#B45309" />
  </Svg>
);

export const BrandLockup: React.FC<{ size?: number; color?: string; header?: boolean }> = ({ size = 32, color = colors.textPrimary, header }) => (
  <View style={styles.row}>
    <BrandMark size={size} />
    <Text accessibilityRole={header ? 'header' : undefined} style={[styles.word, { color, fontSize: Math.round(size * 0.62), lineHeight: Math.round(size * 0.8) }]}>SafeRoute</Text>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontFamily: fonts.bold, letterSpacing: -0.2, includeFontPadding: false },
});

export default BrandLockup;
