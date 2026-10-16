import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { Text } from './Text';
import { MARK_VIEW, markShapes, type MarkShape } from './dollMark';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const MarkShapes: React.FC<{ shapes: MarkShape[] }> = ({ shapes }) => (
  <>
    {shapes.map((s, i) => {
      const paint = { fill: s.fill ?? 'none', stroke: s.stroke, strokeWidth: s.width, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, opacity: s.opacity };
      return s.circle ? <Circle key={i} cx={s.circle[0]} cy={s.circle[1]} r={s.circle[2]} {...paint} /> : <Path key={i} d={s.d} {...paint} />;
    })}
  </>
);

const [VX, VY, VS] = MARK_VIEW;

/** The pyit taing htaung doll mark. medallion sets it on a disc of that colour, as in the app icon, for dark grounds. */
export const BrandMark: React.FC<{ size?: number; medallion?: string }> = ({ size = 32, medallion }) => (
  <Svg width={size} height={size} viewBox={`${VX} ${VY} ${VS} ${VS}`} accessibilityElementsHidden importantForAccessibility="no">
    {medallion ? (
      <>
        <Circle cx={VX + VS / 2} cy={VY + VS / 2} r={VS / 2} fill={medallion} />
        <G transform={`translate(${VX + VS / 2} ${VY + VS / 2 + 1}) scale(0.78) translate(${-(VX + VS / 2)} ${-(VY + VS / 2)})`}>
          <MarkShapes shapes={markShapes()} />
        </G>
      </>
    ) : (
      <MarkShapes shapes={markShapes()} />
    )}
  </Svg>
);

/** "Safe" in ink and "Route" in lacquer red; white and gold on dark grounds. */
export const Wordmark: React.FC<{ size?: number; dark?: boolean; header?: boolean }> = ({ size = 32, dark, header }) => (
  <Text accessibilityRole={header ? 'header' : undefined} style={[styles.word, { color: dark ? colors.white : colors.textPrimary, fontSize: Math.round(size * 0.62), lineHeight: Math.round(size * 0.8) }]}>
    Safe<Text style={{ color: dark ? colors.brandGold : colors.brandRed }}>Route</Text>
  </Text>
);

export const BrandLockup: React.FC<{ size?: number; dark?: boolean; header?: boolean }> = ({ size = 32, dark, header }) => (
  <View style={styles.row}>
    <BrandMark size={Math.round(size * 1.2)} medallion={dark ? colors.brandGold : undefined} />
    <Wordmark size={size} dark={dark} header={header} />
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  word: { fontFamily: fonts.extraBold, letterSpacing: -0.2, includeFontPadding: false },
});

export default BrandLockup;
