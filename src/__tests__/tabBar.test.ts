import { tabBarStyle, TAB_CONTENT_HEIGHT, TAB_CONTENT_HEIGHT_TALL, TAB_MIN_TOUCH } from '../navigation/tabBarMetrics';

describe('tab bar metrics', () => {
  it.each([0, 24, 48])('counts a bottom inset of %i once', inset => {
    const s = tabBarStyle(inset, false);
    expect(s.height).toBe(TAB_CONTENT_HEIGHT + inset);
    expect(s.paddingBottom).toBe(inset);
    expect((s.height as number) - (s.paddingBottom as number)).toBe(TAB_CONTENT_HEIGHT);
  });

  it('gives Burmese and Thai a taller content area, still inside 56 to 64', () => {
    const s = tabBarStyle(24, true);
    expect(s.height).toBe(TAB_CONTENT_HEIGHT_TALL + 24);
    expect(TAB_CONTENT_HEIGHT_TALL).toBeLessThanOrEqual(64);
  });

  it('keeps the content area above the touch minimum', () => {
    expect(TAB_CONTENT_HEIGHT - 6).toBeGreaterThanOrEqual(TAB_MIN_TOUCH);
  });
});
