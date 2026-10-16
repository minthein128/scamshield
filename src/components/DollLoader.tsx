import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Verdict } from '../api/types';
import { BrandMark } from './BrandMark';
import { Icon, type IconName } from './Icon';
import { useReduceMotion } from '../hooks/useReduceMotion';
import theme from '../theme/theme';

const { colors } = theme;
const SIZE = 240;
const DOLL = 140;
const native = Platform.OS !== 'web';

const STAGE_ICONS: { at: number; x: number; y: number; paths: string[] }[] = [
  { at: 0, x: 6, y: 30, paths: ['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6M10 16h6'] },
  { at: 2, x: 190, y: 30, paths: ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M16 16l5 5'] },
  { at: 3, x: 6, y: 150, paths: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'] },
  { at: 4, x: 190, y: 150, paths: ['M4 18a8 8 0 1 1 16 0', 'M12 18l4-6'] },
];

/** Verdict marks: colour, plus a glyph whose shape differs, so the verdict never rests on colour alone. */
export const VERDICT_MARK: Record<Verdict, { color: string; icon: IconName }> = {
  safe: { color: colors.safe, icon: 'check' },
  careful: { color: colors.warningText, icon: 'alert' },
  danger: { color: colors.danger, icon: 'octagon' },
};

/** The doll rocks while the check runs, rights itself when the verdict lands, then shows the verdict mark. */
export const DollLoader: React.FC<{ step: number; verdict?: Verdict | null; label: string }> = ({ step, verdict = null, label }) => {
  const reduce = useReduceMotion();
  const rock = useRef(new Animated.Value(0)).current;
  const badge = useRef(new Animated.Value(0)).current;
  const pops = useRef(STAGE_ICONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduce || verdict) return;
    const side = (to: number) => Animated.timing(rock, { toValue: to, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: native });
    const loop = Animated.loop(Animated.sequence([side(1), side(-1)]));
    loop.start();
    return () => loop.stop();
  }, [reduce, verdict, rock]);

  useEffect(() => {
    if (!verdict) {
      badge.setValue(0);
      return;
    }
    if (reduce) {
      rock.setValue(0);
      badge.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(rock, { toValue: 0, friction: 3, tension: 90, useNativeDriver: native }),
      Animated.sequence([Animated.delay(180), Animated.spring(badge, { toValue: 1, friction: 4, tension: 140, useNativeDriver: native })]),
    ]).start();
  }, [verdict, reduce, rock, badge]);

  useEffect(() => {
    STAGE_ICONS.forEach((icon, i) => {
      const target = step >= icon.at ? 1 : 0;
      if (reduce) pops[i].setValue(target);
      else Animated.spring(pops[i], { toValue: target, friction: 5, tension: 120, useNativeDriver: native }).start();
    });
  }, [step, reduce, pops]);

  const angle = rock.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] });
  const mark = verdict ? VERDICT_MARK[verdict] : null;

  return (
    <View style={styles.root} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={[styles.glow, mark ? { borderColor: mark.color } : null]} />
      <Animated.View testID="loader-doll" style={[styles.doll, { transformOrigin: '50% 92%', transform: [{ rotate: angle }] }]}>
        <BrandMark size={DOLL} />
      </Animated.View>
      {mark ? (
        <Animated.View testID={`loader-verdict-${verdict}`} style={[styles.badge, { backgroundColor: mark.color, opacity: badge, transform: [{ scale: badge }] }]}>
          <Icon name={mark.icon} size={30} color={colors.white} />
        </Animated.View>
      ) : null}
      {STAGE_ICONS.map((icon, i) => (
        <Animated.View key={icon.at} style={[styles.stage, { left: icon.x, top: icon.y, opacity: verdict ? 0 : pops[i], transform: [{ scale: pops[i] }] }]}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.brandGold} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            {icon.paths.map(d => (
              <Path key={d} d={d} />
            ))}
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 184, height: 184, borderRadius: 92, backgroundColor: colors.brandGold, borderWidth: 5, borderColor: colors.brandGold },
  doll: { width: DOLL, height: DOLL, marginTop: -6 },
  badge: { position: 'absolute', right: 34, bottom: 30, width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  stage: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.slateDark, borderWidth: 1, borderColor: colors.borderDark, alignItems: 'center', justifyContent: 'center' },
});

export default DollLoader;
