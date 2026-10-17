import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Linking, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button, Card, LinkButton, Pill, SectionTitle } from '../components/ui';
import { HeaderWithLeave } from '../components/LeaveQuickly';
import { getApiClient } from '../api';
import type { CheckAction, Verdict } from '../api/types';
import {
  VERDICT_STYLES,
  groupFlags,
  linkStatus,
  shareMessage,
  sourceLines,
  warnMessage,
} from '../lib/report';
import { callLabel } from '../lib/callLabel';
import { scamTypeLabel } from '../lib/labels';
import { TIER_VERDICT, resultWord, stepWord, tierHeadline } from '../lib/attention';
import { hotlineFocus, resolveCallTarget } from '../lib/hotlines';
import { useLayout } from '../hooks/useLayout';
import { useRuntimeConfig } from '../lib/runtimeConfig';
import { seenLine } from '../lib/radar';
import { callNumber } from '../lib/warn';
import { WarnFamilySheet } from '../components/WarnFamilySheet';
import { Avatar } from '../components/Avatar';
import { BrandMark } from '../components/BrandMark';
import { VERDICT_MOOD } from '../components/DollLoader';
import { ConflictCard } from '../components/ConflictCard';
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
const STEPS: Verdict[] = ['safe', 'careful', 'danger'];

