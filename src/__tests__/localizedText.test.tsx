import React from 'react';
import { Platform, StyleSheet, Text as RNText, View, type StyleProp, type TextStyle } from 'react-native';
import { render } from '@testing-library/react-native';
import { Text } from '../components/Text';
import { Button } from '../components/ui';
import { localizedStyle, plainText } from '../theme/localizedText';

const flat = (style: unknown) => StyleSheet.flatten(style as StyleProp<TextStyle>) as TextStyle;

describe('localized text style', () => {
  it('leaves Latin and mono text alone', () => {
    const style = { fontFamily: 'PlusJakartaSans-Bold', fontSize: 16, lineHeight: 20 };
    expect(localizedStyle('Check now', style)).toBe(style);
    expect(localizedStyle('မြန်မာ', { fontFamily: 'IBMPlexMono-Medium', fontSize: 16 })).toEqual({ fontFamily: 'IBMPlexMono-Medium', fontSize: 16 });
  });

  it('switches Burmese and Thai to Noto by weight and widens the line', () => {
    const my = flat(localizedStyle('စစ်ဆေးပါ', { fontFamily: 'PlusJakartaSans-Bold', fontSize: 16, lineHeight: 20 }));
    expect(my.fontFamily).toBe('A10YoeShin-Bold');
    expect(my.lineHeight).toBe(24);
    const th = flat(localizedStyle('ตรวจสอบ', { fontFamily: 'PlusJakartaSans-Regular', fontSize: 14, lineHeight: 20 }));
    expect(th.fontFamily).toBe('NotoSansThai-Regular');
    expect(th.lineHeight).toBe(23);
  });

  it('gives Burmese a line height when the style has none', () => {
    expect(flat(localizedStyle('မြန်မာ', { fontFamily: 'PlusJakartaSans-Regular', fontSize: 16 })).lineHeight).toBe(24);
  });

  it('adds a Latin fallback font on web only', () => {
    const style = { fontFamily: 'PlusJakartaSans-Regular', fontSize: 14, lineHeight: 20 };
    expect(flat(localizedStyle('SafeRoute မြန်မာ', style)).fontFamily).toBe('A10YoeShin-Regular');
    const os = Platform.OS;
    Platform.OS = 'web';
    try {
      expect(flat(localizedStyle('SafeRoute မြန်မာ', style)).fontFamily).toBe('A10YoeShin-Regular, PlusJakartaSans-Regular');
    } finally {
      Platform.OS = os;
    }
  });

  it('reads text from nested children', () => {
    expect(plainText(['a', 1, ['မြ'], null])).toBe('a1မြ');
  });

  it('renders Text and Button labels in the Myanmar font', () => {
    const tree = render(
      <View>
        <Text style={{ fontFamily: 'PlusJakartaSans-Regular', fontSize: 14, lineHeight: 20 }}>မြန်မာ</Text>
        <Button label="စစ်ဆေးပါ" onPress={() => undefined} />
      </View>,
    );
    const fonts = tree.UNSAFE_getAllByType(RNText).map(n => flat(n.props.style).fontFamily);
    expect(fonts).toEqual(['A10YoeShin-Regular', 'A10YoeShin-Bold']);
  });
});
