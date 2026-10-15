import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AVATAR_ART, avatarPose, type AvatarArt, type AvatarConcept, type AvatarState, type Shape } from './avatarArt';
import { useReduceMotion } from './ShieldLoader';

export type { AvatarConcept, AvatarState } from './avatarArt';

interface Props {
  concept: AvatarConcept;
  state: AvatarState;
  /** 0..1 loudness of the active voice: SafeRoute's while speaking, the user's while listening. */
  level?: number;
  /** Disc diameter. The halo grows up to 30% past it, so leave room around the avatar. */
  size?: number;
}

const BLINK_MS = [3200, 5600] as const;

const Shapes: React.FC<{ shapes: Shape[] }> = ({ shapes }) => (
  <>
    {shapes.map((s, i) => {
      const paint = {
        fill: s.fill ?? 'none',
        stroke: s.stroke,
        strokeWidth: s.width,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        opacity: s.opacity,
      };
      return s.circle ? <Circle key={i} cx={s.circle[0]} cy={s.circle[1]} r={s.circle[2]} {...paint} /> : <Path key={i} d={s.d} {...paint} />;
    })}
  </>
);

const Layer: React.FC<{ art: AvatarArt; shapes: Shape[]; size: number }> = ({ art, shapes, size }) =>
  shapes.length ? (
    <Svg width={size} height={size} viewBox={`${art.view[0]} ${art.view[1]} ${art.view[2]} ${art.view[2]}`} style={StyleSheet.absoluteFill}>
      <Shapes shapes={shapes} />
    </Svg>
  ) : null;

/** SafeRoute's voice avatar: a halo that follows the voice level plus one small motion per concept. */
export const Avatar: React.FC<Props> = ({ concept, state, level = 0, size = 160 }) => {
  const reduce = useReduceMotion();
  const art = AVATAR_ART[concept];
  const pose = avatarPose(concept, state, level, reduce);

  const haloScale = useRef(new Animated.Value(pose.haloScale)).current;
  const haloOpacity = useRef(new Animated.Value(pose.haloOpacity)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(pose.tilt)).current;
  const swing = useRef(new Animated.Value(pose.swing)).current;
  const phase = useRef(new Animated.Value(0)).current;
  const overlay = useRef(new Animated.Value(pose.overlay)).current;
  const blink = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    haloScale.setValue(pose.haloScale);
    haloOpacity.setValue(pose.haloOpacity);
    swing.setValue(pose.swing);
  }, [pose.haloScale, pose.haloOpacity, pose.swing, haloScale, haloOpacity, swing]);

  useEffect(() => {
    if (reduce) {
      tilt.setValue(pose.tilt);
      overlay.setValue(pose.overlay);
      return;
    }
    const ease = { duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true };
    const run = Animated.parallel([
      Animated.timing(tilt, { toValue: pose.tilt, ...ease }),
      Animated.timing(overlay, { toValue: pose.overlay, ...ease, duration: 120 }),
    ]);
    run.start();
    return () => run.stop();
  }, [reduce, pose.tilt, pose.overlay, tilt, overlay]);

  const rocking = !reduce && pose.swing > 0;
  useEffect(() => {
    if (!rocking) {
      phase.setValue(0);
      return;
    }
    const half = concept === 'C' ? 700 : 1100;
    const step = (to: number) => Animated.timing(phase, { toValue: to, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([step(1), step(-1)]));
    loop.start();
    return () => loop.stop();
  }, [rocking, concept, phase]);

  useEffect(() => {
    if (!pose.breathe) {
      breath.setValue(0);
      return;
    }
    const step = (to: number) => Animated.timing(breath, { toValue: to, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([step(1), step(0)]));
    loop.start();
    return () => loop.stop();
  }, [pose.breathe, breath]);

  useEffect(() => {
    if (!pose.blink) {
      blink.setValue(0);
      return;
    }
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(blink, { toValue: 1, duration: 70, useNativeDriver: true }),
          Animated.timing(blink, { toValue: 0, duration: 110, useNativeDriver: true }),
        ]).start(() => live && next());
      }, BLINK_MS[0] + Math.random() * (BLINK_MS[1] - BLINK_MS[0]));
    };
    next();
    return () => {
      live = false;
      clearTimeout(timer);
      blink.stopAnimation();
      blink.setValue(0);
    };
  }, [pose.blink, blink]);

  const [vx, vy, vs] = art.view;
  const origin = `${((art.pivot[0] - vx) / vs) * 100}% ${((art.pivot[1] - vy) / vs) * 100}%`;
  const angle = Animated.add(tilt, Animated.multiply(phase, swing)).interpolate({ inputRange: [-45, 45], outputRange: ['-45deg', '45deg'] });
  const haloAlpha = Animated.multiply(haloOpacity, breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }));
  const overlayOpacity = concept === 'A' ? blink : overlay;
  const round = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel="SafeRoute" testID="avatar">
      <Animated.View
        testID="avatar-halo"
        style={[styles.abs, round, { backgroundColor: pose.haloColor, opacity: haloAlpha, transform: [{ scale: haloScale }] }]}
      />
      <View style={[styles.abs, round, styles.clip, { backgroundColor: art.disc }]}>
        <Layer art={art} shapes={art.ground} size={size} />
        <Animated.View testID="avatar-figure" style={[styles.abs, { transformOrigin: origin, transform: [{ rotate: angle }] }]}>
          <Layer art={art} shapes={art.back} size={size} />
          {art.overlay.length > 0 && (
            <Animated.View testID="avatar-overlay" style={[styles.abs, { opacity: overlayOpacity }]}>
              <Layer art={art} shapes={art.overlay} size={size} />
            </Animated.View>
          )}
          <Layer art={art} shapes={art.front} size={size} />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  abs: { ...StyleSheet.absoluteFillObject },
  clip: { overflow: 'hidden' },
});

export default Avatar;
