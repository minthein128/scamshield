import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Grid } from '../components/Grid';
import { useLayout } from '../hooks/useLayout';
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

export const LearnScreen: React.FC<TabScreenProps<'Learn'>> = ({ navigation }) => {
  const { t } = useTranslation('learn');
  const [flag, setFlag] = useState<RedFlag | null>(null);
  const layout = useLayout();
  const chipColumns = layout.isExpanded ? 4 : layout.isTablet ? 3 : 2;
  return (
    <Screen wide contentStyle={styles.content}>
      <View style={{ gap: 6 }}>
        <ScreenHeader title={t('title')} />
        <Text style={styles.tagline}>{t('tagline')}</Text>
      </View>

      <View style={styles.section}>
        <SectionTitle>{t('scamsHeading')}</SectionTitle>
        <Grid columns={layout.columns} gap={10}>
          {SCAM_TYPES.map(scam => (
            <ScamCard key={scam.id} scam={scam} onPress={() => navigation.navigate('ScamGuide', { type: scam.id })} />
          ))}
        </Grid>
      </View>

      <View style={styles.section}>
        <SectionTitle>{t('flagsHeading')}</SectionTitle>
        <Text style={styles.hint}>{t('flagsHint')}</Text>
        <Grid columns={chipColumns} gap={10}>
          {RED_FLAGS.map(f => (
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
          ))}
        </Grid>
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
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { flex: 1, color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontFamily: fonts.semiBold },
  footer: { gap: 2, marginTop: -12 },
});

export default LearnScreen;
