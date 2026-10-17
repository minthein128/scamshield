import type { ViewStyle } from 'react-native';

export const TAB_CONTENT_HEIGHT = 64;
export const TAB_CONTENT_HEIGHT_TALL = 72;
export const TAB_MIN_TOUCH = 48;
export const TAB_ICON_SIZE = 24;
export const TAB_LABEL_SIZE = 12;
export const TAB_LABEL_LINE = 16;
export const TAB_LABEL_LINE_TALL = 22;
export const TAB_ICON_LABEL_GAP = 4;

/** Bar style: fixed content height plus the bottom safe-area inset, counted once. */
export function tabBarStyle(insetBottom: number, tall: boolean): ViewStyle {
  const content = tall ? TAB_CONTENT_HEIGHT_TALL : TAB_CONTENT_HEIGHT;
  return { height: content + insetBottom, paddingTop: 0, paddingBottom: insetBottom };
}
