import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '../components/Screen';
import { Text, TextInput } from '../components/Text';
import { BlockIcon } from '../components/blockIcons';
import { BrandLockup } from '../components/BrandMark';
import { LeaveQuicklyButton } from '../components/LeaveQuickly';
import { AddedBar, CheckCard, FileCard, FoldRow, ModeChips, OrDivider, TextBox, UploadBox } from '../components/CheckBlocks';
import { Button, Notice } from '../components/ui';
import { Select } from '../components/Select';
import { UI_LANGUAGES } from '../i18n/languages';
import { appName } from '../config/brand';
import { countryName } from '../lib/countries';
import { hasInput } from '../api';
import { PreparedImage, pickScreenshot, prepareSharedImage } from '../lib/image';
import { CHECK_MODES, CheckMode, buildJobRequest, buildRequest, jobSourceLabel, kindForMode, looksLikeUrl, modeForKind, sourceLabel } from '../lib/request';
import { useClipboardHasText } from '../hooks/useClipboardText';
import type { TabScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

interface SourceProps {
  id: string;
  title: string;
  optional?: string;
  hint?: string;
  a11y: string;
  placeholder: string;
  text: string;
  image: PreparedImage | null;
  busy: boolean;
  hasClip: boolean;
  notice?: string | null;
  focusKey?: number;
  onText: (value: string) => void;
  onClip: () => void;
  onPick: () => void;
  onRemove: () => void;
}

async function readClipboard(): Promise<string> {
  try {
    return (await Clipboard.getStringAsync()).trim();
  } catch {
    return '';
  }
}

/** One card: a text box with an OR line and the upload box, or the picture and text once added. */
const SourceCard: React.FC<SourceProps> = ({ id, title, optional, hint, a11y, placeholder, text, image, busy, hasClip, notice, focusKey, onText, onClip, onPick, onRemove }) => {
  const { t } = useTranslation(['check', 'common']);
  const empty = !image && !text;
  return (
    <CheckCard testID={id} title={title} optional={optional} hint={image ? undefined : hint}>
      {notice ? <Notice testID={`${id}-notice`} message={notice} /> : null}
      {image ? (
        <FileCard
          testID={`${id}-file`}
          image={image}
          name={image.name ?? t('screenshot.ready', { kb: Math.round(image.bytes / 1024) })}
          added={t('screenshot.added')}
          replaceLabel={t('screenshot.replace')}
          removeLabel={t('common:actions.remove')}
          busy={busy}
          onReplace={onPick}
          onRemove={onRemove}
        />
      ) : null}
      {!image || text ? <TextBox testID={`${id}-text`} a11y={a11y} placeholder={placeholder} value={text} onChange={onText} clipLabel={hasClip ? t('clip') : undefined} onClip={onClip} focusKey={focusKey} /> : null}
      {empty ? (
        <>
          <OrDivider label={t('or')} />
          <UploadBox testID={`${id}-pick`} label={busy ? t('screenshot.preparing') : t('upload')} busy={busy} onPress={onPick} />
        </>
      ) : null}
    </CheckCard>
  );
};

export const CheckScreen: React.FC<TabScreenProps<'Check'>> = ({ navigation, route }) => {
  const { t } = useTranslation(['check', 'common']);
  const { language, setLanguage, profile } = useAppState();
  const [mode, setMode] = useState<CheckMode>('message');
  const [moreOpen, setMoreOpen] = useState(false);
  const [text, setText] = useState('');
  const [destination, setDestination] = useState(countryName(profile.destinationCountry));
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [chatText, setChatText] = useState('');
  const [chatImage, setChatImage] = useState<PreparedImage | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ id: string; message: string } | null>(null);
  const hasClip = useClipboardHasText();

  const attachImage = useCallback(async (loader: () => Promise<PreparedImage | null>, target: (image: PreparedImage) => void = setImage, cardId = 'check') => {
    setBusy(true);
    setNotice(null);
    try {
      const prepared = await loader();
      if (prepared) target(prepared);
    } catch {
      setNotice({ id: cardId, message: t('errors.image') });
    } finally {
      setBusy(false);
    }
  }, [t]);

  const pasteInto = useCallback(async (target: (value: string) => void, cardId = 'check') => {
    const value = await readClipboard();
    if (!value) {
      setNotice({ id: cardId, message: t('errors.clipboardEmpty') });
      return;
    }
    setNotice(null);
    target(value);
  }, [t]);

  const clearDraft = () => {
    setText('');
    setImage(null);
    setChatText('');
    setChatImage(null);
    setNotice(null);
  };

  const nonce = route.params?.nonce;
  useEffect(() => {
    const params = route.params;
    if (!params || !params.nonce) return;
    const { draft, intent } = params;
    clearDraft();
    if (draft) {
      if (draft.kind) setMode(modeForKind(draft.kind));
      const shared = [draft.text, draft.url].filter(Boolean).join(' ');
      if (shared) setText(shared);
      if (draft.imageUri) {
        const uri = draft.imageUri;
        attachImage(() => prepareSharedImage(uri), setImage, draft.kind && modeForKind(draft.kind) === 'job' ? 'job-ad' : 'check');
      }
    } else if (intent === 'text') {
      setMode('message');
    } else if (intent === 'image') {
      setMode('message');
      attachImage(pickScreenshot);
    } else if (intent === 'link') {
      setMode('message');
      setFocusKey(k => k + 1);
      void pasteInto(setText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  const isJob = mode === 'job';
  const ready = isJob
    ? hasInput({ text, imageBase64: image?.base64 }) || hasInput({ text: chatText, imageBase64: chatImage?.base64 })
    : hasInput({ text, imageBase64: image?.base64 });

  const submit = () => {
    const base = { destination, home: countryName(profile.homeCountry), shareSignals: profile.shareSignals, language };
    if (isJob) {
      const jobForm = { ...base, kind: 'job' as const, text, url: '', imageBase64: image?.base64, imageMimeType: image?.mimeType, chatText, chatImageBase64: chatImage?.base64, chatImageMimeType: chatImage?.mimeType };
      navigation.getParent()?.navigate('Checking', { job: { phase: 'extract', request: buildJobRequest(jobForm) }, source: jobSourceLabel(jobForm) });
      return;
    }
    const asLink = looksLikeUrl(text);
    const form = { ...base, kind: kindForMode(mode, text), text: asLink ? '' : text, url: asLink ? text.trim() : '', imageBase64: image?.base64, imageMimeType: image?.mimeType };
    navigation.getParent()?.navigate('Checking', { request: buildRequest(form), source: sourceLabel(form) });
  };

  const common = { busy, hasClip };
  const added = [hasInput({ text, imageBase64: image?.base64 }) ? t('job.added.ad') : '', hasInput({ text: chatText, imageBase64: chatImage?.base64 }) ? t('job.added.chat') : ''].filter(Boolean);

  return (
    <Screen
      header={
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <BrandLockup />
          </View>
          <LeaveQuicklyButton />
        </View>
      }
      footer={
        <>
          {ready ? null : <Text testID="check-submit-hint" style={styles.hint}>{isJob ? t('job.submitHint') : t('submitHint')}</Text>}
          <Button testID="check-submit" label={isJob ? t('job.submit') : t('submit')} leading={<BlockIcon name="magnify" size={22} color={ready && !busy ? colors.white : colors.textSecondary} strokeWidth={2.2} />} onPress={submit} disabled={!ready || busy} mutedDisabled />
          <Text testID="check-warn" style={styles.warn}>{t('warn', { app: appName() })}</Text>
        </>
      }
    >
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={styles.title}>{t('title')}</Text>
        <Text style={styles.sub}>{t('sub')}</Text>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={styles.question}>{t('whatIsIt')}</Text>
        <ModeChips testID="check-mode" value={mode} onChange={v => setMode(v as CheckMode)} options={CHECK_MODES.map(m => ({ value: m, label: t(`chips.${m}`) }))} />
      </View>

      {isJob ? (
        <>
          <SourceCard
            {...common}
            id="job-ad"
            notice={notice?.id === 'job-ad' ? notice.message : null}
            title={t('job.step1')}
            hint={t('job.step1Hint')}
            a11y={t('job.ad.a11y')}
            placeholder={t('job.ad.placeholder')}
            text={text}
            image={image}
            onText={setText}
            onClip={() => pasteInto(setText, 'job-ad')}
            onPick={() => attachImage(pickScreenshot, setImage, 'job-ad')}
            onRemove={() => setImage(null)}
          />
          <SourceCard
            {...common}
            id="job-chat"
            notice={notice?.id === 'job-chat' ? notice.message : null}
            title={t('job.step2')}
            optional={t('job.optional')}
            hint={t('job.step2Hint')}
            a11y={t('job.chat.a11y')}
            placeholder={t('job.chat.placeholder')}
            text={chatText}
            image={chatImage}
            onText={setChatText}
            onClip={() => pasteInto(setChatText, 'job-chat')}
            onPick={() => attachImage(pickScreenshot, setChatImage, 'job-chat')}
            onRemove={() => setChatImage(null)}
          />
          {added.length ? <AddedBar testID="job-added" items={added} /> : null}
        </>
      ) : (
        <SourceCard
          {...common}
          id="check"
          notice={notice?.id === 'check' ? notice.message : null}
          focusKey={focusKey}
          title={t(`${mode}.title`)}
          a11y={t('text.a11y')}
          placeholder={t(`${mode}.placeholder`)}
          text={text}
          image={image}
          onText={setText}
          onClip={() => pasteInto(setText)}
          onPick={() => attachImage(pickScreenshot)}
          onRemove={() => setImage(null)}
        />
      )}

      <FoldRow testID="check-more" label={t('more.title')} open={moreOpen} onToggle={() => setMoreOpen(open => !open)}>
        <Text style={styles.label}>{t('destination.label')}</Text>
        <TextInput
          testID="check-destination"
          accessibilityLabel={t('destination.a11y')}
          value={destination}
          onChangeText={setDestination}
          placeholder={t('destination.placeholder')}
          placeholderTextColor="#8C847C"
          style={styles.input}
        />
        <Select
          testID="check-language"
          label={t('optional.language')}
          value={language}
          options={UI_LANGUAGES.map(l => ({ value: l.code, label: l.label }))}
          onChange={setLanguage}
        />
      </FoldRow>

    </Screen>
  );
};

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  title: { color: colors.textPrimary, fontSize: 27, lineHeight: 36, fontFamily: fonts.extraBold, letterSpacing: -0.4, includeFontPadding: false },
  sub: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular },
  question: { color: colors.textPrimary, fontSize: 15.5, lineHeight: 22, fontFamily: fonts.extraBold, includeFontPadding: false },
  label: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.bold, includeFontPadding: false },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 12, color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.regular },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, textAlign: 'center' },
  warn: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, fontFamily: fonts.regular, textAlign: 'center' },
});

export default CheckScreen;
