import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Text } from './Text';
import { BlockIcon } from './blockIcons';
import { leaveQuickly } from './LeaveQuickly';
import theme from '../theme/theme';

const { colors, fonts } = theme;

/** Same action as Leave quickly: resets the stack to Home. */
export const QuickExitButton: React.FC = () => {
  const { t } = useTranslation(['check', 'common']);
  const navigation = useNavigation();
  const root = navigation.getParent() ?? navigation;
  return (
    <TouchableOpacity
      testID="leave-quickly"
      accessibilityRole="button"
      accessibilityLabel={t('common:actions.leaveA11y')}
      activeOpacity={0.7}
      onPress={() => leaveQuickly(action => root.dispatch(action))}
      style={styles.button}
    >
      <Text numberOfLines={1} style={styles.label}>{t('check:exit')}</Text>
      <BlockIcon name="exit" size={18} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, borderColor: colors.brandInk, backgroundColor: colors.white },
  label: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontFamily: fonts.bold, includeFontPadding: false },
});
