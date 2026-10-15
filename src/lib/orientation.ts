export const PHONE_MAX_SHORT_SIDE = 600;

export type OrientationPolicy = 'portrait' | 'free';

/** Phones stay portrait. Anything with a short side of 600 dp or more may rotate. */
export function orientationPolicyFor(screenWidth: number, screenHeight: number): OrientationPolicy {
  return Math.min(screenWidth, screenHeight) < PHONE_MAX_SHORT_SIDE ? 'portrait' : 'free';
}
