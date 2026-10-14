import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import * as Contacts from 'expo-contacts';
import { Screen } from '../components/Screen';
import { Button, Card, EmptyState, Field, LinkButton, Notice, ScreenHeader } from '../components/ui';
import { callNumber } from '../lib/warn';
import { useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const ContactsScreen: React.FC = () => {
  const { contacts, addContact, removeContact } = useAppState();
  const { status } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = (n: string, p: string) => {
    const problem = addContact({ name: n, phone: p });
    setError(problem);
    if (!problem) {
      setName('');
      setPhone('');
    }
  };

  const pick = async () => {
    setError(null);
    try {
      const { granted } = await Contacts.requestPermissionsAsync();
      if (!granted) {
        setError('Allow access to contacts to pick someone, or type their number below.');
        return;
      }
      const picked = await Contacts.presentContactPickerAsync();
      const number = picked?.phoneNumbers?.[0]?.number;
      if (!picked) return;
      if (!number) {
        setError('That contact has no phone number.');
        return;
      }
      setName(picked.name ?? '');
      setPhone(number);
    } catch {
      setError('We could not open your contacts. Type the number below instead.');
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Trusted contacts" />
      <Text style={styles.body}>
        People you trust. When a check looks risky, warn them with one tap, or call them first.
      </Text>

      {contacts.length === 0 ? (
        <EmptyState testID="contacts-empty" title="No trusted contacts yet" body="Add a family member or friend below. Their number is saved only on your device unless you sign in." />
      ) : (
        contacts.map(c => (
          <Card key={c.id} style={styles.contact}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text testID="contact-name" style={styles.name}>{c.name}</Text>
              <Text style={styles.phone}>{c.phone}</Text>
            </View>
            <Button testID={`call-${c.id}`} label="Call" variant="secondary" style={styles.small} onPress={() => callNumber(c.phone)} />
            <LinkButton label="Remove" color={colors.danger} onPress={() => removeContact(c.id)} />
          </Card>
        ))
      )}

      <Card style={{ gap: 12 }}>
        <Text style={styles.name}>Add a contact</Text>
        <Field testID="contact-name-input" label="Name" value={name} onChangeText={setName} autoComplete="name" />
        <Field testID="contact-phone-input" label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" hint="Include the country code, for example +95." />
        {error ? <Notice testID="contact-error" message={error} /> : null}
        <Button testID="contact-add" label="Add contact" onPress={() => save(name, phone)} />
        {Platform.OS !== 'web' ? <Button testID="contact-pick" label="Pick from my contacts" variant="secondary" onPress={pick} /> : null}
      </Card>

      <Text style={styles.footnote}>
        {status.kind === 'account' ? 'Your contacts are synced to your account.' : 'Your contacts are saved on this device. Sign in to keep them if you change phone.'}
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.bold },
  phone: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.mono },
  small: { height: 44, paddingHorizontal: 14 },
  footnote: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, textAlign: 'center', fontFamily: fonts.regular },
});

export default ContactsScreen;
