import React from 'react';
import { Linking, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { Card } from './ui';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const AndroidNote: React.FC<{ text: string }> = ({ text }) => {
  const { t } = useTranslation('shield');
  if (Platform.OS !== 'web') return null;
  const apkUrl = process.env.EXPO_PUBLIC_APK_URL?.trim();
  return (
    <Card style={styles.card}>
      <Text style={styles.text}>{text}</Text>
      {apkUrl ? (
        <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL(apkUrl)}>
          <Text style={styles.link}>{t('download')}</Text>
        </TouchableOpacity>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { gap: 6, backgroundColor: colors.brandBlueLight, borderColor: colors.brandBlueLight },
  text: { color: colors.safeText, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold },
  link: { color: colors.accent, fontSize: 14, lineHeight: 20, fontFamily: fonts.bold, textDecorationLine: 'underline' },
});
