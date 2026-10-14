import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Screen } from '../components/Screen';
import { Card, ScreenHeader, SectionTitle } from '../components/ui';
import { BOARDS } from './demo/boards';
import type { TabScreenProps } from '../navigation/types';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const FAMILIES = [
  ['Too good to be true', 'Pay or perks far above normal, no experience needed.'],
  ['Pressure', 'Act today, limited slots, do not tell anyone.'],
  ['Payment route', 'Fees, deposits or transfers before you start.'],
  ['Identity', 'Hidden recruiter, private chat apps only, no company trace.'],
  ['Link risk', 'New domains, shortened links, fake tracking pages.'],
  ['Known bad', 'Matches numbers, pages or scripts already reported.'],
  ['Trafficking', 'No visa, passport kept, pickup at the border.'],
];

export const LearnScreen: React.FC<TabScreenProps<'Learn'>> = ({ navigation }) => {
  const groups = [...new Set(BOARDS.map(b => b.group))];
  return (
    <Screen>
      <ScreenHeader title="Learn" />

      <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Shield')} style={styles.shieldCard}>
        <Text style={styles.shieldTitle}>Screen shield</Text>
        <Text style={styles.shieldBody}>Put a shield button on your screen. Tap it on any post or chat that looks strange.</Text>
      </TouchableOpacity>

      <View style={{ gap: 8 }}>
        <SectionTitle>Seven red flags</SectionTitle>
        <Card style={{ gap: 10 }}>
          {FAMILIES.map(([title, body]) => (
            <View key={title} style={{ gap: 2 }}>
              <Text style={styles.famTitle}>{title}</Text>
              <Text style={styles.famBody}>{body}</Text>
            </View>
          ))}
        </Card>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>Demo: how the shield looks</SectionTitle>
        <Text style={styles.famBody}>Step-by-step walkthroughs of the shield on a job post, chat, SMS, agency page and shop listing.</Text>
        {groups.map(group => (
          <View key={group} style={{ gap: 6 }}>
            <Text style={styles.group}>{group}</Text>
            {BOARDS.filter(b => b.group === group).map(b => (
              <TouchableOpacity key={b.key} testID={`demo-${b.key}`} activeOpacity={0.7} onPress={() => navigation.navigate('DemoBoard', { key: b.key })} style={styles.item}>
                <Text style={styles.itemText}>{b.title}</Text>
                <Text style={styles.chevron}>{'›'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  shieldCard: { backgroundColor: colors.darkBackground, borderRadius: 16, padding: 16, gap: 6 },
  shieldTitle: { color: colors.white, fontSize: 17, lineHeight: 24, fontFamily: fonts.bold },
  shieldBody: { color: colors.textLight, fontSize: 13, lineHeight: 19, fontFamily: fonts.regular },
  famTitle: { color: colors.textPrimary, fontSize: 13, lineHeight: 18, fontFamily: fonts.bold },
  famBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontFamily: fonts.regular },
  group: { color: colors.textSecondary, fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  itemText: { color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontFamily: fonts.semiBold },
  chevron: { color: colors.textMuted, fontSize: 20 },
});

export default LearnScreen;
