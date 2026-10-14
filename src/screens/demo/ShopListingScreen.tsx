import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Ellipse, Line } from 'react-native-svg';
import theme from '../../theme/theme';

interface ShopListingScreenProps {
  onNavigate?: (route: string) => void;
}

export const ShopListingScreen: React.FC<ShopListingScreenProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row' }}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M15 18l-6-6 6-6" />
        </Svg>
        <Text style={{ flex: 1, color: '#0F1B2D', fontSize: 16, fontFamily: theme.fonts.bold, lineHeight: 22, includeFontPadding: false }}>Marketplace</Text>
        <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Any shopping app · sample</Text>
      </View>
      <View style={{ height: 300, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
        <Text style={{ color: '#4B5563', fontSize: 13, fontFamily: theme.fonts.semiBold, lineHeight: 18, includeFontPadding: false }}>{"[PRODUCT PHOTO]"}</Text>
      </View>
      <View style={{ flexDirection: 'column', gap: 10, padding: 16 }}>
        <Text style={{ color: '#0F1B2D', fontSize: 18, fontFamily: theme.fonts.bold, lineHeight: 24, includeFontPadding: false }}>Flagship smartphone 256GB, like new</Text>
        <View style={{ alignItems: 'baseline', gap: 10, flexDirection: 'row' }}>
          <Text style={{ color: '#B91C1C', fontSize: 24, fontFamily: theme.fonts.extraBold, lineHeight: 32, includeFontPadding: false }}>Rp 3.500.000</Text>
          <Text style={{ color: '#6B7280', fontSize: 14, textDecorationLine: 'line-through', lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Rp 17.000.000</Text>
        </View>
        <Text style={{ color: '#374151', fontSize: 14, lineHeight: 21, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Need money fast, selling cheap. Transfer to my bank and I ship today. Chat me on WhatsApp for extra discount.</Text>
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 0, borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FBCFE8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            <Text style={{ color: '#831843', fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false, fontSize: 14 }}>{"T"}</Text>
          </View>
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <Text style={{ color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Toko Murah88</Text>
            <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Seller</Text>
          </View>
          <View style={{ height: 36, paddingVertical: 0, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#2563EB', alignItems: 'center', flexDirection: 'row' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: theme.fonts.bold, lineHeight: 19, includeFontPadding: false }}>{"Chat"}</Text>
          </View>
        </View>
      </View>
      <Text style={{ position: 'absolute', right: 92, top: 404, backgroundColor: '#0F1B2D', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, color: '#FFFFFF', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Too cheap? Tap to check</Text>
      <View style={{ position: 'absolute', right: 84, top: 418, width: 14, height: 14, backgroundColor: '#0F1B2D', transform: [{ rotate: '45deg' }] }}>
      </View>
      <View style={{ position: 'absolute', right: 6, top: 384, width: 84, height: 84, borderRadius: 42, backgroundColor: '#DBE5FF', opacity: 0.9 }}>
      </View>
      <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('shop-seller')} style={{ position: 'absolute', right: 16, top: 394, width: 64, height: 64, borderRadius: 32, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </Svg>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 390, height: 844, position: 'relative', backgroundColor: '#FFFFFF', flexDirection: 'column', overflow: 'hidden' },
  defaultText: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: theme.fonts.regular,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
});

export default ShopListingScreen;
