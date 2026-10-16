import React from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { Button } from './ui';
import { useAppState } from '../state/AppState';
import { shareText } from '../lib/notify';
import { textContact } from '../lib/warn';
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
  const close = onClose;
  const share = () => {
    shareText(message).catch(() => undefined);
    close();
  };
  const signedOutEmpty = contacts.length === 0 && contactAccess !== 'allowed';
  const { height } = useWindowDimensions();
  const sheet = useSheetLayout();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={[styles.overlay, { height }, sheet.overlay]}>
      <Pressable accessibilityLabel={t('common:actions.close')} style={styles.backdrop} onPress={close} />
      <View style={[styles.sheet, sheet.sheet]} testID="warn-sheet">
        <Text accessibilityRole="header" style={styles.title}>{t('warn.title')}</Text>
        {signedOutEmpty ? null : <Text style={styles.body}>{t('warn.body')}</Text>}
        {signedOutEmpty ? (
          <>
            <Button testID="warn-share" label={t('warn.shareNow')} onPress={share} />
            <Text testID="warn-gate-note" style={styles.body}>{contactAccess === 'unavailable' ? t('gate.unavailable') : t('gate.body')}</Text>
            {contactAccess === 'signIn' ? (
              <Button testID="warn-sign-in" label={t('gate.signInToSave')} variant="secondary" onPress={() => { close(); openSignIn(); }} />
            ) : null}
          </>
        ) : (
          <>
            {contacts.length === 0 ? (
              <Button testID="warn-add" label={t('warn.addContact')} onPress={() => { close(); onAddContact(); }} />
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
            <Button testID="warn-share" label={t('warn.share')} variant="secondary" onPress={share} />
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
});

export default WarnFamilySheet;
