import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import theme from '../../theme/theme';

const { colors, fonts } = theme;

interface Props {
  icon: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
  quiet?: boolean;
  testID?: string;
}

export const LinkRow: React.FC<Props> = ({ icon, label, hint, onPress, quiet, testID }) => (
  <TouchableOpacity
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={hint ? `${label}. ${hint}` : label}
    activeOpacity={0.7}
    onPress={onPress}
    style={[styles.row, quiet ? styles.quiet : styles.loud]}
  >
    <View style={[styles.icon, quiet && styles.iconQuiet]}>
      <Icon name={icon} size={20} color={quiet ? colors.textSecondary : colors.accent} />
    </View>
    <View style={styles.text}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
    <Icon name="chevron" size={20} color={colors.textMuted} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  loud: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  quiet: { backgroundColor: 'transparent' },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandBlueLight, alignItems: 'center', justifyContent: 'center' },
  iconQuiet: { backgroundColor: colors.codeBg },
  text: { flex: 1 },
  label: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.semiBold },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
});

export default LinkRow;
