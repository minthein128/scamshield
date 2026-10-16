import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import theme from '../../theme/theme';

interface JobSpotScreenProps {
  onNavigate?: (route: string) => void;
}

export const JobSpotScreen: React.FC<JobSpotScreenProps> = ({ onNavigate }) => {
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
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="#111827">
          <Circle cx={5} cy={12} r={1.8} />
          <Circle cx={12} cy={12} r={1.8} />
          <Circle cx={19} cy={12} r={1.8} />
        </Svg>
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
        <Text style={{ color: '#0F1B2D', fontSize: 15, lineHeight: 23, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Work in Thailand! Big salary, free flight and visa. No experience needed. Leave this week... <Text style={{ fontFamily: theme.fonts.bold, color: '#4B5563', lineHeight: 19, includeFontPadding: false }}>See more</Text></Text>
        <View style={{ height: 250, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Text style={{ color: '#4B5563', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>{"[JOB AD PHOTO]"}</Text>
        </View>
        <View style={{ justifyContent: 'space-around', paddingTop: 4, flexDirection: 'row' }}>
          <Text style={{ color: '#4B5563', fontSize: 14, fontFamily: theme.fonts.semiBold, lineHeight: 19, includeFontPadding: false }}>Like</Text>
          <Text style={{ color: '#4B5563', fontSize: 14, fontFamily: theme.fonts.semiBold, lineHeight: 19, includeFontPadding: false }}>Comment</Text>
          <Text style={{ color: '#4B5563', fontSize: 14, fontFamily: theme.fonts.semiBold, lineHeight: 19, includeFontPadding: false }}>Share</Text>
        </View>
      </View>
      <View style={{ height: 8, backgroundColor: '#F3F4F6' }}>
      </View>
      <View style={{ flexDirection: 'column', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
        <View style={{ alignItems: 'center', gap: 10, flexDirection: 'row' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#C7D2FE', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            <Text style={{ color: '#312E81', fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false, fontSize: 14 }}>{"B"}</Text>
          </View>
          <View style={{ flexDirection: 'column' }}>
            <Text style={{ color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Budi</Text>
            <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>5 hours ago</Text>
          </View>
        </View>
        <Text style={{ color: '#374151', fontSize: 15, lineHeight: 23, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Anyone know if the Malaysia factory jobs are real?</Text>
      </View>
      <Text style={{ position: 'absolute', right: 92, top: 404, backgroundColor: '#0F1B2D', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, color: '#FFFFFF', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Tap to check this</Text>
      <View style={{ position: 'absolute', right: 84, top: 418, width: 14, height: 14, backgroundColor: '#0F1B2D', transform: [{ rotate: '45deg' }] }}>
      </View>
      <View style={{ position: 'absolute', right: 6, top: 384, width: 84, height: 84, borderRadius: 42, backgroundColor: '#DBE5FF', opacity: 0.9 }}>
      </View>
      <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('job-cutoff')} style={{ position: 'absolute', right: 16, top: 394, width: 64, height: 64, borderRadius: 32, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </Svg>
      </TouchableOpacity>
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

export default JobSpotScreen;
