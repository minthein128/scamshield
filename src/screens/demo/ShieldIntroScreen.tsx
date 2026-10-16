import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useShieldControl } from '../../hooks/useShieldControl';
import theme from '../../theme/theme';
import { MarkShapes } from '../../components/BrandMark';
import { MARK_VIEW, markShapes } from '../../components/dollMark';

interface ShieldIntroScreenProps {
  onNavigate?: (route: string) => void;
}

export const ShieldIntroScreen: React.FC<ShieldIntroScreenProps> = ({ onNavigate }) => {
  const { setEnabled } = useShieldControl();
  const handleTurnOnShield = async () => {
    try {
      await setEnabled(true);
    } catch (e) {
      console.warn('Shield activation:', e);
    }
    onNavigate?.('job-spot');
  };
  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, paddingHorizontal: 20, paddingBottom: 0, flexDirection: 'row' }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('noop')} style={{ height: 44, paddingVertical: 0, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', alignItems: 'center', gap: 6, flexDirection: 'row' }}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0F1B2D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={12} cy={12} r={9} />
            <Path d="M3 12h18" />
            <Path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
          </Svg>
          <Text style={{ color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.semiBold, lineHeight: 20, includeFontPadding: false }}>{"Bahasa Indonesia"}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('noop')} style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 0, backgroundColor: '#0F1B2D', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M11 5L6 9H3v6h3l5 4z" />
            <Path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <Path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </Svg>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, flexDirection: 'column', alignItems: 'center', gap: 22, paddingTop: 20, paddingHorizontal: 24, paddingBottom: 0 }}>
        <Svg width={190} height={200} viewBox="0 0 190 200">
          <Rect x={40} y={10} width={110} height={180} rx={18} fill="#FFFFFF" stroke="#0F1B2D" strokeWidth={3} />
          <Rect x={54} y={34} width={82} height={10} rx={5} fill="#DCE3EC" />
          <Rect x={54} y={52} width={60} height={10} rx={5} fill="#DCE3EC" />
          <Rect x={54} y={72} width={82} height={56} rx={8} fill="#EEF2F6" />
          <Rect x={54} y={138} width={70} height={10} rx={5} fill="#DCE3EC" />
          <Circle cx={150} cy={104} r={30} fill="#FCEFD2" />
          <Circle cx={150} cy={104} r={22} fill="#F2B01E" />
          <G transform={`translate(${150 - 19} ${104 - 19}) scale(${38 / MARK_VIEW[2]}) translate(${-MARK_VIEW[0]} ${-MARK_VIEW[1]})`}>
            <MarkShapes shapes={markShapes()} />
          </G>
        </Svg>
        <View style={{ flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: '#0F1B2D', textAlign: 'center', lineHeight: 38, fontFamily: theme.fonts.extraBold, includeFontPadding: false, fontSize: 28, letterSpacing: -0.5 }}>Your shield doll</Text>
          <Text style={{ color: '#334155', textAlign: 'center', lineHeight: 26, fontFamily: theme.fonts.regular, includeFontPadding: false, fontSize: 17 }}>It sits on the side of your screen. Tap it on anything that looks strange.</Text>
        </View>
        <View style={{ width: '100%', flexDirection: 'column', gap: 10 }}>
          <View style={{ alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row' }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#1F1A17', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'row' }}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M9 11V5a2 2 0 0 1 4 0v5" />
                <Path d="M13 10a2 2 0 0 1 4 0v1a2 2 0 0 1 3 1.7V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L5 15a2 2 0 0 1 3-2.6L9 13" />
              </Svg>
            </View>
            <Text style={{ color: '#0F1B2D', fontSize: 17, fontFamily: theme.fonts.bold, lineHeight: 23, includeFontPadding: false }}>Tap the doll</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row' }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#1F1A17', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'row' }}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Circle cx={11} cy={11} r={7} />
                <Path d="M21 21l-5-5" />
              </Svg>
            </View>
            <Text style={{ color: '#0F1B2D', fontSize: 17, fontFamily: theme.fonts.bold, lineHeight: 23, includeFontPadding: false }}>We check it for you</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row' }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#1F1A17', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'row' }}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12l5 5L20 7" />
              </Svg>
            </View>
            <View style={{ flexWrap: 'wrap', gap: 6, flexDirection: 'row' }}>
              <Text style={{ backgroundColor: '#DBE5FF', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, color: '#1E3A8A', fontSize: 13, fontFamily: theme.fonts.bold, lineHeight: 18, includeFontPadding: false }}>Safe</Text>
              <Text style={{ backgroundColor: '#FEF3C7', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, color: '#713F12', fontSize: 13, fontFamily: theme.fonts.bold, lineHeight: 18, includeFontPadding: false }}>Careful</Text>
              <Text style={{ backgroundColor: '#9F1239', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, color: '#FFFFFF', fontSize: 13, fontFamily: theme.fonts.bold, lineHeight: 18, includeFontPadding: false }}>Danger</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 26, flexDirection: 'column', gap: 10 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={handleTurnOnShield} style={{ height: 60, borderRadius: 16, backgroundColor: '#1F1A17', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>{"Turn on shield"}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('noop')} style={{ height: 52, borderRadius: 14, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#0F1B2D', fontSize: 16, fontFamily: theme.fonts.bold, lineHeight: 22, includeFontPadding: false }}>{"Add a family member"}</Text>
        </TouchableOpacity>
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

export default ShieldIntroScreen;
