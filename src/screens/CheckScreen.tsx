import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Image, StyleSheet, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '../components/Screen';
import { Button, Card, Chip, LinkButton, Notice, ScreenHeader } from '../components/ui';
import { countryName } from '../lib/countries';
import { hasInput } from '../api';
import type { CheckKind } from '../api/types';
import { LANGUAGES } from '../lib/languages';
import { PreparedImage, pickScreenshot, prepareImage } from '../lib/image';
import { KIND_OPTIONS, buildRequest, looksLikeUrl, sourceLabel } from '../lib/request';
import type { TabScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const CheckScreen: React.FC<TabScreenProps<'Check'>> = ({ navigation, route }) => {
  const { language, setLanguage, profile } = useAppState();
  const [kind, setKind] = useState<CheckKind>('job');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [destination, setDestination] = useState(countryName(profile.destinationCountry));
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const attachImage = useCallback(async (loader: () => Promise<PreparedImage | null>) => {
    setBusy(true);
    setNotice(null);
    try {
      const prepared = await loader();
      if (prepared) setImage(prepared);
    } catch {
      setNotice('We could not use that picture. Try another screenshot.');
    } finally {
      setBusy(false);
    }
  }, []);

  const pasteInto = useCallback(async (target: 'text' | 'url') => {
    const value = (await Clipboard.getStringAsync()).trim();
    if (!value) {
      setNotice('Your clipboard is empty.');
      return;
    }
    setNotice(null);
    if (target === 'url' || looksLikeUrl(value)) setUrl(value);
    else setText(value);
  }, []);

  const nonce = route.params?.nonce;
  useEffect(() => {
    const params = route.params;
    if (!params || !params.nonce) return;
    const { draft, intent } = params;
    if (draft) {
      if (draft.kind) setKind(draft.kind);
      if (draft.text) setText(draft.text);
      if (draft.url) setUrl(draft.url);
      if (draft.imageUri) {
        const uri = draft.imageUri;
        attachImage(() => prepareImage(uri));
      }
    } else if (intent === 'image') {
      attachImage(pickScreenshot);
    } else if (intent === 'link') {
      setKind('link');
      pasteInto('url').catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  const form = { kind, text, url, destination, home: countryName(profile.homeCountry), shareSignals: profile.shareSignals, imageBase64: image?.base64, imageMimeType: image?.mimeType, language };
  const ready = hasInput({ text, url, imageBase64: image?.base64 });

  const submit = () => {
    navigation.getParent()?.navigate('Checking', { request: buildRequest(form), source: sourceLabel(form) });
  };

  return (
    <Screen
      footer={<Button testID="check-submit" label="Check now" onPress={submit} disabled={!ready || busy} />}
    >
      <ScreenHeader title="Check something" />

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>What is it?</Text>
        <View style={styles.wrap}>
          {KIND_OPTIONS.map(o => (
            <Chip key={o.kind} label={o.label} selected={kind === o.kind} onPress={() => setKind(o.kind)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Paste the text or chat</Text>
          <LinkButton label="Paste" onPress={() => pasteInto('text')} />
        </View>
        <TextInput
          testID="check-text"
          accessibilityLabel="Text or chat to check"
          multiline
          value={text}
          onChangeText={setText}
          placeholder="Job post, chat messages or SMS"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.textArea]}
        />
      </View>

      <View style={{ gap: 6 }}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Link</Text>
          <LinkButton label="Paste" onPress={() => pasteInto('url')} />
        </View>
        <TextInput
          testID="check-url"
          accessibilityLabel="Link to check"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </View>

      <Card style={{ gap: 10 }}>
        <Text style={styles.label}>Screenshot</Text>
        {image ? (
          <View style={styles.imageRow}>
            <Image source={{ uri: image.uri }} style={styles.thumb} resizeMode="cover" />
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={styles.meta}>{Math.round(image.bytes / 1024)} KB, ready to send</Text>
              <Button label="Remove" variant="secondary" onPress={() => setImage(null)} style={styles.small} />
            </View>
          </View>
        ) : (
          <Button
            testID="check-pick-image"
            label={busy ? 'Preparing picture...' : Platform.OS === 'web' ? 'Upload a screenshot' : 'Pick a screenshot'}
            variant="secondary"
            disabled={busy}
            onPress={() => attachImage(pickScreenshot)}
          />
        )}
      </Card>

      <View style={{ gap: 6 }}>
        <Text style={styles.label}>Where will you work or travel? (optional)</Text>
        <TextInput
          testID="check-destination"
          accessibilityLabel="Destination"
          value={destination}
          onChangeText={setDestination}
          placeholder="For example Bangkok, Thailand"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>Report language</Text>
        <View style={styles.wrap}>
          {LANGUAGES.map(l => (
            <Chip key={l.code} label={l.label} selected={language === l.code} onPress={() => setLanguage(l.code)} />
          ))}
        </View>
      </View>

      {notice ? <Notice message={notice} /> : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  label: { color: colors.textPrimary, fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold, includeFontPadding: false },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontFamily: fonts.regular },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  imageRow: { flexDirection: 'row', gap: 12 },
  thumb: { width: 80, height: 110, borderRadius: 10, backgroundColor: colors.codeBg },
  meta: { color: colors.textSecondary, fontSize: 12, lineHeight: 16, fontFamily: fonts.regular },
  small: { height: 38 },
});

export default CheckScreen;
