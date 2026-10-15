import React, { useCallback, useEffect, useState } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '../components/Screen';
import { Text, TextInput } from '../components/Text';
import { Button, Card, Divider, LinkButton, Notice, ScreenHeader, SectionTitle } from '../components/ui';
import { Select } from '../components/Select';
import { UI_LANGUAGES } from '../i18n/languages';
import { countryName } from '../lib/countries';
import { hasInput, getApiClient } from '../api';
import type { CheckKind } from '../api/types';
import { PreparedImage, pickScreenshot, prepareImage } from '../lib/image';
import { KIND_OPTIONS, buildRequest, looksLikeUrl, sourceLabel } from '../lib/request';
import type { TabScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const CheckScreen: React.FC<TabScreenProps<'Check'>> = ({ navigation, route }) => {
  const { t } = useTranslation(['check', 'common', 'report']);
  const { language, setLanguage, profile } = useAppState();
  const [kind, setKind] = useState<CheckKind>('job');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [chatText, setChatText] = useState('');
  const [destination, setDestination] = useState(countryName(profile.destinationCountry));
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [chatImage, setChatImage] = useState<PreparedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const leaveQuickly = () => {
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };

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

  const attachChatImage = useCallback(async (loader: () => Promise<PreparedImage | null>) => {
    setBusy(true);
    setNotice(null);
    try {
      const prepared = await loader();
      if (prepared) setChatImage(prepared);
    } catch {
      setNotice(t('errors.image'));
    } finally {
      setBusy(false);
    }
  }, [t]);

  const pasteInto = useCallback(async (target: 'text' | 'url' | 'chat') => {
    const value = (await Clipboard.getStringAsync()).trim();
    if (!value) {
      setNotice(t('errors.clipboardEmpty'));
      return;
    }
    setNotice(null);
    if (target === 'chat') setChatText(value);
    else if (target === 'url' || looksLikeUrl(value)) setUrl(value);
    else setText(value);
  }, [t]);

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
  const ready = kind === 'job'
    ? Boolean(text.trim() || image || chatText.trim() || chatImage)
    : hasInput({ text, url, imageBase64: image?.base64 });

  const submit = async () => {
    if (kind === 'job') {
      setBusy(true);
      setNotice(null);
      try {
        const client = getApiClient();
        const res = await client.extractJob({
          ad: (text.trim() || image) ? { text: text.trim() || undefined, imageBase64: image?.base64, imageMimeType: image?.mimeType } : undefined,
          chat: (chatText.trim() || chatImage) ? { text: chatText.trim() || undefined, imageBase64: chatImage?.base64, imageMimeType: chatImage?.mimeType } : undefined,
          language,
          context: { destination, home: countryName(profile.homeCountry) },
        });
        navigation.getParent()?.navigate('JobFacts', {
          jobId: res.jobId,
          ad: res.ad,
          chat: res.chat,
          language,
          context: { destination, home: countryName(profile.homeCountry) },
        });
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Failed to extract job facts');
      } finally {
        setBusy(false);
      }
      return;
    }

    navigation.getParent()?.navigate('Checking', { request: buildRequest(form), source: sourceLabel(form) });
  };

  return (
    <Screen
      header={
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ScreenHeader title={t('title')} />
            <LinkButton label={t('report:leaveQuickly', 'Leave quickly')} onPress={leaveQuickly} />
          </View>
          <Select
            testID="check-kind"
            label={t('whatIsIt')}
            value={kind}
            options={KIND_OPTIONS.map(k => ({ value: k, label: t(`kinds.${k}`) }))}
            onChange={setKind}
          />
        </>
      }
      footer={<Button testID="check-submit" label={busy ? t('job.extracting', 'Reading job details...') : t('submit')} onPress={submit} disabled={!ready || busy} />}
    >
      {notice ? (
        <Card style={{ backgroundColor: colors.dangerSoftBg, borderColor: colors.danger, marginBottom: 12 }}>
          <Text style={{ color: colors.danger, fontFamily: fonts.semiBold }}>{notice}</Text>
        </Card>
      ) : null}

      {kind === 'job' ? (
        <>
          <Card style={{ gap: 4, backgroundColor: colors.brandBlueLight, borderColor: colors.brandBlue, marginBottom: 8 }}>
            <Text style={{ color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 14 }}>
              {t('job.bannerTitle', 'SafeRoute Job Shield')}
            </Text>
            <Text style={{ color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>
              {t('job.bannerBody', 'SafeRoute compares what the job ad promises with what the recruiter then asks you to do, before you pay, send documents, or travel.')}
            </Text>
          </Card>

          {/* Block 1: The Job Ad */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <SectionTitle>{t('job.adSectionTitle', '1. The Job Ad (Flyer or Post)')}</SectionTitle>
              <LinkButton label={t('common:actions.paste')} onPress={() => pasteInto('text')} />
            </View>
            <TextInput
              testID="check-job-ad-text"
              accessibilityLabel={t('job.adTextA11y', 'Job advertisement text')}
              multiline
              value={text}
              onChangeText={setText}
              placeholder={t('job.adPlaceholder', 'Paste job ad text or description...')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.textArea]}
            />
            <Card style={{ gap: 8, marginTop: 4 }}>
              {image ? (
                <View style={styles.imageRow}>
                  <Image source={{ uri: image.uri }} style={styles.thumb} resizeMode="cover" />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={styles.meta}>{t('screenshot.ready', { kb: Math.round(image.bytes / 1024) })}</Text>
                    <Button label={t('common:actions.remove')} variant="secondary" onPress={() => setImage(null)} style={styles.small} />
                  </View>
                </View>
              ) : (
                <Button
                  testID="check-pick-ad-image"
                  label={busy ? t('screenshot.preparing') : Platform.OS === 'web' ? t('job.uploadFlyer', 'Upload flyer image') : t('job.pickFlyer', 'Add flyer screenshot')}
                  variant="secondary"
                  disabled={busy}
                  onPress={() => attachImage(pickScreenshot)}
                />
              )}
            </Card>
          </View>

          <Divider />

          {/* Block 2: Recruiter Chat */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <SectionTitle>{t('job.chatSectionTitle', '2. What the recruiter asked you (Optional)')}</SectionTitle>
              <LinkButton label={t('common:actions.paste')} onPress={() => pasteInto('chat')} />
            </View>
            <Text style={{ color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, marginBottom: 4 }}>
              {t('job.chatHelper', 'Paste chat messages or upload screenshots from WhatsApp, Telegram, or Facebook. SafeRoute checks for hidden fees, passport demands, or route changes.')}
            </Text>
            <TextInput
              testID="check-job-chat-text"
              accessibilityLabel={t('job.chatTextA11y', 'Recruiter chat text')}
              multiline
              value={chatText}
              onChangeText={setChatText}
              placeholder={t('job.chatPlaceholder', 'Paste messages from the recruiter...')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.textArea]}
            />
            <Card style={{ gap: 8, marginTop: 4 }}>
              {chatImage ? (
                <View style={styles.imageRow}>
                  <Image source={{ uri: chatImage.uri }} style={styles.thumb} resizeMode="cover" />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={styles.meta}>{t('screenshot.ready', { kb: Math.round(chatImage.bytes / 1024) })}</Text>
                    <Button label={t('common:actions.remove')} variant="secondary" onPress={() => setChatImage(null)} style={styles.small} />
                  </View>
                </View>
              ) : (
                <Button
                  testID="check-pick-chat-image"
                  label={busy ? t('screenshot.preparing') : Platform.OS === 'web' ? t('job.uploadChat', 'Upload chat screenshot') : t('job.pickChat', 'Add chat screenshot')}
                  variant="secondary"
                  disabled={busy}
                  onPress={() => attachChatImage(pickScreenshot)}
                />
              )}
            </Card>
          </View>
        </>
      ) : (
        <>
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <SectionTitle>{t('text.title')}</SectionTitle>
              <LinkButton label={t('common:actions.paste')} onPress={() => pasteInto('text')} />
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
              <LinkButton label={t('common:actions.paste')} onPress={() => pasteInto('url')} />
            </View>
            <TextInput
              testID="check-url"
              accessibilityLabel={t('link.a11y')}
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
        </>
      )}

      <Divider />

      <View style={[styles.section, { gap: 14 }]}>
        <SectionTitle>{t('optional.title')}</SectionTitle>
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
  small: { minHeight: 48 },
});

export default CheckScreen;
