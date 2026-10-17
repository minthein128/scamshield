import React, { useEffect, useRef, useState } from 'react';
import { Linking, Modal, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { Button } from './ui';
import { registerPermissionHost, type HelpKind, type PermissionKind } from '../lib/permissions';
import theme from '../theme/theme';

const { colors, fonts } = theme;

type Active = { mode: 'explain'; kind: PermissionKind } | { mode: 'help'; kind: HelpKind } | null;

/** Short reason shown before a system permission dialog, and how-to-enable help after a refusal. */
export const PermissionHost: React.FC = () => {
  const { t } = useTranslation('permissions');
  const [active, setActive] = useState<Active>(null);
  const pending = useRef<((ok: boolean) => void) | null>(null);

  useEffect(
    () =>
      registerPermissionHost({
        explain: kind =>
          new Promise<boolean>(resolve => {
            pending.current?.(false);
            pending.current = resolve;
            setActive({ mode: 'explain', kind });
          }),
        help: kind => {
          pending.current?.(false);
          pending.current = null;
          setActive({ mode: 'help', kind });
        },
      }),
    [],
  );

  const settle = (ok: boolean) => {
    const done = pending.current;
    pending.current = null;
    setActive(null);
    done?.(ok);
  };

  const openSettings = () => {
    setActive(null);
    Linking.openSettings().catch(() => undefined);
  };

  const explain = active?.mode === 'explain';
  const showSettings = active?.mode === 'help';
  const body = active ? (explain ? `explain.${active.kind}` : `help.${active.kind}`) : '';

  return (
    <Modal visible={active !== null} transparent animationType="fade" onRequestClose={() => settle(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card} testID="permission-dialog" accessibilityViewIsModal>
          {active ? (
            <>
              <Text accessibilityRole="header" style={styles.title}>{t(`${body}.title` as 'explain.mic.title')}</Text>
              <Text style={styles.body}>{t(`${body}.body` as 'explain.mic.body')}</Text>
              <View style={styles.actions}>
                {explain ? (
                  <>
                    <Button testID="permission-continue" label={t('continue')} onPress={() => settle(true)} />
                    <Button testID="permission-not-now" label={t('notNow')} variant="secondary" onPress={() => settle(false)} />
                  </>
                ) : (
                  <>
                    {showSettings ? <Button testID="permission-open-settings" label={t('openSettings')} onPress={openSettings} /> : null}
                    <Button testID="permission-close" label={t('close')} variant="secondary" onPress={() => settle(false)} />
                  </>
                )}
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.background, borderRadius: 20, padding: 20, gap: 12 },
  title: { color: colors.textPrimary, fontSize: 19, lineHeight: 26, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular },
  actions: { gap: 10, marginTop: 4 },
});

export default PermissionHost;
