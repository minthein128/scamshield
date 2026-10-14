import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import theme from '../../theme/theme';

interface AgencyPageScreenProps {
  onNavigate?: (route: string) => void;
}

export const AgencyPageScreen: React.FC<AgencyPageScreenProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row' }}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M15 18l-6-6 6-6" />
        </Svg>
        <Text style={{ flex: 1, color: '#0F1B2D', fontSize: 16, fontFamily: theme.fonts.bold, lineHeight: 22, includeFontPadding: false }}>Page</Text>
        <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Any social app · sample</Text>
      </View>
      <View style={{ height: 150, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
        <Text style={{ color: '#4B5563', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>{"[COVER PHOTO]"}</Text>
      </View>
      <View style={{ flexDirection: 'column', gap: 10, paddingTop: 0, paddingHorizontal: 16, paddingBottom: 16, marginTop: -36 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: '#0F766E', borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 24, fontFamily: theme.fonts.extraBold, lineHeight: 32, includeFontPadding: false }}>{"SK"}</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 6, flexDirection: 'row' }}>
          <Text style={{ color: '#0F1B2D', fontSize: 20, fontFamily: theme.fonts.extraBold, lineHeight: 27, includeFontPadding: false }}>PT Sinar Kerja Global</Text>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="#2563EB">
            <Circle cx={12} cy={12} r={10} />
            <Path d="M8 12l3 3 5-6" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <Text style={{ color: '#4B5563', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Official licensed overseas placement agency</Text>
        <View style={{ flexDirection: 'column', gap: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12 }}>
          <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}><Text>License no.</Text> [LICENSE NUMBER]</Text>
          <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}><Text>Jobs:</Text> factory, caregiver, restaurant</Text>
          <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}><Text>Countries:</Text> Taiwan, Malaysia, Japan</Text>
          <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}><Text>Fee:</Text> Rp [AMOUNT] deposit to reserve a place</Text>
        </View>
        <Text style={{ color: '#374151', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Departure guaranteed in 2 weeks. Pay the deposit to our account and send your documents by WhatsApp.</Text>
        <View style={{ gap: 8, flexDirection: 'row' }}>
          <View style={{ height: 40, borderRadius: 10, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>{"Message"}</Text>
          </View>
          <View style={{ height: 40, borderRadius: 10, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', flex: 1 }}>
            <Text style={{ color: '#111827', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>{"Follow"}</Text>
          </View>
        </View>
      </View>
      <Text style={{ position: 'absolute', right: 92, top: 214, backgroundColor: '#0F1B2D', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, color: '#FFFFFF', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Is this agency real?</Text>
      <View style={{ position: 'absolute', right: 84, top: 228, width: 14, height: 14, backgroundColor: '#0F1B2D', transform: [{ rotate: '45deg' }] }}>
      </View>
      <View style={{ position: 'absolute', right: 6, top: 194, width: 84, height: 84, borderRadius: 42, backgroundColor: '#DBE5FF', opacity: 0.9 }}>
      </View>
      <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('agency-verdict')} style={{ position: 'absolute', right: 16, top: 204, width: 64, height: 64, borderRadius: 32, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', flexDirection: 'row' }}>
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

export default AgencyPageScreen;
