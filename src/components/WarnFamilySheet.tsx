import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { Button } from './ui';
import { useAppState } from '../state/AppState';
import { shareText } from '../lib/notify';
import { textContact } from '../lib/warn';
import { ContactsGate } from './ContactsGate';
import { useOpenSignIn } from '../hooks/useOpenSignIn';
import { useSheetLayout } from './useSheetLayout';
import theme from '../theme/theme';

const { colors, fonts } = theme;

interface Props {
  visible: boolean;
  message: string;
  onClose: () => void;
  onAddContact: () => void;
}

export const WarnFamilySheet: React.FC<Props> = ({ visible, message, onClose, onAddContact }) => {
  const { t } = useTranslation(['contacts', 'common']);
  const { contacts, contactAccess } = useAppState();
  const openSignIn = useOpenSignIn();
  const [gateOpen, setGateOpen] = useState(false);
  const close = () => {
    setGateOpen(false);
    onClose();
  };
  const { height } = useWindowDimensions();
  const sheet = useSheetLayout();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={[styles.overlay, { height }, sheet.overlay]}>
      <Pressable accessibilityLabel={t('common:actions.close')} style={styles.backdrop} onPress={close} />
      <View style={[styles.sheet, sheet.sheet]} testID="warn-sheet">
        <Text accessibilityRole="header" style={styles.title}>{t('warn.title')}</Text>
        <Text style={styles.body}>{t('warn.body')}</Text>
        {contacts.length === 0 ? (
          contactAccess === 'allowed' ? (
            <Button testID="warn-add" label={t('warn.addContact')} onPress={() => { close(); onAddContact(); }} />
          ) : gateOpen ? (
            <ContactsGate
              access={contactAccess}
              onSignIn={() => { close(); openSignIn(); }}
              onDismiss={() => setGateOpen(false)}
            />
          ) : (
            <Button testID="warn-add" label={t('warn.addContact')} onPress={() => setGateOpen(true)} />
          )
        ) : (
          contacts.map(c => (
            <Button
              key={c.id}
              testID={`warn-${c.id}`}
              label={t('warn.text', { name: c.name })}
              onPress={() => {
                textContact(c, message).catch(() => undefined);
                close();
              }}
            />
          ))
        )}
        {contacts.length > 0 && contactAccess === 'signIn' ? <Text testID="warn-legacy" style={styles.body}>{t('gate.legacy')}</Text> : null}
        <Button testID="warn-share" label={t('warn.share')} variant="secondary" onPress={() => { shareText(message).catch(() => undefined); close(); }} />
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
});

export default WarnFamilySheet;
