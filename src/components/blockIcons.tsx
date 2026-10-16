import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Icon, type IconName } from './Icon';
import theme from '../theme/theme';

export type BlockIconName = IconName | 'briefcase' | 'download' | 'clipboard' | 'close' | 'power' | 'exit' | 'swap' | 'trash' | 'pencil' | 'chevDown' | 'chevUp' | 'tick' | 'magnify';

const SHAPES: Record<Exclude<BlockIconName, IconName>, React.ReactNode> = {
  briefcase: (
    <>
      <Rect x={3} y={7} width={18} height={13} rx={2} />
      <Path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" />
    </>
  ),
  download: <Path d="M12 3.5V14M7.5 9.5L12 14l4.5-4.5M4.5 14.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3.5" />,
  clipboard: (
    <>
      <Rect x={5} y={4} width={14} height={17} rx={2} />
      <Path d="M9 4.5V3h6v1.5M9 10h6M9 14h6" />
    </>
  ),
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  power: <Path d="M12 3v8M7.1 6.6a8 8 0 1 0 9.8 0" />,
  exit: <Path d="M10 4.5H6A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h4M15 8l4 4-4 4M19 12H9.5" />,
  swap: <Path d="M4 12a8 8 0 0 1 13.6-5.7L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.6 5.7L4 15.5M4 20v-4.5h4.5" />,
  trash: <Path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5" />,
  pencil: <Path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  chevDown: <Path d="M6 9.5l6 6 6-6" />,
  chevUp: <Path d="M6 14.5l6-6 6 6" />,
  magnify: (
    <>
      <Circle cx={11} cy={11} r={6.5} />
      <Path d="M16 16l4.5 4.5" />
    </>
  ),
  tick: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
};

/** Icon set for the Home and Check blocks: the shared icons plus the few these screens add. */
export const BlockIcon: React.FC<{ name: BlockIconName; size?: number; color?: string; strokeWidth?: number }> = ({ name, size = 24, color = theme.colors.textPrimary, strokeWidth = 2 }) => {
  if (!(name in SHAPES)) return <Icon name={name as IconName} size={size} color={color} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no">
      {SHAPES[name as keyof typeof SHAPES]}
    </Svg>
  );
};
