import React, { Children, isValidElement, type ReactNode } from 'react';
import { Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';
import { localizedStyle, plainText } from '../theme/localizedText';
import { breakMyanmar } from '../theme/myanmarBreaks';
import { scriptOf } from '../theme/script';

function breakChildren(children: ReactNode): ReactNode {
  if (typeof children === 'string') return scriptOf(children) === 'myanmar' ? breakMyanmar(children) : children;
  if (Array.isArray(children)) return Children.map(children, c => (isValidElement(c) ? c : breakChildren(c)));
  return children;
}

export const Text: React.FC<TextProps> = ({ style, children, ...rest }) => (
  <RNText {...rest} style={localizedStyle(plainText(children), style)}>
    {breakChildren(children)}
  </RNText>
);

export const TextInput: React.FC<TextInputProps> = ({ style, ...rest }) => (
  <RNTextInput {...rest} style={localizedStyle(rest.value || rest.placeholder || '', style)} />
);
