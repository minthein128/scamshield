import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { MessageGuardApp } from 'shield-module';
import { Text } from './Text';
import { Button } from './ui';
import type { MessageGuardConsentRequest } from '../hooks/useMessageGuard';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const POINTS = ['reads', 'leaves', 'never', 'who', 'control', 'phone'] as const;

interface Props {
  request: MessageGuardConsentRequest | null;
  apps: MessageGuardApp[];
  onConfirm: (appIds: string[]) => void;
  onCancel: () => void;
}

/** Plain-language consent shown in the app before Android's notification access screen. */
export const MessageGuardConsent: React.FC<Props> = ({ request, apps, onConfirm, onCancel }) => {
  const { t } = useTranslation('shield');
  const [chosen, setChosen] = useState<string[]>([]);
  const adding = request?.mode === 'addApp' ? request.app : null;

  useEffect(() => {
    setChosen(adding ? [adding.id] : []);
  }, [request, adding]);

  const list = adding ? [adding] : apps;
  const toggle = (id: string) => setChosen(c => (c.includes(id) ? c.filter(x => x !== id) : [...c, id]));

  return (
    <Modal visible={request !== null} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} testID="message-guard-consent">
          <Text accessibilityRole="header" style={styles.title}>
            {adding ? t('messageGuard.consent.addTitle', { app: adding.label }) : t('messageGuard.consent.title')}
          </Text>
          {adding ? <Text style={styles.body}>{t('messageGuard.consent.addBody', { app: adding.label })}</Text> : null}
          {POINTS.map(p => (
            <View key={p} style={styles.point}>
              <Text style={styles.pointTitle}>{t(`messageGuard.consent.${p}.title`)}</Text>
              <Text style={styles.body}>{t(`messageGuard.consent.${p}.body`)}</Text>
            </View>
          ))}
          <Text accessibilityRole="header" style={styles.pointTitle}>{t('messageGuard.consent.apps')}</Text>
          {list.map(a => (
            <View key={a.id} style={styles.appRow}>
              <View style={styles.appText}>
                <Text style={styles.appLabel}>{a.label}</Text>
                {a.recommended ? <Text style={styles.recommended}>{t('messageGuard.apps.recommended')}</Text> : null}
              </View>
              <Switch
                testID={`message-guard-consent-app-${a.id}`}
                accessibilityLabel={a.recommended ? `${a.label}, ${t('messageGuard.apps.recommended')}` : a.label}
                value={chosen.includes(a.id)}
                disabled={Boolean(adding)}
                onValueChange={() => toggle(a.id)}
                trackColor={{ false: colors.borderLight, true: colors.accent }}
                thumbColor={colors.white}
              />
            </View>
          ))}
          {chosen.length === 0 ? <Text style={styles.hint}>{t('messageGuard.consent.chooseOne')}</Text> : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            testID="message-guard-consent-not-now"
            label={t('messageGuard.consent.notNow')}
            variant="secondary"
            onPress={onCancel}
            style={styles.footerButton}
          />
          <Button
            testID="message-guard-consent-turn-on"
            label={t('messageGuard.consent.turnOn')}
            variant="secondary"
            disabled={chosen.length === 0}
            onPress={() => onConfirm(chosen)}
            style={styles.footerButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { color: colors.textPrimary, fontSize: 20, lineHeight: 26, fontFamily: fonts.bold },
  point: { gap: 2 },
  pointTitle: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  appText: { flex: 1 },
  appLabel: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.medium },
  recommended: { color: colors.accent, fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold },
  footer: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.border, maxWidth: 560, width: '100%', alignSelf: 'center' },
  footerButton: { flex: 1 },
});

export default MessageGuardConsent;
