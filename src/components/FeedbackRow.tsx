import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getApiClient } from '../api';
import { ApiError } from '../api/errors';
import type { CheckResponse } from '../api/types';
import { type FeedbackAnswer, buildFeedback, markAnswered, wasAnswered } from '../lib/feedback';
import theme from '../theme/theme';
import { FeedbackSheet } from './FeedbackSheet';
import { Icon } from './Icon';
import { Text } from './Text';

const { colors, fonts } = theme;

export const FeedbackRow: React.FC<{ result: CheckResponse }> = ({ result }) => {
  const { t } = useTranslation('feedback');
  const [done, setDone] = useState(wasAnswered(result.id));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const send = async (answer: FeedbackAnswer) => {
    setBusy(true);
    setFailed(false);
    try {
      await getApiClient().feedback(buildFeedback(result, answer));
      markAnswered(result.id);
      setOpen(false);
      setDone(true);
    } catch (e) {
      setOpen(false);
      if (e instanceof ApiError && e.code === 'not_found') {
        markAnswered(result.id);
        setDone(true);
      } else setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <View testID="feedback-done" style={styles.row}>
        <Icon name="check" size={18} color={colors.textSecondary} />
        <Text style={styles.label}>{t('row.thanks')}</Text>
      </View>
    );
  }

  return (
    <>
      <View testID="feedback-row" style={styles.row}>
        <Text style={styles.label}>{t('row.label')}</Text>
        <View style={styles.thumbs}>
          <TouchableOpacity testID="feedback-up" accessibilityRole="button" accessibilityLabel={t('row.up')} activeOpacity={0.7} disabled={busy} onPress={() => send({ kind: 'right' })} style={styles.thumb}>
            <Icon name="thumbUp" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity testID="feedback-down" accessibilityRole="button" accessibilityLabel={t('row.down')} activeOpacity={0.7} disabled={busy} onPress={() => setOpen(true)} style={styles.thumb}>
            <Icon name="thumbDown" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      {failed ? <Text style={styles.error}>{t('row.failed')}</Text> : null}
      <FeedbackSheet visible={open} verdict={result.verdict} scamType={result.scamType} busy={busy} onClose={() => setOpen(false)} onSend={send} />
    </>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 48, paddingVertical: 4 },
  label: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium },
  thumbs: { flexDirection: 'row', gap: 6 },
  thumb: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white },
  error: { color: colors.dangerDark, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, textAlign: 'center' },
});

export default FeedbackRow;
