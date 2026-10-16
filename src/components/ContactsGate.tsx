import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { Button } from './ui';
import type { ContactAccess } from '../lib/contactAccess';
import theme from '../theme/theme';

const { colors, fonts } = theme;

interface Props {
  access: Exclude<ContactAccess, 'allowed'>;
  onSignIn: () => void;
  onDismiss: () => void;
}

export const ContactsGate: React.FC<Props> = ({ access, onSignIn, onDismiss }) => {
  const { t } = useTranslation('contacts');
  const unavailable = access === 'unavailable';
  return (
    <View style={styles.box} testID="contacts-gate">
      <Text style={styles.body}>{unavailable ? t('gate.unavailable') : t('gate.body')}</Text>
      {unavailable ? null : <Button testID="contacts-gate-sign-in" label={t('gate.signIn')} onPress={onSignIn} />}
      <Button testID="contacts-gate-dismiss" label={t('gate.notNow')} variant="secondary" onPress={onDismiss} />
    </View>
  );
};

const styles = StyleSheet.create({
  box: { gap: 10 },
  body: { color: colors.textPrimary, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular },
});

export default ContactsGate;
