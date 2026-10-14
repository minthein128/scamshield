import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Button } from '../../components/ui';
import { Icon } from '../../components/Icon';
import theme from '../../theme/theme';
import { SHEET_CLOSE, SHEET_EXAMPLE, type RedFlag } from './content';

const { colors, fonts } = theme;

interface Props {
  flag: RedFlag | null;
  onClose: () => void;
}

export const FlagSheet: React.FC<Props> = ({ flag, onClose }) => {
  const { height } = useWindowDimensions();
  return (
    <Modal visible={flag !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { height }]}>
        <Pressable accessibilityLabel={SHEET_CLOSE} accessibilityRole="button" style={styles.backdrop} onPress={onClose} />
        {flag ? (
          <View style={styles.sheet} testID="flag-sheet" accessibilityViewIsModal>
            <View style={styles.grab} />
            <View style={styles.head}>
              <View style={styles.icon}>
                <Icon name={flag.icon} size={24} color={colors.danger} />
              </View>
              <Text accessibilityRole="header" style={styles.title}>{flag.title}</Text>
            </View>
            <Text style={styles.body}>{flag.explain}</Text>
            <View style={styles.quote}>
              <Text style={styles.quoteLabel}>{SHEET_EXAMPLE}</Text>
              <Text style={styles.quoteText}>{flag.phrase}</Text>
            </View>
            <Button label={SHEET_CLOSE} variant="secondary" onPress={onClose} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,27,45,0.5)' },
  sheet: { backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, gap: 12, borderTopLeftRadius: 24, borderTopRightRadius: 24, width: '100%', maxWidth: 430, alignSelf: 'center' },
  grab: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderLight },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.dangerSoftBg, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: colors.textPrimary, fontSize: 20, lineHeight: 26, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 16, lineHeight: 24, fontFamily: fonts.regular },
  quote: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderLeftColor: colors.danger, borderRadius: 12, padding: 14, gap: 4 },
  quoteLabel: { color: colors.textMuted, fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold },
  quoteText: { color: colors.textPrimary, fontSize: 16, lineHeight: 24, fontFamily: fonts.semiBold },
});

export default FlagSheet;
