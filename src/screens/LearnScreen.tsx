import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../components/Screen';
import { ScreenHeader, SectionTitle } from '../components/ui';
import { Icon } from '../components/Icon';
import type { TabScreenProps } from '../navigation/types';
import theme from '../theme/theme';
import { FlagSheet } from './learn/FlagSheet';
import { LinkRow } from './learn/LinkRow';
import { ScamCard } from './learn/ScamCard';
import {
  FLAGS_HEADING, FLAGS_HINT, HELP_ROW, LEARN_TAGLINE, LEARN_TITLE, RED_FLAGS, REPORT_ROW,
  SCAMS_HEADING, SCAM_TYPES, SHIELD_ROW_HINT, SHIELD_ROW_TITLE, type RedFlag,
} from './learn/content';
import { openReportScam } from './learn/nav';

const { colors, fonts } = theme;

const pairs = <T,>(items: T[]): (T | null)[][] => {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push([items[i], items[i + 1] ?? null]);
  return rows;
};

export const LearnScreen: React.FC<TabScreenProps<'Learn'>> = ({ navigation }) => {
  const [flag, setFlag] = useState<RedFlag | null>(null);
  return (
    <Screen contentStyle={styles.content}>
      <View style={{ gap: 6 }}>
        <ScreenHeader title={LEARN_TITLE} />
        <Text style={styles.tagline}>{LEARN_TAGLINE}</Text>
      </View>

      <View style={styles.section}>
        <SectionTitle>{SCAMS_HEADING}</SectionTitle>
        {SCAM_TYPES.map(scam => (
          <ScamCard key={scam.id} scam={scam} onPress={() => navigation.navigate('ScamGuide', { type: scam.id })} />
        ))}
      </View>

      <View style={styles.section}>
        <SectionTitle>{FLAGS_HEADING}</SectionTitle>
        <Text style={styles.hint}>{FLAGS_HINT}</Text>
        {pairs(RED_FLAGS).map(([a, b], i) => (
          <View key={i} style={styles.chipRow}>
            {[a, b].map((f, j) =>
              f ? (
                <TouchableOpacity
                  key={f.family}
                  testID={`flag-${f.family}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.title}. ${f.explain}`}
                  accessibilityHint="Opens an explanation"
                  activeOpacity={0.7}
                  onPress={() => setFlag(f)}
                  style={styles.chip}
                >
                  <Icon name={f.icon} size={20} color={colors.danger} />
                  <Text style={styles.chipText}>{f.name}</Text>
                </TouchableOpacity>
              ) : (
                <View key={j} style={{ flex: 1 }} />
              ),
            )}
          </View>
        ))}
      </View>

      <LinkRow
        testID="learn-shield-howto"
        icon="shield"
        label={SHIELD_ROW_TITLE}
        hint={SHIELD_ROW_HINT}
        onPress={() => navigation.navigate('ShieldHowTo')}
      />

      <View style={styles.footer}>
        <LinkRow quiet testID="learn-report" icon="flag" label={REPORT_ROW} onPress={() => { openReportScam(); }} />
        <LinkRow quiet testID="learn-help" icon="phone" label={HELP_ROW} onPress={() => navigation.navigate('GetHelp')} />
      </View>

      <FlagSheet flag={flag} onClose={() => setFlag(null)} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { gap: 28 },
  section: { gap: 10 },
  tagline: { color: colors.textSecondary, fontSize: 16, lineHeight: 24, fontFamily: fonts.regular },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { flex: 1, color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontFamily: fonts.semiBold },
  footer: { gap: 2, marginTop: -12 },
});

export default LearnScreen;
