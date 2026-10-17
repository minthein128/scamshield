import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { subscribeToast } from '../lib/toast';
import theme from '../theme/theme';

const { colors, fonts } = theme;
const SHOW_MS = 3200;

export const ToastHost: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const off = subscribeToast(next => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(next);
      if (next) timer.current = setTimeout(() => setMessage(null), SHOW_MS);
    });
    return () => {
      off();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!message) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View testID="toast" accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.toast}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, bottom: 120, alignItems: 'center' },
  toast: { maxWidth: 360, borderRadius: 14, backgroundColor: colors.textPrimary, paddingHorizontal: 16, paddingVertical: 12 },
  text: { color: colors.white, fontSize: 14.5, lineHeight: 21, fontFamily: fonts.medium, textAlign: 'center' },
});
