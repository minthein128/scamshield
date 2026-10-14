import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Button } from './ui';
import { useAppState } from '../state/AppState';
import { shareText } from '../lib/notify';
import { textContact } from '../lib/warn';
import theme from '../theme/theme';

const { colors, fonts } = theme;

interface Props {
  visible: boolean;
  message: string;
  onClose: () => void;
  onAddContact: () => void;
}

export const WarnFamilySheet: React.FC<Props> = ({ visible, message, onClose, onAddContact }) => {
  const { contacts } = useAppState();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { height }]}>
      <Pressable accessibilityLabel="Close" style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet} testID="warn-sheet">
        <Text accessibilityRole="header" style={styles.title}>Warn someone you trust</Text>
        <Text style={styles.body}>This opens a text message with the warning. You choose whether to send it.</Text>
        {contacts.length === 0 ? (
          <Button label="Add a trusted contact" onPress={() => { onClose(); onAddContact(); }} />
        ) : (
          contacts.map(c => (
            <Button
              key={c.id}
              testID={`warn-${c.id}`}
              label={`Text ${c.name}`}
              onPress={() => {
                textContact(c, message).catch(() => undefined);
                onClose();
              }}
            />
          ))
        )}
        <Button testID="warn-share" label="Share another way" variant="secondary" onPress={() => { shareText(message).catch(() => undefined); onClose(); }} />
        <Button label="Cancel" variant="secondary" onPress={onClose} />
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
});

export default WarnFamilySheet;
