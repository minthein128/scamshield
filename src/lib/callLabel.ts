import type { Hotline, HotlineCategory } from '../data/hotlines';

export interface CallLabel {
  label: string;
  sub?: string;
}

export interface CallTexts {
  call: (number: string) => string;
  ext: (ext: string) => string;
  /** Outside English: hotline names are English only, so the second line names the category. */
  category?: (category: HotlineCategory) => string;
}

const EXTENSION = /^(.*?)[\s,;]*(?:local|ext\.?|extension)\s*(\d+)\s*$/i;

/** Splits "(02) 8834 4000 local 4031" into the dialled part and the extension. */
export function splitExtension(number: string): { base: string; ext?: string } {
  const m = EXTENSION.exec(number.trim());
  return m && m[1] ? { base: m[1].trim(), ext: m[2] } : { base: number.trim() };
}

/** Short title with the number, and a smaller second line: the extension, else the category or hotline name. */
export function callLabel(hotline: Pick<Hotline, 'number' | 'dial' | 'name' | 'category'>, texts: CallTexts): CallLabel {
  const { base, ext } = splitExtension(hotline.number ?? hotline.dial ?? '');
  const name = texts.category ? texts.category(hotline.category) : hotline.name;
  return {
    label: texts.call(base),
    sub: ext ? texts.ext(ext) : name || undefined,
  };
}
