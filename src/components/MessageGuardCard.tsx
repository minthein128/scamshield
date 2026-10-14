import React, { useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Card } from './ui';
import { useMessageGuard, type MessageGuardControl } from '../hooks/useMessageGuard';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const MESSAGE_GUARD_TITLE = 'Message Guard: warns you about risky messages as they arrive';
export const MESSAGE_GUARD_PRIVACY = 'Only messages that look risky are checked. Codes and personal numbers are removed first.';

export const MessageGuardCard: React.FC = () => <MessageGuardCardView control={useMessageGuard()} />;

export const MessageGuardCardView: React.FC<{ control: MessageGuardControl }> = ({ control }) => {
  const { support, enabled, access, apps, error, setEnabled, toggleApp } = control;
  const [open, setOpen] = useState(false);

  if (support === 'unsupported') return null;
  const unavailable = support !== 'ready';
  const status = unavailable
    ? support === 'web'
      ? 'Works in the SafeRoute Android app.'
      : 'Not available in this build.'
    : enabled
      ? 'On. Risky messages from your chat and SMS apps get a warning.'
      : access
        ? 'Off.'
        : 'Off. Turning it on opens Android notification access.';
  const onCount = apps.filter(a => a.enabled).length;

  return (
    <Card testID="message-guard-card" style={styles.card}>
      <View style={styles.row}>
        <Text accessibilityRole="header" style={styles.title}>{MESSAGE_GUARD_TITLE}</Text>
        {unavailable ? null : (
          <Switch
            testID="message-guard-switch"
            accessibilityLabel="Message Guard"
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: colors.borderLight, true: colors.accent }}
            thumbColor={colors.white}
          />
        )}
      </View>
      <Text testID="message-guard-status" style={styles.body}>{status}</Text>
      <Text style={styles.privacy}>{MESSAGE_GUARD_PRIVACY}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!unavailable && apps.length > 0 ? (
        <>
          <TouchableOpacity
            testID="message-guard-apps-toggle"
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={`Apps Message Guard watches, ${onCount} on`}
            onPress={() => setOpen(v => !v)}
            style={styles.link}
          >
            <Text style={styles.linkText}>{`${open ? 'Hide apps' : 'Choose apps'} (${onCount} on)`}</Text>
          </TouchableOpacity>
          {open
            ? apps.map(a => (
                <View key={a.id} style={styles.appRow}>
                  <Text style={styles.appLabel}>{a.label}</Text>
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
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  title: { flex: 1, color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  privacy: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold },
  error: { color: colors.dangerDark, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold },
  link: { minHeight: 48, justifyContent: 'center' },
  linkText: { color: colors.accent, fontSize: 15, lineHeight: 20, fontFamily: fonts.bold },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  appLabel: { flex: 1, color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.medium },
});

export default MessageGuardCard;
