import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Ellipse, Line } from 'react-native-svg';
import theme from '../theme/theme';

interface FamilyGuardianScreenProps {
  onNavigate?: (route: string) => void;
}

export const FamilyGuardianScreen: React.FC<FamilyGuardianScreenProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={{ flex: 1, flexDirection: 'column', gap: 14, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 12, overflow: 'hidden' }}>
        <View style={{ alignItems: 'center', justifyContent: 'space-between', height: 44, flexDirection: 'row' }}>
          <View style={{ alignItems: 'center', gap: 8, flexDirection: 'row' }}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('Main.dc.html')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#0F1B2D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
            </TouchableOpacity>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.bold, lineHeight: 24, includeFontPadding: false }}>Family circle</Text>
          </View>
          <Text style={{ color: '#475569', fontSize: 12, fontFamily: theme.fonts.semiBold, lineHeight: 16, includeFontPadding: false }}>Ibu's phone</Text>
        </View>
        <View style={{ backgroundColor: '#FFF1E8', borderWidth: 1, borderColor: '#C2410C', borderRadius: 16, padding: 14, gap: 12, alignItems: 'flex-start', flexDirection: 'row' }}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <Path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
          </Svg>
          <View style={{ flexDirection: 'column', gap: 4 }}>
            <Text style={{ color: '#7C2D12', fontSize: 16, fontFamily: theme.fonts.bold, lineHeight: 22, includeFontPadding: false }}>Rina missed a check-in</Text>
            <Text style={{ color: '#9A3412', fontSize: 13, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Expected at 09:00 today. Her job offer was rated high risk before she left.</Text>
          </View>
        </View>
        <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, padding: 14, flexDirection: 'column', gap: 10 }}>
          <Text style={{ color: '#0F1B2D', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>Trip details on file</Text>
          <View style={{ justifyContent: 'space-between', gap: 12, flexDirection: 'row' }}>
            <Text style={{ color: '#475569', fontSize: 13, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Destination</Text>
            <Text style={{ color: '#0F1B2D', fontSize: 13, lineHeight: 19, fontFamily: theme.fonts.semiBold, includeFontPadding: false }}>Bangkok, Thailand</Text>
          </View>
          <View style={{ justifyContent: 'space-between', gap: 12, flexDirection: 'row' }}>
            <Text style={{ color: '#475569', fontSize: 13, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Employer</Text>
            <Text style={{ color: '#0F1B2D', fontSize: 13, lineHeight: 19, fontFamily: theme.fonts.semiBold, includeFontPadding: false }}>[EMPLOYER NAME]</Text>
          </View>
          <View style={{ justifyContent: 'space-between', gap: 12, flexDirection: 'row' }}>
            <Text style={{ color: '#475569', fontSize: 13, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Recruiter</Text>
            <Text style={{ color: '#0F1B2D', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.medium, includeFontPadding: false }}>Telegram @[HANDLE]</Text>
          </View>
          <View style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexDirection: 'row' }}>
            <Text style={{ color: '#475569', fontSize: 13, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Risk check</Text>
            <Text style={{ backgroundColor: '#C2410C', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.bold, includeFontPadding: false }}>High risk</Text>
          </View>
        </View>
        <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, padding: 14, flexDirection: 'column', gap: 12 }}>
          <Text style={{ color: '#0F1B2D', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>Check-ins</Text>
          <View style={{ alignItems: 'center', gap: 12, flexDirection: 'row' }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#DBE5FF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12l5 5L20 7" />
              </Svg>
            </View>
            <Text style={{ flex: 1, color: '#0F1B2D', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>Departed home airport</Text>
            <Text style={{ color: '#475569', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Yesterday 08:40</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 12, flexDirection: 'row' }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#DBE5FF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12l5 5L20 7" />
              </Svg>
            </View>
            <Text style={{ flex: 1, color: '#0F1B2D', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>Landed in Bangkok</Text>
            <Text style={{ color: '#475569', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Yesterday 14:10</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 12, flexDirection: 'row' }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#DBE5FF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12l5 5L20 7" />
              </Svg>
            </View>
            <Text style={{ flex: 1, color: '#0F1B2D', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>Picked up by company car</Text>
            <Text style={{ color: '#475569', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Yesterday 15:30</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 12, flexDirection: 'row' }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>{"!"}</Text>
            </View>
            <Text style={{ flex: 1, color: '#9A3412', fontSize: 13, fontFamily: theme.fonts.bold, lineHeight: 18, includeFontPadding: false }}>Morning check-in missed</Text>
            <Text style={{ color: '#9A3412', fontSize: 12, fontFamily: theme.fonts.semiBold, lineHeight: 16, includeFontPadding: false }}>Today 09:00</Text>
          </View>
        </View>
      </View>
      <View style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 22, flexDirection: 'column', gap: 8, backgroundColor: '#F4F6F8' }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ height: 50, borderRadius: 14, borderWidth: 0, backgroundColor: '#1D4ED8' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>{"Call Rina"}</Text>
        </TouchableOpacity>
        <View style={{ gap: 8, flexDirection: 'row' }}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', flex: 1 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>{"Send case to embassy"}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', flex: 1 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>{"Contact [NGO PARTNER]"}</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: '#475569', fontSize: 12, textAlign: 'center', lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Nothing about this circle shows on Rina's phone.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 390, height: 844, backgroundColor: '#F4F6F8', flexDirection: 'column', overflow: 'hidden' },
  defaultText: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: theme.fonts.regular,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
});

export default FamilyGuardianScreen;
