import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Verdict } from '../api/types';
import { BrandMark } from './BrandMark';
import type { DollMood } from './avatarArt';
import { Icon, type IconName } from './Icon';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { durations, ease, sway } from '../theme/motion';
import theme from '../theme/theme';

const { colors } = theme;
const SIZE = 240;
const MEDALLION = 176;
const DOLL = 136;
const RING_R = 106;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;
const CREEP_MS = 5000;
const native = Platform.OS !== 'web';
const HIDDEN = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Verdict marks: colour, plus a glyph whose shape differs, so the verdict never rests on colour alone. */
export const VERDICT_MARK: Record<Verdict, { color: string; icon: IconName }> = {
  safe: { color: colors.safe, icon: 'check' },
  careful: { color: colors.warningText, icon: 'alert' },
  danger: { color: colors.danger, icon: 'octagon' },
};

/** Face the doll wears for each verdict. */
export const VERDICT_MOOD: Record<Verdict, DollMood> = { safe: 'calm', careful: 'concerned', danger: 'worried' };

/** One damped tumbler cycle: a soft nudge, swings that shrink to rest, then a pause. */
function swayCycle(rock: Animated.Value): Animated.CompositeAnimation {
  const leg = (durations.sway - sway.restMs) / sway.swings.length;
  return Animated.sequence([
    ...sway.swings.map((deg, i) =>
      Animated.timing(rock, { toValue: deg, duration: leg, easing: i === 0 ? ease.out : ease.inOut, useNativeDriver: native }),
    ),
    Animated.delay(sway.restMs),
  ]);
}

interface Props {
  /** Ring share earned by finished work (0..1). 1 means the result is in. */
  floor: number;
  /** How far the ring may creep while it waits for the next real stage. */
  ceiling: number;
  verdict?: Verdict | null;
  label: string;
  markIcon?: IconName;
}

/** The doll sways while the ring fills with the check's real stages; the verdict lands in one move. */
export const DollLoader: React.FC<Props> = ({ floor, ceiling, verdict = null, label, markIcon }) => {
  const reduce = useReduceMotion();
  const rock = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const fill = useRef(new Animated.Value(0)).current;
  const badge = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce || verdict) return;
    const loop = Animated.loop(swayCycle(rock));
    loop.start();
    return () => loop.stop();
  }, [reduce, verdict, rock]);

  useEffect(() => {
    if (reduce) {
      progress.setValue(floor);
      return;
    }
    const steps = [Animated.timing(progress, { toValue: floor, duration: floor >= 1 ? durations.reveal : durations.step, easing: ease.out, useNativeDriver: false })];
    if (ceiling > floor) {
      steps.push(Animated.timing(progress, { toValue: floor + 0.85 * (ceiling - floor), duration: CREEP_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }));
    }
    const run = Animated.sequence(steps);
    run.start();
    return () => run.stop();
  }, [floor, ceiling, reduce, progress]);

  useEffect(() => {
    if (!verdict) {
      fill.setValue(0);
      badge.setValue(0);
      return;
    }
    if (reduce) {
      rock.setValue(0);
      Animated.parallel([
        Animated.timing(fill, { toValue: 1, duration: durations.fade, easing: ease.out, useNativeDriver: false }),
        Animated.timing(badge, { toValue: 1, duration: durations.fade, easing: ease.out, useNativeDriver: native }),
      ]).start();
      return;
    }
    Animated.parallel([
      Animated.spring(rock, { toValue: 0, stiffness: 220, damping: 20, mass: 1, useNativeDriver: native }),
      Animated.timing(fill, { toValue: 1, duration: durations.reveal, easing: ease.out, useNativeDriver: false }),
      Animated.sequence([Animated.delay(120), Animated.timing(badge, { toValue: 1, duration: durations.step, easing: ease.pop, useNativeDriver: native })]),
    ]).start();
  }, [verdict, reduce, rock, fill, badge]);

  const angle = rock.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] });
  const offset = (v: Animated.Value) => v.interpolate({ inputRange: [0, 1], outputRange: [CIRCUMFERENCE, 0], extrapolate: 'clamp' });
  const mark = verdict ? VERDICT_MARK[verdict] : null;
  const badgeScale = reduce ? 1 : badge.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const center = SIZE / 2;

  return (
    <View style={styles.root} accessible accessibilityRole={verdict ? 'image' : 'progressbar'} accessibilityLabel={label}>
      <View style={styles.medallion} {...HIDDEN} />
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill} {...HIDDEN}>
        <Circle cx={center} cy={center} r={RING_R} stroke={colors.textLighter} strokeOpacity={0.14} strokeWidth={3} fill="none" />
        <AnimatedCircle
          testID="loader-ring"
          cx={center}
          cy={center}
          r={RING_R}
          stroke={colors.textLighter}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={offset(progress)}
          transform={`rotate(-90 ${center} ${center})`}
        />
        {mark ? (
          <AnimatedCircle
            cx={center}
            cy={center}
            r={RING_R}
            stroke={mark.color}
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={reduce ? 0 : offset(fill)}
            opacity={reduce ? fill : 1}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null}
      </Svg>
      <Animated.View testID="loader-doll" style={[styles.doll, { transformOrigin: '50% 92%', transform: [{ rotate: angle }] }]}>
        <BrandMark size={DOLL} mood={verdict ? VERDICT_MOOD[verdict] : undefined} />
      </Animated.View>
      {mark ? (
        <Animated.View testID={`loader-verdict-${verdict}`} {...HIDDEN} style={[styles.badge, { backgroundColor: mark.color, opacity: badge, transform: [{ scale: badgeScale }] }]}>
          <Icon name={markIcon ?? mark.icon} size={28} color={colors.white} />
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  medallion: { position: 'absolute', width: MEDALLION, height: MEDALLION, borderRadius: MEDALLION / 2, backgroundColor: colors.brandGold },
  doll: { width: DOLL, height: DOLL, marginTop: -6 },
  badge: { position: 'absolute', right: 38, bottom: 34, width: 54, height: 54, borderRadius: 27, borderWidth: 3, borderColor: colors.deepDarkBackground, alignItems: 'center', justifyContent: 'center' },
});

export default DollLoader;
