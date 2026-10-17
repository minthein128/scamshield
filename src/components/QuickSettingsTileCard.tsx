import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ShieldModule from 'shield-module';
import type { AddTileResult, QuickSettingsTileSupport } from 'shield-module';
import { diag } from '../lib/diagLog';
import { Text } from './Text';
import { Button, Card } from './ui';
import theme from '../theme/theme';

const { colors, fonts } = theme;

/** Offers the "Kakwe shield" Quick Settings tile: a system prompt on Android 13+, a short how-to before that. */
export const QuickSettingsTileCard: React.FC = () => {
  const { t } = useTranslation(['shield', 'live']);
  const [support, setSupport] = useState<QuickSettingsTileSupport>('none');
  const [result, setResult] = useState<AddTileResult | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let live = true;
    ShieldModule.quickSettingsTileSupport()
      .then(s => live && setSupport(s))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const add = async () => {
    setAsking(true);
    const r = await ShieldModule.requestAddQuickSettingsTile(t('live:companion.a11yShield'));
    diag.info('shield', 'tile_request', { result: r });
    setResult(r);
    setAsking(false);
  };

  if (Platform.OS !== 'android' || support === 'none') return null;
  const inTiles = result === 'added' || result === 'already';
  const failed = result === 'error' || result === 'unsupported';
  return (
    <Card style={{ gap: 8 }} testID="quick-settings-tile-card">
      <Text style={styles.title}>{t('shield:tile.title')}</Text>
      <Text style={styles.body}>{t('shield:tile.body')}</Text>
      {support === 'manual' ? <Text style={styles.body}>{t('shield:tile.hint')}</Text> : null}
      {support === 'request' && !inTiles ? (
        <Button testID="quick-settings-tile-add" label={t('shield:tile.add')} variant="secondary" onPress={add} disabled={asking} />
      ) : null}
      {inTiles ? <Text style={styles.body}>{t('shield:tile.added')}</Text> : null}
      {failed ? <Text style={styles.body}>{t('shield:tile.failed')}</Text> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.regular },
});
