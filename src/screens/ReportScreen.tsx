import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Screen } from '../components/Screen';
import { Button, Card, Pill, ScreenHeader, SectionTitle } from '../components/ui';
import { getApiClient } from '../api';
import type { CheckAction } from '../api/types';
import { languageOption } from '../lib/languages';
import {
  SCAM_TYPE_LABELS,
  VERDICT_STYLES,
  WEB_RISK_LABELS,
  filledSegments,
  groupFlags,
  hotlineNumber,
  shareMessage,
  telUrl,
} from '../lib/report';
import { notify, shareText } from '../lib/notify';
import { speak, stopSpeaking } from '../lib/speech';
import type { RootScreenProps } from '../navigation/types';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const SEVERITY_COLORS = {
  high: { bg: colors.dangerSoftBg, fg: colors.dangerSoftText },
  medium: { bg: colors.amberLight, fg: colors.amberDark },
  low: { bg: colors.codeBg, fg: colors.codeText },
};

export const ReportScreen: React.FC<RootScreenProps<'Report'>> = ({ navigation, route }) => {
  const { result, language, fresh } = route.params;
  const style = VERDICT_STYLES[result.verdict];
  const groups = groupFlags(result.flags);
  const sources = result.sources ?? [];
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (fresh && result.verdict !== 'safe') {
      setSpeaking(true);
      speak(result.spokenWarning, language, () => setSpeaking(false), getApiClient()).catch(() => setSpeaking(false));
    }
    return () => stopSpeaking();
  }, [fresh, result, language]);

  const toggleSpeech = async () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    await speak(result.spokenWarning, language, () => setSpeaking(false), getApiClient()).catch(() => setSpeaking(false));
  };

  const callAction = result.actions.find(a => a.type === 'call');
  const number = hotlineNumber(callAction);

  const shareResult = async () => {
    await shareText(shareMessage(result));
  };

  const run = (action: CheckAction) => {
    switch (action.type) {
      case 'call': {
        const target = hotlineNumber(action);
        if (target) Linking.openURL(telUrl(target)).catch(() => undefined);
        else notify('No hotline number is set for this region yet.');
        break;
      }
      case 'share':
        shareResult();
        break;
      case 'learn':
        navigation.navigate('Tabs', { screen: 'Learn' });
        break;
      case 'block':
        notify('Block the sender', action.value ? `Block ${action.value} in the app where you found it.` : 'Block and report the sender in the app where you found it.');
        break;
    }
  };

  const otherActions = result.actions.filter(a => a.type !== 'call' && a.type !== 'share');

  return (
    <Screen
      edges={['top']}
      footer={
        <>
          <Button testID="report-share" label="Share this warning" onPress={shareResult} />
          {number && result.verdict !== 'safe' ? (
            <Button testID="report-call" label={`Call hotline ${number}`} variant="secondary" onPress={() => callAction && run({ ...callAction, value: number })} />
          ) : null}
        </>
      }
    >
      <ScreenHeader title="Risk report" onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs'))} />

      <View style={[styles.banner, { backgroundColor: style.background }]} testID={`verdict-${result.verdict}`}>
        <View style={styles.bannerHeader}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <Path d="M12 9v4" />
            <Path d="M12 17h.01" />
          </Svg>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{style.label}</Text>
            <Text style={[styles.bannerSub, { color: style.subtle }]}>{SCAM_TYPE_LABELS[result.scamType]}</Text>
          </View>
          <Text style={styles.score}>{result.score}<Text style={styles.scoreMax}>/100</Text></Text>
        </View>
        <View style={styles.segments}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[styles.seg, { backgroundColor: i < filledSegments(result.score) ? colors.white : style.track }]} />
          ))}
        </View>
      </View>

      <Card style={{ gap: 10 }}>
        <Text style={styles.reportTitle}>{result.title}</Text>
        <Text style={styles.summary}>{result.summary}</Text>
        <View style={styles.listenRow}>
          <Button
            testID="report-listen"
            label={speaking ? 'Stop' : `Listen in ${languageOption(language).label}`}
            variant="dark"
            onPress={toggleSpeech}
            style={styles.small}
          />
        </View>
      </Card>

      {groups.length > 0 ? (
        <View style={{ gap: 12 }}>
          <SectionTitle>Why we flagged this</SectionTitle>
          {groups.map(group => (
            <View key={group.family} style={{ gap: 8 }}>
              <Text style={styles.family}>{group.label}</Text>
              {group.flags.map((flag, i) => {
                const sev = SEVERITY_COLORS[flag.severity];
                return (
                  <View key={`${flag.label}-${i}`} style={styles.flagCard}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.flagLabel}>{flag.label}</Text>
                      {flag.evidence ? <Text style={styles.flagEvidence}>{flag.evidence}</Text> : null}
                    </View>
                    <Pill label={flag.severity} background={sev.bg} color={sev.fg} />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}

      {sources.length > 0 ? (
        <View style={{ gap: 8 }}>
          <SectionTitle>Sources we checked</SectionTitle>
          {sources.map(src => (
            <TouchableOpacity key={src.url} accessibilityRole="link" activeOpacity={0.7} onPress={() => Linking.openURL(src.url).catch(() => undefined)} style={styles.flagCard}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text numberOfLines={2} style={styles.flagLabel}>{src.title}</Text>
                <Text numberOfLines={1} style={styles.link}>{src.url}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {result.linkChecks.length > 0 ? (
        <View style={{ gap: 8 }}>
          <SectionTitle>Link checks</SectionTitle>
          {result.linkChecks.map(link => {
            const clean = link.webRisk === 'clean';
            return (
              <View key={link.url} style={styles.flagCard}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text numberOfLines={2} style={styles.link}>{link.url}</Text>
                  <Text style={styles.flagEvidence}>
                    {link.domainAgeDays !== undefined ? `Domain age: ${link.domainAgeDays} days` : 'Domain age unknown'}
                    {link.registrar ? `, ${link.registrar}` : ''}
                  </Text>
                </View>
                <Pill
                  label={WEB_RISK_LABELS[link.webRisk]}
                  background={clean ? colors.safeBg : colors.dangerSoftBg}
                  color={clean ? colors.safeText : colors.dangerSoftText}
                />
              </View>
            );
          })}
        </View>
      ) : null}

      {otherActions.length > 0 ? (
        <View style={{ gap: 8 }}>
          <SectionTitle>What you can do</SectionTitle>
          {otherActions.map(a => (
            <Button key={a.label} label={a.label} variant="secondary" onPress={() => run(a)} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  banner: { borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18, gap: 10 },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerTitle: { fontSize: 22, lineHeight: 28, fontFamily: fonts.bold, letterSpacing: -0.3, color: colors.white, includeFontPadding: false },
  bannerSub: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, includeFontPadding: false },
  score: { fontSize: 26, lineHeight: 32, fontFamily: fonts.extraBold, color: colors.white },
  scoreMax: { fontSize: 13, fontFamily: fonts.medium },
  segments: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 6, borderRadius: 3 },
  reportTitle: { fontSize: 16, lineHeight: 22, fontFamily: fonts.bold, color: colors.textPrimary },
  summary: { fontSize: 14, lineHeight: 22, fontFamily: fonts.medium, color: colors.textPrimary },
  listenRow: { flexDirection: 'row' },
  small: { height: 40 },
  family: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  flagCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  flagLabel: { fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold, color: colors.textPrimary },
  flagEvidence: { fontSize: 12, lineHeight: 17, fontFamily: fonts.regular, color: colors.textSecondary },
  link: { fontSize: 12, lineHeight: 16, fontFamily: fonts.mono, color: colors.codeText },
});

export default ReportScreen;
