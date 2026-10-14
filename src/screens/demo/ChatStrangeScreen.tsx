import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Ellipse, Line } from 'react-native-svg';
import theme from '../../theme/theme';

interface ChatStrangeScreenProps {
  onNavigate?: (route: string) => void;
}

export const ChatStrangeScreen: React.FC<ChatStrangeScreenProps> = ({ onNavigate }) => {
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
      <View style={{ flex: 1, flexDirection: 'column', gap: 10, paddingVertical: 16, paddingHorizontal: 14, justifyContent: 'flex-end' }}>
        <Text style={{ alignSelf: 'center', backgroundColor: '#E5E7EB', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, color: '#6B7280', fontSize: 12, fontFamily: theme.fonts.semiBold, lineHeight: 16, includeFontPadding: false }}>Today</Text>
        <Text style={{ alignSelf: 'flex-start', maxWidth: '76%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 15, lineHeight: 22, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Good morning my dear. Did you sleep well?</Text>
        <Text style={{ alignSelf: 'flex-end', maxWidth: '76%', backgroundColor: '#DBEAFE', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 4, borderBottomLeftRadius: 16, paddingVertical: 10, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 15, lineHeight: 22, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Yes, thank you</Text>
        <Text style={{ alignSelf: 'flex-start', maxWidth: '76%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 15, lineHeight: 22, fontFamily: theme.fonts.regular, includeFontPadding: false }}>I made big profit again on my trading app today</Text>
        <View style={{ alignSelf: 'flex-start', width: 200, height: 120, backgroundColor: '#E5E7EB', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Text style={{ color: '#4B5563', fontSize: 12, fontFamily: theme.fonts.semiBold, lineHeight: 16, includeFontPadding: false }}>{"[PROFIT SCREENSHOT]"}</Text>
        </View>
        <Text style={{ alignSelf: 'flex-start', maxWidth: '76%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 15, lineHeight: 22, fontFamily: theme.fonts.regular, includeFontPadding: false }}>You should join, I will guide you. Just top up first.</Text>
        <Text style={{ alignSelf: 'flex-start', maxWidth: '76%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 15, lineHeight: 22, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Send the money today, price goes up tomorrow. Trust me.</Text>
      </View>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 10, paddingHorizontal: 14, paddingBottom: 22, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row' }}>
        <View style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', paddingVertical: 0, paddingHorizontal: 16, flexDirection: 'row' }}>
          <Text style={{ color: '#6B7280', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>{"Message"}</Text>
        </View>
      </View>
      <Text style={{ position: 'absolute', right: 92, top: 214, backgroundColor: '#0F1B2D', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, color: '#FFFFFF', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Tap to check this chat</Text>
      <View style={{ position: 'absolute', right: 84, top: 228, width: 14, height: 14, backgroundColor: '#0F1B2D', transform: [{ rotate: '45deg' }] }}>
      </View>
      <View style={{ position: 'absolute', right: 6, top: 194, width: 84, height: 84, borderRadius: 42, backgroundColor: '#DBE5FF', opacity: 0.9 }}>
      </View>
      <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('chat-more')} style={{ position: 'absolute', right: 16, top: 204, width: 64, height: 64, borderRadius: 32, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </Svg>
      </TouchableOpacity>
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

export default ChatStrangeScreen;
