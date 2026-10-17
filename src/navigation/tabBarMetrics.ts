import type { ViewStyle } from 'react-native';

export const TAB_CONTENT_HEIGHT = 56;
export const TAB_CONTENT_HEIGHT_TALL = 64;
export const TAB_MIN_TOUCH = 48;

/** Bar style: fixed content height plus the bottom safe-area inset, counted once. */
export function tabBarStyle(insetBottom: number, tall: boolean): ViewStyle {
  const content = tall ? TAB_CONTENT_HEIGHT_TALL : TAB_CONTENT_HEIGHT;
  return { height: content + insetBottom, paddingTop: 6, paddingBottom: insetBottom };
}
