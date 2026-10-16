import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { Text } from './Text';
import { ScreenHeader } from './ui';
import { stopSpeaking } from '../lib/speech';
import theme from '../theme/theme';

const { colors, fonts } = theme;

/** Resets the whole stack to Home, so no report, form or Live session survives. */
export const leaveQuickly = (dispatch: (action: ReturnType<typeof CommonActions.reset>) => void) => {
  stopSpeaking();
  dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Tabs', state: { index: 0, routes: [{ name: 'Home' }] } }] }));
};

export const LeaveQuicklyButton: React.FC = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation();
  const root = navigation.getParent() ?? navigation;
  return (
    <TouchableOpacity
      testID="leave-quickly"
      accessibilityRole="button"
      accessibilityLabel={t('actions.leaveA11y')}
      activeOpacity={0.7}
      onPress={() => leaveQuickly(action => root.dispatch(action))}
      style={styles.button}
    >
      <Text numberOfLines={1} style={styles.label}>{t('actions.leave')}</Text>
    </TouchableOpacity>
  );
};

export const HeaderWithLeave: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
  <View style={styles.row}>
    <View style={styles.title}>
      <ScreenHeader title={title} onBack={onBack} />
    </View>
    <LeaveQuicklyButton />
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, minWidth: 0 },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  label: { color: colors.textPrimary, fontSize: 14, fontFamily: fonts.semiBold },
});
