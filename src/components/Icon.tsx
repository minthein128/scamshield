import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import theme from '../theme/theme';

export type IconName =
  | 'doll' | 'checkCircle' | 'alert' | 'chevron' | 'settings' | 'link' | 'image' | 'chat' | 'speaker' | 'stop'
  | 'gift' | 'clock' | 'card' | 'user' | 'flag' | 'octagon' | 'radar' | 'phone' | 'people' | 'info'
  | 'thumbUp' | 'thumbDown' | 'check' | 'mic' | 'micOff';

const SHAPES: Record<IconName, React.ReactNode> = {
  doll: (
    <>
      <Circle cx={12} cy={3.9} r={1.5} />
      <Path d="M12 6.6c3.9 0 6.2 3.8 6.2 7.9 0 4-2.7 6.5-6.2 6.5s-6.2-2.5-6.2-6.5c0-4.1 2.3-7.9 6.2-7.9z" />
      <Path d="M6.2 13.6c3.8 1.4 7.8 1.4 11.6 0M10 10.6h.01M14 10.6h.01" />
    </>
  ),
  checkCircle: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M8 12.2l2.8 2.8 5.2-5.6" />
    </>
  ),
  alert: (
    <>
      <Path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <Path d="M12 9v4M12 17h.01" />
    </>
  ),
  chevron: <Path d="M9 6l6 6-6 6" />,
  settings: (
    <>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  link: (
    <>
      <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <Path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
  image: (
    <>
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Circle cx={9} cy={10} r={1.5} />
      <Path d="M21 16l-5-5-8 8" />
    </>
  ),
  chat: <Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  speaker: (
    <>
      <Path d="M4 9v6h4l5 4V5L8 9z" />
      <Path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  stop: <Rect x={6} y={6} width={12} height={12} rx={2} />,
  gift: (
    <>
      <Rect x={3} y={8} width={18} height={4} rx={1} />
      <Path d="M5 12v8h14v-8M12 8v12" />
      <Path d="M12 8c-2.5 0-4-1-4-2.5S9.5 3 10.5 4 12 8 12 8zM12 8c2.5 0 4-1 4-2.5S14.5 3 13.5 4 12 8 12 8z" />
    </>
  ),
  clock: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  card: (
    <>
      <Rect x={2} y={5} width={20} height={14} rx={2} />
      <Path d="M2 10h20M6 15h4" />
    </>
  ),
  user: (
    <>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  flag: <Path d="M5 21V4M5 4h13l-2.5 4 2.5 4H5" />,
  octagon: (
    <>
      <Path d="M8 2.5h8L21.5 8v8L16 21.5H8L2.5 16V8z" />
      <Path d="M12 8v5M12 16.5h.01" />
    </>
  ),
  radar: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Circle cx={12} cy={12} r={4.5} />
      <Path d="M12 12l6-6" />
    </>
  ),
  phone: <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  people: (
    <>
      <Circle cx={9} cy={8} r={3.5} />
      <Path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </>
  ),
  info: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 11v5M12 8h.01" />
    </>
  ),
  thumbUp: <Path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.3a2 2 0 0 0 2-1.7l1.4-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />,
  thumbDown: <Path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.7a2 2 0 0 0-2 1.7l-1.4 9a2 2 0 0 0 2 2.3zM17 2h2.7A2.3 2.3 0 0 1 22 4v7a2.3 2.3 0 0 1-2.3 2H17" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  mic: (
    <>
      <Rect x={9} y={3} width={6} height={11} rx={3} />
      <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  micOff: (
    <>
      <Path d="M4 4l16 16" />
      <Path d="M9 9v2a3 3 0 0 0 5 2.2M15 10V6a3 3 0 0 0-5.7-1.3M5 11a7 7 0 0 0 11 5.7M19 11a7 7 0 0 1-.6 2.8M12 18v3" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  fill?: boolean;
}

// One stroke style everywhere: 2px, round caps and joins, 24px grid.
export const Icon: React.FC<IconProps> = ({ name, size = 24, color = theme.colors.textPrimary, fill }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {SHAPES[name]}
  </Svg>
);

export default Icon;
