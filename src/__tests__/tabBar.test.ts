import {
  tabBarStyle, TAB_CONTENT_HEIGHT, TAB_CONTENT_HEIGHT_TALL, TAB_ICON_LABEL_GAP, TAB_ICON_SIZE,
  TAB_LABEL_LINE, TAB_LABEL_LINE_TALL, TAB_MIN_TOUCH,
} from '../navigation/tabBarMetrics';

describe('tab bar metrics', () => {
  it.each([0, 24, 48])('counts a bottom inset of %i once', inset => {
    const s = tabBarStyle(inset, false);
    expect(s.height).toBe(TAB_CONTENT_HEIGHT + inset);
    expect(s.paddingBottom).toBe(inset);
    expect((s.height as number) - (s.paddingBottom as number)).toBe(TAB_CONTENT_HEIGHT);
  });

  it('gives Burmese and Thai a taller content area', () => {
    const s = tabBarStyle(24, true);
    expect(s.height).toBe(TAB_CONTENT_HEIGHT_TALL + 24);
    expect(TAB_CONTENT_HEIGHT_TALL).toBeGreaterThan(TAB_CONTENT_HEIGHT);
  });

  it('stays below the old 72 dp bar for Latin scripts', () => {
    expect(TAB_CONTENT_HEIGHT).toBeLessThan(72);
    expect(TAB_CONTENT_HEIGHT).toBeGreaterThanOrEqual(60);
  });

  it('leaves at least 8 dp of padding around icon and label', () => {
    const stack = (line: number) => TAB_ICON_SIZE + TAB_ICON_LABEL_GAP + line;
    expect(TAB_CONTENT_HEIGHT - stack(TAB_LABEL_LINE)).toBeGreaterThanOrEqual(16);
    expect(TAB_CONTENT_HEIGHT_TALL - stack(TAB_LABEL_LINE_TALL)).toBeGreaterThanOrEqual(16);
  });

  it('keeps the content area above the touch minimum', () => {
    expect(TAB_CONTENT_HEIGHT).toBeGreaterThanOrEqual(TAB_MIN_TOUCH);
  });
});
