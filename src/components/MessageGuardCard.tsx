import React, { useState } from 'react';
import { StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from './ui';
import { Text } from './Text';
import { MessageGuardConsent } from './MessageGuardConsent';
import { MessageGuardLog } from './MessageGuardLog';
import { useMessageGuard, type MessageGuardControl } from '../hooks/useMessageGuard';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const MessageGuardCard: React.FC = () => <MessageGuardCardView control={useMessageGuard()} />;

export const MessageGuardCardView: React.FC<{ control: MessageGuardControl }> = ({ control }) => {
  const { t } = useTranslation('shield');
  const { support, enabled, access, apps, error, pausedReason, consent, setEnabled, toggleApp, confirmConsent, cancelConsent, turnOffAndRevoke } = control;
  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  if (support === 'unsupported') return null;
  const unavailable = support !== 'ready';
  const status = unavailable
    ? support === 'web'
      ? t('messageGuard.status.web')
      : t('messageGuard.status.unavailable')
    : enabled
      ? t('messageGuard.status.on')
      : pausedReason
        ? t('messageGuard.status.paused')
        : access
          ? t('messageGuard.status.off')
          : t('messageGuard.status.needsAccess');
  const onCount = apps.filter(a => a.enabled).length;

  return (
    <Card testID="message-guard-card" style={styles.card}>
      <View style={styles.row}>
        <Text accessibilityRole="header" style={styles.title}>{t('messageGuard.title')}</Text>
        {unavailable ? null : (
          <Switch
            testID="message-guard-switch"
            accessibilityLabel={t('messageGuard.a11y')}
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: colors.borderLight, true: colors.accent }}
            thumbColor={colors.white}
          />
        )}
      </View>
      <Text testID="message-guard-status" style={[styles.body, pausedReason && !enabled ? styles.paused : null]}>{status}</Text>
      <Text style={styles.privacy}>{t('messageGuard.privacy')}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!unavailable && enabled && apps.length > 0 ? (
        <>
          <TouchableOpacity
            testID="message-guard-apps-toggle"
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={t('messageGuard.apps.a11y', { count: onCount })}
            onPress={() => setOpen(v => !v)}
            style={styles.link}
          >
            <Text style={styles.linkText}>{t(open ? 'messageGuard.apps.hide' : 'messageGuard.apps.show', { count: onCount })}</Text>
          </TouchableOpacity>
          {open
            ? apps.map(a => (
                <View key={a.id} style={styles.appRow}>
                  <View style={styles.appText}>
                    <Text style={styles.appLabel}>{a.label}</Text>
                    {a.recommended ? <Text style={styles.recommended}>{t('messageGuard.apps.recommended')}</Text> : null}
                  </View>
                  <Switch
                    testID={`message-guard-app-${a.id}`}
                    accessibilityLabel={a.label}
                    value={a.enabled}
                    onValueChange={() => toggleApp(a.id)}
                    trackColor={{ false: colors.borderLight, true: colors.accent }}
                    thumbColor={colors.white}
                  />
                </View>
              ))
            : null}
        </>
      ) : null}
      {unavailable ? null : (
        <TouchableOpacity testID="message-guard-log-open" accessibilityRole="button" onPress={() => setLogOpen(true)} style={styles.link}>
          <Text style={styles.linkText}>{t('messageGuard.log.title')}</Text>
        </TouchableOpacity>
      )}
      {!unavailable && access ? (
        <View>
          <TouchableOpacity
            testID="message-guard-kill"
            accessibilityRole="button"
            accessibilityHint={t('messageGuard.kill.hint')}
            onPress={() => {
              turnOffAndRevoke().catch(() => undefined);
            }}
            style={styles.link}
          >
            <Text style={styles.killText}>{t('messageGuard.kill.label')}</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>{t('messageGuard.kill.hint')}</Text>
        </View>
      ) : null}
      {unavailable ? null : (
        <>
          <MessageGuardConsent
            request={consent}
            apps={apps}
            onConfirm={ids => {
              confirmConsent(ids).catch(() => undefined);
            }}
            onCancel={cancelConsent}
          />
          <MessageGuardLog visible={logOpen} onClose={() => setLogOpen(false)} />
        </>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  title: { flex: 1, color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  paused: { color: colors.warningText, fontFamily: fonts.semiBold },
  privacy: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold },
  error: { color: colors.dangerDark, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold },
  link: { minHeight: 48, justifyContent: 'center' },
  linkText: { color: colors.accent, fontSize: 15, lineHeight: 20, fontFamily: fonts.bold },
  killText: { color: colors.textPrimary, fontSize: 15, lineHeight: 20, fontFamily: fonts.bold, textDecorationLine: 'underline' },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  appText: { flex: 1 },
  appLabel: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.medium },
  recommended: { color: colors.accent, fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold },
});

export default MessageGuardCard;
