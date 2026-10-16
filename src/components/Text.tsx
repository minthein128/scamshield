import React, { Children, isValidElement, type ReactNode } from 'react';
import { Platform, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';
import { localizedStyle, plainText } from '../theme/localizedText';
import { breakMyanmar, syllableRuns } from '../theme/myanmarBreaks';
import { scriptOf } from '../theme/script';

const NOWRAP = { whiteSpace: 'nowrap' } as const;

/** Chrome runs its own Burmese dictionary breaker inside a run, so on web each syllable run is no-wrap. */
function webRuns(text: string): ReactNode {
  return syllableRuns(text).map((run, i) =>
    run === '\u200B' || run === ' ' ? run : <RNText key={i} style={NOWRAP as never}>{run}</RNText>,
  );
}

function breakChildren(children: ReactNode): ReactNode {
  if (typeof children === 'string') {
    if (scriptOf(children) !== 'myanmar') return children;
    return Platform.OS === 'web' ? webRuns(children) : breakMyanmar(children);
  }
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
