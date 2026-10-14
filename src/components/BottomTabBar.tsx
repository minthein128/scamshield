import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import theme from '../theme/theme';

export type TabKey = 'home' | 'check' | 'family' | 'learn';

interface BottomTabBarProps {
  activeTab: TabKey;
  onNavigate?: (route: string) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onNavigate }) => {
  return (
    <View style={styles.container}>
      {/* Home */}
      <TouchableOpacity
        style={styles.tab}
        activeOpacity={0.7}
        onPress={() => onNavigate?.('Main.dc.html')}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={activeTab === 'home' ? theme.colors.accent : '#475569'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </Svg>
        <Text style={[styles.label, { color: activeTab === 'home' ? theme.colors.accent : '#475569', fontFamily: activeTab === 'home' ? theme.fonts.bold : theme.fonts.semiBold }]}>
          Home
        </Text>
      </TouchableOpacity>

      {/* Check */}
      <TouchableOpacity
        style={styles.tab}
        activeOpacity={0.7}
        onPress={() => onNavigate?.('JobCheck.dc.html')}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={activeTab === 'check' ? theme.colors.accent : '#475569'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </Svg>
        <Text style={[styles.label, { color: activeTab === 'check' ? theme.colors.accent : '#475569', fontFamily: activeTab === 'check' ? theme.fonts.bold : theme.fonts.semiBold }]}>
          Check
        </Text>
      </TouchableOpacity>

      {/* Family */}
      <TouchableOpacity
        style={styles.tab}
        activeOpacity={0.7}
        onPress={() => onNavigate?.('Family.dc.html')}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={activeTab === 'family' ? theme.colors.accent : '#475569'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx={9} cy={8} r={3.5} />
          <Path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <Path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
          <Path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
        </Svg>
        <Text style={[styles.label, { color: activeTab === 'family' ? theme.colors.accent : '#475569', fontFamily: activeTab === 'family' ? theme.fonts.bold : theme.fonts.semiBold }]}>
          Family
        </Text>
      </TouchableOpacity>

      {/* Learn */}
      <TouchableOpacity
        style={styles.tab}
        activeOpacity={0.7}
        onPress={() => onNavigate?.('Main.dc.html')}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={activeTab === 'learn' ? theme.colors.accent : '#475569'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
          <Path d="M4 19V5" />
        </Svg>
        <Text style={[styles.label, { color: activeTab === 'learn' ? theme.colors.accent : '#475569', fontFamily: activeTab === 'learn' ? theme.fonts.bold : theme.fonts.semiBold }]}>
          Learn
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 72,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#DCE3EC',
    flexDirection: 'row',
    paddingTop: 6,
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    includeFontPadding: false,
  },
});

export default BottomTabBar;
