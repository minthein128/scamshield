import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { dismissNotice, loadDismissed, pickNotice } from '../lib/notices';
import { runtimeNotices, useRuntimeConfig } from '../lib/runtimeConfig';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';
import { Icon } from './Icon';
import { Text } from './Text';
import { LinkButton } from './ui';

const { colors, fonts } = theme;

/** Shows one published notice from the admin console. Renders nothing when there is none. */
export const NoticeCard: React.FC = () => {
  const { t, i18n } = useTranslation('home');
  const { profile } = useAppState();
  useRuntimeConfig();
  const [dismissed, setDismissed] = useState<string[] | null>(null);
  useEffect(() => {
    loadDismissed().then(setDismissed);
  }, []);
  if (dismissed === null) return null;
  const notice = pickNotice(runtimeNotices(), { countries: [profile.homeCountry, profile.destinationCountry], language: i18n.language }, dismissed);
  if (!notice) return null;
  const warning = notice.severity === 'warning';
  return (
    <View testID="notice-card" accessibilityRole="alert" style={[styles.card, warning ? styles.warning : styles.info]}>
      <View style={styles.row}>
        <Icon name={warning ? 'alert' : 'info'} size={22} color={warning ? colors.warningText : colors.accent} />
        <View style={styles.text}>
          <Text style={styles.title}>{notice.title}</Text>
          <Text style={styles.body}>{notice.body}</Text>
        </View>
      </View>
      <LinkButton testID="notice-dismiss" label={t('notice.dismiss')} onPress={() => dismissNotice(notice.id).then(setDismissed)} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { gap: 8, padding: 16, borderRadius: 16, borderWidth: 1 },
  warning: { backgroundColor: colors.amberLight, borderColor: colors.amberBadge },
  info: { backgroundColor: colors.brandBlueLight, borderColor: colors.border },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  text: { flex: 1, gap: 2 },
  title: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
});
