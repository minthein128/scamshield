import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Verdict } from '../api/types';
import { SCAM_CHOICES, type ChoosableScam, type FeedbackAnswer } from '../lib/feedback';
import theme from '../theme/theme';
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
  const { height } = useWindowDimensions();
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
      <View style={[styles.overlay, { height }]}>
        <Pressable accessibilityLabel="Close" style={styles.backdrop} onPress={close} />
        <View style={styles.sheet} testID="feedback-sheet">
          <Text accessibilityRole="header" style={styles.title}>{risky ? 'What was it?' : 'What kind of scam was it?'}</Text>
          {risky ? (
            picking ? (
              <>
                <Text style={styles.body}>Pick the closest match.</Text>
                {chips}
                <Button testID="feedback-send" label="Send" disabled={!type || busy} onPress={() => type && onSend({ kind: 'different', scamType: type })} />
              </>
            ) : (
              <>
                <Text style={styles.body}>Your answer helps us warn others more accurately. Nothing you wrote is sent.</Text>
                <Button testID="feedback-safe" label="It was safe" disabled={busy} onPress={() => onSend({ kind: 'safe' })} />
                <Button testID="feedback-different" label="It was a different scam" variant="secondary" disabled={busy} onPress={() => setPicking(true)} />
              </>
            )
          ) : (
            <>
              <Text style={styles.body}>Optional. Your answer helps us catch it next time.</Text>
              {chips}
              <Button testID="feedback-scam" label="It was a scam" disabled={busy} onPress={() => onSend({ kind: 'scam', ...(type ? { scamType: type } : {}) })} />
            </>
          )}
          <Button label="Cancel" variant="secondary" onPress={close} />
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
