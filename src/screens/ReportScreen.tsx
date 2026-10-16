import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Linking, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button, Card, LinkButton, Pill, SectionTitle } from '../components/ui';
import { HeaderWithLeave } from '../components/LeaveQuickly';
import { getApiClient } from '../api';
import type { CheckAction } from '../api/types';
import {
  VERDICT_STYLES,
  filledSegments,
  groupFlags,
  shareMessage,
  warnMessage,
} from '../lib/report';
import { callLabel } from '../lib/callLabel';
import { scamTypeLabel, verdictLabel } from '../lib/labels';
import { resolveCallTarget } from '../lib/hotlines';
import { useLayout } from '../hooks/useLayout';
import { useRuntimeConfig } from '../lib/runtimeConfig';
import { seenLine } from '../lib/radar';
import { callNumber } from '../lib/warn';
import { WarnFamilySheet } from '../components/WarnFamilySheet';
import { Avatar } from '../components/Avatar';
import { LiveVoiceSheet } from '../components/LiveVoiceSheet';
import { FeedbackRow } from '../components/FeedbackRow';
import { canGiveFeedback } from '../lib/feedback';
import { useAppState } from '../state/AppState';
import { notify, shareText } from '../lib/notify';
import { speak, stopSpeaking } from '../lib/speech';
import type { RootScreenProps } from '../navigation/types';
import theme, { readable } from '../theme/theme';

const { colors, fonts } = theme;

const PANE_GAP = 24;

const SEVERITY = {
  high: { bg: colors.dangerSoftBg, fg: colors.dangerSoftText, bar: colors.danger },
  medium: { bg: colors.amberLight, fg: colors.amberDark, bar: colors.warningText },
  low: { bg: colors.codeBg, fg: colors.codeText, bar: colors.textMuted },
};

const FAMILY_ICONS: Record<string, IconName> = {
  too_good: 'gift',
  pressure: 'clock',
  payment_route: 'card',
  identity: 'user',
  link_risk: 'link',
  known_bad: 'flag',
  trafficking: 'octagon',
};

