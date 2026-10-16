import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../../components/Text';
import { Icon } from '../../components/Icon';
import theme from '../../theme/theme';
import { ACCENTS } from './accents';
import type { ScamType } from './content';

const { colors, fonts } = theme;

export const ScamCard: React.FC<{ scam: ScamType; onPress: () => void; style?: StyleProp<ViewStyle> }> = ({ scam, onPress, style }) => {
  const { t } = useTranslation('learn');
  const { accent, soft } = ACCENTS[scam.id];
  return (
    <TouchableOpacity
      testID={`scam-${scam.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${scam.title}. ${scam.hook}`}
      accessibilityHint={t('scamCardHint')}
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.card, style]}
    >
      <View style={[styles.bar, { backgroundColor: accent }]} />
      <View style={[styles.icon, { backgroundColor: soft }]}>
        <Icon name={scam.icon} size={24} color={accent} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{scam.title}</Text>
        <Text style={styles.hook}>{scam.hook}</Text>
      </View>
      <Icon name="chevron" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 80, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 14, paddingLeft: 18, paddingRight: 12, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  hook: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
});

export default ScamCard;
