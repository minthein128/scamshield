import React, { useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from './Text';
import { BlockIcon, type BlockIconName } from './blockIcons';
import { Pill } from './ui';
import type { PreparedImage } from '../lib/image';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const PAPER = '#FFF6E6';
const MIN_INPUT = 48;
const MAX_GROWN = 280;

interface BlockProps {
  testID?: string;
  icon: BlockIconName;
  title: string;
  hint?: string;
  chip?: string;
  children: React.ReactNode;
}

/** White card with an icon header: the frame for one input of the Check page. */
export const InputBlock: React.FC<BlockProps> = ({ testID, icon, title, hint, chip, children }) => (
  <View testID={testID} style={styles.block}>
    <View style={styles.head}>
      <View style={styles.headIcon}>
        <BlockIcon name={icon} size={22} />
      </View>
      <View style={styles.headText}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {chip ? <Pill label={chip} background={colors.codeBg} color={colors.codeText} /> : null}
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </View>
    {children}
  </View>
);

interface TextBoxProps {
  testID: string;
  a11y: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onPaste: () => void;
  pasteLabel: string;
  multiline?: boolean;
  url?: boolean;
}

/** Text field with the Paste button inside its bottom right corner. */
export const TextBox: React.FC<TextBoxProps> = ({ testID, a11y, placeholder, value, onChange, onPaste, pasteLabel, multiline = true, url }) => {
  const [focused, setFocused] = useState(false);
  const [grown, setGrown] = useState(0);
  const filled = value.length > 0;
  const paste = filled ? null : (
    <TouchableOpacity testID={`${testID}-paste`} accessibilityRole="button" accessibilityLabel={pasteLabel} activeOpacity={0.7} onPress={onPaste} style={styles.paste}>
      <BlockIcon name="clipboard" size={18} />
      <Text numberOfLines={1} style={styles.pasteText}>{pasteLabel}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={[styles.box, filled || focused ? styles.boxFilled : null, !multiline && styles.boxRow]}>
      <TextInput
        testID={testID}
        accessibilityLabel={a11y}
        multiline={multiline}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onContentSizeChange={multiline ? e => setGrown(Math.min(Math.ceil(e.nativeEvent.contentSize.height), MAX_GROWN)) : undefined}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize={url ? 'none' : undefined}
        autoCorrect={url ? false : undefined}
        keyboardType={url ? 'url' : undefined}
        style={[styles.input, multiline ? [styles.inputMulti, grown > MIN_INPUT ? { height: grown } : null] : styles.inputSingle]}
      />
      {multiline ? <View style={styles.pasteRow}>{paste}</View> : paste}
    </View>
  );
};

export const OrDivider: React.FC<{ label: string }> = ({ label }) => (
  <View accessibilityRole="none" style={styles.or}>
    <View style={styles.orLine} />
    <Text style={styles.orText}>{label}</Text>
    <View style={styles.orLine} />
  </View>
);

interface PickerProps {
  testID: string;
  image: PreparedImage | null;
  busy: boolean;
  title: string;
  sub: string;
  readyText: string;
  changeLabel: string;
  removeLabel: string;
  onPick: () => void;
  onRemove: () => void;
}

/** Gold-dashed card that picks a screenshot; once one is added it shows the picture with Change and Remove. */
export const ScreenshotPicker: React.FC<PickerProps> = ({ testID, image, busy, title, sub, readyText, changeLabel, removeLabel, onPick, onRemove }) => {
  if (image) {
    return (
      <View testID={`${testID}-image`} style={styles.ready}>
        <Image source={{ uri: image.uri }} style={styles.thumb} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={styles.readyBody}>
          <View style={styles.readyRow}>
            <View style={styles.tick}>
              <BlockIcon name="check" size={13} color={colors.white} strokeWidth={3} />
            </View>
            <Text style={styles.readyText}>{readyText}</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity testID={`${testID}-change`} accessibilityRole="button" accessibilityLabel={changeLabel} activeOpacity={0.7} disabled={busy} onPress={onPick} style={styles.action}>
              <BlockIcon name="image" size={16} />
              <Text numberOfLines={1} style={styles.actionText}>{changeLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity testID={`${testID}-remove`} accessibilityRole="button" accessibilityLabel={removeLabel} activeOpacity={0.7} onPress={onRemove} style={styles.action}>
              <BlockIcon name="close" size={16} />
              <Text numberOfLines={1} style={styles.actionText}>{removeLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
  return (
    <TouchableOpacity testID={testID} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} accessibilityState={{ disabled: busy }} activeOpacity={0.8} disabled={busy} onPress={onPick} style={styles.pick}>
      <View style={styles.pickIcon}>
        <BlockIcon name="download" size={26} />
      </View>
      <View style={styles.pickText}>
        <Text style={styles.pickTitle}>{title}</Text>
        <Text style={styles.pickSub}>{sub}</Text>
      </View>
      <BlockIcon name="chevron" size={22} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  block: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandGoldSoft, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, minWidth: 0, gap: 4 },
  title: { color: colors.textPrimary, fontSize: 17, lineHeight: 24, fontFamily: fonts.bold, includeFontPadding: false },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  box: { borderRadius: 14, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.background, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  boxFilled: { backgroundColor: colors.white, borderColor: colors.brandInk },
  boxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  input: { color: colors.textPrimary, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular, padding: 0, ...({ outlineStyle: 'none' } as object) },
  inputMulti: { minHeight: MIN_INPUT, textAlignVertical: 'top' },
  inputSingle: { flex: 1, minHeight: 44 },
  pasteRow: { alignItems: 'flex-end', minHeight: 4 },
  paste: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white },
  pasteText: { color: colors.textPrimary, fontSize: 15, lineHeight: 20, fontFamily: fonts.bold, includeFontPadding: false },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 80, padding: 12, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.brandGold, backgroundColor: PAPER },
  pickIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.brandGold, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brandGold, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 2 },
  pickText: { flex: 1, minWidth: 0, gap: 2 },
  pickTitle: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold, includeFontPadding: false },
  pickSub: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  ready: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16, borderWidth: 1.5, borderColor: colors.brandInk, backgroundColor: colors.white },
  thumb: { width: 56, height: 72, borderRadius: 10, backgroundColor: colors.codeBg },
  readyBody: { flex: 1, minWidth: 0, gap: 10 },
  readyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tick: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.brandInk, alignItems: 'center', justifyContent: 'center' },
  readyText: { flex: 1, color: colors.textPrimary, fontSize: 15, lineHeight: 22, fontFamily: fonts.bold, includeFontPadding: false },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white },
  actionText: { color: colors.textPrimary, fontSize: 13, lineHeight: 18, fontFamily: fonts.bold, includeFontPadding: false },
});
