import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Ellipse, Line } from 'react-native-svg';
import theme from '../../theme/theme';

interface JobExpandScreenProps {
  onNavigate?: (route: string) => void;
}

export const JobExpandScreen: React.FC<JobExpandScreenProps> = ({ onNavigate }) => {
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
        <View style={{ flexDirection: 'column', gap: 8 }}>
          <Text style={{ color: '#0F1B2D', fontSize: 15, lineHeight: 23, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Work in Thailand! Big salary, free flight and visa. No experience needed. Leave this week.</Text>
          <Text style={{ color: '#0F1B2D', fontSize: 15, lineHeight: 23, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Send a photo of your passport to book your seat. Our driver picks you up at Bangkok airport and takes you to the office.</Text>
          <Text style={{ color: '#0F1B2D', fontSize: 15, lineHeight: 23, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Only 5 places left. Message me on Telegram now!</Text>
        </View>
        <View style={{ height: 200, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Text style={{ color: '#4B5563', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>{"[JOB AD PHOTO]"}</Text>
        </View>
        <View style={{ justifyContent: 'space-around', paddingTop: 4, flexDirection: 'row' }}>
          <Text style={{ color: '#4B5563', fontSize: 14, fontFamily: theme.fonts.semiBold, lineHeight: 19, includeFontPadding: false }}>Like</Text>
          <Text style={{ color: '#4B5563', fontSize: 14, fontFamily: theme.fonts.semiBold, lineHeight: 19, includeFontPadding: false }}>Comment</Text>
          <Text style={{ color: '#4B5563', fontSize: 14, fontFamily: theme.fonts.semiBold, lineHeight: 19, includeFontPadding: false }}>Share</Text>
        </View>
      </View>
      <Text style={{ position: 'absolute', right: 92, top: 314, backgroundColor: '#0F1B2D', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, color: '#FFFFFF', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Tap again to add this</Text>
      <View style={{ position: 'absolute', right: 84, top: 328, width: 14, height: 14, backgroundColor: '#0F1B2D', transform: [{ rotate: '45deg' }] }}>
      </View>
      <View style={{ position: 'absolute', right: 6, top: 294, width: 84, height: 84, borderRadius: 42, backgroundColor: '#DBE5FF', opacity: 0.9 }}>
      </View>
      <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('job-scan')} style={{ position: 'absolute', right: 16, top: 304, width: 64, height: 64, borderRadius: 32, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </Svg>
      </TouchableOpacity>
      <View style={{ position: 'absolute', right: 10, top: 298, width: 24, height: 24, borderRadius: 12, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: theme.fonts.extraBold, lineHeight: 18, includeFontPadding: false }}>{"1"}</Text>
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

export default JobExpandScreen;
