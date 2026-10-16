import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Verdict } from '../api/types';
import theme from '../theme/theme';
import { Face, SHIELD_PATH, shieldColor, useReduceMotion } from './ShieldLoader';

const { colors } = theme;
const SIZE = 168;
const SHIELD = 108;

interface Props {
  verdict: Verdict;
  /** 0..1 loudness of the voice SafeRoute is playing. Read every frame. */
  outputLevel: () => number;
  /** 0..1 loudness of the microphone. Read every frame. */
  inputLevel?: () => number;
  active: boolean;
}

/** The Checking-screen shield, pulsing with the level of the voice it speaks. */
export const ShieldVoice: React.FC<Props> = ({ verdict, outputLevel, inputLevel, active }) => {
  const reduce = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const levels = useRef({ outputLevel, inputLevel });
  levels.current = { outputLevel, inputLevel };

  useEffect(() => {
    if (!active || reduce) {
      pulse.setValue(0);
      halo.setValue(0);
      return;
    }
    let frame = 0;
    let smooth = 0;
    const loop = () => {
      const out = levels.current.outputLevel();
      const inp = levels.current.inputLevel?.() ?? 0;
      smooth = Math.max(out, smooth * 0.85);
      pulse.setValue(smooth);
      halo.setValue(Math.max(smooth, inp * 0.6));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [active, reduce, pulse, halo]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.8] });

  return (
    <View style={styles.root} accessible accessibilityRole="image" accessibilityLabel="SafeRoute">
      <Animated.View style={[styles.halo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={SHIELD} height={SHIELD} viewBox="0 0 24 24">
          <Path d={SHIELD_PATH} fill={shieldColor(verdict)} stroke={colors.white} strokeWidth={0.9} strokeLinejoin="round" />
          <Face verdict={verdict} />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: colors.slateDark },
});

export default ShieldVoice;
