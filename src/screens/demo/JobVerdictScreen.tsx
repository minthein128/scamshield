import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Ellipse, Line } from 'react-native-svg';
import theme from '../../theme/theme';

interface JobVerdictScreenProps {
  onNavigate?: (route: string) => void;
}

export const JobVerdictScreen: React.FC<JobVerdictScreenProps> = ({ onNavigate }) => {
  const [playing, setPlaying] = React.useState(false);
  return (
    <View style={styles.container}>
      <View style={{ height: 150, paddingVertical: 20, paddingHorizontal: 16, flexDirection: 'column', gap: 10 }}>
        <View style={{ alignItems: 'center', gap: 10, flexDirection: 'row' }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#6B6F57' }}>
          </View>
          <View style={{ width: 120, height: 10, borderRadius: 5, backgroundColor: '#5B616B' }}>
          </View>
        </View>
        <View style={{ width: 300, height: 10, borderRadius: 5, backgroundColor: '#5B616B' }}>
        </View>
        <View style={{ width: 260, height: 10, borderRadius: 5, backgroundColor: '#5B616B' }}>
        </View>
      </View>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomRightRadius: 0, borderBottomLeftRadius: 0, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 24, flexDirection: 'column', gap: 16 }}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1' }}>
        </View>
        <View style={{ alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' }}>
          <View style={{ alignItems: 'center', gap: 14, flexDirection: 'row' }}>
            <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                <Path d="M12 9v4" />
                <Path d="M12 17h.01" />
              </Svg>
            </View>
            <View style={{ flexDirection: 'column' }}>
              <Text style={{ color: '#9A3412', fontSize: 34, fontFamily: theme.fonts.extraBold, letterSpacing: -0.5, lineHeight: 37, includeFontPadding: false }}>Danger</Text>
              <Text style={{ color: '#9A3412', fontSize: 15, fontFamily: theme.fonts.semiBold, lineHeight: 20, includeFontPadding: false }}>Job offer abroad</Text>
            </View>
          </View>
          <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, color: '#334155', fontSize: 13, fontFamily: theme.fonts.bold, lineHeight: 18, includeFontPadding: false }}>Bahasa</Text>
        </View>
        <Text style={{ color: '#0F1B2D', fontSize: 20, lineHeight: 29, fontFamily: theme.fonts.bold, includeFontPadding: false }}>This job is likely a trap. Do not go. Keep your passport.</Text>
        {!playing ? (
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('noop')} style={{ height: 60, borderRadius: 16, borderWidth: 2, borderColor: '#0F1B2D', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 10, flexDirection: 'row' }}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#0F1B2D" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M11 5L6 9H3v6h3l5 4z" />
              <Path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <Path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </Svg>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>{"Listen"}</Text>
          </TouchableOpacity>
        ) : null}
        {playing ? (
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('noop')} style={{ height: 60, borderRadius: 16, borderWidth: 2, borderColor: '#0F1B2D', backgroundColor: '#0F1B2D', alignItems: 'center', justifyContent: 'center', gap: 10, flexDirection: 'row' }}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round">
              <Path d="M4 10v4" />
              <Path d="M8 7v10" />
              <Path d="M12 4v16" />
              <Path d="M16 8v8" />
              <Path d="M20 11v2" />
            </Svg>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>{"Playing... tap to stop"}</Text>
          </TouchableOpacity>
        ) : null}
        <View style={{ gap: 10, flexDirection: 'row' }}>
          <View style={{ backgroundColor: '#FFF1E8', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
            <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#9A3412" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Ellipse cx={12} cy={6} rx={7} ry={3} />
              <Path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
              <Path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
            </Svg>
            <Text style={{ color: '#7C2D12', textAlign: 'center', lineHeight: 18, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 14 }}>Pay too good to be true</Text>
          </View>
          <View style={{ backgroundColor: '#FFF1E8', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
            <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#9A3412" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 21V5l8-3 8 3v16" />
              <Path d="M9 21v-4h6v4" />
              <Path d="M9 9l6 6" />
              <Path d="M15 9l-6 6" />
            </Svg>
            <Text style={{ color: '#7C2D12', textAlign: 'center', lineHeight: 18, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 14 }}>Company not found</Text>
          </View>
          <View style={{ backgroundColor: '#FFF1E8', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
            <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#9A3412" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Rect x={5} y={3} width={14} height={18} rx={2} />
              <Circle cx={12} cy={10} r={3} />
              <Path d="M9 16h6" />
            </Svg>
            <Text style={{ color: '#7C2D12', textAlign: 'center', lineHeight: 18, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 14 }}>Asks for your passport</Text>
          </View>
        </View>
        <Text style={{ flex: 1, color: '#0F1B2D', includeFontPadding: false, fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular }}></Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('exit')} style={{ height: 60, borderRadius: 16, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', gap: 10, flexDirection: 'row' }}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={9} cy={8} r={3.5} />
            <Path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
            <Path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
            <Path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
          </Svg>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>{"Tell my family"}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('noop')} style={{ height: 56, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 10, flexDirection: 'row' }}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#0F1B2D" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z" />
          </Svg>
          <Text style={{ color: '#0F1B2D', fontSize: 17, fontFamily: theme.fonts.bold, lineHeight: 23, includeFontPadding: false }}>{"Call for help"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 390, height: 844, backgroundColor: '#3A3F47', flexDirection: 'column', overflow: 'hidden' },
  defaultText: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: theme.fonts.regular,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
});

export default JobVerdictScreen;
