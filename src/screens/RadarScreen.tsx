import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { errorCopy, getApiClient } from '../api';
import type { Insights } from '../api/types';
import { Screen } from '../components/Screen';
import { Card, Chip, EmptyState, Notice, ScreenHeader, SectionTitle } from '../components/ui';
import { COUNTRIES } from '../lib/countries';
import { TREND_LABEL, TREND_SYMBOL, defaultScope, reportCountText, type RadarScope } from '../lib/radar';
import type { RootScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const RadarScreen: React.FC<RootScreenProps<'Radar'>> = ({ navigation }) => {
  const { profile } = useAppState();
  const [scope, setScope] = useState<RadarScope>(defaultScope(profile.destinationCountry, profile.homeCountry));
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (target: RadarScope) => {
    setLoading(true);
    setError(null);
    try {
      setData(await getApiClient().insights(target));
    } catch (e) {
      setData(null);
      setError(errorCopy(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(scope).catch(() => undefined);
  }, [scope, load]);

  const risks = data?.risks ?? [];
  const domains = data?.domains ?? [];

  return (
    <Screen>
      <ScreenHeader title="Scam radar" onBack={() => navigation.goBack()} />
      <Text style={styles.body}>What other SafeRoute users reported in the last 30 days. Only patterns seen at least {data?.k ?? 3} times are shown.</Text>

      <View style={styles.wrap}>
        <Chip label="Global" selected={scope === 'GLOBAL'} onPress={() => setScope('GLOBAL')} />
        {COUNTRIES.map(c => (
          <Chip key={c.code} label={c.name} selected={scope === c.code} onPress={() => setScope(c.code)} />
        ))}
      </View>

      {loading ? <ActivityIndicator testID="radar-loading" color={colors.accent} style={{ marginVertical: 24 }} /> : null}

      {error ? <Notice testID="radar-error" title={error.title} message={error.message} actionLabel="Try again" onAction={() => load(scope)} /> : null}

      {!loading && !error && risks.length === 0 && domains.length === 0 ? (
        <EmptyState testID="radar-empty" title="Not enough reports yet" body="When enough people report the same kind of scam here, it shows up on the radar. Your checks help, and nothing personal is shared." />
      ) : null}

      {risks.map(r => (
        <Card key={r.scamType} testID={`radar-risk-${r.scamType}`} style={{ gap: 6 }}>
          <View style={styles.row}>
            <Text style={styles.label}>{r.label}</Text>
            <Text accessibilityLabel={TREND_LABEL[r.trend]} style={[styles.trend, r.trend === 'up' && { color: colors.danger }]}>{TREND_SYMBOL[r.trend]}</Text>
          </View>
          <Text style={styles.count}>{reportCountText(r.count, data?.days)}</Text>
          {r.example ? <Text style={styles.quote}>{`“${r.example}”`}</Text> : null}
        </Card>
      ))}

      {domains.length > 0 ? (
        <View style={{ gap: 8 }}>
          <SectionTitle>Top scam domains</SectionTitle>
          <Card style={{ gap: 10 }}>
            {domains.map(d => (
              <View key={d.domain} style={styles.row}>
                <Text style={styles.domain}>{d.domain}</Text>
                <Text style={styles.count}>{d.count}</Text>
                <Text accessibilityLabel={TREND_LABEL[d.trend]} style={[styles.trend, d.trend === 'up' && { color: colors.danger }]}>{TREND_SYMBOL[d.trend]}</Text>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { flex: 1, color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.bold },
  trend: { color: colors.textMuted, fontSize: 14, minWidth: 18, textAlign: 'center' },
  count: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, fontFamily: fonts.medium },
  quote: { color: colors.textMuted, fontSize: 12, lineHeight: 18, fontFamily: fonts.regular, fontStyle: 'italic' },
  domain: { flex: 1, color: colors.codeText, fontSize: 13, fontFamily: fonts.mono },
});

export default RadarScreen;
