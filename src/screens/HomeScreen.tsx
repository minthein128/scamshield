import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NoticeCard } from '../components/NoticeCard';
import { BrandLockup } from '../components/BrandMark';
import { Icon, type IconName } from '../components/Icon';
import { Text } from '../components/Text';
import { Screen } from '../components/Screen';
import { Grid } from '../components/Grid';
import { useLayout } from '../hooks/useLayout';
import { BigShieldButton } from '../components/BigShieldButton';
import { Button, Card, EmptyState, SectionTitle } from '../components/ui';
import type { TabScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { VERDICT_STYLES } from '../lib/report';
import { entryLabel } from '../lib/labels';
import { resultWord } from '../lib/attention';
import { formatRelative } from '../lib/time';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const RECENT_SHOWN = 6;

const VERDICT_GLYPH = { safe: 'checkCircle', careful: 'alert', danger: 'octagon' } as const;

export const HomeScreen: React.FC<TabScreenProps<'Home'>> = ({ navigation }) => {
  const { t } = useTranslation('home');
  const { history, profile } = useAppState();
  const layout = useLayout();
  const iconOnlyHelp = layout.width < 380;
  const [showAll, setShowAll] = useState(false);
  const startCheck = (intent: 'link' | 'image' | 'text') => navigation.navigate('Check', { intent, nonce: Date.now() });

  const checkCard = (style?: StyleProp<ViewStyle>) => (
    <Card style={[{ gap: 12 }, style]}>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={styles.cardTitle}>{t('check.title')}</Text>
        <Text style={styles.cardBody}>{t('check.body')}</Text>
      </View>
      <Button label={t('check.start')} onPress={() => navigation.navigate('Check')} testID="home-check-button" />
      <Text style={styles.cardBody}>{t('quick.lead')}</Text>
      <View style={styles.quickRow}>
        <QuickAction label={t('quick.link')} icon="link" onPress={() => startCheck('link')} />
        <QuickAction label={t('quick.image')} icon="image" onPress={() => startCheck('image')} />
        <QuickAction label={t('quick.message')} icon="chat" onPress={() => startCheck('text')} />
      </View>
    </Card>
  );

  return (
    <Screen
      wide
      header={
        <View style={styles.brandRow}>
          <View style={styles.brandSlot}>
            <BrandLockup header />
          </View>
          <TouchableOpacity testID="home-get-help" accessibilityRole="button" accessibilityLabel={t('help.a11y')} activeOpacity={0.7} onPress={() => navigation.navigate('GetHelp')} style={[styles.helpButton, iconOnlyHelp && styles.helpButtonIcon]}>
            <Icon name="phone" size={20} color={colors.textPrimary} />
            {iconOnlyHelp ? null : <Text style={styles.helpButtonText} numberOfLines={1}>{t('help.title')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity testID="open-settings" accessibilityRole="button" accessibilityLabel={t('settingsA11y')} activeOpacity={0.7} onPress={() => navigation.navigate('Settings')} style={styles.iconButton}>
            <Icon name="settings" size={24} />
          </TouchableOpacity>
        </View>
      }
    >
      <NoticeCard />

      <BigShieldButton />

      {checkCard()}

      <TouchableOpacity testID="home-radar" accessibilityRole="button" accessibilityLabel={t('radar.a11y')} activeOpacity={0.7} onPress={() => navigation.navigate('Radar')} style={styles.radar}>
        <View style={styles.rowIcon}>
          <Icon name="radar" size={24} color={colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.radarTitle}>{t('radar.title')}</Text>
          <Text style={styles.radarBody}>{t('radar.body')}</Text>
        </View>
        <Icon name="chevron" size={22} color={colors.textMuted} />
      </TouchableOpacity>

      <View style={{ gap: 8 }}>
        <SectionTitle>{t('recent.title')}</SectionTitle>
        {history.length === 0 ? (
          <EmptyState testID="recent-empty" title={t('recent.emptyTitle')} body={profile.keepHistory ? t('recent.emptyBody') : t('recent.historyOff')} />
        ) : (
          <Grid columns={Math.min(layout.columns, 2)} gap={layout.isTablet ? 12 : 8}>
            {history.slice(0, showAll ? undefined : RECENT_SHOWN).map(entry => {
            const v = VERDICT_STYLES[entry.result.verdict];
            return (
              <TouchableOpacity
                key={entry.id}
                testID="recent-check"
                accessibilityRole="button"
                accessibilityLabel={`${resultWord(entry.result)}: ${entryLabel(entry.result, entry.source)}`}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Report', { result: entry.result, language: entry.language })}
                style={styles.recent}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={1} style={styles.recentTitle}>{entryLabel(entry.result, entry.source)}</Text>
                  <Text style={styles.recentMeta}>{formatRelative(entry.createdAt)}</Text>
                </View>
                <View style={[styles.verdict, { backgroundColor: v.chipBackground }]}>
                  <Icon name={VERDICT_GLYPH[entry.result.verdict]} size={16} color={v.chipForeground} />
                  <Text style={[styles.verdictText, { color: v.chipForeground }]}>{resultWord(entry.result)}</Text>
                </View>
              </TouchableOpacity>
            );
            })}
          </Grid>
        )}
        {history.length > RECENT_SHOWN && !showAll ? (
          <TouchableOpacity testID="recent-older" accessibilityRole="button" accessibilityLabel={t('recent.older')} activeOpacity={0.7} onPress={() => setShowAll(true)} style={styles.older}>
            <Text style={styles.olderText}>{t('recent.older')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

    </Screen>
  );
};

const QuickAction: React.FC<{ label: string; icon: IconName; onPress: () => void }> = ({ label, icon, onPress }) => (
  <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} activeOpacity={0.7} onPress={onPress} style={styles.quick}>
    <Icon name={icon} size={24} color={colors.accent} />
    <Text style={styles.quickText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  brandSlot: { flexGrow: 1, flexShrink: 0, flexBasis: 'auto', alignItems: 'flex-start' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  iconButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.textPrimary, fontSize: 18, lineHeight: 24, fontFamily: fonts.bold, includeFontPadding: false },
  cardBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, includeFontPadding: false },
  quickRow: { flexDirection: 'row', gap: 8 },
  quick: { flex: 1, paddingHorizontal: 4, minHeight: 72, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 4 },
  quickText: { textAlign: 'center', color: colors.textPrimary, fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold, includeFontPadding: false },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  recentTitle: { color: colors.textPrimary, fontSize: 15, lineHeight: 22, fontFamily: fonts.semiBold, includeFontPadding: false },
  recentMeta: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, includeFontPadding: false },
  radar: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  radarTitle: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  radarBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  helpButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: colors.borderDark, backgroundColor: colors.white },
  helpButtonIcon: { width: 48, height: 48, minHeight: 48, paddingHorizontal: 0, borderRadius: 24, justifyContent: 'center' },
  helpButtonText: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontFamily: fonts.bold, includeFontPadding: false },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  verdictText: { fontSize: 13, lineHeight: 18, fontFamily: fonts.bold, includeFontPadding: false },
  older: { minHeight: 48, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  olderText: { color: colors.textPrimary, fontSize: 15, lineHeight: 22, fontFamily: fonts.bold, textDecorationLine: 'underline' },
  rowIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandGoldSoft, alignItems: 'center', justifyContent: 'center' },
});

export default HomeScreen;
