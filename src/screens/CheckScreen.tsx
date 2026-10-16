import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '../components/Screen';
import { Text, TextInput } from '../components/Text';
import { Button, Card, Divider, Notice, SectionTitle } from '../components/ui';
import { Icon } from '../components/Icon';
import { HeaderWithLeave } from '../components/LeaveQuickly';
import { Select } from '../components/Select';
import { UI_LANGUAGES } from '../i18n/languages';
import { countryName } from '../lib/countries';
import { hasInput } from '../api';
import type { CheckKind } from '../api/types';
import { PreparedImage, pickScreenshot, prepareImage } from '../lib/image';
import { KIND_OPTIONS, buildRequest, looksLikeUrl, sourceLabel } from '../lib/request';
import type { TabScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const PasteButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} activeOpacity={0.7} onPress={onPress} style={styles.paste}>
    <Text style={styles.pasteText}>{label}</Text>
  </TouchableOpacity>
);

export const CheckScreen: React.FC<TabScreenProps<'Check'>> = ({ navigation, route }) => {
  const { t } = useTranslation(['check', 'common']);
  const { language, setLanguage, profile } = useAppState();
  const [kind, setKindState] = useState<CheckKind>('job');
  const kindChosen = useRef(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [destination, setDestination] = useState(countryName(profile.destinationCountry));
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const chooseKind = (next: CheckKind) => {
    kindChosen.current = true;
    setKindState(next);
  };

  const changeUrl = useCallback((value: string) => {
    setUrl(value);
    if (!kindChosen.current && looksLikeUrl(value)) setKindState('link');
  }, []);

  const attachImage = useCallback(async (loader: () => Promise<PreparedImage | null>) => {
    setBusy(true);
    setNotice(null);
    try {
      const prepared = await loader();
      if (prepared) setImage(prepared);
    } catch {
      setNotice(t('errors.image'));
    } finally {
      setBusy(false);
    }
  }, [t]);

  const pasteInto = useCallback(async (target: 'text' | 'url') => {
    const value = (await Clipboard.getStringAsync()).trim();
    if (!value) {
      setNotice(t('errors.clipboardEmpty'));
      return;
    }
    setNotice(null);
    if (target === 'url' || looksLikeUrl(value)) changeUrl(value);
    else setText(value);
  }, [t, changeUrl]);

  const nonce = route.params?.nonce;
  useEffect(() => {
    const params = route.params;
    if (!params || !params.nonce) return;
    const { draft, intent } = params;
    if (draft) {
      if (draft.kind) chooseKind(draft.kind);
      if (draft.text) setText(draft.text);
      if (draft.url) changeUrl(draft.url);
      if (draft.imageUri) {
        const uri = draft.imageUri;
        attachImage(() => prepareImage(uri));
      }
    } else if (intent === 'image') {
      attachImage(pickScreenshot);
    } else if (intent === 'link') {
      chooseKind('link');
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
      header={
        <>
          <HeaderWithLeave title={t('title')} />
          <Select
            testID="check-kind"
            label={t('whatIsIt')}
            value={kind}
            options={KIND_OPTIONS.map(k => ({ value: k, label: t(`kinds.${k}`) }))}
            onChange={chooseKind}
          />
        </>
      }
      footer={
        <>
          {ready ? null : <Text testID="check-submit-hint" style={styles.hint}>{t('submitHint')}</Text>}
          <Button testID="check-submit" label={t('submit')} onPress={submit} disabled={!ready || busy} />
        </>
      }
    >
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <SectionTitle>{t('text.title')}</SectionTitle>
          <PasteButton label={t('common:actions.paste')} onPress={() => pasteInto('text')} />
        </View>
        <TextInput
          testID="check-text"
          accessibilityLabel={t('text.a11y')}
          multiline
          value={text}
          onChangeText={setText}
          placeholder={t('text.placeholder')}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.textArea]}
        />
      </View>

      <Divider />

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <SectionTitle>{t('link.label')}</SectionTitle>
          <PasteButton label={t('common:actions.paste')} onPress={() => pasteInto('url')} />
        </View>
        <TextInput
          testID="check-url"
          accessibilityLabel={t('link.a11y')}
          value={url}
          onChangeText={changeUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </View>

      <Divider />

      <View style={styles.section}>
        <SectionTitle>{t('screenshot.label')}</SectionTitle>
        <Card style={{ gap: 10 }}>
          {image ? (
            <View style={styles.imageRow}>
              <Image source={{ uri: image.uri }} style={styles.thumb} resizeMode="cover" />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={styles.meta}>{t('screenshot.ready', { kb: Math.round(image.bytes / 1024) })}</Text>
                <Button label={t('common:actions.remove')} variant="secondary" onPress={() => setImage(null)} style={styles.small} />
              </View>
            </View>
          ) : (
            <Button
              testID="check-pick-image"
              label={busy ? t('screenshot.preparing') : Platform.OS === 'web' ? t('screenshot.upload') : t('screenshot.pick')}
              variant="secondary"
              disabled={busy}
              onPress={() => attachImage(pickScreenshot)}
            />
          )}
        </Card>
      </View>

      <Divider />

      <View style={styles.section}>
        <TouchableOpacity
          testID="check-more"
          accessibilityRole="button"
          accessibilityLabel={t('more.title')}
          accessibilityState={{ expanded: moreOpen }}
          activeOpacity={0.7}
          onPress={() => setMoreOpen(open => !open)}
          style={styles.moreRow}
        >
          <Text style={styles.moreText}>{t('more.title')}</Text>
          <View style={{ transform: [{ rotate: moreOpen ? '-90deg' : '90deg' }] }}>
            <Icon name="chevron" size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
        {moreOpen ? (
          <View style={{ gap: 14 }}>
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>{t('destination.label')}</Text>
              <TextInput
                testID="check-destination"
                accessibilityLabel={t('destination.a11y')}
                value={destination}
                onChangeText={setDestination}
                placeholder={t('destination.placeholder')}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>
            <Select
              testID="check-language"
              label={t('optional.language')}
              value={language}
              options={UI_LANGUAGES.map(l => ({ value: l.code, label: l.label }))}
              onChange={setLanguage}
            />
          </View>
        ) : null}
      </View>

      {notice ? <Notice message={notice} /> : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  label: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold, includeFontPadding: false },
  section: { gap: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontFamily: fonts.regular },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  imageRow: { flexDirection: 'row', gap: 12 },
  thumb: { width: 80, height: 110, borderRadius: 10, backgroundColor: colors.codeBg },
  meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  paste: { minHeight: 48, minWidth: 72, marginRight: -8, paddingHorizontal: 12, alignItems: 'flex-end', justifyContent: 'center' },
  pasteText: { color: colors.accent, fontSize: 15, lineHeight: 20, fontFamily: fonts.bold },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, textAlign: 'center' },
  moreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  moreText: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  small: { minHeight: 48 },
});

export default CheckScreen;
