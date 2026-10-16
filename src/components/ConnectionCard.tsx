import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { apiHost, checkHealth, refreshApiUrl, useApiUrl } from '../config/runtime';
import theme from '../theme/theme';
import { Text } from './Text';
import { Button, Card } from './ui';

const { colors, fonts } = theme;

type Health = 'checking' | 'ok' | 'down';

export const ConnectionCard: React.FC<{ onOpenLog: () => void }> = ({ onOpenLog }) => {
  const { t } = useTranslation('settings');
  const url = useApiUrl();
  const [health, setHealth] = useState<Health>('checking');

  const probe = useCallback(async (target: string | null) => {
    if (!target) return setHealth('down');
    setHealth('checking');
    setHealth((await checkHealth(target)) ? 'ok' : 'down');
  }, []);

  useEffect(() => {
    if (url !== null) void probe(url);
  }, [url, probe]);

  const recheck = async () => {
    setHealth('checking');
    await probe(await refreshApiUrl().catch(() => url));
  };

  const label = health === 'checking' ? t('connection.checking') : health === 'ok' ? t('connection.healthy') : t('connection.unhealthy');
  return (
    <Card style={{ gap: 8 }} testID="settings-connection">
      <Text style={styles.body}>{`${t('connection.host')}: ${url ? apiHost(url) : t('connection.none')}`}</Text>
      <View>
        <Text testID="settings-connection-status" style={[styles.strong, health === 'down' && { color: colors.danger }]}>{label}</Text>
      </View>
      <Button testID="settings-recheck" label={t('connection.recheck')} variant="secondary" onPress={recheck} disabled={health === 'checking'} />
      <Button testID="settings-open-log" label={t('connection.openLog')} variant="secondary" onPress={onOpenLog} />
    </Card>
  );
};

const styles = StyleSheet.create({
  strong: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
});
