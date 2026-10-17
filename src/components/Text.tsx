import React, { Children, isValidElement, type ReactNode } from 'react';
import { Platform, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';
import { localizedStyle, plainText } from '../theme/localizedText';
import { breakMyanmar, joinMyanmarWords, syllableRuns } from '../theme/myanmarBreaks';
import { scriptOf } from '../theme/script';

const NOWRAP = { whiteSpace: 'nowrap' } as const;

/** Chrome runs its own Burmese dictionary breaker inside a run, so on web each syllable run is no-wrap. */
function webRuns(text: string): ReactNode {
  return syllableRuns(text).map((run, i) =>
    run === '\u200B' || run === ' ' ? run : <RNText key={i} style={NOWRAP as never}>{run}</RNText>,
  );
}

/** Word mode on web: each space-separated word is one no-wrap run. */
function webWords(text: string): ReactNode {
  return text.split(/( )/).map((run, i) => (run === ' ' || !run ? run : <RNText key={i} style={NOWRAP as never}>{run}</RNText>));
}

export type WrapMode = 'syllable' | 'word';

function breakChildren(children: ReactNode, wrap: WrapMode): ReactNode {
  if (typeof children === 'string') {
    if (scriptOf(children) !== 'myanmar') return children;
    if (wrap === 'word') return Platform.OS === 'web' ? webWords(children) : joinMyanmarWords(children);
    return Platform.OS === 'web' ? webRuns(children) : breakMyanmar(children);
  }
  if (Array.isArray(children)) return Children.map(children, c => (isValidElement(c) ? c : breakChildren(c, wrap)));
  return children;
}

/** `wrap="word"` keeps Burmese words whole for short headers; body text breaks between syllables. */
export const Text: React.FC<TextProps & { wrap?: WrapMode }> = ({ style, children, wrap = 'syllable', ...rest }) => (
  <RNText {...rest} style={localizedStyle(plainText(children), style)}>
    {breakChildren(children, wrap)}
  </RNText>
);

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(({ style, ...rest }, ref) => (
  <RNTextInput ref={ref} {...rest} style={localizedStyle(rest.value || rest.placeholder || '', style)} />
));
TextInput.displayName = 'TextInput';
