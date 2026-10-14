import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Ellipse, Line } from 'react-native-svg';
import theme from '../theme/theme';

interface ChatVerdictScreenProps {
  onNavigate?: (route: string) => void;
}

export const ChatVerdictScreen: React.FC<ChatVerdictScreenProps> = ({ onNavigate }) => {
  const [playing, setPlaying] = React.useState(false);
  return (
    <View style={styles.container}>
      <View style={{ height: 100, paddingVertical: 20, paddingHorizontal: 16, flexDirection: 'column', gap: 10 }}>
        <View style={{ alignItems: 'center', gap: 10, flexDirection: 'row' }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#5B5F7A' }}>
          </View>
          <View style={{ width: 90, height: 10, borderRadius: 5, backgroundColor: '#5B616B' }}>
          </View>
        </View>
        <View style={{ width: 220, height: 10, borderRadius: 5, backgroundColor: '#5B616B' }}>
        </View>
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
              <Text style={{ color: '#9A3412', fontSize: 15, fontFamily: theme.fonts.semiBold, lineHeight: 20, includeFontPadding: false }}>Love and money trap</Text>
            </View>
          </View>
          <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, color: '#334155', fontSize: 13, fontFamily: theme.fonts.bold, lineHeight: 18, includeFontPadding: false }}>2 screens</Text>
        </View>
        <Text style={{ color: '#0F1B2D', fontSize: 20, lineHeight: 28, fontFamily: theme.fonts.bold, includeFontPadding: false }}>Do not send money. People you only know online can lie about who they are.</Text>
        {!playing ? (
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ height: 56, borderRadius: 16, borderWidth: 2, borderColor: '#0F1B2D', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 10, flexDirection: 'row' }}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#0F1B2D" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M11 5L6 9H3v6h3l5 4z" />
              <Path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <Path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </Svg>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>{"Listen"}</Text>
          </TouchableOpacity>
        ) : null}
        {playing ? (
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ height: 56, borderRadius: 16, borderWidth: 2, borderColor: '#0F1B2D', backgroundColor: '#0F1B2D', alignItems: 'center', justifyContent: 'center', gap: 10, flexDirection: 'row' }}>
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
        <View style={{ flexDirection: 'column', gap: 4 }}>
          <Text style={{ paddingBottom: 6, color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.extraBold, lineHeight: 20, includeFontPadding: false }}>How it happened</Text>
          <View style={{ alignItems: 'center', gap: 12, height: 38, flexDirection: 'row' }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#94A3B8', flexShrink: 0 }}>
            </View>
            <Text style={{ flex: 1, color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.semiBold, lineHeight: 20, includeFontPadding: false }}>&quot;Wrong number&quot; first message</Text>
            <Text style={{ color: '#475569', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>3 wk</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 12, height: 38, flexDirection: 'row' }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#94A3B8', flexShrink: 0 }}>
            </View>
            <Text style={{ flex: 1, color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.semiBold, lineHeight: 20, includeFontPadding: false }}>Says he loves you, fast</Text>
            <Text style={{ color: '#475569', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>2 wk</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 12, height: 38, flexDirection: 'row' }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#EA580C', flexShrink: 0 }}>
            </View>
            <Text style={{ flex: 1, color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.semiBold, lineHeight: 20, includeFontPadding: false }}>&quot;Secret&quot; trading app</Text>
            <Text style={{ color: '#475569', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>1 wk</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 12, height: 38, flexDirection: 'row' }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#C2410C', flexShrink: 0 }}>
            </View>
            <Text style={{ flex: 1, color: '#9A3412', fontSize: 15, fontFamily: theme.fonts.extraBold, lineHeight: 20, includeFontPadding: false }}>Asks you to send money</Text>
            <Text style={{ color: '#9A3412', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Today</Text>
          </View>
        </View>
        <Text style={{ flex: 1, color: '#0F1B2D', includeFontPadding: false, fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular }}></Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('Family.dc.html')} style={{ height: 58, borderRadius: 16, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', gap: 10, flexDirection: 'row' }}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={9} cy={8} r={3.5} />
            <Path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
            <Path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
            <Path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
          </Svg>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>{"Tell my family"}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ height: 54, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 10, flexDirection: 'row' }}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#0F1B2D" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={12} cy={12} r={9} />
            <Path d="M5.6 5.6l12.8 12.8" />
          </Svg>
          <Text style={{ color: '#0F1B2D', fontSize: 17, fontFamily: theme.fonts.bold, lineHeight: 23, includeFontPadding: false }}>{"Block and report"}</Text>
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

export default ChatVerdictScreen;
