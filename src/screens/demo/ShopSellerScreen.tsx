import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import theme from '../../theme/theme';
import { BrandMark } from '../../components/BrandMark';

interface ShopSellerScreenProps {
  onNavigate?: (route: string) => void;
}

export const ShopSellerScreen: React.FC<ShopSellerScreenProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row' }}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M15 18l-6-6 6-6" />
        </Svg>
        <Text style={{ flex: 1, color: '#0F1B2D', fontSize: 16, fontFamily: theme.fonts.bold, lineHeight: 22, includeFontPadding: false }}>Marketplace</Text>
      </View>
      <View style={{ height: 120, backgroundColor: '#E5E7EB' }}>
      </View>
      <View style={{ flexDirection: 'column', gap: 8, paddingVertical: 14, paddingHorizontal: 16 }}>
        <Text style={{ color: '#0F1B2D', fontSize: 17, fontFamily: theme.fonts.bold, lineHeight: 23, includeFontPadding: false }}>Flagship smartphone 256GB, like new</Text>
        <Text style={{ color: '#B91C1C', fontSize: 22, fontFamily: theme.fonts.extraBold, lineHeight: 30, includeFontPadding: false }}>Rp 3.500.000</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('shop-profile')} style={{ alignItems: 'center', gap: 10, padding: 10, borderWidth: 2, borderColor: '#9F1239', backgroundColor: '#FFF0F2', borderRadius: 14, flexDirection: 'row' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FBCFE8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            <Text style={{ color: '#831843', lineHeight: 19, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 14 }}>{"T"}</Text>
          </View>
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <Text style={{ color: '#111827', lineHeight: 20, fontFamily: theme.fonts.extraBold, includeFontPadding: false, fontSize: 15 }}>Toko Murah88</Text>
            <Text style={{ color: '#881337', lineHeight: 16, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 12 }}>Tap the seller name</Text>
          </View>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#881337" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 6l6 6-6 6" />
          </Svg>
        </TouchableOpacity>
      </View>
      <View style={{ position: 'absolute', right: 16, top: 160, width: 64, height: 64, borderRadius: 32, backgroundColor: '#F2B01E', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <BrandMark size={50} />
      </View>
      <View style={{ position: 'absolute', right: 10, top: 154, width: 24, height: 24, borderRadius: 12, backgroundColor: '#9F1239', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: theme.fonts.extraBold, lineHeight: 18, includeFontPadding: false }}>{"1"}</Text>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#0F1B2D', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomRightRadius: 0, borderBottomLeftRadius: 0, paddingTop: 14, paddingHorizontal: 20, paddingBottom: 26, flexDirection: 'column', gap: 14 }}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#475569' }}>
        </View>
        <View style={{ alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' }}>
          <Text style={{ backgroundColor: '#1E293B', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, color: '#FDBA74', lineHeight: 18, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 13 }}>Found: online shopping</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('noop')} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#475569', backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M11 5L6 9H3v6h3l5 4z" />
              <Path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <Path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </Svg>
          </TouchableOpacity>
        </View>
        <Text style={{ color: '#FFFFFF', lineHeight: 29, fontFamily: theme.fonts.extraBold, includeFontPadding: false, fontSize: 22 }}>This price is very low. Show me the seller.</Text>
        <View style={{ flexDirection: 'column', gap: 10 }}>
          <View style={{ alignItems: 'center', gap: 12, flexDirection: 'row' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0F2', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'row' }}>
              <Text style={{ color: '#881337', lineHeight: 19, fontFamily: theme.fonts.extraBold, includeFontPadding: false, fontSize: 14 }}>{"1"}</Text>
            </View>
            <Text style={{ color: '#FFFFFF', lineHeight: 23, fontFamily: theme.fonts.semiBold, includeFontPadding: false, fontSize: 17 }}>Tap the seller's name</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 12, flexDirection: 'row' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0F2', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'row' }}>
              <Text style={{ color: '#881337', lineHeight: 19, fontFamily: theme.fonts.extraBold, includeFontPadding: false, fontSize: 14 }}>{"2"}</Text>
            </View>
            <Text style={{ color: '#FFFFFF', lineHeight: 23, fontFamily: theme.fonts.semiBold, includeFontPadding: false, fontSize: 17 }}>Tap the shield again</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('shop-verdict')} style={{ height: 52, borderRadius: 14, borderWidth: 1, borderColor: '#475569', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Text style={{ color: '#E2E8F0', lineHeight: 22, fontFamily: theme.fonts.bold, includeFontPadding: false, fontSize: 16 }}>{"Check what I have now"}</Text>
        </TouchableOpacity>
      </View>
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

export default ShopSellerScreen;
