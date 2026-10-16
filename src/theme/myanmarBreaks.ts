const MARKS = 'ံ့';
const BREAK = new RegExp(`([\\u1000-\\u1038\\u103A-\\u109F])(?=[\\u1000-\\u1021\\u1025-\\u1027](?![${MARKS}]*[\\u103A\\u1039]))`, 'g');

/** Adds U+200B between Burmese syllables so a line wraps only at a syllable boundary. */
export function breakMyanmar(text: string): string {
  return text.replace(BREAK, '$1​');
}
