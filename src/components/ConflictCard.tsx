import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { Pill } from './ui';
import type { JobConflict } from '../api/types';
import { plainValueLabel } from '../lib/jobFacts';
import theme, { readable } from '../theme/theme';

const { colors, fonts } = theme;

const SEVERITY = {
  high: { bg: colors.dangerSoftBg, fg: colors.dangerSoftText },
  medium: { bg: colors.amberLight, fg: colors.amberDark },
  low: { bg: colors.codeBg, fg: colors.codeText },
};

const FAMILY_ICONS: Record<string, IconName> = {
  too_good: 'gift',
  pressure: 'clock',
  payment_route: 'card',
  identity: 'user',
  link_risk: 'link',
  known_bad: 'flag',
  trafficking: 'octagon',
};

/** One mismatch between the ad and the chat, with both quotes side by side in reading order. */
export const ConflictCard: React.FC<{ conflict: JobConflict; tablet?: boolean }> = ({ conflict, tablet = false }) => {
  const { t } = useTranslation('report');
  const sev = SEVERITY[conflict.severity] ?? SEVERITY.low;
  const adMissing = !conflict.adQuote && (!conflict.adValue || conflict.adValue === 'not_mentioned');
  const adText = adMissing ? t(conflict.field === 'documentRequest' ? 'conflicts.adNoDocuments' : 'conflicts.adNotMentioned') : conflict.adQuote || plainValueLabel(conflict.field, conflict.adValue);
  return (
    <View testID={`conflict-${conflict.field}`} style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: sev.bg }]}>
          <Icon name={FAMILY_ICONS[conflict.family] ?? 'flag'} size={22} color={sev.fg} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={[styles.label, readable(tablet, 15, 22)]}>{conflict.fieldLabel}</Text>
          <Pill label={t(`severity.${conflict.severity}`)} background={sev.bg} color={sev.fg} />
        </View>
      </View>
      <Text style={[styles.description, readable(tablet, 14, 20)]}>{conflict.description}</Text>
      <View style={styles.quoteBox}>
        <Text style={styles.quoteLabel}>{t('conflicts.adSays')}</Text>
        <Text testID={`conflict-${conflict.field}-ad`} style={[styles.quoteText, readable(tablet, 14, 20)]}>{adText}</Text>
      </View>
      <View style={styles.quoteBox}>
        <Text style={styles.quoteLabel}>{t('conflicts.chatSays')}</Text>
        <Text testID={`conflict-${conflict.field}-chat`} style={[styles.quoteText, readable(tablet, 14, 20)]}>{conflict.chatQuote || plainValueLabel(conflict.field, conflict.chatValue)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { gap: 10, padding: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, lineHeight: 22, fontFamily: fonts.bold, color: colors.textPrimary },
  description: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: colors.textSecondary },
  quoteBox: { gap: 2, padding: 10, borderRadius: 10, backgroundColor: colors.codeBg },
  quoteLabel: { color: colors.textSecondary, fontSize: 12, lineHeight: 16, fontFamily: fonts.semiBold },
  quoteText: { color: colors.codeText, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
});
