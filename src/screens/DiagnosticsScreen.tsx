import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button, Card, Chip, LinkButton, ScreenHeader } from '../components/ui';
import { clearLog, readLog, subscribeLog, type DiagEntry, type DiagLevel } from '../lib/diagLog';
import { buildDiagnosticsReport, formatDetails, formatStamp } from '../lib/diagReport';
import { confirmAction, notify, shareText } from '../lib/notify';
import type { RootScreenProps } from '../navigation/types';
import theme from '../theme/theme';

const { colors, fonts } = theme;

type Filter = 'all' | 'errors';

const LEVEL_LOOK: Record<DiagLevel, { icon: IconName; color: string; background: string; border: string }> = {
  error: { icon: 'octagon', color: colors.danger, background: colors.dangerSoftBg, border: colors.dangerBarTrack },
  warn: { icon: 'alert', color: colors.warningText, background: colors.amberLight, border: colors.amberBadge },
  info: { icon: 'info', color: colors.textMuted, background: colors.cardBackground, border: colors.border },
};

export function useDiagEntries(): DiagEntry[] {
  const [entries, setEntries] = useState<DiagEntry[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => readLog().then(list => live && setEntries(list.slice().reverse()));
    void load();
    const off = subscribeLog(() => void load());
    return () => {
      live = false;
      off();
    };
  }, []);
  return entries;
}

export const DiagnosticsScreen: React.FC<RootScreenProps<'Diagnostics'>> = ({ navigation }) => {
  const { t, i18n } = useTranslation('settings');
  const entries = useDiagEntries();
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);
  const shown = filter === 'errors' ? entries.filter(e => e.level === 'error') : entries;
  const levelLabel: Record<DiagLevel, string> = { error: t('diagnostics.levelError'), warn: t('diagnostics.levelWarn'), info: t('diagnostics.levelInfo') };

  const withReport = useCallback(
    async (use: (report: string) => Promise<void>) => {
      setBusy(true);
      try {
        await use(await buildDiagnosticsReport(i18n.language));
      } finally {
        setBusy(false);
      }
    },
    [i18n.language],
  );

  const onCopy = () =>
    withReport(async report => {
      await Clipboard.setStringAsync(report);
      notify(t('diagnostics.copy'), t('diagnostics.copied'));
    });
  const onShare = () => withReport(report => shareText(report));
  const onClear = async () => {
    if (await confirmAction(t('diagnostics.clearTitle'), t('diagnostics.clearMessage'), t('diagnostics.clearAction'))) await clearLog();
  };

  return (
    <Screen header={<ScreenHeader title={t('diagnostics.title')} onBack={() => navigation.goBack()} />}>
      <View style={styles.privacy} testID="diagnostics-privacy">
        <Icon name="info" size={18} color={colors.textSecondary} />
        <Text style={[styles.body, styles.flex]}>{t('diagnostics.privacy')}</Text>
      </View>

      <View style={styles.wrap}>
        <Chip testID="diagnostics-filter-all" label={t('diagnostics.all')} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip testID="diagnostics-filter-errors" label={t('diagnostics.errors')} selected={filter === 'errors'} onPress={() => setFilter('errors')} />
      </View>

      <View style={{ gap: 8 }}>
        <Button testID="diagnostics-copy" label={t('diagnostics.copy')} variant="secondary" onPress={onCopy} disabled={busy} />
        <Button testID="diagnostics-share" label={t('diagnostics.share')} variant="secondary" onPress={onShare} disabled={busy} />
        <LinkButton testID="diagnostics-clear" label={t('diagnostics.clear')} color={colors.danger} onPress={onClear} />
      </View>

      {shown.length === 0 ? (
        <Card testID="diagnostics-empty">
          <Text style={styles.body}>{filter === 'errors' ? t('diagnostics.emptyErrors') : t('diagnostics.empty')}</Text>
        </Card>
      ) : (
        <View style={{ gap: 8 }} testID="diagnostics-list">
          {shown.map((e, i) => {
            const look = LEVEL_LOOK[e.level] ?? LEVEL_LOOK.info;
            const details = formatDetails(e.d);
            return (
              <View
                key={`${e.t}-${i}`}
                testID={`diagnostics-row-${e.level}`}
                accessible
                accessibilityLabel={`${levelLabel[e.level] ?? ''}, ${e.area}, ${e.event}`}
                style={[styles.row, { backgroundColor: look.background, borderColor: look.border }]}
              >
                <View style={styles.icon}>
                  <Icon name={look.icon} size={18} color={look.color} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.meta}>{`${formatStamp(e.t)} · ${e.area}`}</Text>
                  <Text style={[styles.event, e.level === 'error' && { color: colors.danger }]}>{e.event}</Text>
                  {details ? <Text style={styles.details}>{details}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  privacy: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  row: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  icon: { paddingTop: 2 },
  meta: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontFamily: fonts.regular },
  event: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontFamily: fonts.bold },
  details: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, fontFamily: fonts.regular },
});

export default DiagnosticsScreen;
