import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '../../theme/theme';
import ScanProgress from '../../components/ScanProgress';

interface JobAutoCheckScreenProps {
  onNavigate?: (route: string) => void;
}

const STEPS = ['Joining your 2 screens', 'Checking the company', 'Comparing with reported scams'];

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

  const isFinished = step >= 3;

  return (
    <View style={styles.container}>
      <ScanProgress steps={STEPS} step={step} title={isFinished ? 'Done' : 'Checking...'} foundLabel="Found: job offer abroad" />
      <View style={{ flex: 1 }} />
      {isFinished ? (
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('job-verdict')} style={styles.resultButton}>
          <Text style={styles.resultButtonText}>See result</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('job-spot')} style={styles.cancelButton}>
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
