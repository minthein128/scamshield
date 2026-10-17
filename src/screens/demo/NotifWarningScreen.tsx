import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '../../theme/theme';
import { BrandMark } from '../../components/BrandMark';

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
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'column', gap: 6 }}>
          <View style={{ alignItems: 'center', gap: 8, flexDirection: 'row' }}>
            <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: '#CBD5E1' }}>
            </View>
            <Text style={{ color: '#475569', fontSize: 12, fontFamily: theme.fonts.semiBold, lineHeight: 16, includeFontPadding: false }}>{"Messages · now"}</Text>
          </View>
          <Text style={{ color: '#0F1B2D', fontSize: 15, fontFamily: theme.fonts.bold, lineHeight: 20, includeFontPadding: false }}>+62 812 [NUMBER]</Text>
          <Text style={{ color: '#1E293B', fontSize: 14, lineHeight: 20, fontFamily: theme.fonts.regular, includeFontPadding: false }}>Your parcel is held at the warehouse. Pay the small delivery fee today or it will be returned: [SHORT LINK]</Text>
        </View>
      </View>
      <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('notif-verdict')} style={{ position: 'absolute', right: 16, top: 570, width: 64, height: 64, borderRadius: 32, backgroundColor: '#F2B01E', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', flexDirection: 'row' }}>
        <BrandMark size={50} />
      </TouchableOpacity>
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
