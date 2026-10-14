import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Ellipse, Line } from 'react-native-svg';
import theme from '../theme/theme';

interface JobCheckScreenProps {
  onNavigate?: (route: string) => void;
}

export const JobCheckScreen: React.FC<JobCheckScreenProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={{ flex: 1, flexDirection: 'column', gap: 16, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 12, overflow: 'hidden' }}>
        <View style={{ alignItems: 'center', gap: 8, height: 44, flexDirection: 'row' }}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('Main.dc.html')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#0F1B2D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </TouchableOpacity>
          <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.bold, lineHeight: 24, includeFontPadding: false }}>Check a job offer</Text>
        </View>
        <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, padding: 12, gap: 12, flexDirection: 'row' }}>
          <View style={{ width: 96, height: 150, flexShrink: 0, borderRadius: 10, backgroundColor: '#1E293B', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 }}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Polygon points="8 5 19 12 8 19 8 5" />
            </Svg>
            <Text style={{ color: '#CBD5E1', fontSize: 11, textAlign: 'center', lineHeight: 15, fontFamily: theme.fonts.regular, includeFontPadding: false }}>{"[JOB VIDEO SCREENSHOT]"}</Text>
          </View>
          <View style={{ flex: 1, flexDirection: 'column', gap: 8 }}>
            <Text style={{ alignSelf: 'flex-start', backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontFamily: theme.fonts.medium, fontSize: 11, lineHeight: 15, includeFontPadding: false }}>Source: TikTok</Text>
            <Text style={{ color: '#1E293B', fontSize: 13, lineHeight: 20, fontFamily: theme.fonts.regular, includeFontPadding: false }}>&quot;Urgent! Data entry staff needed in Thailand. High salary, free flight, hotel and visa. No experience needed. DM us on Telegram today.&quot;</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ alignSelf: 'flex-start', height: 32, paddingVertical: 0, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DCE3EC', backgroundColor: '#FFFFFF' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 12, fontFamily: theme.fonts.semiBold, lineHeight: 16, includeFontPadding: false }}>{"Add more"}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: 'column', gap: 6 }}>
          <Text style={{ color: '#0F1B2D', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>Where will you work?</Text>
          <TextInput editable={false} value="Bangkok, Thailand" style={{ height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', paddingVertical: 0, paddingHorizontal: 14, color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }} />
        </View>
        <View style={{ flexDirection: 'column', gap: 6 }}>
          <Text style={{ color: '#0F1B2D', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>How will you get there?</Text>
          <TextInput editable={false} value="Fly to Bangkok, company car picks me up" style={{ height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', paddingVertical: 0, paddingHorizontal: 14, color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }} />
        </View>
        <View style={{ flexDirection: 'column', gap: 8 }}>
          <Text style={{ color: '#0F1B2D', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>Report language</Text>
          <View style={{ flexWrap: 'wrap', gap: 8, flexDirection: 'row' }}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ height: 36, paddingVertical: 0, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#0F1B2D', backgroundColor: '#0F1B2D' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>{"English"}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ height: 36, paddingVertical: 0, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>{"Bahasa"}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ height: 36, paddingVertical: 0, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>{"Tagalog"}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ height: 36, paddingVertical: 0, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>{"Myanmar"}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('action')} style={{ height: 36, paddingVertical: 0, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>{"More"}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, padding: 14, flexDirection: 'column', gap: 10 }}>
          <Text style={{ color: '#0F1B2D', fontSize: 13, fontFamily: theme.fonts.bold, lineHeight: 18, includeFontPadding: false }}>What we will check</Text>
          <View style={{ alignItems: 'center', gap: 10, flexDirection: 'row' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#DBE5FF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <Text style={{ color: '#1E3A8A', fontSize: 11, lineHeight: 15, fontFamily: theme.fonts.bold, includeFontPadding: false }}>{"1"}</Text>
            </View>
            <Text style={{ color: '#0F1B2D', fontSize: 13, lineHeight: 18, fontFamily: theme.fonts.regular, includeFontPadding: false }}>{"Read the ad, video and chat"}</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 10, flexDirection: 'row' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#DBE5FF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <Text style={{ color: '#1E3A8A', fontSize: 11, lineHeight: 15, fontFamily: theme.fonts.bold, includeFontPadding: false }}>{"2"}</Text>
            </View>
            <Text style={{ color: '#0F1B2D', fontSize: 13, lineHeight: 18, fontFamily: theme.fonts.regular, includeFontPadding: false }}>{"Confirm the employer really exists"}</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 10, flexDirection: 'row' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#DBE5FF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <Text style={{ color: '#1E3A8A', fontSize: 11, lineHeight: 15, fontFamily: theme.fonts.bold, includeFontPadding: false }}>{"3"}</Text>
            </View>
            <Text style={{ color: '#0F1B2D', fontSize: 13, lineHeight: 18, fontFamily: theme.fonts.regular, includeFontPadding: false }}>{"Scan every link for danger"}</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 10, flexDirection: 'row' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#DBE5FF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <Text style={{ color: '#1E3A8A', fontSize: 11, lineHeight: 15, fontFamily: theme.fonts.bold, includeFontPadding: false }}>{"4"}</Text>
            </View>
            <Text style={{ color: '#0F1B2D', fontSize: 13, lineHeight: 18, fontFamily: theme.fonts.regular, includeFontPadding: false }}>{"Compare with known trafficking signs"}</Text>
          </View>
        </View>
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: 24, backgroundColor: '#F4F6F8' }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('Result.dc.html')} style={{ height: 52, borderRadius: 14, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: theme.fonts.bold, lineHeight: 22, includeFontPadding: false }}>{"Analyse offer"}</Text>
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

export default JobCheckScreen;
