import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const PasteButton: React.FC<{ label: string; onPress: () => void; testID?: string }> = ({ label, onPress, testID }) => (
  <TouchableOpacity testID={testID} accessibilityRole="button" accessibilityLabel={label} activeOpacity={0.7} onPress={onPress} style={styles.paste}>
    <Text style={styles.pasteText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  paste: { minHeight: 48, minWidth: 72, marginRight: -8, paddingHorizontal: 12, alignItems: 'flex-end', justifyContent: 'center' },
  pasteText: { color: colors.accent, fontSize: 15, lineHeight: 20, fontFamily: fonts.bold },
});
