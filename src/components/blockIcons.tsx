import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Icon, type IconName } from './Icon';
import theme from '../theme/theme';

export type BlockIconName = IconName | 'briefcase' | 'download' | 'clipboard' | 'search' | 'close' | 'power';

const SHAPES: Record<'briefcase' | 'download' | 'clipboard' | 'search' | 'close' | 'power', React.ReactNode> = {
  briefcase: (
    <>
      <Rect x={3} y={7} width={18} height={13} rx={2} />
      <Path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" />
    </>
  ),
  download: <Path d="M12 4v10M8 10.5l4 4 4-4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />,
  clipboard: (
    <>
      <Rect x={5} y={4} width={14} height={17} rx={2} />
      <Path d="M9 4.5V3h6v1.5M9 10h6M9 14h6" />
    </>
  ),
  search: (
    <>
      <Circle cx={11} cy={11} r={7} />
      <Path d="M16.5 16.5L21 21" />
    </>
  ),
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  power: <Path d="M12 3v8M7.1 6.6a8 8 0 1 0 9.8 0" />,
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
