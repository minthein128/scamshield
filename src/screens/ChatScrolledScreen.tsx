import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Ellipse, Line } from 'react-native-svg';
import theme from '../theme/theme';

interface ChatScrolledScreenProps {
  onNavigate?: (route: string) => void;
}

export const ChatScrolledScreen: React.FC<ChatScrolledScreenProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row' }}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M15 18l-6-6 6-6" />
        </Svg>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#C7D2FE', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Text style={{ color: '#312E81', fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false, fontSize: 14 }}>{"K"}</Text>
        </View>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          <Text style={{ color: '#0F1B2D', fontSize: 16, fontFamily: theme.fonts.bold, lineHeight: 22, includeFontPadding: false }}>Kevin</Text>
          <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Any chat app · sample</Text>
        </View>
      </View>
      <View style={{ flex: 1, flexDirection: 'column', gap: 10, paddingVertical: 16, paddingHorizontal: 14 }}>
        <Text style={{ alignSelf: 'center', backgroundColor: '#E5E7EB', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, color: '#6B7280', fontSize: 12, fontFamily: theme.fonts.semiBold, lineHeight: 16, includeFontPadding: false }}>3 weeks ago</Text>
        <Text style={{ alignSelf: 'flex-start', maxWidth: '76%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 15, lineHeight: 22, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Hello, sorry wrong number. But your photo looks kind.</Text>
        <Text style={{ alignSelf: 'flex-end', maxWidth: '76%', backgroundColor: '#DBEAFE', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 4, borderBottomLeftRadius: 16, paddingVertical: 10, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 15, lineHeight: 22, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Haha it's ok</Text>
        <Text style={{ alignSelf: 'flex-start', maxWidth: '76%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 15, lineHeight: 22, fontFamily: theme.fonts.regular, includeFontPadding: false }}>I am an engineer working overseas. It is lonely here.</Text>
        <Text style={{ alignSelf: 'center', backgroundColor: '#E5E7EB', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, color: '#6B7280', fontSize: 12, fontFamily: theme.fonts.semiBold, lineHeight: 16, includeFontPadding: false }}>2 weeks ago</Text>
        <Text style={{ alignSelf: 'flex-start', maxWidth: '76%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 15, lineHeight: 22, fontFamily: theme.fonts.regular, includeFontPadding: false }}>I think I am falling for you. God sent you to me.</Text>
        <Text style={{ alignSelf: 'flex-start', maxWidth: '76%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 15, lineHeight: 22, fontFamily: theme.fonts.regular, includeFontPadding: false }}>One day I want to build our future together</Text>
        <Text style={{ alignSelf: 'center', backgroundColor: '#E5E7EB', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, color: '#6B7280', fontSize: 12, fontFamily: theme.fonts.semiBold, lineHeight: 16, includeFontPadding: false }}>Last week</Text>
        <Text style={{ alignSelf: 'flex-start', maxWidth: '76%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 15, lineHeight: 22, fontFamily: theme.fonts.regular, includeFontPadding: false }}>My uncle showed me a secret trading app. Very safe.</Text>
      </View>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 10, paddingHorizontal: 14, paddingBottom: 22, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row' }}>
        <View style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', paddingVertical: 0, paddingHorizontal: 16, flexDirection: 'row' }}>
          <Text style={{ color: '#6B7280', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>{"Message"}</Text>
        </View>
      </View>
      <Text style={{ position: 'absolute', right: 92, top: 424, backgroundColor: '#0F1B2D', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, color: '#FFFFFF', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Tap again to add this</Text>
      <View style={{ position: 'absolute', right: 84, top: 438, width: 14, height: 14, backgroundColor: '#0F1B2D', transform: [{ rotate: '45deg' }] }}>
      </View>
      <View style={{ position: 'absolute', right: 6, top: 404, width: 84, height: 84, borderRadius: 42, backgroundColor: '#DBE5FF', opacity: 0.9 }}>
      </View>
      <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('ChatVerdict.dc.html')} style={{ position: 'absolute', right: 16, top: 414, width: 64, height: 64, borderRadius: 32, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </Svg>
      </TouchableOpacity>
      <View style={{ position: 'absolute', right: 10, top: 408, width: 24, height: 24, borderRadius: 12, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: theme.fonts.extraBold, lineHeight: 18, includeFontPadding: false }}>{"1"}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 390, height: 844, position: 'relative', backgroundColor: '#F3F4F6', flexDirection: 'column', overflow: 'hidden' },
  defaultText: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: theme.fonts.regular,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
});

export default ChatScrolledScreen;
