import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { TAB_ICON_SIZE } from './tabBarMetrics';
import type { TabParamList } from './types';

export const TabIcon: React.FC<{ name: keyof TabParamList; color: string }> = ({ name, color }) => (
  <Svg width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {name === 'Home' && <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />}
    {name === 'Check' && (
      <>
        <Circle cx={12} cy={3.9} r={1.5} />
        <Path d="M12 6.6c3.9 0 6.2 3.8 6.2 7.9 0 4-2.7 6.5-6.2 6.5s-6.2-2.5-6.2-6.5c0-4.1 2.3-7.9 6.2-7.9z" />
        <Path d="M6.2 13.6c3.8 1.4 7.8 1.4 11.6 0M10 10.6h.01M14 10.6h.01" />
      </>
    )}
    {name === 'Contacts' && (
      <>
        <Circle cx={9} cy={8} r={3.5} />
        <Path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <Path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
        <Path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
      </>
    )}
    {name === 'Learn' && (
      <>
        <Path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
        <Path d="M4 19V5" />
      </>
    )}
  </Svg>
);
