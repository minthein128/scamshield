import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, type StyleProp, type TextStyle } from 'react-native';
import { Text } from './Text';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { durations, ease } from '../theme/motion';

const native = Platform.OS !== 'web';

type Props = Omit<React.ComponentProps<typeof Text>, 'children' | 'style'> & { text: string; style?: StyleProp<TextStyle>; rise?: number };

/** Text that fades out and the new text fades in, rising a few points unless reduce motion is on. */
export const CrossfadeText: React.FC<Props> = ({ text, style, rise = 6, ...rest }) => {
  const reduce = useReduceMotion();
  const [shown, setShown] = useState({ text, style });
  const opacity = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;

  const token = useRef(0);

  useEffect(() => () => opacity.stopAnimation(), [opacity]);

  useEffect(() => {
    if (text === shown.text) {
      setShown(s => (s.style === style ? s : { text, style }));
      return;
    }
    const mine = ++token.current;
    Animated.timing(opacity, { toValue: 0, duration: durations.exit, easing: ease.exit, useNativeDriver: native }).start(() => {
      if (mine !== token.current) return;
      setShown({ text, style });
      lift.setValue(reduce ? 0 : rise);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: durations.fade, easing: ease.out, useNativeDriver: native }),
        Animated.timing(lift, { toValue: 0, duration: durations.fade, easing: ease.out, useNativeDriver: native }),
      ]).start();
    });
  }, [text, style, shown.text, reduce, rise, opacity, lift]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: lift }] }}>
      <Text {...rest} style={shown.style}>
        {shown.text}
      </Text>
    </Animated.View>
  );
};

export default CrossfadeText;
