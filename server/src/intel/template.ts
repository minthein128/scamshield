import { hasResidualPii, redactDeterministic } from './redact.js';

export const TEMPLATE_CAP = 300;
const LABEL_CAP = 60;

const ALLOWED = [
  'VICTIM_NAME',
  'PERSON',
  'COMPANY',
  'AMOUNT',
  'PHONE',
  'EMAIL',
  'LINK',
  'HANDLE',
  'ACCOUNT',
  'ADDRESS',
  'ID_NUMBER',
  'PASSPORT',
  'CARD',
  'IBAN',
  'DOB',
  'NUMBER',
  'REDACTED',
  'DATE',
  'LOCATION',
];
const UNKNOWN_BRACKET = new RegExp(`\\[(?!(?:${ALLOWED.join('|')})\\])[^\\]\\n]{0,60}\\]`, 'g');

const cap = (s: string, n: number) => {
  const chars = [...s];
  return chars.length <= n
    ? s
    : chars
        .slice(0, n)
        .join('')
        .replace(/\[[A-Z_]*$/, '')
        .trim();
};

/**
 * Second redaction pass over the model template. Returns undefined (store nothing) when the
 * model is unsure, the template is too short, or any residual identifier pattern remains.
 */
export function finalizeTemplate(raw: string | undefined, templateSafe: boolean | undefined): string | undefined {
  if (!raw || templateSafe === false) return undefined;
  const cleaned = redactDeterministic(raw).text.replace(UNKNOWN_BRACKET, '[REDACTED]');
  const out = cap(cleaned.replace(/\s+/g, ' '), TEMPLATE_CAP);
  if ([...out].length < 12 || hasResidualPii(out)) return undefined;
  return out;
}

export function finalizeLabel(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const out = cap(
    redactDeterministic(raw.replace(/\[[^\]]*\]/g, ''))
      .text.replace(/\s+/g, ' ')
      .trim(),
    LABEL_CAP,
  );
  return out.length >= 4 && !hasResidualPii(out) ? out : undefined;
}
