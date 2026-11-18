import React, { useState } from 'react';
import { Linking, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Grid } from '../components/Grid';
import { useLayout } from '../hooks/useLayout';
import { Text } from '../components/Text';
import { Button, Card, EmptyState, LinkButton, Notice, Pill, SectionTitle } from '../components/ui';
import { HeaderWithLeave } from '../components/LeaveQuickly';
import { countryLabel } from '../lib/countries';
import { categoryLabel, allSections, helpSections, localizedHotline, type Hotline } from '../lib/hotlines';
import { useRuntimeConfig } from '../lib/runtimeConfig';
import { callNumber } from '../lib/warn';
import type { RootScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const HotlineCard: React.FC<{ h: Hotline; style?: StyleProp<ViewStyle> }> = ({ h, style }) => {
  const { t, i18n } = useTranslation('help');
  const copy = localizedHotline(h, i18n.language);
  return (
    <Card testID={`hotline-${h.id}`} style={[{ gap: 8 }, style]}>
      <View style={styles.rowBetween}>
        <Text style={styles.name}>{copy.name}</Text>
      </View>
      <Pill label={categoryLabel(h.category)} background={colors.accentSoft} color={colors.textPrimary} />
      {h.number ? <Text style={styles.number}>{h.number}</Text> : null}
      {h.domesticOnly ? <Text style={styles.meta}>{t('dialInside', { country: countryLabel(h.country) })}</Text> : null}
      {copy.hours ? <Text style={styles.meta}>{copy.hours}</Text> : null}
      {copy.notes ? <Text style={styles.meta}>{copy.notes}</Text> : null}
      {h.dial ? <Button testID={`call-${h.id}`} label={t('callNumber', { number: h.number ?? h.dial })} onPress={() => callNumber(h.dial ?? '')} /> : null}
      {h.reportUrl ? (
        <Button label={t('openSite')} variant={h.dial ? 'secondary' : 'primary'} onPress={() => Linking.openURL(h.reportUrl ?? '').catch(() => undefined)} />
      ) : null}
      <LinkButton label={t('source')} onPress={() => Linking.openURL(h.sourceUrl).catch(() => undefined)} />
    </Card>
  );
};

export const GetHelpScreen: React.FC<RootScreenProps<'GetHelp'>> = ({ navigation }) => {
  const { t } = useTranslation('help');
  const { profile } = useAppState();
  const layout = useLayout();
  useRuntimeConfig();
  const [showAll, setShowAll] = useState(false);
  const mine = helpSections(profile.destinationCountry, profile.homeCountry);
  const chosen = Boolean(profile.destinationCountry || profile.homeCountry);
  const noneListed = chosen && mine.every(section => section.entries.length === 0);
  const sections = showAll ? allSections() : chosen && !noneListed ? mine : [];

  return (
    <Screen wide header={<HeaderWithLeave title={t('title')} onBack={() => navigation.goBack()} />}>
      <Text style={styles.body}>{t('intro')}</Text>

      <Button testID="help-report-scam" label={t('reportScam')} variant="secondary" icon="flag" onPress={() => navigation.navigate('ReportScam')} />

      {!showAll && !chosen ? (
        <EmptyState
          testID="help-no-countries"
          title={t('pick.title')}
          body={t('pick.body')}
          actionLabel={t('pick.action')}
          onAction={() => navigation.navigate('Settings')}
        />
      ) : null}

      {!showAll && noneListed ? (
        <EmptyState
          testID="help-none-listed"
          title={t('noneListed.title')}
          body={t('noneListed.body')}
          actionLabel={t('pick.action')}
          onAction={() => navigation.navigate('Settings')}
        />
      ) : null}

      {sections.map(section => (
        <View key={section.country} style={{ gap: 8 }}>
          <SectionTitle>
            {section.country === profile.destinationCountry
              ? t('whereWork', { country: countryLabel(section.country) })
              : section.country === profile.homeCountry
                ? t('yourCountry', { country: countryLabel(section.country) })
                : countryLabel(section.country)}
          </SectionTitle>
          {section.entries.length === 0 ? (
            <Notice
              tone="info"
              message={t('unverified', { country: countryLabel(section.country) })}
            />
          ) : null}
          <Grid columns={Math.min(layout.columns, 2)} gap={16}>
            {section.entries.map(h => (
              <HotlineCard key={h.id} h={h} />
            ))}
          </Grid>
        </View>
      ))}

      <Button
        testID="help-toggle-all"
        label={showAll ? (chosen ? t('showMine') : t('hideAll')) : t('showAll')}
        variant="secondary"
        onPress={() => setShowAll(!showAll)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.bold },
  number: { color: colors.textPrimary, fontSize: 22, lineHeight: 28, fontFamily: fonts.mono },
  meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
});

export default GetHelpScreen;
