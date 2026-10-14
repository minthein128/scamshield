import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { BackButton, Card, SectionTitle } from '../components/ui';
import { Icon } from '../components/Icon';
import type { RootScreenProps } from '../navigation/types';
import theme from '../theme/theme';
import { ACCENTS } from './learn/accents';
import { DemoStepper } from './learn/DemoStepper';
import { LinkRow } from './learn/LinkRow';
import {
  GUIDE_ACTIONS, GUIDE_EXAMPLE, GUIDE_EXAMPLE_NOTE, GUIDE_HOW_IT_STARTS, GUIDE_SIGNS,
  findRedFlag, findScamType, type GuideAction,
} from './learn/content';

const { colors, fonts } = theme;

export const ScamGuideScreen: React.FC<RootScreenProps<'ScamGuide'>> = ({ navigation, route }) => {
  const scam = findScamType(route.params.type);
  if (!scam) return null;
  const { accent, soft } = ACCENTS[scam.id];

  const runAction = (a: GuideAction) => {
    if (a.kind === 'check') navigation.navigate('Tabs', { screen: 'Check' });
    else if (a.kind === 'help') navigation.navigate('GetHelp');
  };

  return (
    <Screen contentStyle={{ gap: 24 }}>
      <View style={styles.top}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.eyebrow}>Scam guide</Text>
      </View>

      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: soft }]}>
          <Icon name={scam.icon} size={28} color={accent} />
        </View>
        <Text accessibilityRole="header" style={styles.heroTitle}>{scam.title}</Text>
        <Text style={styles.heroHook}>{scam.hook}</Text>
      </View>

      <View style={styles.section}>
        <SectionTitle>{GUIDE_HOW_IT_STARTS}</SectionTitle>
        <Text style={styles.para}>{scam.howItStarts}</Text>
      </View>

      <View style={styles.section}>
        <SectionTitle>{GUIDE_SIGNS}</SectionTitle>
        <Card style={{ gap: 14 }}>
          {scam.signs.map((s, i) => {
            const flag = findRedFlag(s.family);
            return (
              <View key={i} style={styles.sign} accessible accessibilityLabel={`${flag?.title ?? 'Warning'}: ${s.text}`}>
                <View style={styles.signIcon}>
                  <Icon name={flag?.icon ?? 'flag'} size={18} color={colors.danger} />
                </View>
                <Text style={styles.signText}>{s.text}</Text>
              </View>
            );
          })}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>{GUIDE_EXAMPLE}</SectionTitle>
        <Text style={styles.note}>{GUIDE_EXAMPLE_NOTE}</Text>
        <DemoStepper steps={scam.example} accent={accent} testID="scam-stepper" />
      </View>

      <View style={styles.section}>
        <SectionTitle>{GUIDE_ACTIONS}</SectionTitle>
        {scam.actions.map(a =>
          a.kind === 'noPay' ? (
            <View key={a.kind} style={styles.stop} accessible accessibilityLabel={`${a.title}. ${a.body}`}>
              <View style={styles.stopIcon}>
                <Icon name="octagon" size={22} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stopTitle}>{a.title}</Text>
                <Text style={styles.stopBody}>{a.body}</Text>
              </View>
            </View>
          ) : (
            <LinkRow
              key={a.kind}
              testID={`guide-${a.kind}`}
              icon={a.kind === 'check' ? 'shieldCheck' : 'phone'}
              label={a.title}
              hint={a.body}
              onPress={() => runAction(a)}
            />
          ),
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { color: colors.textMuted, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold },
  hero: { gap: 8 },
  heroIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: colors.textPrimary, fontSize: 24, lineHeight: 30, fontFamily: fonts.extraBold },
  heroHook: { color: colors.textSecondary, fontSize: 16, lineHeight: 24, fontFamily: fonts.regular },
  section: { gap: 10 },
  para: { color: colors.textPrimary, fontSize: 16, lineHeight: 25, fontFamily: fonts.regular },
  note: { color: colors.textMuted, fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold },
  sign: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  signIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.dangerSoftBg, alignItems: 'center', justifyContent: 'center' },
  signText: { flex: 1, color: colors.textPrimary, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular, paddingTop: 4 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.dangerSoftBg, borderRadius: 14, padding: 14, minHeight: 56 },
  stopIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  stopTitle: { color: colors.dangerSoftText, fontSize: 15, lineHeight: 21, fontFamily: fonts.bold },
  stopBody: { color: colors.dangerDark, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
});

export default ScamGuideScreen;
