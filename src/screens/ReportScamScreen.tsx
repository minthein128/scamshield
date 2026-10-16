import React, { useCallback, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '../components/Screen';
import { Text, TextInput } from '../components/Text';
import { Button, Card, Chip, LinkButton, Notice, ScreenHeader } from '../components/ui';
import { countryName } from '../lib/countries';
import { SCAM_CHOICES, buildReportRequest, reportReady, type ChoosableScam } from '../lib/feedback';
import { PreparedImage, pickScreenshot } from '../lib/image';
import type { RootScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const ReportScamScreen: React.FC<RootScreenProps<'ReportScam'>> = ({ navigation }) => {
  const { t } = useTranslation(['feedback', 'check', 'common']);
  const { language, profile } = useAppState();
  const [text, setText] = useState('');
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [scamType, setScamType] = useState<ChoosableScam | null>(null);
  const [lostMoney, setLostMoney] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const paste = useCallback(async () => {
    const value = (await Clipboard.getStringAsync()).trim();
    if (!value) setNotice(t('check:errors.clipboardEmpty'));
    else {
      setNotice(null);
      setText(value);
    }
  }, [t]);

  const pick = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    try {
      const prepared = await pickScreenshot();
      if (prepared) setImage(prepared);
    } catch {
      setNotice(t('check:errors.image'));
    } finally {
      setBusy(false);
    }
  }, [t]);

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
    if (request) navigation.navigate('Checking', { request, source: t('reportScam.source'), reported: true });
  };

  return (
    <Screen footer={<Button testID="report-scam-submit" label={t('reportScam.submit')} onPress={submit} disabled={!ready || busy} />} header={<ScreenHeader title={t('reportScam.title')} onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs'))} />}>
      <Text style={styles.body}>{t('reportScam.intro')}</Text>
      <Text testID="report-scam-share-note" style={styles.body}>{t('reportScam.shareNote')}</Text>

      <View style={{ gap: 6 }}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{t('reportScam.textLabel')}</Text>
          <LinkButton label={t('common:actions.paste')} onPress={paste} />
        </View>
        <TextInput
          testID="report-scam-text"
          accessibilityLabel={t('reportScam.textA11y')}
          multiline
          value={text}
          onChangeText={setText}
          placeholder={t('reportScam.placeholder')}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.textArea]}
        />
      </View>

      <Card style={{ gap: 10 }}>
        <Text style={styles.label}>{t('reportScam.screenshotLabel')}</Text>
        {image ? (
          <View style={styles.imageRow}>
            <Image source={{ uri: image.uri }} style={styles.thumb} resizeMode="cover" />
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={styles.meta}>{t('check:screenshot.ready', { kb: Math.round(image.bytes / 1024) })}</Text>
              <Button label={t('common:actions.remove')} variant="secondary" onPress={() => setImage(null)} />
            </View>
          </View>
        ) : (
          <Button
            testID="report-scam-pick-image"
            label={busy ? t('check:screenshot.preparing') : Platform.OS === 'web' ? t('check:screenshot.upload') : t('check:screenshot.pick')}
            variant="secondary"
            disabled={busy}
            onPress={pick}
          />
        )}
      </Card>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>{t('reportScam.kindLabel')}</Text>
        <View style={styles.wrap}>
          {SCAM_CHOICES.map(c => (
            <Chip key={c.type} label={c.label} selected={scamType === c.type} onPress={() => setScamType(c.type)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>{t('reportScam.lostLabel')}</Text>
        <View style={styles.wrap}>
          <Chip label={t('reportScam.yes')} selected={lostMoney === true} onPress={() => setLostMoney(lostMoney === true ? null : true)} />
          <Chip label={t('reportScam.no')} selected={lostMoney === false} onPress={() => setLostMoney(lostMoney === false ? null : false)} />
        </View>
        <Text style={styles.meta}>{t('reportScam.lostNote')}</Text>
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
