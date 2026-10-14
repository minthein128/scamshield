import { foldDigits } from '../src/intel/redact.js';

const tokens = (value: string) =>
  foldDigits(value)
    .toLowerCase()
    .split(/[\s,.()\-/:@]+/u)
    .filter((t) => (/^\d+$/.test(t) ? t.length >= 3 : [...t].length >= 4));

/** True when any distinctive token of `value` is still readable in `out`. */
export function leaks(value: string, out: string): boolean {
  const hay = foldDigits(out).toLowerCase();
  const compact = hay.replace(/[\s\-.]/g, '');
  const digits = foldDigits(value).replace(/\D/g, '');
  if (digits.length >= 6 && compact.includes(digits)) return true;
  return tokens(value).some((t) =>
    new RegExp(`(?<![\\p{L}\\p{N}])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').test(hay),
  );
}
