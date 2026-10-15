import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { ScreenHeader, SectionTitle } from '../components/ui';
import { Icon } from '../components/Icon';
import type { TabScreenProps } from '../navigation/types';
import theme from '../theme/theme';
import { FlagSheet } from './learn/FlagSheet';
import { LinkRow } from './learn/LinkRow';
import { ScamCard } from './learn/ScamCard';
import { RED_FLAGS, SCAM_TYPES, type RedFlag } from './learn/content';
import { openReportScam } from './learn/nav';

const { colors, fonts } = theme;

const pairs = <T,>(items: T[]): (T | null)[][] => {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push([items[i], items[i + 1] ?? null]);
  return rows;
};

export const LearnScreen: React.FC<TabScreenProps<'Learn'>> = ({ navigation }) => {
  const { t } = useTranslation('learn');
  const [flag, setFlag] = useState<RedFlag | null>(null);
  return (
    <Screen contentStyle={styles.content}>
      <View style={{ gap: 6 }}>
        <ScreenHeader title={t('title')} />
        <Text style={styles.tagline}>{t('tagline')}</Text>
      </View>

      <View style={styles.section}>
        <SectionTitle>{t('scamsHeading')}</SectionTitle>
        {SCAM_TYPES.map(scam => (
          <ScamCard key={scam.id} scam={scam} onPress={() => navigation.navigate('ScamGuide', { type: scam.id })} />
        ))}
      </View>

      <View style={styles.section}>
        <SectionTitle>{t('flagsHeading')}</SectionTitle>
        <Text style={styles.hint}>{t('flagsHint')}</Text>
        {pairs(RED_FLAGS).map(([a, b], i) => (
          <View key={i} style={styles.chipRow}>
            {[a, b].map((f, j) =>
              f ? (
                <TouchableOpacity
                  key={f.family}
                  testID={`flag-${f.family}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.title}. ${f.explain}`}
                  accessibilityHint={t('flagsHintA11y')}
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
        label={t('shieldRow.title')}
        hint={t('shieldRow.hint')}
        onPress={() => navigation.navigate('ShieldHowTo')}
      />

      <View style={styles.footer}>
        <LinkRow quiet testID="learn-report" icon="flag" label={t('reportRow')} onPress={() => { openReportScam(); }} />
        <LinkRow quiet testID="learn-help" icon="phone" label={t('helpRow')} onPress={() => navigation.navigate('GetHelp')} />
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
