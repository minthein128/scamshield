import React, { useCallback, useState } from 'react';
import { Image, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '../components/Screen';
import { Button, Card, Chip, LinkButton, Notice, ScreenHeader } from '../components/ui';
import { countryName } from '../lib/countries';
import { SCAM_CHOICES, buildReportRequest, reportReady, type ChoosableScam } from '../lib/feedback';
import { PreparedImage, pickScreenshot } from '../lib/image';
import type { RootScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const ReportScamScreen: React.FC<RootScreenProps<'ReportScam'>> = ({ navigation }) => {
  const { language, profile } = useAppState();
  const [text, setText] = useState('');
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [scamType, setScamType] = useState<ChoosableScam | null>(null);
  const [lostMoney, setLostMoney] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const paste = useCallback(async () => {
    const value = (await Clipboard.getStringAsync()).trim();
    if (!value) setNotice('Your clipboard is empty.');
    else {
      setNotice(null);
      setText(value);
    }
  }, []);

  const pick = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    try {
      const prepared = await pickScreenshot();
      if (prepared) setImage(prepared);
    } catch {
      setNotice('We could not use that picture. Try another screenshot.');
    } finally {
      setBusy(false);
    }
  }, []);

  const form = {
    text,
    scamType,
    lostMoney,
    imageBase64: image?.base64,
    imageMimeType: image?.mimeType,
    language,
    home: countryName(profile.homeCountry),
    destination: countryName(profile.destinationCountry),
  };
  const ready = reportReady(form);

  const submit = () => {
    const request = buildReportRequest(form);
    if (request) navigation.navigate('Checking', { request, source: 'Reported scam', reported: true });
  };

  return (
    <Screen footer={<Button testID="report-scam-submit" label="Send report" onPress={submit} disabled={!ready || busy} />}>
      <ScreenHeader title="Report a scam" onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs'))} />
      <Text style={styles.body}>Tell us about a scam you saw. We remove names, numbers and links before anything is kept, and it helps warn others.</Text>

      <View style={{ gap: 6 }}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Paste the text or chat</Text>
          <LinkButton label="Paste" onPress={paste} />
        </View>
        <TextInput
          testID="report-scam-text"
          accessibilityLabel="Scam text or chat"
          multiline
          value={text}
          onChangeText={setText}
          placeholder="The message, job post or chat"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.textArea]}
        />
      </View>

      <Card style={{ gap: 10 }}>
        <Text style={styles.label}>Or a screenshot</Text>
        {image ? (
          <View style={styles.imageRow}>
            <Image source={{ uri: image.uri }} style={styles.thumb} resizeMode="cover" />
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={styles.meta}>{Math.round(image.bytes / 1024)} KB, ready to send</Text>
              <Button label="Remove" variant="secondary" onPress={() => setImage(null)} />
            </View>
          </View>
        ) : (
          <Button
            testID="report-scam-pick-image"
            label={busy ? 'Preparing picture...' : Platform.OS === 'web' ? 'Upload a screenshot' : 'Pick a screenshot'}
            variant="secondary"
            disabled={busy}
            onPress={pick}
          />
        )}
      </Card>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>What kind of scam was it?</Text>
        <View style={styles.wrap}>
          {SCAM_CHOICES.map(c => (
            <Chip key={c.type} label={c.label} selected={scamType === c.type} onPress={() => setScamType(c.type)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>Did you lose money? (optional)</Text>
        <View style={styles.wrap}>
          <Chip label="Yes" selected={lostMoney === true} onPress={() => setLostMoney(lostMoney === true ? null : true)} />
          <Chip label="No" selected={lostMoney === false} onPress={() => setLostMoney(lostMoney === false ? null : false)} />
        </View>
        <Text style={styles.meta}>Yes or no only. We never ask how much.</Text>
      </View>

      {notice ? <Notice message={notice} /> : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  label: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold, includeFontPadding: false },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontFamily: fonts.regular },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  imageRow: { flexDirection: 'row', gap: 12 },
  thumb: { width: 80, height: 110, borderRadius: 10, backgroundColor: colors.codeBg },
  meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
});

export default ReportScamScreen;
