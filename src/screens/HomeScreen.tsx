import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Ellipse, Line } from 'react-native-svg';
import theme from '../theme/theme';

interface HomeScreenProps {
  onNavigate?: (route: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={{ flex: 1, flexDirection: 'column', gap: 16, paddingTop: 24, paddingHorizontal: 20, paddingBottom: 12, overflow: 'hidden' }}>
        <View style={{ alignItems: 'center', justifyContent: 'space-between', height: 44, flexDirection: 'row' }}>
          <View style={{ alignItems: 'center', gap: 8, flexDirection: 'row' }}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
              <Path d="M9 12l2 2 4-4" />
            </Svg>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.bold, letterSpacing: -0.2, lineHeight: 24, includeFontPadding: false }}>SafeRoute</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('Profile')} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 0, backgroundColor: '#DCE3EC' }}>
            <Text style={{ color: '#0F1B2D', fontFamily: theme.fonts.bold, fontSize: 16, lineHeight: 22, includeFontPadding: false }}>{"R"}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'column', gap: 4 }}>
          <Text style={{ color: '#0F1B2D', fontSize: 24, fontFamily: theme.fonts.bold, letterSpacing: -0.4, lineHeight: 32, includeFontPadding: false }}>Good morning, Rina</Text>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Check any job offer before you say yes.</Text>
        </View>
        <View style={{ backgroundColor: '#0F1B2D', borderRadius: 20, padding: 20, flexDirection: 'column', gap: 14 }}>
          <View style={{ flexDirection: 'column', gap: 6 }}>
            <Text style={{ color: '#FFFFFF', lineHeight: 26, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 19 }}>Got an overseas job offer?</Text>
            <Text style={{ color: '#CBD5E1', lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false, fontSize: 14 }}>Share the ad, a screenshot or the chat. We check it for trafficking and money-mule warning signs.</Text>
          </View>
          <View style={{ gap: 8, flexDirection: 'row' }}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ height: 64, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1E293B', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, flex: 1 }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round">
                <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                <Path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
              </Svg>
              <Text style={{ color: '#FFFFFF', lineHeight: 16, fontFamily: theme.fonts.semiBold, includeFontPadding: false, fontSize: 12 }}>{"Paste link"}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ height: 64, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1E293B', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, flex: 1 }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Rect x={3} y={5} width={18} height={14} rx={2} />
                <Circle cx={9} cy={10} r={1.5} />
                <Path d="M21 16l-5-5-8 8" />
              </Svg>
              <Text style={{ color: '#FFFFFF', lineHeight: 16, fontFamily: theme.fonts.semiBold, includeFontPadding: false, fontSize: 12 }}>{"Screenshot"}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ height: 64, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1E293B', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, flex: 1 }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
              </Svg>
              <Text style={{ color: '#FFFFFF', lineHeight: 16, fontFamily: theme.fonts.semiBold, includeFontPadding: false, fontSize: 12 }}>{"Chat"}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('JobCheck.dc.html')} style={{ height: 48, borderRadius: 12, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            <Text style={{ color: '#FFFFFF', lineHeight: 20, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 15 }}>{"Check a job offer"}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'column', gap: 10 }}>
          <Text style={{ color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>More protection</Text>
          <View style={{ gap: 10, flexDirection: 'row' }}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ borderRadius: 16, borderWidth: 1, borderColor: '#DCE3EC', backgroundColor: '#FFFFFF', padding: 14, flexDirection: 'column', gap: 6, flex: 1 }}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
              </Svg>
              <Text style={{ color: '#0F1B2D', textAlign: 'left', lineHeight: 19, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 14 }}>Online relationship</Text>
              <Text style={{ color: '#475569', textAlign: 'left', lineHeight: 17, fontFamily: theme.fonts.regular, includeFontPadding: false, fontSize: 12 }}>Spot slow romance and investment scams</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ borderRadius: 16, borderWidth: 1, borderColor: '#DCE3EC', backgroundColor: '#FFFFFF', padding: 14, flexDirection: 'column', gap: 6, flex: 1 }}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                <Circle cx={12} cy={9.5} r={2.5} />
              </Svg>
              <Text style={{ color: '#0F1B2D', textAlign: 'left', lineHeight: 19, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 14 }}>Travel plan</Text>
              <Text style={{ color: '#475569', textAlign: 'left', lineHeight: 17, fontFamily: theme.fonts.regular, includeFontPadding: false, fontSize: 12 }}>Flag risky routes before you leave</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('Family.dc.html')} style={{ borderRadius: 16, borderWidth: 1, borderColor: '#DCE3EC', backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', gap: 12, flexDirection: 'row' }}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FDE4D3', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', flexDirection: 'row' }}>
              <Text style={{ color: '#9A3412', lineHeight: 18, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 13 }}>{"I"}</Text>
            </View>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#DBE5FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', marginLeft: -10, flexDirection: 'row' }}>
              <Text style={{ color: '#1E3A8A', lineHeight: 18, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 13 }}>{"D"}</Text>
            </View>
          </View>
          <View style={{ flex: 1, flexDirection: 'column', gap: 2 }}>
            <Text style={{ color: '#0F1B2D', lineHeight: 19, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 14 }}>Family circle</Text>
            <Text style={{ color: '#475569', lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false, fontSize: 12 }}>Ibu and Dewi get your check-ins</Text>
          </View>
          <Text style={{ backgroundColor: '#DBE5FF', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, color: '#1E3A8A', lineHeight: 16, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 12 }}>On</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'column', gap: 8 }}>
          <Text style={{ color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Recent checks</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('Result.dc.html')} style={{ alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', flexDirection: 'row' }}>
            <View style={{ flexDirection: 'column', gap: 2 }}>
              <Text style={{ color: '#0F1B2D', lineHeight: 19, fontFamily: theme.fonts.semiBold, includeFontPadding: false, fontSize: 14 }}>Data entry staff, Thailand</Text>
              <Text style={{ color: '#475569', lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false, fontSize: 12 }}>TikTok · today</Text>
            </View>
            <Text style={{ backgroundColor: '#C2410C', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, color: '#FFFFFF', lineHeight: 16, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 12 }}>High risk</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', flexDirection: 'row' }}>
            <View style={{ flexDirection: 'column', gap: 2 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, fontFamily: theme.fonts.semiBold, lineHeight: 19, includeFontPadding: false }}>Hotel receptionist, Malaysia</Text>
              <Text style={{ color: '#475569', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>JobStreet · 3 days ago</Text>
            </View>
            <Text style={{ backgroundColor: '#DBE5FF', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, color: '#1E3A8A', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Low risk</Text>
          </View>
        </View>
      </View>
      <View style={{ height: 72, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#DCE3EC', paddingTop: 6, paddingHorizontal: 8, paddingBottom: 10, flexDirection: 'row' }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('Main.dc.html')} style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, flex: 1 }}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
          </Svg>
          <Text style={{ color: '#1D4ED8', fontSize: 11, fontFamily: theme.fonts.bold, lineHeight: 15, includeFontPadding: false }}>{"Home"}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('JobCheck.dc.html')} style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, flex: 1 }}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
          </Svg>
          <Text style={{ color: '#475569', fontSize: 11, fontFamily: theme.fonts.semiBold, lineHeight: 15, includeFontPadding: false }}>{"Check"}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('Family.dc.html')} style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, flex: 1 }}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={9} cy={8} r={3.5} />
            <Path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
            <Path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
            <Path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
          </Svg>
          <Text style={{ color: '#475569', fontSize: 11, fontFamily: theme.fonts.semiBold, lineHeight: 15, includeFontPadding: false }}>{"Family"}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('Main.dc.html')} style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, flex: 1 }}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
            <Path d="M4 19V5" />
          </Svg>
          <Text style={{ color: '#475569', fontSize: 11, fontFamily: theme.fonts.semiBold, lineHeight: 15, includeFontPadding: false }}>{"Learn"}</Text>
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

export default HomeScreen;
