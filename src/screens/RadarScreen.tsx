import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { errorCopy, getApiClient } from '../api';
import type { Insights } from '../api/types';
import { Screen } from '../components/Screen';
import { Grid } from '../components/Grid';
import { useLayout } from '../hooks/useLayout';
import { Text } from '../components/Text';
import { Card, Chip, EmptyState, Notice, ScreenHeader, SectionTitle } from '../components/ui';
import { COUNTRIES, countryLabel } from '../lib/countries';
import { TREND_SYMBOL, trendLabel, defaultScope, reportCountText, type RadarScope } from '../lib/radar';
import type { RootScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const RadarScreen: React.FC<RootScreenProps<'Radar'>> = ({ navigation }) => {
  const { t } = useTranslation(['radar', 'common']);
  const { profile } = useAppState();
  const layout = useLayout();
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
    <Screen wide header={<ScreenHeader title={t('title')} onBack={() => navigation.goBack()} />}>
      <Text style={styles.body}>{t('intro', { count: data?.k ?? 3 })}</Text>

      <View style={styles.wrap}>
        <Chip label={t('global')} selected={scope === 'GLOBAL'} onPress={() => setScope('GLOBAL')} />
        {COUNTRIES.map(c => (
          <Chip key={c.code} label={countryLabel(c.code)} selected={scope === c.code} onPress={() => setScope(c.code)} />
        ))}
      </View>

      {loading ? <ActivityIndicator testID="radar-loading" color={colors.accent} style={{ marginVertical: 24 }} /> : null}

      {error ? <Notice testID="radar-error" title={error.title} message={error.message} actionLabel={t('common:actions.tryAgain')} onAction={() => load(scope)} /> : null}

      {!loading && !error && risks.length === 0 && domains.length === 0 ? (
        <EmptyState icon="radar" testID="radar-empty" title={t('empty.title')} body={t('empty.body')} />
      ) : null}

      <Grid columns={Math.min(layout.columns, 2)} gap={16}>
      {risks.map(r => (
        <Card key={r.scamType} testID={`radar-risk-${r.scamType}`} style={{ gap: 6 }}>
          <View style={styles.row}>
            <Text style={styles.label}>{r.label}</Text>
            <Text accessibilityLabel={trendLabel(r.trend)} style={[styles.trend, r.trend === 'up' && { color: colors.danger }]}>{TREND_SYMBOL[r.trend]}</Text>
          </View>
          <Text style={styles.count}>{reportCountText(r.count, data?.days)}</Text>
          {r.example ? <Text style={styles.quote}>{`“${r.example}”`}</Text> : null}
        </Card>
      ))}
      </Grid>

      {domains.length > 0 ? (
        <View style={{ gap: 8 }}>
          <SectionTitle>{t('domains')}</SectionTitle>
          <Card style={{ gap: 10 }}>
            {domains.map(d => (
              <View key={d.domain} style={styles.row}>
                <Text style={styles.domain}>{d.domain}</Text>
                <Text style={styles.count}>{d.count}</Text>
                <Text accessibilityLabel={trendLabel(d.trend)} style={[styles.trend, d.trend === 'up' && { color: colors.danger }]}>{TREND_SYMBOL[d.trend]}</Text>
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
  count: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium },
  quote: { color: colors.textMuted, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, fontStyle: 'italic' },
  domain: { flex: 1, color: colors.codeText, fontSize: 13, fontFamily: fonts.mono },
});

export default RadarScreen;
