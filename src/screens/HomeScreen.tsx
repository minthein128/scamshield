import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { Screen } from '../components/Screen';
import { Button, Card, Pill, SectionTitle } from '../components/ui';
import type { TabScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { VERDICT_STYLES, entryLabel } from '../lib/report';
import { formatRelative } from '../lib/time';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const HomeScreen: React.FC<TabScreenProps<'Home'>> = ({ navigation }) => {
  const { history } = useAppState();
  const startCheck = (intent: 'link' | 'image' | 'text') => navigation.navigate('Check', { intent, nonce: Date.now() });

  return (
    <Screen>
      <View style={styles.brandRow}>
        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
          <Path d="M9 12l2 2 4-4" />
        </Svg>
        <Text style={styles.brand}>SafeRoute</Text>
      </View>

      <View style={{ gap: 4 }}>
        <Text style={styles.greeting}>Check before you say yes</Text>
        <Text style={styles.sub}>Check any job offer, message or link before you trust it.</Text>
      </View>

      <View style={styles.hero}>
        <View style={{ gap: 6 }}>
          <Text style={styles.heroTitle}>Got an overseas job offer?</Text>
          <Text style={styles.heroBody}>Share the ad, a screenshot or the chat. We check it for trafficking and money-mule warning signs.</Text>
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
        <Button label="Check a job offer" onPress={() => navigation.navigate('Check')} testID="home-check-button" />
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>More protection</SectionTitle>
        <View style={styles.cardRow}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => startCheck('text')} style={styles.tile}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.danger} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
            </Svg>
            <Text style={styles.tileTitle}>Online relationship</Text>
            <Text style={styles.tileBody}>Spot slow romance and investment scams</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Shield')} style={styles.tile}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
            </Svg>
            <Text style={styles.tileTitle}>Screen shield</Text>
            <Text style={styles.tileBody}>A button that checks what is on your screen</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>Recent checks</SectionTitle>
        {history.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No checks yet. Your last checks appear here.</Text>
          </Card>
        ) : (
          history.slice(0, 5).map(entry => {
            const v = VERDICT_STYLES[entry.result.verdict];
            return (
              <TouchableOpacity
                key={entry.id}
                testID="recent-check"
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
    </Screen>
  );
};

const QuickAction: React.FC<{ label: string; onPress: () => void; children: React.ReactNode }> = ({ label, onPress, children }) => (
  <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} onPress={onPress} style={styles.quick}>
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
    <Text style={styles.quickText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44 },
  brand: { color: colors.textPrimary, fontSize: 18, fontFamily: fonts.bold, letterSpacing: -0.2, lineHeight: 24, includeFontPadding: false },
  greeting: { color: colors.textPrimary, fontSize: 24, fontFamily: fonts.bold, letterSpacing: -0.4, lineHeight: 32, includeFontPadding: false },
  sub: { color: colors.textSecondary, fontSize: 14, lineHeight: 19, fontFamily: fonts.regular, includeFontPadding: false },
  hero: { backgroundColor: colors.darkBackground, borderRadius: 20, padding: 20, gap: 14 },
  heroTitle: { color: colors.white, fontSize: 19, lineHeight: 26, fontFamily: fonts.bold, includeFontPadding: false },
  heroBody: { color: colors.textLight, fontSize: 14, lineHeight: 21, fontFamily: fonts.regular, includeFontPadding: false },
  quickRow: { flexDirection: 'row', gap: 8 },
  quick: { flex: 1, height: 64, borderRadius: 12, borderWidth: 1, borderColor: colors.borderDark, backgroundColor: colors.slateDark, alignItems: 'center', justifyContent: 'center', gap: 4 },
  quickText: { color: colors.white, fontSize: 12, lineHeight: 16, fontFamily: fonts.semiBold, includeFontPadding: false },
  cardRow: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 14, gap: 6 },
  tileTitle: { color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontFamily: fonts.bold, includeFontPadding: false },
  tileBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, fontFamily: fonts.regular, includeFontPadding: false },
  empty: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  recentTitle: { color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontFamily: fonts.semiBold, includeFontPadding: false },
  recentMeta: { color: colors.textSecondary, fontSize: 12, lineHeight: 16, fontFamily: fonts.regular, includeFontPadding: false },
});

export default HomeScreen;
