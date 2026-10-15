import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Verdict } from '../api/types';
import { SCAM_CHOICES, type ChoosableScam, type FeedbackAnswer } from '../lib/feedback';
import { useSheetLayout } from './useSheetLayout';
import theme from '../theme/theme';
import { Text } from './Text';
import { Button, Chip } from './ui';

const { colors, fonts } = theme;

interface Props {
  visible: boolean;
  verdict: Verdict;
  scamType: string;
  busy?: boolean;
  onClose: () => void;
  onSend: (answer: FeedbackAnswer) => void;
}

export const FeedbackSheet: React.FC<Props> = ({ visible, verdict, scamType, busy, onClose, onSend }) => {
  const { t } = useTranslation(['feedback', 'common']);
  const { height } = useWindowDimensions();
  const sheet = useSheetLayout();
  const risky = verdict !== 'safe';
  const [picking, setPicking] = useState(false);
  const [type, setType] = useState<ChoosableScam | null>(null);
  const reset = () => {
    setPicking(false);
    setType(null);
  };
  const close = () => {
    reset();
    onClose();
  };
  const choices = SCAM_CHOICES.filter(c => c.type !== scamType);
  const chips = (
    <View style={styles.wrap}>
      {choices.map(c => (
        <Chip key={c.type} label={c.label} selected={type === c.type} onPress={() => setType(type === c.type ? null : c.type)} />
      ))}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={[styles.overlay, { height }, sheet.overlay]}>
        <Pressable accessibilityLabel={t('common:actions.close')} style={styles.backdrop} onPress={close} />
        <View style={[styles.sheet, sheet.sheet]} testID="feedback-sheet">
          <Text accessibilityRole="header" style={styles.title}>{risky ? t('sheet.titleRisky') : t('sheet.titleSafe')}</Text>
          {risky ? (
            picking ? (
              <>
                <Text style={styles.body}>{t('sheet.pick')}</Text>
                {chips}
                <Button testID="feedback-send" label={t('sheet.send')} disabled={!type || busy} onPress={() => type && onSend({ kind: 'different', scamType: type })} />
              </>
            ) : (
              <>
                <Text style={styles.body}>{t('sheet.sendBody')}</Text>
                <Button testID="feedback-safe" label={t('sheet.itWasSafe')} variant="secondary" disabled={busy} onPress={() => onSend({ kind: 'safe' })} />
                <Button testID="feedback-different" label={t('sheet.different')} variant="secondary" disabled={busy} onPress={() => setPicking(true)} />
              </>
            )
          ) : (
            <>
              <Text style={styles.body}>{t('sheet.optional')}</Text>
              {chips}
              <Button testID="feedback-scam" label={t('sheet.scam')} disabled={busy} onPress={() => onSend({ kind: 'scam', ...(type ? { scamType: type } : {}) })} />
            </>
          )}
          <Button label={t('common:actions.cancel')} variant="secondary" onPress={close} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,27,45,0.5)' },
  sheet: { backgroundColor: colors.background, padding: 20, gap: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: '100%', maxWidth: 430, alignSelf: 'center' },
  title: { color: colors.textPrimary, fontSize: 18, lineHeight: 24, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

export default FeedbackSheet;
