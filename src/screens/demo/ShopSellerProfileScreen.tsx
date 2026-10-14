import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import theme from '../../theme/theme';

interface ShopSellerProfileScreenProps {
  onNavigate?: (route: string) => void;
}

export const ShopSellerProfileScreen: React.FC<ShopSellerProfileScreenProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row' }}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M15 18l-6-6 6-6" />
        </Svg>
        <Text style={{ flex: 1, color: '#0F1B2D', fontSize: 16, fontFamily: theme.fonts.bold, lineHeight: 22, includeFontPadding: false }}>Seller</Text>
      </View>
      <View style={{ flexDirection: 'column', alignItems: 'center', gap: 8, paddingVertical: 24, paddingHorizontal: 16, backgroundColor: '#FFFFFF' }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FBCFE8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Text style={{ color: '#831843', fontSize: 28, fontFamily: theme.fonts.extraBold, lineHeight: 38, includeFontPadding: false }}>{"T"}</Text>
        </View>
        <Text style={{ color: '#0F1B2D', fontSize: 20, fontFamily: theme.fonts.extraBold, lineHeight: 27, includeFontPadding: false }}>Toko Murah88</Text>
        <Text style={{ color: '#6B7280', fontSize: 14, lineHeight: 19, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Joined 4 days ago</Text>
      </View>
      <View style={{ gap: 1, backgroundColor: '#E5E7EB', borderTopWidth: 1, borderTopColor: '#E5E7EB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row' }}>
        <View style={{ backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 8, flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
          <Text style={{ color: '#0F1B2D', fontSize: 20, fontFamily: theme.fonts.extraBold, lineHeight: 27, includeFontPadding: false }}>0</Text>
          <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Sold</Text>
        </View>
        <View style={{ backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 8, flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
          <Text style={{ color: '#0F1B2D', fontSize: 20, fontFamily: theme.fonts.extraBold, lineHeight: 27, includeFontPadding: false }}>-</Text>
          <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Rating</Text>
        </View>
        <View style={{ backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 8, flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
          <Text style={{ color: '#0F1B2D', fontSize: 20, fontFamily: theme.fonts.extraBold, lineHeight: 27, includeFontPadding: false }}>14</Text>
          <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Listings</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'column', gap: 10, padding: 16 }}>
        <Text style={{ color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Other items from this seller</Text>
        <View style={{ gap: 10, flexDirection: 'row' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden', flex: 1 }}>
            <View style={{ height: 100, backgroundColor: '#E5E7EB' }}>
            </View>
            <View style={{ paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'column', gap: 2 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 13, lineHeight: 18, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Laptop, new</Text>
              <Text style={{ color: '#B91C1C', fontSize: 13, lineHeight: 19, fontFamily: theme.fonts.extraBold, includeFontPadding: false }}>80% off</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden', flex: 1 }}>
            <View style={{ height: 100, backgroundColor: '#E5E7EB' }}>
            </View>
            <View style={{ paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'column', gap: 2 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 13, lineHeight: 18, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Game console</Text>
              <Text style={{ color: '#B91C1C', fontSize: 13, lineHeight: 19, fontFamily: theme.fonts.extraBold, includeFontPadding: false }}>75% off</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden', flex: 1 }}>
            <View style={{ height: 100, backgroundColor: '#E5E7EB' }}>
            </View>
            <View style={{ paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'column', gap: 2 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 13, lineHeight: 18, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Smartwatch</Text>
              <Text style={{ color: '#B91C1C', fontSize: 13, lineHeight: 19, fontFamily: theme.fonts.extraBold, includeFontPadding: false }}>78% off</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden', flex: 1 }}>
            <View style={{ height: 100, backgroundColor: '#E5E7EB' }}>
            </View>
            <View style={{ paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'column', gap: 2 }}>
              <Text style={{ color: '#0F1B2D', fontSize: 13, lineHeight: 18, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Tablet 128GB</Text>
              <Text style={{ color: '#B91C1C', fontSize: 13, lineHeight: 19, fontFamily: theme.fonts.extraBold, includeFontPadding: false }}>82% off</Text>
            </View>
          </View>
        </View>
      </View>
      <Text style={{ position: 'absolute', right: 92, top: 224, backgroundColor: '#0F1B2D', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, color: '#FFFFFF', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>Tap again to add this</Text>
      <View style={{ position: 'absolute', right: 84, top: 238, width: 14, height: 14, backgroundColor: '#0F1B2D', transform: [{ rotate: '45deg' }] }}>
      </View>
      <View style={{ position: 'absolute', right: 6, top: 204, width: 84, height: 84, borderRadius: 42, backgroundColor: '#DBE5FF', opacity: 0.9 }}>
      </View>
      <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('shop-verdict')} style={{ position: 'absolute', right: 16, top: 214, width: 64, height: 64, borderRadius: 32, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </Svg>
      </TouchableOpacity>
      <View style={{ position: 'absolute', right: 10, top: 208, width: 24, height: 24, borderRadius: 12, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: theme.fonts.extraBold, lineHeight: 18, includeFontPadding: false }}>{"1"}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 390, height: 844, position: 'relative', backgroundColor: '#F9FAFB', flexDirection: 'column', overflow: 'hidden' },
  defaultText: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: theme.fonts.regular,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
});

export default ShopSellerProfileScreen;
