import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import theme from '../theme/theme';

interface JobAutoCheckScreenProps {
  onNavigate?: (route: string) => void;
}

export const JobAutoCheckScreen: React.FC<JobAutoCheckScreenProps> = ({ onNavigate }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(prev => {
        if (prev >= 3) {
          clearInterval(timer);
          return 3;
        }
        return prev + 1;
      });
    }, 1100);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    'Joining your 2 screens',
    'Checking the company',
    'Comparing with known scams',
  ];
  const scanTops = [20, 110, 200, 270];
  const scanTop = scanTops[Math.min(step, 3)];
  const isFinished = step >= 3;

  return (
    <View style={styles.container}>
      {/* Phone graphic with scanning laser */}
      <View style={styles.phoneGraphic}>
        <View style={styles.phoneHeader}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.barSmall} />
        </View>
        <View style={styles.bar140} />
        <View style={styles.bar120} />
        <View style={styles.bar130} />
        <View style={styles.barFill} />
        <View style={[styles.scanLine, { top: scanTop }]} />
      </View>

      {/* Checking status */}
      <View style={styles.statusSection}>
        <Text style={styles.statusTitle}>
          {isFinished ? 'Done' : 'Checking...'}
        </Text>
        <View style={styles.foundBadge}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FDBA74" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Rect x={3} y={7} width={18} height={13} rx={2} />
            <Path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          </Svg>
          <Text style={styles.foundText}>Found: job offer abroad</Text>
        </View>
      </View>

      {/* Progress steps */}
      <View style={styles.stepsContainer}>
        {steps.map((label, i) => {
          const isDone = step > i;
          return (
            <View key={label} style={styles.stepRow}>
              {isDone ? (
                <View style={styles.checkCircle}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M5 12l5 5L20 7" />
                  </Svg>
                </View>
              ) : (
                <View style={styles.pendingCircle} />
              )}
              <Text style={styles.stepLabel}>{label}</Text>
            </View>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      {/* Action Button */}
      {isFinished ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onNavigate?.('Verdict.dc.html')}
          style={styles.resultButton}
        >
          <Text style={styles.resultButtonText}>See result</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onNavigate?.('Bubble.dc.html')}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 390,
    height: 844,
    backgroundColor: '#0B1220',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 28,
    gap: 22,
    overflow: 'hidden',
  },
  phoneGraphic: {
    width: 180,
    height: 290,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#1D4ED8',
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
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#1D4ED8',
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
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1D4ED8',
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
  resultButton: {
    width: '100%',
    height: 60,
    borderRadius: 16,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultButtonText: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: theme.fonts.extraBold,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  cancelButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: theme.fonts.bold,
    color: '#E2E8F0',
    includeFontPadding: false,
  },
});

export default JobAutoCheckScreen;
