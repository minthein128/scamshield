import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, PermissionsAndroid, Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { Button, Card } from './ui';
import theme from '../theme/theme';

const { colors, fonts } = theme;

type MicState = 'unknown' | 'granted' | 'ask' | 'blocked';

/** Optional microphone step for the voice companion on the shield bubble. */
export const VoiceCompanionCard: React.FC = () => {
  const { t } = useTranslation('live');
  const [mic, setMic] = useState<MicState>('unknown');

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    setMic((await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)) ? 'granted' : 'ask');
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refresh().catch(() => undefined);
    });
    return () => sub.remove();
  }, [refresh]);

  const allow = async () => {
    if (mic === 'blocked') {
      await Linking.openSettings().catch(() => undefined);
      return;
    }
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO).catch(() => null);
    if (r === PermissionsAndroid.RESULTS.GRANTED) setMic('granted');
    else if (r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) setMic('blocked');
  };

  if (Platform.OS !== 'android' || mic === 'unknown') return null;
  return (
    <Card style={{ gap: 8 }} testID="voice-companion-card">
      <Text style={styles.title}>{t('companion.permissionTitle')}</Text>
      <Text style={styles.body}>{t('companion.permissionBody')}</Text>
      {mic === 'granted' ? (
        <Text style={styles.body}>{t('companion.micOn')}</Text>
      ) : (
        <>
          {mic === 'blocked' ? <Text style={styles.body}>{t('companion.micBlocked')}</Text> : null}
          <Button testID="voice-companion-allow" label={t('companion.allowMic')} variant="secondary" onPress={allow} />
        </>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.regular },
});

export default VoiceCompanionCard;
