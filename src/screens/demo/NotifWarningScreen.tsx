import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import theme from '../../theme/theme';

interface NotifWarningScreenProps {
  onNavigate?: (route: string) => void;
}

export const NotifWarningScreen: React.FC<NotifWarningScreenProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={{ position: 'absolute', left: 24, right: 24, top: 300, rowGap: 22, columnGap: 18, flexDirection: 'row' }}>
        <View style={{ height: 58, borderRadius: 16, backgroundColor: '#475569', flex: 1 }}>
        </View>
        <View style={{ height: 58, borderRadius: 16, backgroundColor: '#475569', flex: 1 }}>
        </View>
        <View style={{ height: 58, borderRadius: 16, backgroundColor: '#475569', flex: 1 }}>
        </View>
        <View style={{ height: 58, borderRadius: 16, backgroundColor: '#475569', flex: 1 }}>
        </View>
        <View style={{ height: 58, borderRadius: 16, backgroundColor: '#475569', flex: 1 }}>
        </View>
        <View style={{ height: 58, borderRadius: 16, backgroundColor: '#475569', flex: 1 }}>
        </View>
        <View style={{ height: 58, borderRadius: 16, backgroundColor: '#475569', flex: 1 }}>
        </View>
        <View style={{ height: 58, borderRadius: 16, backgroundColor: '#475569', flex: 1 }}>
        </View>
        <View style={{ height: 58, borderRadius: 16, backgroundColor: '#475569', flex: 1 }}>
        </View>
        <View style={{ height: 58, borderRadius: 16, backgroundColor: '#475569', flex: 1 }}>
        </View>
        <View style={{ height: 58, borderRadius: 16, backgroundColor: '#475569', flex: 1 }}>
        </View>
        <View style={{ height: 58, borderRadius: 16, backgroundColor: '#475569', flex: 1 }}>
        </View>
      </View>
      <View style={{ position: 'absolute', left: 12, right: 12, top: 20, flexDirection: 'column' }}>
        <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 0, borderBottomLeftRadius: 0, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'column', gap: 6 }}>
          <View style={{ alignItems: 'center', gap: 8, flexDirection: 'row' }}>
            <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: '#CBD5E1' }}>
            </View>
            <Text style={{ color: '#475569', fontSize: 12, fontFamily: theme.fonts.semiBold, lineHeight: 16, includeFontPadding: false }}>{"Messages · now"}</Text>
          </View>
          <Text style={{ color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>+62 812 [NUMBER]</Text>
          <Text style={{ color: '#1E293B', fontSize: 14, lineHeight: 20, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Your parcel is held at the warehouse. Pay the small delivery fee today or it will be returned: [SHORT LINK]</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('notif-verdict')} style={{ backgroundColor: '#C2410C', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomRightRadius: 20, borderBottomLeftRadius: 20, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', gap: 12, flexDirection: 'row' }}>
          <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
            <Path d="M12 8v4" />
            <Path d="M12 16h.01" />
          </Svg>
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <Text style={{ color: '#FFFFFF', lineHeight: 22, fontFamily: theme.fonts.extraBold, includeFontPadding: false, fontSize: 16 }}>Danger: likely fake message</Text>
            <Text style={{ color: '#FFEDD5', lineHeight: 18, fontFamily: theme.fonts.regular, includeFontPadding: false, fontSize: 13 }}>Do not open the link. Tap to see why.</Text>
          </View>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 6l6 6-6 6" />
          </Svg>
        </TouchableOpacity>
      </View>
      <View style={{ position: 'absolute', right: 6, top: 560, width: 84, height: 84, borderRadius: 42, backgroundColor: '#FDBA74', opacity: 0.55 }}>
      </View>
      <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('notif-verdict')} style={{ position: 'absolute', right: 16, top: 570, width: 64, height: 64, borderRadius: 32, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </Svg>
      </TouchableOpacity>
      <View style={{ position: 'absolute', right: 10, top: 564, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#C2410C', flexDirection: 'row' }}>
        <Text style={{ color: '#C2410C', fontSize: 15, fontFamily: theme.fonts.extraBold, lineHeight: 20, includeFontPadding: false }}>{"!"}</Text>
      </View>
      <View style={{ position: 'absolute', left: 24, right: 24, bottom: 34, backgroundColor: '#0F1B2D', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 10, alignItems: 'flex-start', flexDirection: 'row' }}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#E2E8F0" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={5} y={11} width={14} height={10} rx={2} />
          <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </Svg>
        <Text style={{ color: '#E2E8F0', fontSize: 13, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>{"Checked on your phone first. Only suspicious messages are sent for a deeper check."}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 390, height: 844, position: 'relative', backgroundColor: '#334155', overflow: 'hidden' },
  defaultText: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: theme.fonts.regular,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
});

export default NotifWarningScreen;
