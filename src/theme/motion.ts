import { Easing } from 'react-native';

/** Motion tokens shared with the overlay (ShieldMotion.kt): cubic-bezier control points and milliseconds. */
export const curves = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.37, 0, 0.63, 1],
  exit: [0.3, 0, 1, 1],
  pop: [0.34, 1.3, 0.64, 1],
} as const;

export const durations = {
  exit: 150,
  fade: 240,
  step: 320,
  reveal: 400,
  sway: 2800,
} as const;

/** The doll's damped tumbler sway: each swing in degrees, smaller than the last, then a short rest. */
export const sway = {
  swings: [4.5, -3.2, 2, -1, 0],
  restMs: 240,
} as const;

const bezier = ([a, b, c, d]: readonly number[]) => Easing.bezier(a, b, c, d);

export const ease = {
  out: bezier(curves.out),
  inOut: bezier(curves.inOut),
  exit: bezier(curves.exit),
  pop: bezier(curves.pop),
};

export default { curves, durations, sway, ease };
