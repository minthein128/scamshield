import { scriptOf } from '../theme/script';

const SIDE_PADDING = 20;
const GAP = 10;
const BUTTON_PADDING = 20;
const ICON = 30;

/** Width in px of an average glyph at the 16px button size. */
const GLYPH = { latin: 9, myanmar: 10, thai: 9.5 };

export function estimateLines(label: string, columnWidth: number, fontScale = 1): number {
  const room = Math.max(columnWidth - BUTTON_PADDING - ICON, 1);
  return Math.ceil((label.length * GLYPH[scriptOf(label)] * fontScale) / room);
}

/** The two voice buttons stack when the screen is narrow or either label would need over 2 lines. */
export function voiceRowStacks(windowWidth: number, labels: string[], fontScale = 1): boolean {
  if (windowWidth < 360) return true;
  const column = (windowWidth - SIDE_PADDING * 2 - GAP) / 2;
  return labels.some(l => estimateLines(l, column, fontScale) > 2);
}
