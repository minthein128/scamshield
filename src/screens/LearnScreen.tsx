import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Screen } from '../components/Screen';
import { Card, ScreenHeader, SectionTitle } from '../components/ui';
import { BOARDS } from './demo/boards';
import type { TabScreenProps } from '../navigation/types';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const RED_FLAGS = [
  ['Too good to be true', 'Pay or perks far above normal, no experience needed.'],
  ['Pressure', 'Act today, limited slots, do not tell anyone.'],
  ['Payment route', 'Fees, deposits or transfers before you start.'],
  ['Identity', 'Hidden recruiter, private chat apps only, no company trace.'],
  ['Link risk', 'New domains, shortened links, fake tracking pages.'],
  ['Known bad', 'Matches numbers, pages or scripts already reported.'],
  ['Trafficking', 'No visa, passport kept, pickup at the border.'],
];

const GROUP_TITLES: Record<string, string> = {
  'Overlay: shield button': 'The shield button',
  'Overlay: job post': 'Job posts',
  'Overlay: strange chat': 'Strange chats',
  'Overlay: SMS': 'Text messages',
  'Overlay: agency': 'Recruitment agencies',
  'Overlay: shop': 'Online shops',
};

export const LearnScreen: React.FC<TabScreenProps<'Learn'>> = ({ navigation }) => {
  const boards = BOARDS.filter(b => GROUP_TITLES[b.group]);
  const groups = [...new Set(boards.map(b => b.group))];
  return (
    <Screen>
      <ScreenHeader title="Learn" />

      <View style={{ gap: 8 }}>
        <SectionTitle>Seven red flags</SectionTitle>
        <Card style={{ gap: 10 }}>
          {RED_FLAGS.map(([title, body]) => (
            <View key={title} style={{ gap: 2 }}>
              <Text style={styles.famTitle}>{title}</Text>
              <Text style={styles.famBody}>{body}</Text>
            </View>
          ))}
        </Card>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>See how scams look</SectionTitle>
        <Text style={styles.famBody}>Step-by-step examples of common scams and how SafeRoute flags them. The posts and chats shown are made-up examples.</Text>
        {groups.map(group => (
          <View key={group} style={{ gap: 6 }}>
            <Text style={styles.group}>{GROUP_TITLES[group]}</Text>
            {boards.filter(b => b.group === group).map(b => (
              <TouchableOpacity
                key={b.key}
                testID={`demo-${b.key}`}
                accessibilityRole="button"
                accessibilityLabel={b.title}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('DemoBoard', { key: b.key })}
                style={styles.item}
              >
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
  famTitle: { color: colors.textPrimary, fontSize: 13, lineHeight: 18, fontFamily: fonts.bold },
  famBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontFamily: fonts.regular },
  group: { color: colors.textSecondary, fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  itemText: { color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontFamily: fonts.semiBold },
  chevron: { color: colors.textMuted, fontSize: 20 },
});

export default LearnScreen;
