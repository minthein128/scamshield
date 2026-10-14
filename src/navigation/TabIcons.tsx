import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import type { TabParamList } from './types';

export const TabIcon: React.FC<{ name: keyof TabParamList; color: string }> = ({ name, color }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {name === 'Home' && <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />}
    {name === 'Check' && <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />}
    {name === 'Family' && (
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
