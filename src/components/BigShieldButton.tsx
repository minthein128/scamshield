import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { BlockIcon } from './blockIcons';
import { MarkShapes } from './BrandMark';
import { MARK_COLORS, MARK_VIEW, markShapes, type MarkShape } from './dollMark';
import { stepText, type ShieldControl } from '../hooks/useShieldControl';
import { useHomeShield } from '../hooks/useHomeShield';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const [VX, VY, VS] = MARK_VIEW;
const DISC = 164;
const HALO = 212;
const DOLL = 84;

const GREY: Record<string, string> = {
  [MARK_COLORS.body]: '#B3AEA8',
  [MARK_COLORS.bodyDeep]: '#9A958F',
  [MARK_COLORS.face]: '#F1EEEA',
  [MARK_COLORS.ink]: '#7C7771',
  [MARK_COLORS.gold]: '#CFCBC6',
  [MARK_COLORS.cheek]: '#D8D4CF',
};

const toGrey = (shapes: MarkShape[]): MarkShape[] =>
  shapes.map(s => ({ ...s, fill: s.fill ? GREY[s.fill] ?? s.fill : s.fill, stroke: s.stroke ? GREY[s.stroke] ?? s.stroke : s.stroke }));

const Doll: React.FC<{ on: boolean }> = ({ on }) => (
  <Svg width={DOLL} height={DOLL} viewBox={`${VX} ${VY} ${VS} ${VS}`} accessibilityElementsHidden importantForAccessibility="no">
    <Circle cx={VX + VS / 2} cy={VY + VS / 2} r={VS / 2} fill={on ? colors.brandGold : '#DAD6D1'} />
    <G transform={`translate(${VX + VS / 2} ${VY + VS / 2 + 1}) scale(0.78) translate(${-(VX + VS / 2)} ${-(VY + VS / 2)})`}>
      <MarkShapes shapes={on ? markShapes() : toGrey(markShapes())} />
    </G>
  </Svg>
);

export const BigShieldButton: React.FC<{ onDetails?: () => void }> = ({ onDetails }) => <BigShieldButtonView control={useHomeShield()} onDetails={onDetails} />;

/** Status line, the round on/off button and one hint line. */
export const BigShieldButtonView: React.FC<{ control: ShieldControl; onDetails?: () => void }> = ({ control, onDetails }) => {
  const { t } = useTranslation(['home', 'shield']);
  const { support, running, step, error, setEnabled } = control;
  if (support === 'unsupported') return null;

  const unavailable = support !== 'ready';
  const working = step !== 'idle';
  const on = !unavailable && running;
  const hint = unavailable
    ? support === 'web'
      ? t('home:shield.web')
      : support === 'insecure-service'
        ? t('shield:status.insecure')
        : t('shield:status.unavailable')
    : working
      ? stepText(step)
      : on
        ? t('home:shield.hintOn')
        : t('home:shield.hintOff');
  const label = on ? t('home:shield.on') : t('home:shield.turnOn');
  const statusText = on ? t('home:shield.statusOn') : t('home:shield.statusOff');

  return (
    <View testID="shield-card" style={styles.wrap}>
      <View style={styles.status} accessibilityRole="header">
        <View style={on ? styles.dotOnRing : null}>
          <View style={[styles.dot, { backgroundColor: on ? colors.brandGold : '#B8B2AB' }]} />
        </View>
        <Text testID="shield-status" style={[styles.statusText, !on && { color: colors.textSecondary }]}>{statusText}</Text>
      </View>

      <View style={[styles.halo, on ? styles.haloOn : styles.haloOff]}>
        <TouchableOpacity
          testID="shield-button"
          accessibilityRole="button"
          accessibilityLabel={unavailable ? `${statusText}. ${hint}` : on ? t('home:shield.a11yOn') : t('home:shield.a11yOff')}
          accessibilityState={{ disabled: unavailable || working, selected: on, busy: working }}
          activeOpacity={0.85}
          disabled={unavailable || working}
          onPress={() => setEnabled(!running)}
          style={[styles.disc, on ? styles.discOn : styles.discOff, unavailable && styles.discUnavailable]}
        >
          <Doll on={on} />
          {unavailable ? null : (
            <View style={styles.labelRow}>
              <BlockIcon name="power" size={16} color={on ? colors.white : colors.textPrimary} />
              <Text numberOfLines={1} style={[styles.label, { color: on ? colors.white : colors.textPrimary }]}>{label}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Text testID="shield-hint" style={styles.hint}>{hint}</Text>
      {error ? <Text testID="shield-error" style={styles.error}>{error}</Text> : null}
      {onDetails && !unavailable ? (
        <TouchableOpacity testID="shield-details" accessibilityRole="button" accessibilityLabel={t('shield:detailsA11y')} activeOpacity={0.7} onPress={onDetails} style={styles.details}>
          <Text style={styles.detailsText}>{t('shield:details')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12, paddingTop: 4 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOnRing: { padding: 4, borderRadius: 12, backgroundColor: colors.brandGoldSoft },
  statusText: { color: colors.textPrimary, fontSize: 17, lineHeight: 24, fontFamily: fonts.bold, includeFontPadding: false },
  halo: { width: HALO, height: HALO, borderRadius: HALO / 2, alignItems: 'center', justifyContent: 'center' },
  haloOff: { backgroundColor: '#EFE8DF' },
  haloOn: { backgroundColor: colors.brandGoldSoft, borderWidth: 2, borderColor: colors.brandGold, shadowColor: colors.brandGold, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 6 },
  disc: { width: DISC, height: DISC, borderRadius: DISC / 2, alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#1F1A17', shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 4 },
  discOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, shadowOpacity: 0.1 },
  discOn: { backgroundColor: colors.brandInk, shadowOpacity: 0.3 },
  discUnavailable: { opacity: 0.7 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: DISC - 24 },
  label: { fontSize: 17, lineHeight: 24, fontFamily: fonts.bold, includeFontPadding: false },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.regular, textAlign: 'center', paddingHorizontal: 12, maxWidth: 360 },
  details: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8, marginTop: -8 },
  detailsText: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold, textDecorationLine: 'underline' },
  error: { color: colors.dangerDark, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold, textAlign: 'center' },
});
