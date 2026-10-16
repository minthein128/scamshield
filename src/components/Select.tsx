import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import theme from '../theme/theme';
import { Icon } from './Icon';
import { Text } from './Text';
import { Button } from './ui';
import { useSheetLayout } from './useSheetLayout';

const { colors, fonts } = theme;

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  testID?: string;
}

/** A tappable field that opens a list of options. Works the same on Android and web. */
export function Select<T extends string>({ label, value, options, onChange, testID }: SelectProps<T>) {
  const { t } = useTranslation('common');
  const { height } = useWindowDimensions();
  const sheet = useSheetLayout();
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value) ?? options[0];

  const choose = (next: T) => {
    setOpen(false);
    if (next !== value) onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? ''}`}
        accessibilityState={{ expanded: open }}
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
        style={styles.field}
      >
        <Text numberOfLines={1} style={styles.value}>{current?.label}</Text>
        <View style={styles.caret}>
          <Icon name="chevron" size={20} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.overlay, { height }, sheet.overlay]}>
          <Pressable accessibilityLabel={t('actions.close')} style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, sheet.sheet]} testID={testID ? `${testID}-list` : undefined} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={styles.title}>{label}</Text>
            <ScrollView style={{ maxHeight: Math.max(height * 0.55, 200) }} contentContainerStyle={styles.list}>
              {options.map(o => {
                const selected = o.value === value;
                return (
                  <TouchableOpacity
                    key={o.value}
                    testID={testID ? `${testID}-${o.value}` : undefined}
                    accessibilityRole="button"
                    accessibilityLabel={o.label}
                    accessibilityState={{ selected }}
                    activeOpacity={0.7}
                    onPress={() => choose(o.value)}
                    style={[styles.option, selected && styles.optionOn]}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextOn]}>{o.label}</Text>
                    {selected ? <Icon name="check" size={22} color={colors.accent} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Button label={t('actions.cancel')} variant="secondary" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold, includeFontPadding: false },
  field: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 8 },
  value: { flex: 1, color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.medium },
  caret: { transform: [{ rotate: '90deg' }] },
  overlay: { width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,27,45,0.5)' },
  sheet: { backgroundColor: colors.background, padding: 20, gap: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: '100%', maxWidth: 430, alignSelf: 'center' },
  title: { color: colors.textPrimary, fontSize: 18, lineHeight: 24, fontFamily: fonts.bold },
  list: { gap: 8 },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  optionOn: { borderColor: colors.accent, backgroundColor: colors.brandBlueLight },
  optionText: { flex: 1, color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.medium },
  optionTextOn: { fontFamily: fonts.bold, color: colors.safeText },
});