/** The summary ends on the instruction: its last sentence leads, the explanation follows. */
function splitHero(summary: string): [string, string] {
  const text = summary.trim();
  const sentences = (text.match(/[^.!?။。]+(?:[.!?။。]+|$)\s*/g) ?? []).map(x => x.trim()).filter(Boolean);
  if (sentences.length < 2) return [text, ''];
  return [sentences[sentences.length - 1], sentences.slice(0, -1).join(' ')];
}

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
  const tier = result.attention;
  const level: Verdict = tier ? TIER_VERDICT[tier] : result.verdict;
  const word = resultWord(result);
  const style = VERDICT_STYLES[level];
  const conflicts = result.conflicts ?? [];
  const unclear = result.stillUnclear ?? [];
  const findings = result.findings ?? [];
  const flags = groupFlags(result.flags).flatMap(g => g.flags);
  const sources = result.sources ?? [];
  const [warnOpen, setWarnOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const { profile, language: settingLanguage } = useAppState();
  const { width } = useWindowDimensions();
  const layout = useLayout();
  const tablet = layout.isTablet;
  const narrow = width < 360;
  const [hero, rest] = tier ? [tierHeadline(tier), result.summary] : splitHero(result.summary);
  const isDanger = level === 'danger';
  const showTitle = !tier && !result.title.toLowerCase().includes(word.toLowerCase());

  useEffect(() => {
    if (fresh && result.verdict !== 'safe') {
      speak(result.spokenWarning, language, () => undefined, getApiClient()).catch(() => undefined);
    }
    return () => stopSpeaking();
  }, [fresh, result, language]);

  useRuntimeConfig();
  const callAction = result.actions.find(a => a.type === 'call');
  const hotline = resolveCallTarget(callAction?.value, profile.destinationCountry, profile.homeCountry, hotlineFocus(result));

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

  const otherActions = result.actions.filter(a => a.type !== 'call' && a.type !== 'share' && !(level === 'safe' && a.type === 'learn'));

  const leftTop = (
    <>
      <View style={[styles.banner, { backgroundColor: style.background }]} testID={`verdict-${level}`} accessible accessibilityLabel={t('a11yVerdict', { verdict: word, step: STEPS.indexOf(level) + 1 })}>
        <View style={styles.bannerDoll}>
          <BrandMark size={narrow ? 64 : 80} medallion="#FCEFD2" mood={VERDICT_MOOD[level]} />
        </View>
        <View style={styles.bannerText}>
          <Text wrap="word" style={styles.bannerTitle}>{word}</Text>
          {result.scamType !== 'none' && !tier ? <Text style={[styles.bannerSub, { color: style.subtle }]}>{scamTypeLabel(result.scamType, result.kind)}</Text> : null}
        </View>
      </View>
      <View style={styles.meter} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {STEPS.map(step => {
          const on = step === level;
          return (
            <View key={step} testID={`meter-${step}`} style={styles.meterStep}>
              <View style={[styles.seg, { backgroundColor: on ? VERDICT_STYLES[step].background : colors.borderLight }]} />
              <Text style={[styles.meterLabel, on && styles.meterLabelOn]}>{stepWord(step, tier)}</Text>
            </View>
          );
        })}
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

      {isDanger ? (
        <View testID="report-hero" style={styles.hero}>
          <Text accessibilityRole="header" style={[styles.heroText, readable(tablet, 24, 34)]}>{hero}</Text>
          {rest ? <Text style={[styles.summary, readable(tablet, 16, 24)]}>{rest}</Text> : null}
          {showTitle ? <Text style={styles.heroTitle}>{result.title}</Text> : null}
        </View>
      ) : (
        <Card style={{ gap: 8 }}>
          {tier ? <Text accessibilityRole="header" style={[styles.reportTitle, readable(tablet, 20, 28)]}>{hero}</Text> : showTitle ? <Text style={[styles.reportTitle, readable(tablet, 20, 28)]}>{result.title}</Text> : null}
          <Text style={[styles.summary, readable(tablet, 16, 24)]}>{tier ? rest : result.summary}</Text>
        </Card>
      )}

      {tier && tier !== 'pause' ? <Text testID="report-tier-note" style={styles.tierNote}>{t(`attention.note.${tier}`)}</Text> : null}
    </>
  );
  const rightPane = (
    <>
      {conflicts.length > 0 ? (
        <View testID="report-conflicts" style={{ gap: 12 }}>
          <SectionTitle>{t('conflicts.title')}</SectionTitle>
          {conflicts.map((c, i) => (
            <ConflictCard key={`${c.field}-${i}`} conflict={c} tablet={tablet} />
          ))}
        </View>
      ) : null}

      {unclear.length > 0 ? (
        <View testID="report-unclear" style={{ gap: 12 }}>
          <SectionTitle>{t('unclear.title')}</SectionTitle>
          <View style={styles.unclearList}>
            {unclear.map((line, i) => (
              <View key={`${line}-${i}`} style={styles.unclearRow}>
                <Icon name="info" size={20} color={colors.textSecondary} />
                <Text style={[styles.flagEvidence, styles.unclearText, readable(tablet, 14, 20)]}>{line}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {findings.length > 0 ? (
        <View testID="report-findings" style={{ gap: 12 }}>
          <SectionTitle>{t('findings.title')}</SectionTitle>
          <View style={styles.unclearList}>
            {findings.map((f, i) => (
              <View key={`${f.code}-${i}`} style={styles.unclearRow}>
                <Icon name="info" size={20} color={colors.textSecondary} />
                <Text style={[styles.flagEvidence, styles.unclearText, readable(tablet, 14, 20)]}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {flags.length > 0 ? (
        <View style={{ gap: 12 }}>
          <SectionTitle>{level === 'safe' ? t('flagsSafe') : t('flagsRisky')}</SectionTitle>
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
          {sources.map(src => {
            const lines = sourceLines(src);
            return (
              <TouchableOpacity key={src.url} testID="report-source" accessibilityRole="link" activeOpacity={0.7} onPress={() => Linking.openURL(src.url).catch(() => undefined)} style={styles.sourceCard}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text numberOfLines={2} style={styles.flagLabel}>{lines.title}</Text>
                  {lines.domain ? <Text numberOfLines={1} style={styles.link}>{lines.domain}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {result.linkChecks.length > 0 ? (
        <View style={{ gap: 8 }}>
          <SectionTitle>{t('linkChecks')}</SectionTitle>
          {result.linkChecks.map(link => {
            const status = linkStatus(link, result.flags, result.linkChecks);
            const clean = status === 'clean';
            const unchecked = status === 'unknown' || status === 'notListed';
            return (
              <View key={link.url} style={styles.sourceCard}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text numberOfLines={2} style={styles.link}>{link.url}</Text>
                  <Text style={styles.flagEvidence}>
                    {link.domainAgeDays !== undefined ? t('domainAge', { count: link.domainAgeDays }) : t('domainAgeUnknown')}
                    {link.registrar ? `, ${link.registrar}` : ''}
                  </Text>
                </View>
                <View testID={`link-status-${status}`} style={styles.linkPill}>
                  <Pill
                    label={t(`webRisk.${status}`)}
                    background={clean ? colors.safeBg : unchecked ? colors.borderLight : colors.dangerSoftBg}
                    color={clean ? colors.safeText : unchecked ? colors.textSecondary : colors.dangerSoftText}
                  />
                </View>
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
  const hasRight = conflicts.length > 0 || unclear.length > 0 || findings.length > 0 || flags.length > 0 || sources.length > 0 || result.linkChecks.length > 0;

  return (
    <Screen
      edges={['top']}
      header={<HeaderWithLeave title={t('title')} onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs'))} />}
      wide={layout.isExpanded}
      footerRow={tablet}
      footer={
        <>
          <Button testID="report-warn" label={t('warn')} icon="people" style={footerButton} onPress={() => setWarnOpen(true)} />
          {level !== 'safe' || tier ? (
            hotline?.dial ? (
              <Button testID="report-call" icon="phone" label={call.label} subLabel={call.sub} maxLines={3} subMaxLines={4} variant="secondary" style={footerButton} onPress={() => callNumber(hotline.dial ?? '')} />
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
  tierNote: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium },
  unclearList: { gap: 8, padding: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16 },
  unclearRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  unclearText: { flex: 1, minWidth: 0 },
  panes: { flexDirection: 'row', alignItems: 'flex-start', gap: PANE_GAP },
  pane: { flex: 1, flexBasis: 0, minWidth: 0, gap: 16 },
  footerButton: { flex: 1, flexBasis: 0, minWidth: 0 },
  talkButton: { alignSelf: 'stretch', minHeight: 56 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 24, paddingVertical: 20, paddingHorizontal: 20 },
  bannerDoll: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 32, lineHeight: 40, fontFamily: fonts.extraBold, letterSpacing: -0.3, color: colors.white, includeFontPadding: false },
  bannerSub: { fontSize: 15, lineHeight: 22, fontFamily: fonts.medium, includeFontPadding: false },
  bannerText: { flex: 1, minWidth: 0, gap: 4 },
  meter: { flexDirection: 'row', gap: 8 },
  meterStep: { flex: 1, flexBasis: 0, minWidth: 0, gap: 6 },
  seg: { height: 8, borderRadius: 4 },
  meterLabel: { fontSize: 13, lineHeight: 18, fontFamily: fonts.medium, color: colors.textSecondary, textAlign: 'center' },
  meterLabelOn: { fontFamily: fonts.extraBold, color: colors.textPrimary },
  hero: { gap: 10, paddingVertical: 4 },
  heroText: { fontSize: 24, lineHeight: 34, fontFamily: fonts.extraBold, color: colors.textPrimary },
  heroTitle: { fontSize: 15, lineHeight: 22, fontFamily: fonts.medium, color: colors.textSecondary },
  thanks: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.safeBg },
  thanksText: { flex: 1, color: colors.safeText, fontSize: 15, lineHeight: 22, fontFamily: fonts.semiBold },
  network: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, textAlign: 'center' },
  reportTitle: { fontSize: 20, lineHeight: 28, fontFamily: fonts.bold, color: colors.textPrimary },
  summary: { fontSize: 16, lineHeight: 24, fontFamily: fonts.medium, color: colors.textPrimary },
  flagCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16, paddingRight: 16, paddingLeft: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden' },
  flagBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  flagIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  linkPill: { maxWidth: '42%', flexShrink: 1, alignItems: 'flex-end' },
  sourceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  flagLabel: { fontSize: 15, lineHeight: 22, fontFamily: fonts.bold, color: colors.textPrimary },
  flagEvidence: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: colors.textSecondary },
  link: { fontSize: 13, lineHeight: 18, fontFamily: fonts.mono, color: colors.codeText },
});

export default ReportScreen;
