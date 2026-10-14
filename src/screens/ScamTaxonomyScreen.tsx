import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Ellipse, Line } from 'react-native-svg';
import theme from '../theme/theme';

interface ScamTaxonomyScreenProps {
  onNavigate?: (route: string) => void;
}

export const ScamTaxonomyScreen: React.FC<ScamTaxonomyScreenProps> = ({ onNavigate }) => {
  return (
    <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }} showsHorizontalScrollIndicator={false}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <Text style={{ color: '#0F1B2D', fontSize: 40, fontFamily: theme.fonts.extraBold, letterSpacing: -0.8, lineHeight: 54, includeFontPadding: false }}>Scam types SafeRoute detects</Text>
        <Text style={{ color: '#475569', fontSize: 18, lineHeight: 24, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Every type maps to the red-flag families the risk score adds up. One family counts once, however many signals point to it.</Text>
      </View>
      <View style={{ flexWrap: 'wrap', gap: 10, flexDirection: 'row' }}>
        <Text style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}><Text>Too good</Text> · pay, price or bonus</Text>
        <Text style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}><Text>Pressure</Text> · urgency, scarcity, secrecy</Text>
        <Text style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}><Text>Payment route</Text> · off-platform, personal account, top-up</Text>
        <Text style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}><Text>Identity</Text> · unknown, new or unverified</Text>
        <Text style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, color: '#0F1B2D', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}><Text>Link risk</Text> · odd domain, young site</Text>
        <Text style={{ backgroundColor: '#FFF1E8', borderWidth: 1, borderColor: '#C2410C', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, color: '#7C2D12', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}><Text>Known bad</Text> · Web Risk hit, reported before</Text>
        <Text style={{ backgroundColor: '#FFF1E8', borderWidth: 1, borderColor: '#C2410C', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, color: '#7C2D12', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}><Text>Trafficking</Text> · passport, visa, border route</Text>
      </View>
      <View style={{ gap: 28, flex: 1, flexDirection: 'row' }}>
        <View style={{ flexDirection: 'column', gap: 14, flex: 1 }}>
          <View style={{ alignItems: 'center', gap: 10, backgroundColor: '#0F1B2D', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row' }}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Rect x={3} y={7} width={18} height={13} rx={2} />
              <Path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            </Svg>
            <Text style={{ color: '#FFFFFF', lineHeight: 27, fontFamily: theme.fonts.extraBold, includeFontPadding: false, fontSize: 20 }}>Job shield</Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'column', gap: 8 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>Trafficking recruitment</Text>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>A fake overseas job moves people across a border into a scam compound.</Text>
            <View style={{ flexWrap: 'wrap', gap: 6, flexDirection: 'row' }}>
              <Text style={{ backgroundColor: '#FFF1E8', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#7C2D12', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Trafficking</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Too good</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Pressure</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'column', gap: 8 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>Money mule recruitment</Text>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>The &quot;job&quot; is receiving and forwarding money through your own bank account.</Text>
            <View style={{ flexWrap: 'wrap', gap: 6, flexDirection: 'row' }}>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Payment route</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Too good</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'column', gap: 8 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>Fake agency deposit</Text>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>An unlicensed &quot;agency&quot; takes a placement fee and disappears.</Text>
            <View style={{ flexWrap: 'wrap', gap: 6, flexDirection: 'row' }}>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Identity</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Payment route</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'column', gap: 8 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>Task scam</Text>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Paid to like videos or rate products, then told to top up to withdraw earnings.</Text>
            <View style={{ flexWrap: 'wrap', gap: 6, flexDirection: 'row' }}>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Too good</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Payment route</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Pressure</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'column', gap: 14, flex: 1 }}>
          <View style={{ alignItems: 'center', gap: 10, backgroundColor: '#0F1B2D', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row' }}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
            </Svg>
            <Text style={{ color: '#FFFFFF', lineHeight: 27, fontFamily: theme.fonts.extraBold, includeFontPadding: false, fontSize: 20 }}>Message shield</Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#C2410C', borderRadius: 16, paddingVertical: 15, paddingHorizontal: 17, flexDirection: 'column', gap: 8 }}>
            <View style={{ alignItems: 'center', justifyContent: 'space-between', gap: 8, flexDirection: 'row' }}>
              <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>Gambling bonus lure</Text>
              <Text style={{ backgroundColor: '#C2410C', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#FFFFFF', fontSize: 12, fontFamily: theme.fonts.extraBold, lineHeight: 16, includeFontPadding: false }}>Case study</Text>
            </View>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>An unknown sender offers free credit and deposit bonuses on an illegal gambling site to take the deposit and personal data.</Text>
            <View style={{ flexWrap: 'wrap', gap: 6, flexDirection: 'row' }}>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Identity</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Link risk</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Too good</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Pressure</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'column', gap: 8 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>Fake fee or bill</Text>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>A &quot;parcel,&quot; &quot;toll&quot; or &quot;bill&quot; needs a small payment through a link that steals card details.</Text>
            <View style={{ flexWrap: 'wrap', gap: 6, flexDirection: 'row' }}>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Link risk</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Pressure</Text>
              <Text style={{ backgroundColor: '#FFF1E8', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#7C2D12', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Known bad</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'column', gap: 8 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>Love and money trap</Text>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>A slow online relationship turns into a fake investment platform.</Text>
            <View style={{ flexWrap: 'wrap', gap: 6, flexDirection: 'row' }}>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Identity</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Too good</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Payment route</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'column', gap: 8 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>Impersonation</Text>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Pretends to be family on a new number, a bank, the police or a government office.</Text>
            <View style={{ flexWrap: 'wrap', gap: 6, flexDirection: 'row' }}>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Identity</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Pressure</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Payment route</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'column', gap: 14, flex: 1 }}>
          <View style={{ alignItems: 'center', gap: 10, backgroundColor: '#0F1B2D', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row' }}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <Path d="M3 6h18" />
              <Path d="M16 10a4 4 0 0 1-8 0" />
            </Svg>
            <Text style={{ color: '#FFFFFF', lineHeight: 27, fontFamily: theme.fonts.extraBold, includeFontPadding: false, fontSize: 20 }}>E-commerce shield</Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'column', gap: 8 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>Fake seller, pay outside the app</Text>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>A too-cheap listing moves the buyer to a direct bank transfer, then nothing ships.</Text>
            <View style={{ flexWrap: 'wrap', gap: 6, flexDirection: 'row' }}>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Too good</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Payment route</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Identity</Text>
              <Text style={{ backgroundColor: '#FFF1E8', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#7C2D12', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Known bad</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'column', gap: 8 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>Fake shop or ad</Text>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>A copycat website or social ad sells big discounts on goods that never arrive.</Text>
            <View style={{ flexWrap: 'wrap', gap: 6, flexDirection: 'row' }}>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Link risk</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Too good</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Identity</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'column', gap: 8 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>Fake payment proof</Text>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Targets sellers: an edited transfer receipt and pressure to ship before money arrives.</Text>
            <View style={{ flexWrap: 'wrap', gap: 6, flexDirection: 'row' }}>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Payment route</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Pressure</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EC', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'column', gap: 8 }}>
            <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.extraBold, lineHeight: 24, includeFontPadding: false }}>Fake support &quot;verification&quot;</Text>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Fake marketplace staff send a link to &quot;verify&quot; an account or &quot;receive&quot; a payment.</Text>
            <View style={{ flexWrap: 'wrap', gap: 6, flexDirection: 'row' }}>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Link risk</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Identity</Text>
              <Text style={{ backgroundColor: '#EEF2F6', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, color: '#334155', fontSize: 12, fontFamily: theme.fonts.bold, lineHeight: 16, includeFontPadding: false }}>Pressure</Text>
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
  container: { width: 1440, height: 1160, backgroundColor: '#F4F6F8', padding: 64, flexDirection: 'column', gap: 28 },
  defaultText: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: theme.fonts.regular,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
});

export default ScamTaxonomyScreen;
