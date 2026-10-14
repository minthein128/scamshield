import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { Screen } from '../components/Screen';
import { ShieldCard } from '../components/ShieldCard';
import { Button, Card, EmptyState, Pill, SectionTitle } from '../components/ui';
import type { TabScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { VERDICT_STYLES, entryLabel } from '../lib/report';
import { formatRelative } from '../lib/time';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const HomeScreen: React.FC<TabScreenProps<'Home'>> = ({ navigation }) => {
  const { history, profile } = useAppState();
  const startCheck = (intent: 'link' | 'image' | 'text') => navigation.navigate('Check', { intent, nonce: Date.now() });

  return (
    <Screen>
      <View style={styles.brandRow}>
        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
          <Path d="M9 12l2 2 4-4" />
        </Svg>
        <Text accessibilityRole="header" style={styles.brand}>SafeRoute</Text>
        <TouchableOpacity testID="open-settings" accessibilityRole="button" accessibilityLabel="Settings" activeOpacity={0.7} onPress={() => navigation.navigate('Settings')} style={styles.iconButton}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.textPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={12} cy={12} r={3} />
            <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </Svg>
        </TouchableOpacity>
      </View>

      <ShieldCard onDetails={() => navigation.navigate('Shield')} />

      <TouchableOpacity testID="home-radar" accessibilityRole="button" accessibilityLabel="Scam radar: what people are reporting" activeOpacity={0.7} onPress={() => navigation.navigate('Radar')} style={styles.radar}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.radarTitle}>Scam radar</Text>
          <Text style={styles.radarBody}>See which scams people are reporting right now.</Text>
        </View>
        <Text style={styles.radarChevron}>{'›'}</Text>
      </TouchableOpacity>

      <Card style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text style={styles.cardTitle}>Check a job offer, message or link</Text>
          <Text style={styles.cardBody}>Paste it or share a screenshot. We look for trafficking and money-mule warning signs.</Text>
        </View>
        <View style={styles.quickRow}>
          <QuickAction label="Paste link" onPress={() => startCheck('link')}>
            <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
            <Path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
          </QuickAction>
          <QuickAction label="Screenshot" onPress={() => startCheck('image')}>
            <Rect x={3} y={5} width={18} height={14} rx={2} />
            <Circle cx={9} cy={10} r={1.5} />
            <Path d="M21 16l-5-5-8 8" />
          </QuickAction>
          <QuickAction label="Chat" onPress={() => startCheck('text')}>
            <Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
          </QuickAction>
        </View>
        <Button label="Start a check" onPress={() => navigation.navigate('Check')} testID="home-check-button" />
      </Card>

      <View style={{ gap: 8 }}>
        <SectionTitle>Recent checks</SectionTitle>
        {history.length === 0 ? (
          <EmptyState testID="recent-empty" title="No checks yet" body="Your checks are saved on this device and show up here." />
        ) : (
          history.slice(0, 5).map(entry => {
            const v = VERDICT_STYLES[entry.result.verdict];
            return (
              <TouchableOpacity
                key={entry.id}
                testID="recent-check"
                accessibilityRole="button"
                accessibilityLabel={`${v.label}: ${entryLabel(entry.result, entry.source)}`}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Report', { result: entry.result, language: entry.language })}
                style={styles.recent}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={1} style={styles.recentTitle}>{entryLabel(entry.result, entry.source)}</Text>
                  <Text style={styles.recentMeta}>{formatRelative(entry.createdAt)}</Text>
                </View>
                <Pill label={v.label} background={v.background} color={v.foreground} />
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <TouchableOpacity
        testID="home-get-help"
        accessibilityRole="button"
        accessibilityLabel="Get help: hotlines and reporting"
        activeOpacity={0.7}
        onPress={() => navigation.navigate('GetHelp')}
        style={styles.help}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.helpTitle}>Get help</Text>
          <Text style={styles.helpBody}>
            {profile.destinationCountry || profile.homeCountry ? 'Hotlines for your countries.' : 'Hotlines and reporting lines in Southeast Asia.'}
          </Text>
        </View>
        <Text style={styles.chevron}>{'›'}</Text>
      </TouchableOpacity>
    </Screen>
  );
};

const QuickAction: React.FC<{ label: string; onPress: () => void; children: React.ReactNode }> = ({ label, onPress, children }) => (
  <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} activeOpacity={0.7} onPress={onPress} style={styles.quick}>
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
    <Text style={styles.quickText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  brand: { flex: 1, color: colors.textPrimary, fontSize: 18, fontFamily: fonts.bold, letterSpacing: -0.2, lineHeight: 24, includeFontPadding: false },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.textPrimary, fontSize: 17, lineHeight: 24, fontFamily: fonts.bold, includeFontPadding: false },
  cardBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, fontFamily: fonts.regular, includeFontPadding: false },
  quickRow: { flexDirection: 'row', gap: 8 },
  quick: { flex: 1, minHeight: 64, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 4 },
  quickText: { color: colors.textPrimary, fontSize: 12, lineHeight: 16, fontFamily: fonts.semiBold, includeFontPadding: false },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  recentTitle: { color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontFamily: fonts.semiBold, includeFontPadding: false },
  recentMeta: { color: colors.textSecondary, fontSize: 12, lineHeight: 16, fontFamily: fonts.regular, includeFontPadding: false },
  radar: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  radarTitle: { color: colors.textPrimary, fontSize: 15, lineHeight: 20, fontFamily: fonts.bold },
  radarBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
  radarChevron: { color: colors.textMuted, fontSize: 24 },
  help: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.dangerSoftBg, borderWidth: 1, borderColor: colors.dangerBarTrack },
  helpTitle: { color: colors.dangerSoftText, fontSize: 15, lineHeight: 20, fontFamily: fonts.bold },
  helpBody: { color: colors.dangerDark, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
  chevron: { color: colors.dangerDark, fontSize: 24 },
});

export default HomeScreen;
