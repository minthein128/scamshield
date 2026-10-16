import React from 'react';
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NoticeCard } from '../components/NoticeCard';
import { BrandLockup } from '../components/BrandMark';
import { Icon, type IconName } from '../components/Icon';
import { Text } from '../components/Text';
import { Screen } from '../components/Screen';
import { Grid } from '../components/Grid';
import { useLayout } from '../hooks/useLayout';
import { ShieldCard } from '../components/ShieldCard';
import { Button, Card, EmptyState, Pill, SectionTitle } from '../components/ui';
import type { TabScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { VERDICT_STYLES } from '../lib/report';
import { entryLabel, verdictLabel } from '../lib/labels';
import { formatRelative } from '../lib/time';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const HomeScreen: React.FC<TabScreenProps<'Home'>> = ({ navigation }) => {
  const { t } = useTranslation('home');
  const { history, profile } = useAppState();
  const layout = useLayout();
  const startCheck = (intent: 'link' | 'image' | 'text') => navigation.navigate('Check', { intent, nonce: Date.now() });

  const checkCard = (style?: StyleProp<ViewStyle>) => (
      <Card style={[{ gap: 16 }, style]}>
        <View style={{ gap: 4 }}>
          <Text style={styles.cardTitle}>{t('check.title')}</Text>
          <Text style={styles.cardBody}>{t('check.body')}</Text>
        </View>
        <View style={styles.quickRow}>
          <QuickAction label={t('quick.link')} icon="link" onPress={() => startCheck('link')} />
          <QuickAction label={t('quick.image')} icon="image" onPress={() => startCheck('image')} />
          <QuickAction label={t('quick.chat')} icon="chat" onPress={() => startCheck('text')} />
        </View>
        <Button label={t('check.start')} onPress={() => navigation.navigate('Check')} testID="home-check-button" />
      </Card>
  );

  return (
    <Screen
      wide
      header={
        <View style={styles.brandRow}>
          <View style={{ flex: 1 }}>
            <BrandLockup header />
          </View>
          <TouchableOpacity testID="open-settings" accessibilityRole="button" accessibilityLabel={t('settingsA11y')} activeOpacity={0.7} onPress={() => navigation.navigate('Settings')} style={styles.iconButton}>
            <Icon name="settings" size={24} />
          </TouchableOpacity>
        </View>
      }
    >
      <NoticeCard />

      {layout.isExpanded ? (
        <View style={styles.pair}>
          <ShieldCard style={styles.pairItem} onDetails={() => navigation.navigate('Shield')} />
          {checkCard(styles.pairItem)}
        </View>
      ) : (
        <>
          <ShieldCard onDetails={() => navigation.navigate('Shield')} />
          {checkCard()}
        </>
      )}

      <View style={{ gap: 8 }}>
        <SectionTitle>{t('recent.title')}</SectionTitle>
        {history.length === 0 ? (
          <EmptyState testID="recent-empty" title={t('recent.emptyTitle')} body={t('recent.emptyBody')} />
        ) : (
          <Grid columns={Math.min(layout.columns, 2)} gap={layout.isTablet ? 12 : 8}>
            {history.slice(0, layout.isTablet ? 6 : 5).map(entry => {
            const v = VERDICT_STYLES[entry.result.verdict];
            return (
              <TouchableOpacity
                key={entry.id}
                testID="recent-check"
                accessibilityRole="button"
                accessibilityLabel={`${verdictLabel(entry.result.verdict)}: ${entryLabel(entry.result, entry.source)}`}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Report', { result: entry.result, language: entry.language })}
                style={styles.recent}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={1} style={styles.recentTitle}>{entryLabel(entry.result, entry.source)}</Text>
                  <Text style={styles.recentMeta}>{formatRelative(entry.createdAt)}</Text>
                </View>
                <Pill label={verdictLabel(entry.result.verdict)} background={v.chipBackground} color={v.chipForeground} />
              </TouchableOpacity>
            );
            })}
          </Grid>
        )}
      </View>

      <Grid columns={Math.min(layout.columns, 2)} gap={layout.isTablet ? 12 : 16}>
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

      <TouchableOpacity
        testID="home-get-help"
        accessibilityRole="button"
        accessibilityLabel={t('help.a11y')}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('GetHelp')}
        style={styles.help}
      >
        <View style={[styles.rowIcon, { backgroundColor: colors.white }]}>
          <Icon name="phone" size={24} color={colors.danger} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.helpTitle}>{t('help.title')}</Text>
          <Text style={styles.helpBody}>
            {profile.destinationCountry || profile.homeCountry ? t('help.bodyCountries') : t('help.bodyRegion')}
          </Text>
        </View>
        <Icon name="chevron" size={22} color={colors.dangerDark} />
      </TouchableOpacity>
      </Grid>
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
  help: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.dangerSoftBg, borderWidth: 1, borderColor: colors.dangerBarTrack },
  helpTitle: { color: colors.dangerSoftText, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  helpBody: { color: colors.dangerDark, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  pair: { flexDirection: 'row', gap: 16, alignItems: 'stretch' },
  pairItem: { flex: 1, flexBasis: 0, minWidth: 0 },
  rowIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandGoldSoft, alignItems: 'center', justifyContent: 'center' },
});

export default HomeScreen;
