import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Card, EmptyState, LinkButton, Notice, Pill, ScreenHeader, SectionTitle } from '../components/ui';
import { countryName } from '../lib/countries';
import { CATEGORY_LABELS, allSections, helpSections, type Hotline } from '../lib/hotlines';
import { callNumber } from '../lib/warn';
import type { RootScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const HotlineCard: React.FC<{ h: Hotline }> = ({ h }) => (
  <Card testID={`hotline-${h.id}`} style={{ gap: 8 }}>
    <View style={styles.rowBetween}>
      <Text style={styles.name}>{h.name}</Text>
    </View>
    <Pill label={CATEGORY_LABELS[h.category]} background={colors.brandBlueLight} color={colors.safeText} />
    {h.number ? <Text style={styles.number}>{h.number}</Text> : null}
    {h.domesticOnly ? <Text style={styles.meta}>{`Dial from inside ${countryName(h.country)}.`}</Text> : null}
    {h.hours ? <Text style={styles.meta}>{h.hours}</Text> : null}
    {h.notes ? <Text style={styles.meta}>{h.notes}</Text> : null}
    {h.dial ? <Button testID={`call-${h.id}`} label={`Call ${h.number ?? h.dial}`} onPress={() => callNumber(h.dial ?? '')} /> : null}
    {h.reportUrl ? (
      <Button label="Open reporting site" variant={h.dial ? 'secondary' : 'primary'} onPress={() => Linking.openURL(h.reportUrl ?? '').catch(() => undefined)} />
    ) : null}
    <LinkButton label="Official source" onPress={() => Linking.openURL(h.sourceUrl).catch(() => undefined)} />
  </Card>
);

export const GetHelpScreen: React.FC<RootScreenProps<'GetHelp'>> = ({ navigation }) => {
  const { profile } = useAppState();
  const [showAll, setShowAll] = useState(false);
  const mine = helpSections(profile.destinationCountry, profile.homeCountry);
  const chosen = Boolean(profile.destinationCountry || profile.homeCountry);
  const sections = showAll || mine.length === 0 ? allSections() : mine;

  return (
    <Screen>
      <ScreenHeader title="Get help" onBack={() => navigation.goBack()} />
      <Text style={styles.body}>
        Official hotlines and reporting lines. If someone is holding your passport, stopping you from leaving, or you feel in danger, call now.
      </Text>

      {!chosen ? (
        <EmptyState
          testID="help-no-countries"
          title="Pick your countries"
          body="Choose where you are from and where you will work, and we show those hotlines first."
          actionLabel="Choose countries"
          onAction={() => navigation.navigate('Settings')}
        />
      ) : null}

      {sections.length === 0 ? (
        <EmptyState title="No hotlines to show" body="We could not load hotline details. Try again later." />
      ) : (
        sections.map(section => (
          <View key={section.country} style={{ gap: 8 }}>
            <SectionTitle>
              {`${countryName(section.country)}${section.country === profile.destinationCountry ? ' (where you will work)' : section.country === profile.homeCountry ? ' (your country)' : ''}`}
            </SectionTitle>
            {section.entries.length === 0 ? (
              <Notice
                tone="info"
                message={`We have not verified an official hotline for ${countryName(section.country)} yet. Contact your nearest embassy or the police, or use the lines for the country you are in.`}
              />
            ) : null}
            {section.entries.map(h => (
              <HotlineCard key={h.id} h={h} />
            ))}
          </View>
        ))
      )}

      {chosen && mine.length > 0 ? (
        <Button testID="help-toggle-all" label={showAll ? 'Show only my countries' : 'Show all countries'} variant="secondary" onPress={() => setShowAll(!showAll)} />
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
