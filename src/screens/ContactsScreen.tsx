import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Contacts from 'expo-contacts';
import { Screen } from '../components/Screen';
import { Grid } from '../components/Grid';
import { useLayout } from '../hooks/useLayout';
import { Text } from '../components/Text';
import { Button, Card, EmptyState, Field, LinkButton, Notice, ScreenHeader } from '../components/ui';
import { callNumber } from '../lib/warn';
import { useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const ContactsScreen: React.FC = () => {
  const { t } = useTranslation('contacts');
  const { contacts, addContact, removeContact } = useAppState();
  const { status } = useAuth();
  const layout = useLayout();
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
        setError(t('errors.permission'));
        return;
      }
      const picked = await Contacts.presentContactPickerAsync();
      const number = picked?.phoneNumbers?.[0]?.number;
      if (!picked) return;
      if (!number) {
        setError(t('errors.noNumber'));
        return;
      }
      setName(picked.name ?? '');
      setPhone(number);
    } catch {
      setError(t('errors.openFailed'));
    }
  };

  const list =
    contacts.length === 0 ? (
      <EmptyState testID="contacts-empty" icon="people" title={t('emptyTitle')} body={t('emptyBody')} />
    ) : (
      <Grid columns={layout.isExpanded ? 1 : layout.columns} gap={16}>
        {contacts.map(c => (
          <Card key={c.id} style={styles.contact}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text testID="contact-name" style={styles.name}>{c.name}</Text>
              <Text style={styles.phone}>{c.phone}</Text>
            </View>
            <Button testID={`call-${c.id}`} label={t('call')} variant="secondary" style={styles.small} onPress={() => callNumber(c.phone)} />
            <LinkButton label={t('remove')} color={colors.danger} onPress={() => removeContact(c.id)} />
          </Card>
        ))}
      </Grid>
    );

  const form = (
    <Card style={{ gap: 12 }}>
      <Text style={styles.name}>{t('add.title')}</Text>
      <Field testID="contact-name-input" label={t('add.name')} value={name} onChangeText={setName} autoComplete="name" />
      <Field testID="contact-phone-input" label={t('add.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" hint={t('add.phoneHint')} />
      {error ? <Notice testID="contact-error" message={error} /> : null}
      <Button testID="contact-add" label={t('add.submit')} onPress={() => save(name, phone)} />
      {Platform.OS !== 'web' ? <Button testID="contact-pick" label={t('add.pick')} variant="secondary" onPress={pick} /> : null}
    </Card>
  );

  return (
    <Screen wide header={<ScreenHeader title={t('title')} />}>
      <Text style={styles.body}>{t('intro')}</Text>

      {layout.isExpanded ? (
        <View style={styles.panes}>
          <View style={styles.listPane}>{list}</View>
          <View style={styles.formPane}>{form}</View>
        </View>
      ) : (
        <>
          {list}
          <View style={layout.isTablet ? styles.formCentered : undefined}>{form}</View>
        </>
      )}

      <Text style={styles.footnote}>
        {status.kind === 'account' ? t('footnote.synced') : t('footnote.local')}
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  panes: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  listPane: { flex: 1, minWidth: 0 },
  formPane: { width: 400 },
  formCentered: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.bold },
  phone: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.mono },
  small: { minHeight: 48, paddingHorizontal: 16 },
  footnote: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', fontFamily: fonts.regular },
});

export default ContactsScreen;
