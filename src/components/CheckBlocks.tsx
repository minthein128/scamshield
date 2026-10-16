import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, TextInput as RNTextInput, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from './Text';
import { BlockIcon } from './blockIcons';
import type { PreparedImage } from '../lib/image';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const PAPER = '#FFF6EA';
const CLIP_BORDER = '#F1DFC4';
const MIN_INPUT = 56;
const MAX_GROWN = 280;

interface CardProps {
  testID?: string;
  title: string;
  optional?: string;
  hint?: string;
  children: React.ReactNode;
}

/** White card with a bold title and an optional one-line explanation. */
export const CheckCard: React.FC<CardProps> = ({ testID, title, optional, hint, children }) => (
  <View testID={testID} style={styles.card}>
    <Text accessibilityRole="header" style={styles.cardTitle}>
      {title}
      {optional ? <Text style={styles.cardOptional}>{` (${optional})`}</Text> : null}
    </Text>
    {hint ? <Text style={styles.cardHint}>{hint}</Text> : null}
    {children}
  </View>
);

export const ModeChips: React.FC<{ testID: string; options: { value: string; label: string }[]; value: string; onChange: (value: string) => void }> = ({ testID, options, value, onChange }) => (
  <View testID={testID} style={styles.chips}>
    {options.map(o => {
      const selected = o.value === value;
      return (
        <TouchableOpacity key={o.value} testID={`${testID}-${o.value}`} accessibilityRole="button" accessibilityLabel={o.label} accessibilityState={{ selected }} activeOpacity={0.7} onPress={() => onChange(o.value)} style={[styles.chip, selected && styles.chipOn]}>
          <Text style={[styles.chipText, selected && { color: colors.white }]}>{o.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

interface TextBoxProps {
  testID: string;
  a11y: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  /** Set when the clipboard holds text: shows the Paste chip inside the empty box. */
  clipLabel?: string;
  onClip?: () => void;
  /** Focuses the box each time this number changes. */
  focusKey?: number;
}

/** Text field. Empty, it can offer a Paste chip; with text it turns into the filled box with a pencil. */
export const TextBox: React.FC<TextBoxProps> = ({ testID, a11y, placeholder, value, onChange, clipLabel, onClip, focusKey }) => {
  const inputRef = useRef<RNTextInput>(null);
  useEffect(() => {
    if (focusKey) inputRef.current?.focus();
  }, [focusKey]);
  const [focused, setFocused] = useState(false);
  const [grown, setGrown] = useState(0);
  const filled = value.length > 0;
  return (
    <View style={[styles.box, (filled || focused) && styles.boxFilled]}>
      <View style={styles.boxRow}>
        <TextInput
          ref={inputRef}
          testID={testID}
          accessibilityLabel={a11y}
          multiline
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onContentSizeChange={e => setGrown(Math.min(Math.ceil(e.nativeEvent.contentSize.height), MAX_GROWN))}
          placeholder={placeholder}
          placeholderTextColor="#8C847C"
          style={[styles.input, filled && grown > MIN_INPUT ? { height: grown } : null]}
        />
        {filled ? <BlockIcon name="pencil" size={20} /> : null}
      </View>
      {!filled && clipLabel && onClip ? (
        <TouchableOpacity testID={`${testID}-clip`} accessibilityRole="button" accessibilityLabel={clipLabel} activeOpacity={0.7} onPress={onClip} style={styles.clip}>
          <BlockIcon name="clipboard" size={17} />
          <Text style={styles.clipText}>{clipLabel}</Text>
        </TouchableOpacity>
      ) : null}
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

/** Gold-dashed box that opens the picture picker. */
export const UploadBox: React.FC<{ testID: string; label: string; busy?: boolean; onPress: () => void }> = ({ testID, label, busy, onPress }) => (
  <TouchableOpacity testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(busy) }} activeOpacity={0.8} disabled={busy} onPress={onPress} style={styles.upload}>
    <View style={styles.uploadIcon}>
      <BlockIcon name="download" size={20} strokeWidth={2.4} />
    </View>
    <Text style={styles.uploadText}>{label}</Text>
  </TouchableOpacity>
);

interface FileProps {
  testID: string;
  image: PreparedImage;
  name: string;
  added: string;
  replaceLabel: string;
  removeLabel: string;
  busy?: boolean;
  onReplace: () => void;
  onRemove: () => void;
}

/** The added picture: thumbnail with a tick, file name, and Replace and Remove. */
export const FileCard: React.FC<FileProps> = ({ testID, image, name, added, replaceLabel, removeLabel, busy, onReplace, onRemove }) => (
  <View testID={testID} style={styles.file}>
    <View style={styles.thumbWrap}>
      <Image source={{ uri: image.uri }} style={styles.thumb} resizeMode="cover" accessibilityIgnoresInvertColors />
      <View style={styles.thumbTick}>
        <BlockIcon name="tick" size={14} color={colors.white} strokeWidth={3} />
      </View>
    </View>
    <View style={styles.fileBody}>
      <Text numberOfLines={1} style={styles.fileName}>{name}</Text>
      <View style={styles.fileAdded}>
        <View style={styles.badge}>
          <BlockIcon name="tick" size={12} color={colors.white} strokeWidth={3} />
        </View>
        <Text style={styles.fileAddedText}>{added}</Text>
      </View>
      <View style={styles.fileActions}>
        <TouchableOpacity testID={`${testID}-replace`} accessibilityRole="button" accessibilityLabel={replaceLabel} disabled={busy} activeOpacity={0.7} onPress={onReplace} style={styles.pill}>
          <BlockIcon name="swap" size={15} />
          <Text style={styles.pillText}>{replaceLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`${testID}-remove`} accessibilityRole="button" accessibilityLabel={removeLabel} activeOpacity={0.7} onPress={onRemove} style={styles.pill}>
          <BlockIcon name="trash" size={15} />
          <Text style={styles.pillText}>{removeLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

/** Gold bar that lists what the job check has so far. */
export const AddedBar: React.FC<{ testID?: string; items: string[] }> = ({ testID, items }) => (
  <View testID={testID} style={styles.bar}>
    {items.map(item => (
      <View key={item} style={styles.barItem}>
        <View style={styles.badge}>
          <BlockIcon name="tick" size={12} color={colors.white} strokeWidth={3} />
        </View>
        <Text style={styles.barText}>{item}</Text>
      </View>
    ))}
  </View>
);

/** Folded row that opens extra fields below it. */
export const FoldRow: React.FC<{ testID: string; label: string; open: boolean; onToggle: () => void; children?: React.ReactNode }> = ({ testID, label, open, onToggle, children }) => (
  <View>
    <TouchableOpacity testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }} activeOpacity={0.7} onPress={onToggle} style={[styles.fold, open && styles.foldOpen]}>
      <BlockIcon name="plus" size={20} strokeWidth={2.2} />
      <Text style={styles.foldText}>{label}</Text>
      <BlockIcon name={open ? 'chevUp' : 'chevDown'} size={20} strokeWidth={2.2} />
    </TouchableOpacity>
    {open ? <View style={styles.foldBody}>{children}</View> : null}
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 14, gap: 10, shadowColor: colors.brandInk, shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3 },
  cardTitle: { color: colors.textPrimary, fontSize: 17, lineHeight: 24, fontFamily: fonts.extraBold, includeFontPadding: false },
  cardOptional: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.semiBold },
  cardHint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, marginTop: -6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.brandInk, borderColor: colors.brandInk },
  chipText: { color: colors.textPrimary, fontSize: 15, lineHeight: 20, fontFamily: fonts.bold, includeFontPadding: false },
  box: { borderRadius: 14, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.background, padding: 12, gap: 10 },
  boxFilled: { backgroundColor: colors.white, borderColor: colors.brandInk, borderWidth: 1.5 },
  boxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  input: { flex: 1, minHeight: MIN_INPUT, color: colors.textPrimary, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular, padding: 0, textAlignVertical: 'top', ...({ outlineStyle: 'none' } as object) },
  clip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: 22, backgroundColor: colors.brandGoldSoft, borderWidth: 1, borderColor: CLIP_BORDER },
  clipText: { color: colors.textPrimary, fontSize: 13.5, lineHeight: 19, fontFamily: fonts.bold, includeFontPadding: false },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 0.8 },
  upload: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.brandGold, backgroundColor: PAPER },
  uploadIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.brandGold, alignItems: 'center', justifyContent: 'center' },
  uploadText: { flexShrink: 1, color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.extraBold, textAlign: 'center', includeFontPadding: false },
  file: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumbWrap: { width: 76, height: 88 },
  thumb: { width: 76, height: 88, borderRadius: 12, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.border },
  thumbTick: { position: 'absolute', right: -6, bottom: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.brandInk, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  fileBody: { flex: 1, minWidth: 0, gap: 4 },
  fileName: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.extraBold, includeFontPadding: false },
  fileAdded: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fileAddedText: { flexShrink: 1, color: colors.textPrimary, fontSize: 14.5, lineHeight: 20, fontFamily: fonts.bold, includeFontPadding: false },
  badge: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.brandInk, alignItems: 'center', justifyContent: 'center' },
  fileActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white },
  pillText: { color: colors.textPrimary, fontSize: 13.5, lineHeight: 19, fontFamily: fonts.bold, includeFontPadding: false },
  bar: { backgroundColor: colors.brandGoldSoft, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  barItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barText: { color: colors.textPrimary, fontSize: 14.5, lineHeight: 20, fontFamily: fonts.bold, includeFontPadding: false },
  fold: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  foldOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
  foldText: { flex: 1, color: colors.textPrimary, fontSize: 15.5, lineHeight: 22, fontFamily: fonts.bold, includeFontPadding: false },
  foldBody: { gap: 8, padding: 14, paddingTop: 12, borderWidth: 1, borderTopWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: colors.white },
});
