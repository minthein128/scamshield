import type { SignalDoc } from './types.js';

/** Reported scams and missed-scam feedback. */
export const CONFIRMED_WEIGHT = 1;
/** A signal whose verdict the user said was wrong. */
export const CONTRADICTED_WEIGHT = 0.25;

export const weightOf = (s: Pick<SignalDoc, 'w'>) => s.w ?? 1;

/** Counter change that moves a signal from its current weight to `to`. */
export const weightDelta = (s: Pick<SignalDoc, 'w'>, to: number) => to - weightOf(s);

/** Fractional counters are shown as whole reports. */
export const shown = (n: number) => Math.round(n);
