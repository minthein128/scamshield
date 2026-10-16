import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, TextInput } from './Text';
import { Button, Card, Pill } from './ui';
import { PasteButton } from './PasteButton';
import type { PreparedImage } from '../lib/image';
import theme from '../theme/theme';

const { colors, fonts } = theme;

interface Props {
  testID: string;
  title: string;
  hint: string;
  a11y: string;
  placeholder: string;
  optional?: boolean;
  text: string;
  image: PreparedImage | null;
  busy: boolean;
  onText: (value: string) => void;
  onPaste: () => void;
  onPick: () => void;
  onRemove: () => void;
}

/** One labelled input block of the Job Shield form: pasted text or a screenshot. */
export const JobSourceBlock: React.FC<Props> = ({ testID, title, hint, a11y, placeholder, optional, text, image, busy, onText, onPaste, onPick, onRemove }) => {
  const { t } = useTranslation(['check', 'common']);
  return (
    <View testID={testID} style={styles.block}>
      <View style={styles.head}>
        <View style={styles.titleCol}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          {optional ? <Pill label={t('job.chat.optional')} background={colors.codeBg} color={colors.codeText} /> : null}
        </View>
        <PasteButton label={t('common:actions.paste')} onPress={onPaste} />
      </View>
      <Text style={styles.hint}>{hint}</Text>
      <TextInput
        testID={`${testID}-text`}
        accessibilityLabel={a11y}
        multiline
        value={text}
        onChangeText={onText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <Card style={{ gap: 10 }}>
        {image ? (
          <View style={styles.imageRow}>
            <Image source={{ uri: image.uri }} style={styles.thumb} resizeMode="cover" />
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={styles.meta}>{t('screenshot.ready', { kb: Math.round(image.bytes / 1024) })}</Text>
              <Button label={t('common:actions.remove')} variant="secondary" onPress={onRemove} style={styles.small} />
            </View>
          </View>
        ) : (
          <Button
            testID={`${testID}-pick`}
            label={busy ? t('screenshot.preparing') : Platform.OS === 'web' ? t('screenshot.upload') : t('screenshot.pick')}
            variant="secondary"
            disabled={busy}
            onPress={onPick}
          />
        )}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  block: { gap: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  titleCol: { flex: 1, minWidth: 0, gap: 6, paddingVertical: 4 },
  title: { fontSize: 18, lineHeight: 24, fontFamily: fonts.bold, color: colors.textPrimary, includeFontPadding: false },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  input: { minHeight: 110, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontFamily: fonts.regular, textAlignVertical: 'top' },
  imageRow: { flexDirection: 'row', gap: 12 },
  thumb: { width: 80, height: 110, borderRadius: 10, backgroundColor: colors.codeBg },
  meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  small: { minHeight: 48 },
});
