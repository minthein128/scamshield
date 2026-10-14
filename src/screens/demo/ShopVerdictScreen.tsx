import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Ellipse, Line } from 'react-native-svg';
import theme from '../../theme/theme';

interface ShopVerdictScreenProps {
  onNavigate?: (route: string) => void;
}

export const ShopVerdictScreen: React.FC<ShopVerdictScreenProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={{ height: 90 }}>
      </View>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomRightRadius: 0, borderBottomLeftRadius: 0, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 24, flexDirection: 'column', gap: 14 }}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1' }}>
        </View>
        <View style={{ alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' }}>
          <View style={{ alignItems: 'center', gap: 14, flexDirection: 'row' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                <Path d="M12 9v4" />
                <Path d="M12 17h.01" />
              </Svg>
            </View>
            <View style={{ flexDirection: 'column' }}>
              <Text style={{ color: '#9A3412', fontSize: 32, fontFamily: theme.fonts.extraBold, letterSpacing: -0.5, lineHeight: 35, includeFontPadding: false }}>Danger</Text>
              <Text style={{ color: '#9A3412', fontSize: 15, fontFamily: theme.fonts.semiBold, lineHeight: 20, includeFontPadding: false }}>Fake seller</Text>
            </View>
          </View>
          <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, color: '#334155', fontSize: 13, fontFamily: theme.fonts.bold, lineHeight: 18, includeFontPadding: false }}>2 screens</Text>
        </View>
        <Text style={{ color: '#0F1B2D', fontSize: 20, lineHeight: 28, fontFamily: theme.fonts.bold, includeFontPadding: false }}>Only pay inside the shopping app. Never transfer to the seller's own bank.</Text>
        <View style={{ gap: 10, flexDirection: 'row' }}>
          <View style={{ backgroundColor: '#FFF1E8', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, flexDirection: 'column', gap: 8, flex: 1 }}>
            <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#9A3412" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20 12l-8 8-9-9V3h8z" />
              <Circle cx={7.5} cy={7.5} r={1.5} />
            </Svg>
            <Text style={{ color: '#7C2D12', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Price far too low</Text>
          </View>
          <View style={{ backgroundColor: '#FFF1E8', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, flexDirection: 'column', gap: 8, flex: 1 }}>
            <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#9A3412" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={8} r={4} />
              <Path d="M4 21a8 8 0 0 1 16 0" />
            </Svg>
            <Text style={{ color: '#7C2D12', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>New seller, nothing sold</Text>
          </View>
          <View style={{ backgroundColor: '#FFF1E8', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, flexDirection: 'column', gap: 8, flex: 1 }}>
            <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#9A3412" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 10l9-6 9 6" />
              <Path d="M5 10v8" />
              <Path d="M10 10v8" />
              <Path d="M14 10v8" />
              <Path d="M19 10v8" />
              <Path d="M3 21h18" />
            </Svg>
            <Text style={{ color: '#7C2D12', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Wants direct bank transfer</Text>
          </View>
          <View style={{ backgroundColor: '#C2410C', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, flexDirection: 'column', gap: 8, flex: 1 }}>
            <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={6} cy={6} r={2.5} />
              <Circle cx={18} cy={6} r={2.5} />
              <Circle cx={12} cy={18} r={2.5} />
              <Path d="M8 7.5l2.8 8.5" />
              <Path d="M16 7.5l-2.8 8.5" />
              <Path d="M8.5 6h7" />
            </Svg>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Same seller photos reported before</Text>
          </View>
        </View>
        <Text style={{ color: '#475569', fontFamily: theme.fonts.mono, fontSize: 11, lineHeight: 15, includeFontPadding: false }}>Sources: listing, seller page, SafeRoute reports</Text>
        <Text style={{ flex: 1, color: '#0F1B2D', includeFontPadding: false, fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular }}></Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('noop')} style={{ height: 58, borderRadius: 16, borderWidth: 0, backgroundColor: '#1D4ED8' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>{"Report this seller"}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('noop')} style={{ height: 54, borderRadius: 16, borderWidth: 2, borderColor: '#C2410C', backgroundColor: '#FFFFFF' }}>
          <Text style={{ color: '#9A3412', fontSize: 17, fontFamily: theme.fonts.extraBold, lineHeight: 23, includeFontPadding: false }}>{"I already paid"}</Text>
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

export default ShopVerdictScreen;
