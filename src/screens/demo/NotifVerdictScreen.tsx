import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import theme from '../../theme/theme';

interface NotifVerdictScreenProps {
  onNavigate?: (route: string) => void;
}

export const NotifVerdictScreen: React.FC<NotifVerdictScreenProps> = ({ onNavigate }) => {
  const [playing] = React.useState(false);
  return (
    <View style={styles.container}>
      <View style={{ height: 90 }}>
      </View>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomRightRadius: 0, borderBottomLeftRadius: 0, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 24, flexDirection: 'column', gap: 14 }}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1' }}>
        </View>
        <View style={{ alignItems: 'center', gap: 14, flexDirection: 'row' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#9F1239', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              <Path d="M12 9v4" />
              <Path d="M12 17h.01" />
            </Svg>
          </View>
          <View style={{ flexDirection: 'column' }}>
            <Text style={{ color: '#881337', fontSize: 32, fontFamily: theme.fonts.extraBold, letterSpacing: -0.5, lineHeight: 35, includeFontPadding: false }}>Danger</Text>
            <Text style={{ color: '#881337', fontSize: 15, fontFamily: theme.fonts.semiBold, lineHeight: 20, includeFontPadding: false }}>Delivery fee looks fake</Text>
          </View>
        </View>
        <Text style={{ color: '#0F1B2D', fontSize: 20, lineHeight: 28, fontFamily: theme.fonts.bold, includeFontPadding: false }}>Do not open the link. Check your parcel in the courier's own app.</Text>
        {!playing ? (
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('noop')} style={{ height: 56, borderRadius: 16, borderWidth: 2, borderColor: '#0F1B2D', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 10, flexDirection: 'row' }}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#0F1B2D" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M11 5L6 9H3v6h3l5 4z" />
              <Path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <Path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </Svg>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>{"Listen"}</Text>
          </TouchableOpacity>
        ) : null}
        {playing ? (
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('noop')} style={{ height: 56, borderRadius: 16, borderWidth: 2, borderColor: '#0F1B2D', backgroundColor: '#0F1B2D', alignItems: 'center', justifyContent: 'center', gap: 10, flexDirection: 'row' }}>
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
        <View style={{ flexDirection: 'column', gap: 8 }}>
          <View style={{ alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#FFF0F2', borderRadius: 14, flexDirection: 'row' }}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#881337" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
              <Path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
            </Svg>
            <Text style={{ flex: 1, color: '#6F0F2C', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Link matches reported scams</Text>
            <Text style={{ backgroundColor: '#FFFFFF', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6, color: '#6F0F2C', fontFamily: theme.fonts.mono, fontSize: 11, lineHeight: 15, includeFontPadding: false }}>Web Risk</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#FFF0F2', borderRadius: 14, flexDirection: 'row' }}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#881337" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={9} cy={8} r={3.5} />
              <Path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
              <Path d="M17 8l4 4" />
              <Path d="M21 8l-4 4" />
            </Svg>
            <Text style={{ flex: 1, color: '#6F0F2C', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Number reported by others</Text>
            <Text style={{ backgroundColor: '#FFFFFF', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6, color: '#6F0F2C', fontFamily: theme.fonts.mono, fontSize: 11, lineHeight: 15, includeFontPadding: false }}>Seen before</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#FFF0F2', borderRadius: 14, flexDirection: 'row' }}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#881337" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={13} r={8} />
              <Path d="M12 9v4l2 2" />
              <Path d="M9 2h6" />
            </Svg>
            <Text style={{ flex: 1, color: '#6F0F2C', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Small fee, pay today</Text>
            <Text style={{ backgroundColor: '#FFFFFF', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6, color: '#6F0F2C', fontFamily: theme.fonts.mono, fontSize: 11, lineHeight: 15, includeFontPadding: false }}>Message</Text>
          </View>
        </View>
        <Text style={{ flex: 1, color: '#0F1B2D', includeFontPadding: false, fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular }}></Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('noop')} style={{ height: 58, borderRadius: 16, borderWidth: 0, backgroundColor: '#1F1A17' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>{"Delete and block"}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('noop')} style={{ height: 54, borderRadius: 16, borderWidth: 2, borderColor: '#9F1239', backgroundColor: '#FFFFFF' }}>
          <Text style={{ color: '#881337', fontSize: 17, fontFamily: theme.fonts.extraBold, lineHeight: 23, includeFontPadding: false }}>{"I already opened it or paid"}</Text>
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

export default NotifVerdictScreen;
