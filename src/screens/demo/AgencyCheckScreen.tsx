import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import theme from '../../theme/theme';

interface AgencyCheckScreenProps {
  onNavigate?: (route: string) => void;
}

export const AgencyCheckScreen: React.FC<AgencyCheckScreenProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={{ height: 90 }}>
      </View>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomRightRadius: 0, borderBottomLeftRadius: 0, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 24, flexDirection: 'column', gap: 14 }}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1' }}>
        </View>
        <View style={{ alignItems: 'center', gap: 14, flexDirection: 'row' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FCD34D', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#713F12" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={12} r={9} />
              <Path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2.2-2.4 3.7" />
              <Path d="M12 17h.01" />
            </Svg>
          </View>
          <View style={{ flexDirection: 'column' }}>
            <Text style={{ color: '#713F12', fontSize: 32, fontFamily: theme.fonts.extraBold, letterSpacing: -0.5, lineHeight: 35, includeFontPadding: false }}>Careful</Text>
            <Text style={{ color: '#854D0E', fontSize: 15, fontFamily: theme.fonts.semiBold, lineHeight: 20, includeFontPadding: false }}>We could not confirm this agency</Text>
          </View>
        </View>
        <Text style={{ color: '#0F1B2D', fontSize: 20, lineHeight: 28, fontFamily: theme.fonts.bold, includeFontPadding: false }}>Do not pay a deposit yet. Ask at your local migrant worker office first.</Text>
        <View style={{ flexDirection: 'column', gap: 4 }}>
          <Text style={{ paddingBottom: 6, color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.extraBold, lineHeight: 20, includeFontPadding: false }}>What we checked</Text>
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: '#EEF2F6', flexDirection: 'row' }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#9F1239', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'row' }}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round">
                <Path d="M6 6l12 12" />
                <Path d="M18 6L6 18" />
              </Svg>
            </View>
            <View style={{ flex: 1, flexDirection: 'column' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>License not in the official list</Text>
              <Text style={{ color: '#475569', fontFamily: theme.fonts.mono, fontSize: 11, lineHeight: 15, includeFontPadding: false }}>[GOVERNMENT REGISTRY]</Text>
            </View>
          </View>
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: '#EEF2F6', flexDirection: 'row' }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#9F1239', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'row' }}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round">
                <Path d="M6 6l12 12" />
                <Path d="M18 6L6 18" />
              </Svg>
            </View>
            <View style={{ flex: 1, flexDirection: 'column' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Deposit goes to a personal account</Text>
              <Text style={{ color: '#475569', fontFamily: theme.fonts.mono, fontSize: 11, lineHeight: 15, includeFontPadding: false }}>Page text</Text>
            </View>
          </View>
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: '#EEF2F6', flexDirection: 'row' }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#FCD34D', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'row' }}>
              <Text style={{ color: '#713F12', fontFamily: theme.fonts.extraBold, fontSize: 15, lineHeight: 20, includeFontPadding: false }}>{"?"}</Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'column' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Page is only a few weeks old</Text>
              <Text style={{ color: '#475569', fontFamily: theme.fonts.mono, fontSize: 11, lineHeight: 15, includeFontPadding: false }}>Google Search</Text>
            </View>
          </View>
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 0, flexDirection: 'row' }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'row' }}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12l5 5L20 7" />
              </Svg>
            </View>
            <View style={{ flex: 1, flexDirection: 'column' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Company name is registered</Text>
              <Text style={{ color: '#475569', fontFamily: theme.fonts.mono, fontSize: 11, lineHeight: 15, includeFontPadding: false }}>Business records</Text>
            </View>
          </View>
        </View>
        <Text style={{ flex: 1, color: '#0F1B2D', includeFontPadding: false, fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular }}></Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('noop')} style={{ height: 58, borderRadius: 16, borderWidth: 0, backgroundColor: '#1F1A17' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>{"Find licensed agencies"}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('exit')} style={{ height: 54, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Text style={{ color: '#0F1B2D', fontSize: 17, fontFamily: theme.fonts.bold, lineHeight: 23, includeFontPadding: false }}>{"Tell my family"}</Text>
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

export default AgencyCheckScreen;
