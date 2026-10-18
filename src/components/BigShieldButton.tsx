import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Linking, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { BlockIcon } from './blockIcons';
import { MarkShapes } from './BrandMark';
import { MARK_COLORS, MARK_VIEW, markShapes, type MarkShape } from './dollMark';
import { PERMISSION_STEPS, stepText, type ShieldControl } from '../hooks/useShieldControl';
import { useHomeShield } from '../hooks/useHomeShield';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { APK_URL } from '../config/env';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const [VX, VY, VS] = MARK_VIEW;
const DISC = 164;
const HALO = 212;
const DOLL = 84;
/** A start or stop shows the spinner only when the service takes longer than this to confirm. */
export const BUSY_DELAY_MS = 300;
export const SHIELD_FADE_MS = 400;
const native = Platform.OS !== 'web';

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

const DollArt: React.FC<{ on: boolean }> = ({ on }) => (
  <Svg width={DOLL} height={DOLL} viewBox={`${VX} ${VY} ${VS} ${VS}`} accessibilityElementsHidden importantForAccessibility="no">
    <Circle cx={VX + VS / 2} cy={VY + VS / 2} r={VS / 2} fill={on ? colors.brandGold : '#DAD6D1'} />
    <G transform={`translate(${VX + VS / 2} ${VY + VS / 2 + 1}) scale(0.78) translate(${-(VX + VS / 2)} ${-(VY + VS / 2)})`}>
      <MarkShapes shapes={on ? markShapes() : toGrey(markShapes())} />
    </G>
  </Svg>
);

/** The grey doll with the colour doll fading in over it as [progress] goes 0 to 1. */
const Doll: React.FC<{ progress: Animated.Value }> = ({ progress }) => (
  <View style={{ width: DOLL, height: DOLL }}>
    <DollArt on={false} />
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
      <DollArt on />
    </Animated.View>
  </View>
);

/** Colour fade, one soft scale pulse and, when turning on, one ring that expands and fades. */
function useShieldTransition(on: boolean) {
  const reduce = useReduceMotion();
  const progress = useRef(new Animated.Value(on ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const last = useRef(on);
  useEffect(() => {
    if (last.current === on) return;
    last.current = on;
    if (reduce) {
      progress.setValue(on ? 1 : 0);
      return;
    }
    ring.setValue(0);
    const ease = Easing.out(Easing.cubic);
    const run = Animated.parallel([
      Animated.timing(progress, { toValue: on ? 1 : 0, duration: SHIELD_FADE_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: native }),
      Animated.sequence([
        Animated.timing(pulse, { toValue: on ? 1.07 : 0.96, duration: SHIELD_FADE_MS * 0.4, easing: ease, useNativeDriver: native }),
        Animated.timing(pulse, { toValue: 1, duration: SHIELD_FADE_MS * 0.6, easing: Easing.inOut(Easing.cubic), useNativeDriver: native }),
      ]),
      ...(on ? [Animated.timing(ring, { toValue: 1, duration: SHIELD_FADE_MS + 100, easing: ease, useNativeDriver: native })] : []),
    ]);
    run.start();
    return () => run.stop();
  }, [on, reduce, progress, pulse, ring]);
  return { progress, pulse, ring };
}

/** True once [active] has stayed true for [ms]. */
function useActiveFor(active: boolean, ms: number): boolean {
  const [late, setLate] = useState(false);
  useEffect(() => {
    setLate(false);
    if (!active) return;
    const timer = setTimeout(() => setLate(true), ms);
    return () => clearTimeout(timer);
  }, [active, ms]);
  return active && late;
}

export const BigShieldButton: React.FC = () => <BigShieldButtonView control={useHomeShield()} />;

export const downloadUrl = (): string => APK_URL;

/** Status line, the round on/off button and one hint line. */
export const BigShieldButtonView: React.FC<{ control: ShieldControl }> = ({ control }) => {
  const { t } = useTranslation(['home', 'shield']);
  const { support, step, error, setEnabled } = control;
  const working = step !== 'idle';
  const slow = useActiveFor(working, BUSY_DELAY_MS);
  const motion = useShieldTransition(support === 'ready' && control.on);
  if (support === 'unsupported') return null;

  const unavailable = support !== 'ready';
  const web = support === 'web';
  const busy = slow || PERMISSION_STEPS.includes(step);
  const on = !unavailable && control.on;
  const hint = unavailable
    ? support === 'web'
      ? t('home:shield.web')
      : support === 'insecure-service'
        ? t('shield:status.insecure')
        : t('shield:status.unavailable')
    : busy
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

      <View style={styles.haloSlot}>
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { opacity: motion.ring.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }), transform: [{ scale: motion.ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }] }]}
      />
      <Animated.View style={[styles.halo, styles.haloOff, { transform: [{ scale: motion.pulse }] }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.haloOn, { borderRadius: HALO / 2, opacity: motion.progress }]} />
        <TouchableOpacity
          testID="shield-button"
          accessibilityRole={web ? 'link' : 'button'}
          accessibilityLabel={web ? t('shield:download') : unavailable ? `${statusText}. ${hint}` : on ? t('home:shield.a11yOn') : t('home:shield.a11yOff')}
          accessibilityState={{ disabled: (unavailable && !web) || working, selected: on, busy }}
          activeOpacity={0.85}
          disabled={(unavailable && !web) || working}
          onPress={() => (web ? Linking.openURL(downloadUrl()).catch(() => undefined) : setEnabled(!on))}
          style={[styles.disc, styles.discOff, unavailable && !web && styles.discUnavailable]}
        >
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.discFill, { opacity: motion.progress }]} />
          <Doll progress={motion.progress} />
          {web ? (
            <Text testID="shield-download" style={styles.download}>{t('shield:download')}</Text>
          ) : busy ? (
            <ActivityIndicator testID="shield-busy" color={colors.textPrimary} />
          ) : unavailable ? null : (
            <Animated.View style={[styles.labelRow, { opacity: on ? motion.progress : Animated.subtract(1, motion.progress) }]}>
              <BlockIcon name="power" size={16} color={on ? colors.white : colors.textPrimary} />
              <Text numberOfLines={1} style={[styles.label, { color: on ? colors.white : colors.textPrimary }]}>{label}</Text>
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>
      </View>

      <Text testID="shield-hint" style={styles.hint}>{hint}</Text>
      {error ? <Text testID="shield-error" style={styles.error}>{error}</Text> : null}
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
  haloOn: { borderRadius: HALO / 2, backgroundColor: colors.brandGoldSoft, borderWidth: 2, borderColor: colors.brandGold, shadowColor: colors.brandGold, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 6 },
  disc: { width: DISC, height: DISC, borderRadius: DISC / 2, alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#1F1A17', shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 4 },
  discOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, shadowOpacity: 0.1 },
  discFill: { borderRadius: DISC / 2, backgroundColor: colors.brandInk },
  discUnavailable: { opacity: 0.7 },
  haloSlot: { width: HALO, height: HALO, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: HALO, height: HALO, borderRadius: HALO / 2, borderWidth: 3, borderColor: colors.brandGold },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: DISC - 24 },
  download: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.bold, textAlign: 'center', paddingHorizontal: 16, textDecorationLine: 'underline' },
  label: { fontSize: 17, lineHeight: 24, fontFamily: fonts.bold, includeFontPadding: false },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.regular, textAlign: 'center', paddingHorizontal: 12, maxWidth: 360 },
  error: { color: colors.dangerDark, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold, textAlign: 'center' },
});
