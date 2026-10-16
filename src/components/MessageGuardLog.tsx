import React from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { Button, Card } from './ui';
import { useMessageGuardLog } from '../hooks/useMessageGuard';
import { formatRelative } from '../lib/time';
import theme from '../theme/theme';

const { colors, fonts } = theme;

/** "What Message Guard sent": the exact redacted text that left the phone, kept on the phone for seven days. */
export const MessageGuardLog: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { t } = useTranslation(['shield', 'common']);
  const { entries, deleteAll } = useMessageGuardLog(visible);
  const verdictLabel = (verdict: string): string => {
    if (verdict === 'safe' || verdict === 'careful' || verdict === 'danger') return t(`common:verdict.${verdict}`);
    return verdict === 'pending' ? t('shield:messageGuard.log.pending') : t('shield:messageGuard.log.failed');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} testID="message-guard-log">
          <Text accessibilityRole="header" style={styles.title}>{t('shield:messageGuard.log.title')}</Text>
          <Text style={styles.body}>{t('shield:messageGuard.log.body')}</Text>
          {entries.length === 0 ? (
            <Text testID="message-guard-log-empty" style={styles.body}>{t('shield:messageGuard.log.empty')}</Text>
          ) : (
            entries.map(e => (
              <Card key={e.id} style={styles.entry}>
                <View style={styles.meta}>
                  <Text style={styles.metaText}>{`${formatRelative(new Date(e.at).toISOString())} · ${e.app}`}</Text>
                  <Text style={styles.verdict}>{verdictLabel(e.verdict)}</Text>
                </View>
                <Text selectable style={styles.sent}>{e.text}</Text>
              </Card>
            ))
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Button label={t('common:actions.close')} variant="secondary" onPress={onClose} style={styles.footerButton} />
          <Button
            testID="message-guard-log-delete"
            label={t('shield:messageGuard.log.deleteAll')}
            variant="secondary"
            disabled={entries.length === 0}
            onPress={() => {
              deleteAll().catch(() => undefined);
            }}
            style={styles.footerButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { color: colors.textPrimary, fontSize: 20, lineHeight: 26, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  entry: { gap: 6 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  metaText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.medium },
  verdict: { color: colors.textPrimary, fontSize: 13, lineHeight: 18, fontFamily: fonts.bold },
  sent: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  footer: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.border, maxWidth: 560, width: '100%', alignSelf: 'center' },
  footerButton: { flex: 1 },
});

export default MessageGuardLog;
