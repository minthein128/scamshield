import React, { useEffect, useRef } from 'react';
import { Animated, Platform, View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { durations, ease } from '../theme/motion';
import theme from '../theme/theme';

const native = Platform.OS !== 'web';

/** A step's check mark fades in when the step is done. */
const StepMark: React.FC<{ done: boolean }> = ({ done }) => {
  const shown = useRef(new Animated.Value(done ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(shown, { toValue: done ? 1 : 0, duration: durations.fade, easing: ease.out, useNativeDriver: native }).start();
  }, [done, shown]);
  return (
    <View style={styles.pendingCircle}>
      <Animated.View style={[styles.checkCircle, styles.checkOver, { opacity: shown }]}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M5 12l5 5L20 7" />
        </Svg>
      </Animated.View>
    </View>
  );
};

interface ScanProgressProps {
  steps: string[];
  step: number;
  title: string;
  foundLabel?: string;
}

export const ScanProgress: React.FC<ScanProgressProps> = ({ steps, step, title, foundLabel }) => {
  const reduce = useReduceMotion();
  const scanTop = 20 + 250 * Math.min(step / steps.length, 1);
  const scan = useRef(new Animated.Value(scanTop)).current;
  useEffect(() => {
    if (reduce) scan.setValue(scanTop);
    else Animated.timing(scan, { toValue: scanTop, duration: durations.reveal, easing: ease.out, useNativeDriver: native }).start();
  }, [scanTop, reduce, scan]);
  return (
    <View style={styles.root}>
      <View style={styles.phoneGraphic}>
        <View style={styles.phoneHeader}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.barSmall} />
        </View>
        <View style={styles.bar140} />
        <View style={styles.bar120} />
        <View style={styles.bar130} />
        <View style={styles.barFill} />
        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scan }] }]} />
      </View>

      <View style={styles.statusSection}>
        <Text style={styles.statusTitle}>{title}</Text>
        {foundLabel ? (
          <View style={styles.foundBadge}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FDBA74" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Rect x={3} y={7} width={18} height={13} rx={2} />
              <Path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            </Svg>
            <Text style={styles.foundText}>{foundLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.stepsContainer}>
        {steps.map((label, i) => (
          <View key={label} style={styles.stepRow}>
            <StepMark done={step > i} />
            <Text style={styles.stepLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: 22, alignSelf: 'stretch' },
  phoneGraphic: {
    width: 180,
    height: 290,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#1F1A17',
    padding: 12,
    gap: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  phoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FDE68A',
  },
  barSmall: {
    width: 70,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  bar140: {
    width: 140,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  bar120: {
    width: 120,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  bar130: {
    width: 130,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  barFill: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#1F1A17',
    opacity: 0.85,
  },
  statusSection: {
    alignItems: 'center',
    gap: 10,
  },
  statusTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: theme.fonts.extraBold,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  foundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  foundText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  stepsContainer: {
    width: '100%',
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  checkOver: { position: 'absolute', top: -2, left: -2 },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F1A17',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pendingCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#475569',
    flexShrink: 0,
  },
  stepLabel: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: theme.fonts.semiBold,
    color: '#E2E8F0',
    includeFontPadding: false,
  },
});

export default ScanProgress;
