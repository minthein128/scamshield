import React from 'react';
import { Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';
import { localizedStyle, plainText } from '../theme/localizedText';

export const Text: React.FC<TextProps> = ({ style, children, ...rest }) => (
  <RNText {...rest} style={localizedStyle(plainText(children), style)}>
    {children}
  </RNText>
);

export const TextInput: React.FC<TextInputProps> = ({ style, ...rest }) => (
  <RNTextInput {...rest} style={localizedStyle(rest.value || rest.placeholder || '', style)} />
);
