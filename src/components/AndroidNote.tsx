import React from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Card } from './ui';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const AndroidNote: React.FC<{ feature: string }> = ({ feature }) => {
  if (Platform.OS !== 'web') return null;
  const apkUrl = process.env.EXPO_PUBLIC_APK_URL?.trim();
  return (
    <Card style={styles.card}>
      <Text style={styles.text}>{feature} is available in the SafeRoute Android app.</Text>
      {apkUrl ? (
        <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL(apkUrl)}>
          <Text style={styles.link}>Download the Android app</Text>
        </TouchableOpacity>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { gap: 6, backgroundColor: colors.brandBlueLight, borderColor: colors.brandBlueLight },
  text: { color: colors.safeText, fontSize: 13, lineHeight: 19, fontFamily: fonts.semiBold },
  link: { color: colors.accent, fontSize: 13, lineHeight: 19, fontFamily: fonts.bold, textDecorationLine: 'underline' },
});
