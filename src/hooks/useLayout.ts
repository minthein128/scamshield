import { useWindowDimensions } from 'react-native';

export type SizeClass = 'compact' | 'medium' | 'expanded';

export const MEDIUM_MIN = 600;
export const EXPANDED_MIN = 900;
export const APP_MAX_WIDTH = 1200;
export const RAIL_WIDTH = 96;

export interface Layout {
  sizeClass: SizeClass;
  /** Window width capped at the app maximum. */
  width: number;
  height: number;
  isTablet: boolean;
  isExpanded: boolean;
  /** Grid columns for card lists: 1, 2 or 3. */
  columns: 1 | 2 | 3;
  /** Width of a reading column. */
  contentMaxWidth: number;
  /** Width of a grid or two-pane screen. */
  wideMaxWidth: number;
  gutter: number;
}

export function sizeClassFor(width: number): SizeClass {
  if (width >= EXPANDED_MIN) return 'expanded';
  if (width >= MEDIUM_MIN) return 'medium';
  return 'compact';
}

export function layoutFor(windowWidth: number, height = 0): Layout {
  const width = Math.min(windowWidth, APP_MAX_WIDTH);
  const sizeClass = sizeClassFor(width);
  if (sizeClass === 'compact') {
    return { sizeClass, width, height, isTablet: false, isExpanded: false, columns: 1, contentMaxWidth: width, wideMaxWidth: width, gutter: 20 };
  }
  if (sizeClass === 'medium') {
    return { sizeClass, width, height, isTablet: true, isExpanded: false, columns: 2, contentMaxWidth: 680, wideMaxWidth: width, gutter: 28 };
  }
  return { sizeClass, width, height, isTablet: true, isExpanded: true, columns: 3, contentMaxWidth: 720, wideMaxWidth: width - RAIL_WIDTH, gutter: 32 };
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return layoutFor(width, height);
}