export const ReportScreen: React.FC<RootScreenProps<'Report'>> = ({ navigation, route }) => {
  const { t } = useTranslation(['report', 'common', 'live']);
  const { result, language, fresh, reported } = route.params;
  const style = VERDICT_STYLES[result.verdict];
  const flags = groupFlags(result.flags).flatMap(g => g.flags);
  const sources = result.sources ?? [];
  const [warnOpen, setWarnOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const { profile, language: settingLanguage } = useAppState();
  const { width } = useWindowDimensions();
  const layout = useLayout();
  const tablet = layout.isTablet;
  const narrow = width < 360;
  const score = <Text style={[styles.score, narrow && styles.scoreNarrow]}>{result.score}<Text style={styles.scoreMax}>/100</Text></Text>;

  useEffect(() => {
    if (fresh && result.verdict !== 'safe') {
      speak(result.spokenWarning, language, () => undefined, getApiClient()).catch(() => undefined);
    }
    return () => stopSpeaking();
  }, [fresh, result, language]);

  useRuntimeConfig();
  const callAction = result.actions.find(a => a.type === 'call');
  const hotline = resolveCallTarget(callAction?.value, profile.destinationCountry, profile.homeCountry);

  const call = hotline ? callLabel(hotline, { call: number => t('call', { number }), ext: ext => t('callExt', { ext }) }) : { label: '' };
  const talkLabel = t('live:button');
  const footerButton = tablet ? styles.footerButton : undefined;

  const shareResult = async () => {
    await shareText(shareMessage(result));
  };

  const run = (action: CheckAction) => {
    switch (action.type) {
      case 'call':
        if (hotline?.dial) callNumber(hotline.dial).catch(() => undefined);
        else navigation.navigate('GetHelp');
        break;
      case 'share':
        shareResult();
        break;
      case 'learn':
        navigation.navigate('Tabs', { screen: 'Learn' });
        break;
      case 'block':
        notify(t('block.title'), action.value ? t('block.withValue', { value: action.value }) : t('block.generic'));
        break;
    }
  };

  const otherActions = result.actions.filter(a => a.type !== 'call' && a.type !== 'share' && !(result.verdict === 'safe' && a.type === 'learn'));

  const leftTop = (
    <>
      <View style={[styles.banner, narrow && styles.bannerNarrow, { backgroundColor: style.background }]} testID={`verdict-${result.verdict}`} accessible accessibilityLabel={t('a11yVerdict', { verdict: verdictLabel(result.verdict), score: result.score })}>
        <View style={styles.bannerIcon}>
          <Icon name={result.verdict === 'safe' ? 'checkCircle' : result.verdict === 'danger' ? 'octagon' : 'alert'} size={36} color={colors.white} />
        </View>
        {narrow ? score : null}
        <View style={narrow ? styles.bannerTextNarrow : styles.bannerText}>
          <Text style={styles.bannerTitle}>{verdictLabel(result.verdict)}</Text>
          <Text style={[styles.bannerSub, { color: style.subtle }]}>{scamTypeLabel(result.scamType)}</Text>
        </View>
        {narrow ? null : score}
      </View>
      <View style={styles.segments}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[styles.seg, { backgroundColor: i < filledSegments(result.score) ? style.background : colors.borderLight }]} />
        ))}
      </View>

      {reported ? (
        <View testID="report-thanks" style={styles.thanks}>
          <Icon name="check" size={20} color={colors.safeText} />
          <Text style={styles.thanksText}>{t('thanks')}</Text>
        </View>
      ) : null}

      <View>
        <Button
          testID="report-talk"
          leading={<Avatar state="idle" size={30} decorative />}
          label={talkLabel}
          subLabel={t('live:buttonSub')}
          trailing={<Icon name="mic" size={24} color={colors.white} />}
          accessibilityLabel={t('live:a11yButton')}
          onPress={() => {
            stopSpeaking();
            setLiveOpen(true);
          }}
          style={styles.talkButton}
        />
      </View>

      {seenLine(result.network?.seenCount) ? (
        <Text testID="report-network" style={styles.network}>{seenLine(result.network?.seenCount)}</Text>
      ) : null}

      <Card style={{ gap: 8 }}>
        <Text style={[styles.reportTitle, readable(tablet, 20, 28)]}>{result.title}</Text>
        <Text style={[styles.summary, readable(tablet, 16, 24)]}>{result.summary}</Text>
      </Card>

    </>
  );
  const rightPane = (
    <>
      {flags.length > 0 ? (
        <View style={{ gap: 12 }}>
          <SectionTitle>{result.verdict === 'safe' ? t('flagsSafe') : t('flagsRisky')}</SectionTitle>
          {flags.map((flag, i) => {
            const sev = SEVERITY[flag.severity];
            return (
              <View key={`${flag.label}-${i}`} style={styles.flagCard}>
                <View style={[styles.flagBar, { backgroundColor: sev.bar }]} />
                <View style={[styles.flagIcon, { backgroundColor: sev.bg }]}>
                  <Icon name={FAMILY_ICONS[flag.family] ?? 'flag'} size={22} color={sev.fg} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.flagLabel, readable(tablet, 15, 22)]}>{flag.label}</Text>
                  {flag.evidence ? <Text numberOfLines={3} style={[styles.flagEvidence, readable(tablet, 14, 20)]}>{flag.evidence}</Text> : null}
                  <Pill label={t(`severity.${flag.severity}`)} background={sev.bg} color={sev.fg} />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {sources.length > 0 ? (
        <View style={{ gap: 8 }}>
          <SectionTitle>{t('sources')}</SectionTitle>
          {sources.map(src => (
            <TouchableOpacity key={src.url} accessibilityRole="link" activeOpacity={0.7} onPress={() => Linking.openURL(src.url).catch(() => undefined)} style={styles.sourceCard}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text numberOfLines={2} style={styles.flagLabel}>{src.title}</Text>
                <Text numberOfLines={1} style={styles.link}>{src.url}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {result.linkChecks.length > 0 ? (
        <View style={{ gap: 8 }}>
          <SectionTitle>{t('linkChecks')}</SectionTitle>
          {result.linkChecks.map(link => {
            const clean = link.webRisk === 'clean';
            return (
              <View key={link.url} style={styles.sourceCard}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text numberOfLines={2} style={styles.link}>{link.url}</Text>
                  <Text style={styles.flagEvidence}>
                    {link.domainAgeDays !== undefined ? t('domainAge', { count: link.domainAgeDays }) : t('domainAgeUnknown')}
                    {link.registrar ? `, ${link.registrar}` : ''}
                  </Text>
                </View>
                <Pill
                  label={t(`webRisk.${link.webRisk}`)}
                  background={clean ? colors.safeBg : colors.dangerSoftBg}
                  color={clean ? colors.safeText : colors.dangerSoftText}
                />
              </View>
            );
          })}
        </View>
      ) : null}

    </>
  );
  const leftBottom = (
    <>
      {otherActions.length > 0 ? (
        <View style={{ gap: 8 }}>
          <SectionTitle>{t('actions')}</SectionTitle>
          {otherActions.map(a => (
            <Button key={a.label} label={a.label} maxLines={2} variant="secondary" onPress={() => run(a)} />
          ))}
        </View>
      ) : null}

      {!reported && canGiveFeedback(result) ? <FeedbackRow result={result} /> : null}
    </>
  );
  const hasRight = flags.length > 0 || sources.length > 0 || result.linkChecks.length > 0;

  return (
    <Screen
      edges={['top']}
      header={<HeaderWithLeave title={t('title')} onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs'))} />}
      wide={layout.isExpanded}
      footerRow={tablet}
      footer={
        <>
          <Button testID="report-warn" label={t('warn')} icon="people" style={footerButton} onPress={() => setWarnOpen(true)} />
          {result.verdict !== 'safe' ? (
            hotline?.dial ? (
              <Button testID="report-call" icon="phone" label={call.label} subLabel={call.sub} variant="secondary" style={footerButton} onPress={() => callNumber(hotline.dial ?? '')} />
            ) : (
              <Button testID="report-help" label={t('help')} variant="secondary" style={footerButton} onPress={() => navigation.navigate('GetHelp')} />
            )
          ) : null}
          <LinkButton testID="report-share" label={t('share')} onPress={shareResult} />
        </>
      }
    >
      <WarnFamilySheet
        visible={warnOpen}
        message={warnMessage(result)}
        onClose={() => setWarnOpen(false)}
        onAddContact={() => navigation.navigate('Tabs', { screen: 'Contacts' })}
      />
      <LiveVoiceSheet
        visible={liveOpen}
        result={result}
        language={settingLanguage}
        home={profile.homeCountry}
        destination={profile.destinationCountry}
        onClose={() => setLiveOpen(false)}
        onGetHelp={() => {
          setLiveOpen(false);
          navigation.navigate('GetHelp');
        }}
        onAction={screen => {
          setLiveOpen(false);
          if (screen === 'HOTLINES') navigation.navigate('GetHelp');
          else setWarnOpen(true);
        }}
      />
      {layout.isExpanded ? (
        <View style={styles.panes}>
          <View style={styles.pane}>
{leftTop}
{leftBottom}
          </View>
          {hasRight ? <View style={styles.pane}>{rightPane}</View> : null}
        </View>
      ) : (
        <>
          {leftTop}
          {rightPane}
          {leftBottom}
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  panes: { flexDirection: 'row', alignItems: 'flex-start', gap: PANE_GAP },
  pane: { flex: 1, flexBasis: 0, minWidth: 0, gap: 16 },
  footerButton: { flex: 1, flexBasis: 0, minWidth: 0 },
  talkButton: { alignSelf: 'stretch', minHeight: 56 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20 },
  bannerIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 28, lineHeight: 34, fontFamily: fonts.extraBold, letterSpacing: -0.3, color: colors.white, includeFontPadding: false },
  bannerSub: { fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, includeFontPadding: false },
  score: { fontSize: 32, lineHeight: 36, fontFamily: fonts.extraBold, color: colors.white },
  scoreMax: { fontSize: 14, fontFamily: fonts.medium },
  bannerNarrow: { flexWrap: 'wrap', paddingVertical: 20, paddingHorizontal: 16 },
  bannerText: { flex: 1, minWidth: 0, gap: 4 },
  bannerTextNarrow: { flexBasis: '100%', gap: 4 },
  scoreNarrow: { marginLeft: 'auto' },
  segments: { flexDirection: 'row', gap: 4, marginTop: -8 },
  seg: { flex: 1, height: 8, borderRadius: 4 },
  thanks: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.safeBg },
  thanksText: { flex: 1, color: colors.safeText, fontSize: 15, lineHeight: 22, fontFamily: fonts.semiBold },
  network: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, textAlign: 'center' },
  reportTitle: { fontSize: 20, lineHeight: 28, fontFamily: fonts.bold, color: colors.textPrimary },
  summary: { fontSize: 16, lineHeight: 24, fontFamily: fonts.medium, color: colors.textPrimary },
  flagCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16, paddingRight: 16, paddingLeft: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden' },
  flagBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  flagIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sourceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  flagLabel: { fontSize: 15, lineHeight: 22, fontFamily: fonts.bold, color: colors.textPrimary },
  flagEvidence: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: colors.textSecondary },
  link: { fontSize: 13, lineHeight: 18, fontFamily: fonts.mono, color: colors.codeText },
});

export default ReportScreen;
