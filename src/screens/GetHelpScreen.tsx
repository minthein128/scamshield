import React, { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button, Card, EmptyState, LinkButton, Notice, Pill, ScreenHeader, SectionTitle } from '../components/ui';
import { countryLabel } from '../lib/countries';
import { categoryLabel, allSections, helpSections, type Hotline } from '../lib/hotlines';
import { callNumber } from '../lib/warn';
import type { RootScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const HotlineCard: React.FC<{ h: Hotline }> = ({ h }) => {
  const { t } = useTranslation('help');
  return (
    <Card testID={`hotline-${h.id}`} style={{ gap: 8 }}>
      <View style={styles.rowBetween}>
        <Text style={styles.name}>{h.name}</Text>
      </View>
      <Pill label={categoryLabel(h.category)} background={colors.brandBlueLight} color={colors.safeText} />
      {h.number ? <Text style={styles.number}>{h.number}</Text> : null}
      {h.domesticOnly ? <Text style={styles.meta}>{t('dialInside', { country: countryLabel(h.country) })}</Text> : null}
      {h.hours ? <Text style={styles.meta}>{h.hours}</Text> : null}
      {h.notes ? <Text style={styles.meta}>{h.notes}</Text> : null}
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
  const [showAll, setShowAll] = useState(false);
  const mine = helpSections(profile.destinationCountry, profile.homeCountry);
  const chosen = Boolean(profile.destinationCountry || profile.homeCountry);
  const sections = showAll || mine.length === 0 ? allSections() : mine;

  return (
    <Screen>
      <ScreenHeader title={t('title')} onBack={() => navigation.goBack()} />
      <Text style={styles.body}>{t('intro')}</Text>

      {!chosen ? (
        <EmptyState
          testID="help-no-countries"
          title={t('pick.title')}
          body={t('pick.body')}
          actionLabel={t('pick.action')}
          onAction={() => navigation.navigate('Settings')}
        />
      ) : null}

      {sections.length === 0 ? (
        <EmptyState title={t('none.title')} body={t('none.body')} />
      ) : (
        sections.map(section => (
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
            {section.entries.map(h => (
              <HotlineCard key={h.id} h={h} />
            ))}
          </View>
        ))
      )}

      {chosen && mine.length > 0 ? (
        <Button testID="help-toggle-all" label={showAll ? t('showMine') : t('showAll')} variant="secondary" onPress={() => setShowAll(!showAll)} />
      ) : null}
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
