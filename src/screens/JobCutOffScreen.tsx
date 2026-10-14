import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Ellipse, Line } from 'react-native-svg';
import theme from '../theme/theme';

interface JobCutOffScreenProps {
  onNavigate?: (route: string) => void;
}

export const JobCutOffScreen: React.FC<JobCutOffScreenProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row' }}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M15 18l-6-6 6-6" />
        </Svg>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          <Text style={{ color: '#0F1B2D', fontSize: 16, fontFamily: theme.fonts.bold, lineHeight: 22, includeFontPadding: false }}>Overseas Jobs Group</Text>
          <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Any social app · sample</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'column', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
        <View style={{ alignItems: 'center', gap: 10, flexDirection: 'row' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            <Text style={{ color: '#78350F', fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false, fontSize: 14 }}>{"S"}</Text>
          </View>
          <View style={{ flexDirection: 'column' }}>
            <Text style={{ color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Agent Siti</Text>
            <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>2 hours ago</Text>
          </View>
        </View>
        <View>
          <Text style={{ color: '#0F1B2D', fontSize: 15, lineHeight: 23, fontFamily: theme.fonts.regular, includeFontPadding: false }}>{"Work in Thailand! Big salary, free flight and visa. No experience needed. Leave this week..."}</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('Expanded.dc.html')} style={{ backgroundColor: '#FFF1E8', borderWidth: 2, borderColor: '#C2410C', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8 }}>
            <Text style={{ color: '#9A3412', fontSize: 15, lineHeight: 19, fontFamily: theme.fonts.extraBold, includeFontPadding: false }}>{"See more"}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 250, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Text style={{ color: '#4B5563', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>{"[JOB AD PHOTO]"}</Text>
        </View>
      </View>
      <View style={{ position: 'absolute', right: 16, top: 300, width: 64, height: 64, borderRadius: 32, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </Svg>
      </View>
      <View style={{ position: 'absolute', right: 10, top: 294, width: 24, height: 24, borderRadius: 12, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: theme.fonts.extraBold, lineHeight: 18, includeFontPadding: false }}>{"1"}</Text>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#0F1B2D', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomRightRadius: 0, borderBottomLeftRadius: 0, paddingTop: 14, paddingHorizontal: 20, paddingBottom: 26, flexDirection: 'column', gap: 14 }}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#475569' }}>
        </View>
        <View style={{ alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' }}>
          <Text style={{ backgroundColor: '#1E293B', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, color: '#FDBA74', lineHeight: 18, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 13 }}>Found: job offer abroad</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('Listen')} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#475569', backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M11 5L6 9H3v6h3l5 4z" />
              <Path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <Path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </Svg>
          </TouchableOpacity>
        </View>
        <Text style={{ color: '#FFFFFF', lineHeight: 29, fontFamily: theme.fonts.extraBold, includeFontPadding: false, fontSize: 22 }}>Part of this post is hidden</Text>
        <View style={{ flexDirection: 'column', gap: 10 }}>
          <View style={{ alignItems: 'center', gap: 12, flexDirection: 'row' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF1E8', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'row' }}>
              <Text style={{ color: '#9A3412', lineHeight: 19, fontFamily: theme.fonts.extraBold, includeFontPadding: false, fontSize: 14 }}>{"1"}</Text>
            </View>
            <Text style={{ color: '#FFFFFF', lineHeight: 23, fontFamily: theme.fonts.semiBold, includeFontPadding: false, fontSize: 17 }}>Tap <Text style={{ fontFamily: theme.fonts.extraBold, color: '#FDBA74', lineHeight: 19, includeFontPadding: false }}>See more</Text></Text>
          </View>
          <View style={{ alignItems: 'center', gap: 12, flexDirection: 'row' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF1E8', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'row' }}>
              <Text style={{ color: '#9A3412', lineHeight: 19, fontFamily: theme.fonts.extraBold, includeFontPadding: false, fontSize: 14 }}>{"2"}</Text>
            </View>
            <Text style={{ color: '#FFFFFF', lineHeight: 23, fontFamily: theme.fonts.semiBold, includeFontPadding: false, fontSize: 17 }}>Tap the shield again</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('Scanning.dc.html')} style={{ height: 52, borderRadius: 14, borderWidth: 1, borderColor: '#475569', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Text style={{ color: '#E2E8F0', lineHeight: 22, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 16 }}>{"Check what I have now"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 390, height: 844, position: 'relative', backgroundColor: '#FFFFFF', flexDirection: 'column', overflow: 'hidden' },
  defaultText: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: theme.fonts.regular,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
});

export default JobCutOffScreen;
