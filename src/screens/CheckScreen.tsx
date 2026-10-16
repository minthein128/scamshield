import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '../components/Screen';
import { Text, TextInput } from '../components/Text';
import { BlockIcon } from '../components/blockIcons';
import { Button, Notice } from '../components/ui';
import { Icon } from '../components/Icon';
import { HeaderWithLeave } from '../components/LeaveQuickly';
import { Select } from '../components/Select';
import { SourceBlock } from '../components/SourceBlock';
import { InputBlock, TextBox } from '../components/CheckBlocks';
import { UI_LANGUAGES } from '../i18n/languages';
import { countryName } from '../lib/countries';
import { hasInput } from '../api';
import type { CheckKind } from '../api/types';
import { PreparedImage, pickScreenshot, prepareImage } from '../lib/image';
import { KIND_OPTIONS, buildJobRequest, buildRequest, jobSourceLabel, looksLikeUrl, sourceLabel } from '../lib/request';
import type { TabScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

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
  const [chatText, setChatText] = useState('');
  const [chatImage, setChatImage] = useState<PreparedImage | null>(null);
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

  const attachImage = useCallback(async (loader: () => Promise<PreparedImage | null>, target: (image: PreparedImage) => void = setImage) => {
    setBusy(true);
    setNotice(null);
    try {
      const prepared = await loader();
      if (prepared) target(prepared);
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
    else if (target === 'url' || (looksLikeUrl(value) && kind !== 'job')) changeUrl(value);
    else setText(value);
  }, [t, changeUrl, kind]);

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
  const isJob = kind === 'job';
  const ready = isJob
    ? hasInput({ text, imageBase64: image?.base64 }) || hasInput({ text: chatText, imageBase64: chatImage?.base64 })
    : hasInput({ text, url, imageBase64: image?.base64 });

  const submit = () => {
    if (isJob) {
      const jobForm = { ...form, chatText, chatImageBase64: chatImage?.base64, chatImageMimeType: chatImage?.mimeType };
      navigation.getParent()?.navigate('Checking', { job: { phase: 'extract', request: buildJobRequest(jobForm) }, source: jobSourceLabel(jobForm) });
      return;
    }
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
          {ready ? null : <Text testID="check-submit-hint" style={styles.hint}>{isJob ? t('job.submitHint') : t('submitHint')}</Text>}
          <Button testID="check-submit" label={isJob ? t('job.submit') : t('submit')} leading={<BlockIcon name="search" size={22} color={ready && !busy ? colors.white : colors.textSecondary} />} onPress={submit} disabled={!ready || busy} mutedDisabled />
        </>
      }
    >
      {isJob ? (
        <>
          <SourceBlock
            testID="job-ad"
            icon="briefcase"
            title={t('job.ad.title')}
            hint={t('job.ad.hint')}
            a11y={t('job.ad.a11y')}
            placeholder={t('job.ad.placeholder')}
            pickHint={t('job.ad.pickHint')}
            text={text}
            image={image}
            busy={busy}
            onText={setText}
            onPaste={() => pasteInto('text')}
            onPick={() => attachImage(pickScreenshot)}
            onRemove={() => setImage(null)}
          />
          <SourceBlock
            testID="job-chat"
            icon="chat"
            title={t('job.chat.title')}
            hint={t('job.chat.hint')}
            a11y={t('job.chat.a11y')}
            placeholder={t('job.chat.placeholder')}
            pickHint={t('job.chat.pickHint')}
            optional
            text={chatText}
            image={chatImage}
            busy={busy}
            onText={setChatText}
            onPaste={() => pasteInto('chat')}
            onPick={() => attachImage(pickScreenshot, setChatImage)}
            onRemove={() => setChatImage(null)}
          />
        </>
      ) : (
        <>
          <SourceBlock
            testID="check"
            icon="chat"
            title={t('text.title')}
            hint={t('text.hint')}
            a11y={t('text.a11y')}
            placeholder={t('text.placeholder')}
            pickHint={t('screenshot.pickHint')}
            text={text}
            image={image}
            busy={busy}
            onText={setText}
            onPaste={() => pasteInto('text')}
            onPick={() => attachImage(pickScreenshot)}
            onRemove={() => setImage(null)}
          />
          <InputBlock testID="check-link" icon="link" title={t('link.label')} hint={t('link.hint')}>
            <TextBox testID="check-url" a11y={t('link.a11y')} placeholder="https://" value={url} onChange={changeUrl} onPaste={() => pasteInto('url')} pasteLabel={t('common:actions.paste')} multiline={false} url />
          </InputBlock>
        </>
      )}

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
  section: { gap: 8 },
  label: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold, includeFontPadding: false },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontFamily: fonts.regular },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, textAlign: 'center' },
  moreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  moreText: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
});

export default CheckScreen;
