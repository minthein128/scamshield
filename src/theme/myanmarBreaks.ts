const MARKS = '\u1036\u1037';
const BREAK = new RegExp(`([\\u1000-\\u1038\\u103A-\\u109F])(?=[\\u1000-\\u1021\\u1025-\\u1027](?![${MARKS}]*[\\u103A\\u1039]))`, 'g');

/** Adds U+200B between Burmese syllables so a line wraps only at a syllable boundary. */
export function breakMyanmar(text: string): string {
  return text.replace(BREAK, '$1\u200B');
}

/** Splits spaced text into syllable runs and the separators between them. */
export function syllableRuns(text: string): string[] {
  return breakMyanmar(text).split(/([\u200B ])/).filter(Boolean);
}

/** Joins the syllables of each word with U+2060 so a short header wraps only at spaces. */
export function joinMyanmarWords(text: string): string {
  return breakMyanmar(text).replace(/\u200B/g, '\u2060');
}
