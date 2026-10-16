import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { MARK_VIEW, markShapes, type MarkShape } from './dollMark';
import { moodFace, type DollMood } from './avatarArt';
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
export const BrandMark: React.FC<{ size?: number; medallion?: string; mood?: DollMood }> = ({ size = 32, medallion, mood }) => {
  const shapes = markShapes(undefined, mood ? moodFace(mood) : undefined);
  return (
  <Svg width={size} height={size} viewBox={`${VX} ${VY} ${VS} ${VS}`} accessibilityElementsHidden importantForAccessibility="no">
    {medallion ? (
      <>
        <Circle cx={VX + VS / 2} cy={VY + VS / 2} r={VS / 2} fill={medallion} />
        <G transform={`translate(${VX + VS / 2} ${VY + VS / 2 + 1}) scale(0.78) translate(${-(VX + VS / 2)} ${-(VY + VS / 2)})`}>
          <MarkShapes shapes={shapes} />
        </G>
      </>
    ) : (
      <MarkShapes shapes={shapes} />
    )}
  </Svg>
  );
};

/** The name in ink, with the closing letters "we" in lacquer red; white and gold on dark grounds. Burmese reads in one colour. */
export const Wordmark: React.FC<{ size?: number; dark?: boolean; header?: boolean }> = ({ size = 32, dark, header }) => {
  const { t } = useTranslation();
  const name = t('appName');
  const latin = /^[A-Za-z]+$/.test(name);
  const tail = dark ? colors.brandGold : colors.brandRed;
  return (
    <Text accessibilityRole={header ? 'header' : undefined} style={[styles.word, { color: dark ? colors.white : colors.textPrimary, fontSize: Math.round(size * 0.62), lineHeight: Math.round(size * 0.8) }]}>
      {latin ? name.slice(0, -2) : name}
      {latin ? <Text style={{ color: tail }}>{name.slice(-2)}</Text> : null}
    </Text>
  );
};

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
