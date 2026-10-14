import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Ellipse, Line } from 'react-native-svg';
import theme from '../../theme/theme';

interface CaseStudyArchitectureScreenProps {
  onNavigate?: (route: string) => void;
}

export const CaseStudyArchitectureScreen: React.FC<CaseStudyArchitectureScreenProps> = ({ onNavigate }) => {
  return (
    <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }} showsHorizontalScrollIndicator={false}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <Text style={{ color: '#0F1B2D', fontSize: 40, fontFamily: theme.fonts.extraBold, letterSpacing: -0.8, lineHeight: 54, includeFontPadding: false }}>Case study: gambling bonus lure on Viber</Text>
        <Text style={{ color: '#475569', fontSize: 18, lineHeight: 24, fontFamily: theme.fonts.regular, includeFontPadding: false }}>How one screenshot moves through the six stages. [RESULT] marks a live lookup whose answer depends on the day it runs.</Text>
      </View>
      <View style={{ alignItems: 'flex-start', gap: 12, flexDirection: 'row' }}>
        <View style={{ width: 236, flexShrink: 0, flexDirection: 'column', gap: 10 }}>
          <View style={{ flexDirection: 'column', gap: 4 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 22, fontFamily: theme.fonts.extraBold, lineHeight: 30, includeFontPadding: false }}>1 · Capture</Text>
            <Text style={{ alignSelf: 'flex-start', backgroundColor: '#E2E8F0', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>On the phone</Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, padding: 14, flexDirection: 'column', gap: 10 }}>
            <Text style={{ color: '#475569', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Viber · not in contacts</Text>
            <View style={{ alignItems: 'center', gap: 8, flexDirection: 'row' }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#E2E8F0', flexShrink: 0 }}>
              </View>
              <View style={{ flexDirection: 'column' }}>
                <Text style={{ color: '#0F1B2D', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>[BURMESE NAME]</Text>
                <Text style={{ color: '#475569', fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 16, includeFontPadding: false }}>+95 966 876 ****</Text>
              </View>
            </View>
            <Text style={{ backgroundColor: '#F1F5F9', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>12 free red envelopes! 200% bonus on your first top-up. Limited slots, first come, first served.<Text></Text><Text style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: '#1D4ED8', lineHeight: 16, includeFontPadding: false }}>dljie[.]vip/kzfs</Text></Text>
            <Text style={{ color: '#475569', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Message summarised. Number masked and link broken with [.] so nobody opens it from this board.</Text>
          </View>
        </View>
        <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 6l6 6-6 6" />
        </Svg>
        <View style={{ width: 236, flexShrink: 0, flexDirection: 'column', gap: 10 }}>
          <View style={{ flexDirection: 'column', gap: 4 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 22, fontFamily: theme.fonts.extraBold, lineHeight: 30, includeFontPadding: false }}>2 · Extract</Text>
            <Text style={{ alignSelf: 'flex-start', backgroundColor: '#E0E7FF', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#3730A3', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>OCR + Gemini</Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, padding: 14, flexDirection: 'column', gap: 8 }}>
            <Text style={{ color: '#1E293B', fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 18, includeFontPadding: false }}><Text style={{ color: '#64748B', lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>app</Text> Viber</Text>
            <Text style={{ color: '#1E293B', fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 18, includeFontPadding: false }}><Text style={{ color: '#64748B', lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>sender</Text> +95 966 876 ****</Text>
            <Text style={{ color: '#1E293B', fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 18, includeFontPadding: false }}><Text style={{ color: '#64748B', lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>in_contacts</Text> false</Text>
            <Text style={{ color: '#1E293B', fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 18, includeFontPadding: false }}><Text style={{ color: '#64748B', lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>display_name</Text> &quot;Unfaithful person&quot; (from Burmese)</Text>
            <Text style={{ color: '#1E293B', fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 18, includeFontPadding: false }}><Text style={{ color: '#64748B', lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>url</Text> dljie[.]vip/kzfs</Text>
            <Text style={{ color: '#1E293B', fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 18, includeFontPadding: false }}><Text style={{ color: '#64748B', lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>tld</Text> .vip</Text>
            <Text style={{ color: '#1E293B', fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 18, includeFontPadding: false }}><Text style={{ color: '#64748B', lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>offers</Text> 12 free red envelopes; 200% first top-up bonus</Text>
            <Text style={{ color: '#1E293B', fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 18, includeFontPadding: false }}><Text style={{ color: '#64748B', lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>pressure</Text> &quot;limited slots&quot;, &quot;first come, first served&quot;</Text>
          </View>
        </View>
        <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 6l6 6-6 6" />
        </Svg>
        <View style={{ width: 236, flexShrink: 0, flexDirection: 'column', gap: 10 }}>
          <View style={{ flexDirection: 'column', gap: 4 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 22, fontFamily: theme.fonts.extraBold, lineHeight: 30, includeFontPadding: false }}>3 · Detect</Text>
            <Text style={{ alignSelf: 'flex-start', backgroundColor: '#E0E7FF', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#3730A3', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Gemini</Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, padding: 14, flexDirection: 'column', gap: 12 }}>
            <View style={{ flexDirection: 'column', gap: 2 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 16, fontFamily: theme.fonts.extraBold, lineHeight: 22, includeFontPadding: false }}>Gambling bonus lure</Text>
              <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Takes deposits and personal data</Text>
            </View>
            <View style={{ flexDirection: 'column', gap: 4 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>Unsolicited, unverified sender</Text>
              <Text style={{ alignSelf: 'flex-start', backgroundColor: '#EEF2F6', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 5, color: '#334155', fontSize: 11, fontFamily: theme.fonts.bold, lineHeight: 15, includeFontPadding: false }}>Identity</Text>
            </View>
            <View style={{ flexDirection: 'column', gap: 4 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>Link on an obscure domain</Text>
              <Text style={{ alignSelf: 'flex-start', backgroundColor: '#EEF2F6', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 5, color: '#334155', fontSize: 11, fontFamily: theme.fonts.bold, lineHeight: 15, includeFontPadding: false }}>Link risk</Text>
            </View>
            <View style={{ flexDirection: 'column', gap: 4 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>Free credit and 200% bonus</Text>
              <Text style={{ alignSelf: 'flex-start', backgroundColor: '#EEF2F6', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 5, color: '#334155', fontSize: 11, fontFamily: theme.fonts.bold, lineHeight: 15, includeFontPadding: false }}>Too good</Text>
            </View>
            <View style={{ flexDirection: 'column', gap: 4 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>Limited slots, first come</Text>
              <Text style={{ alignSelf: 'flex-start', backgroundColor: '#EEF2F6', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 5, color: '#334155', fontSize: 11, fontFamily: theme.fonts.bold, lineHeight: 15, includeFontPadding: false }}>Pressure</Text>
            </View>
            <Text style={{ borderTopWidth: 1, borderTopColor: '#EEF2F6', paddingTop: 10, color: '#475569', fontSize: 13, lineHeight: 18, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Complete message, so no ask-for-more step.</Text>
          </View>
        </View>
        <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 6l6 6-6 6" />
        </Svg>
        <View style={{ width: 236, flexShrink: 0, flexDirection: 'column', gap: 10 }}>
          <View style={{ flexDirection: 'column', gap: 4 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 22, fontFamily: theme.fonts.extraBold, lineHeight: 30, includeFontPadding: false }}>4 · Correlate</Text>
            <Text style={{ alignSelf: 'flex-start', backgroundColor: '#CCFBF1', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#115E59', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Lookups</Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, padding: 14, flexDirection: 'column', gap: 12 }}>
            <View style={{ flexDirection: 'column', gap: 2 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>Link → Web Risk</Text>
              <Text style={{ color: '#475569', fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 16, includeFontPadding: false }}>[RESULT]</Text>
            </View>
            <View style={{ flexDirection: 'column', gap: 2 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>Domain → age (RDAP)</Text>
              <Text style={{ color: '#475569', fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 16, includeFontPadding: false }}>[RESULT]</Text>
            </View>
            <View style={{ flexDirection: 'column', gap: 2 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>.vip → risky domain list</Text>
              <Text style={{ color: '#9A3412', fontFamily: theme.fonts.medium, fontSize: 12, lineHeight: 16, includeFontPadding: false }}>match</Text>
            </View>
            <View style={{ flexDirection: 'column', gap: 2 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>Number → report graph</Text>
              <Text style={{ color: '#475569', fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 16, includeFontPadding: false }}>[RESULT]</Text>
            </View>
            <View style={{ flexDirection: 'column', gap: 2, opacity: 0.55 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, fontFamily: theme.fonts.bold, textDecorationLine: 'line-through', lineHeight: 19, includeFontPadding: false }}>Display name → search</Text>
              <Text style={{ color: '#475569', fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 16, includeFontPadding: false }}>pruned: adds little</Text>
            </View>
          </View>
        </View>
        <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 6l6 6-6 6" />
        </Svg>
        <View style={{ width: 236, flexShrink: 0, flexDirection: 'column', gap: 10 }}>
          <View style={{ flexDirection: 'column', gap: 4 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 22, fontFamily: theme.fonts.extraBold, lineHeight: 30, includeFontPadding: false }}>5 · Score</Text>
            <Text style={{ alignSelf: 'flex-start', backgroundColor: '#CCFBF1', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#115E59', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Rules</Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, padding: 14, flexDirection: 'column', gap: 8 }}>
            <View style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Base: unsolicited</Text>
              <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.mono, includeFontPadding: false }}>-1.0</Text>
            </View>
            <View style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Identity</Text>
              <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.mono, includeFontPadding: false }}>+0.8</Text>
            </View>
            <View style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Link risk</Text>
              <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.mono, includeFontPadding: false }}>+1.4</Text>
            </View>
            <View style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Too good</Text>
              <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.mono, includeFontPadding: false }}>+1.4</Text>
            </View>
            <View style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Pressure</Text>
              <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.mono, includeFontPadding: false }}>+0.6</Text>
            </View>
            <View style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#DCE3EC', paddingTop: 8, flexDirection: 'row' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.extraBold, includeFontPadding: false }}>Total</Text>
              <Text style={{ color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.mono, includeFontPadding: false }}>3.2</Text>
            </View>
            <Text style={{ backgroundColor: '#FFF1E8', borderRadius: 10, padding: 10, color: '#7C2D12', fontSize: 13, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}><Text>Danger:</Text> over the 3.0 line and 4 families agree. A Web Risk hit would set Danger by itself.</Text>
            <Text style={{ color: '#475569', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Illustrative weights, to be tuned on labelled cases.</Text>
          </View>
        </View>
        <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 6l6 6-6 6" />
        </Svg>
        <View style={{ width: 236, flexShrink: 0, flexDirection: 'column', gap: 10 }}>
          <View style={{ flexDirection: 'column', gap: 4 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 22, fontFamily: theme.fonts.extraBold, lineHeight: 30, includeFontPadding: false }}>6 · Explain</Text>
            <Text style={{ alignSelf: 'flex-start', backgroundColor: '#E0E7FF', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#3730A3', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Gemini + voice</Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, padding: 14, flexDirection: 'column', gap: 12 }}>
            <View style={{ alignItems: 'center', gap: 10, flexDirection: 'row' }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'row' }}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                  <Path d="M12 9v4" />
                  <Path d="M12 17h.01" />
                </Svg>
              </View>
              <View style={{ flexDirection: 'column' }}>
                <Text style={{ color: '#9A3412', fontSize: 22, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>Danger</Text>
                <Text style={{ color: '#9A3412', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>Gambling trap</Text>
              </View>
            </View>
            <Text style={{ color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 22, includeFontPadding: false }}>Do not open the link or top up. The bonus is a trick to take your money.</Text>
            <View style={{ gap: 6, flexWrap: 'wrap', flexDirection: 'row' }}>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Read in Myanmar</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Listen</Text>
            </View>
            <View style={{ flexDirection: 'column', gap: 6 }}>
              <View style={{ height: 40, borderRadius: 10, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>{"Block this number"}</Text>
              </View>
              <View style={{ height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                <Text style={{ color: '#0F1B2D', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>{"Report it"}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
        </View>
      </ScrollView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { width: 1840, height: 1040, backgroundColor: '#F4F6F8', padding: 64, flexDirection: 'column', gap: 32 },
  defaultText: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: theme.fonts.regular,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
});

export default CaseStudyArchitectureScreen;
