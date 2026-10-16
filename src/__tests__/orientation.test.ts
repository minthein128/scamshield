import { orientationPolicyFor } from '../lib/orientation';

describe('orientationPolicyFor', () => {
  it.each([
    [360, 800],
    [800, 360],
    [411, 914],
    [599, 1000],
  ])('locks a %dx%d phone to portrait', (w, h) => {
    expect(orientationPolicyFor(w, h)).toBe('portrait');
  });

  it.each([
    [600, 960],
    [800, 1280],
    [1280, 800],
    [1600, 2560],
  ])('lets a %dx%d tablet rotate', (w, h) => {
    expect(orientationPolicyFor(w, h)).toBe('free');
  });
});
