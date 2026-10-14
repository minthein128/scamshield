import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Verdict } from '../api/types';
import theme from '../theme/theme';

const { colors } = theme;
const SIZE = 240;
const SHIELD = 132;
const native = Platform.OS !== 'web';

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => live && setReduce(v)).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

const SHIELD_PATH = 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z';

const STAGE_ICONS: { at: number; x: number; y: number; paths: string[] }[] = [
  { at: 0, x: 10, y: 34, paths: ['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6M10 16h6'] },
  { at: 2, x: 186, y: 34, paths: ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M16 16l5 5'] },
  { at: 3, x: 10, y: 150, paths: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'] },
  { at: 4, x: 186, y: 150, paths: ['M4 18a8 8 0 1 1 16 0', 'M12 18l4-6'] },
];

const Face: React.FC<{ verdict: Verdict | null }> = ({ verdict }) => {
  const stroke = { stroke: colors.white, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  if (verdict === 'safe') return <Path d="M8.2 12.2l2.6 2.6 5-5.4" {...stroke} strokeWidth={2.2} />;
  if (verdict === 'danger') {
    return (
      <>
        <Path d="M12 8.2v4.4" {...stroke} strokeWidth={2.2} />
        <Circle cx={12} cy={15.6} r={1} fill={colors.white} />
      </>
    );
  }
  if (verdict === 'careful') {
    return (
      <>
        <Path d="M8.2 9.2l2.4-.9" {...stroke} />
        <Circle cx={9.5} cy={11.2} r={0.9} fill={colors.white} />
        <Circle cx={14.5} cy={11.2} r={0.9} fill={colors.white} />
        <Path d="M10 15h4" {...stroke} />
      </>
    );
  }
  return (
    <>
      <Circle cx={9.5} cy={10.8} r={0.95} fill={colors.white} />
      <Circle cx={14.5} cy={10.8} r={0.95} fill={colors.white} />
      <Path d="M9.6 14c1.4 1.3 3.4 1.3 4.8 0" {...stroke} />
    </>
  );
};

const shieldColor = (v: Verdict | null) => (v === 'danger' ? colors.danger : v === 'careful' ? colors.warningText : colors.accent);

export const ShieldLoader: React.FC<{ step: number; verdict?: Verdict | null }> = ({ step, verdict = null }) => {
  const reduce = useReduceMotion();
  const breathe = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(1)).current;
  const pops = useRef(STAGE_ICONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduce) {
      breathe.setValue(0);
      scan.setValue(0.5);
      return;
    }
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(breathe, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    const s = Animated.loop(Animated.timing(scan, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: native }));
    b.start();
    s.start();
    return () => {
      b.stop();
      s.stop();
    };
  }, [reduce, breathe, scan]);

  useEffect(() => {
    STAGE_ICONS.forEach((icon, i) => {
      const target = step >= icon.at ? 1 : 0;
      if (reduce) pops[i].setValue(target);
      else Animated.spring(pops[i], { toValue: target, friction: 5, tension: 120, useNativeDriver: native }).start();
    });
  }, [step, reduce, pops]);

  useEffect(() => {
    if (!verdict || reduce) return;
    bounce.setValue(0.8);
    Animated.spring(bounce, { toValue: 1, friction: 3, tension: 140, useNativeDriver: native }).start();
  }, [verdict, reduce, bounce]);

  const scale = Animated.multiply(Animated.add(1, Animated.multiply(breathe, 0.05)), bounce);
  const bob = breathe.interpolate({ inputRange: [0, 1], outputRange: [3, -3] });
  const scanY = scan.interpolate({ inputRange: [0, 1], outputRange: [-14, SHIELD - 20] });
  const scanOpacity = scan.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.5, 0.5, 0] });

  return (
    <View style={styles.root} accessible accessibilityRole="progressbar" accessibilityLabel="Checking">
      <View style={styles.glow} />
      <Animated.View style={[styles.shield, { transform: [{ translateY: bob }, { scale }] }]}>
        <Svg width={SHIELD} height={SHIELD} viewBox="0 0 24 24">
          <Path d={SHIELD_PATH} fill={shieldColor(verdict)} stroke={colors.white} strokeWidth={0.9} strokeLinejoin="round" />
          <Face verdict={verdict} />
        </Svg>
        {!verdict ? (
          <View pointerEvents="none" style={styles.scanClip}>
            <Animated.View style={[styles.scanBand, { opacity: scanOpacity, transform: [{ translateY: scanY }] }]} />
          </View>
        ) : null}
      </Animated.View>
      {STAGE_ICONS.map((icon, i) => (
        <Animated.View key={icon.at} style={[styles.badge, { left: icon.x, top: icon.y, opacity: pops[i], transform: [{ scale: pops[i] }] }]}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.brandBlueLight} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
  glow: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: colors.slateDark, opacity: 0.8 },
  shield: { width: SHIELD, height: SHIELD, alignItems: 'center', justifyContent: 'center' },
  scanClip: { position: 'absolute', left: SHIELD * 0.2, top: SHIELD * 0.12, width: SHIELD * 0.6, height: SHIELD * 0.74, overflow: 'hidden', borderRadius: 14 },
  scanBand: { height: 14, borderRadius: 7, backgroundColor: colors.white },
  badge: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.slateDark, borderWidth: 1, borderColor: colors.borderDark, alignItems: 'center', justifyContent: 'center' },
});

export default ShieldLoader;
