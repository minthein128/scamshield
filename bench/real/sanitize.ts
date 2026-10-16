import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from '../lib.js';
import { type CaseFile, YAML } from '../v2/cases.js';

type Box = NonNullable<CaseFile['redaction_boxes']>[number];

const TEXT_KINDS = new Set(['name', 'phone', 'handle', 'other']);
const PLACEHOLDER: Record<string, string> = { name: '[NAME]', phone: '[PHONE]', handle: '[HANDLE]', other: '[REDACTED]' };
const PHONE_RE = /\+?\d(?:[ -]?\d){8,}/g;
const HANDLE_RE = /@[A-Za-z0-9_.]{3,}/g;

export const hiddenStrings = (boxes: Box[] = []): string[] =>
  [
    ...new Set(
      boxes.filter((b) => b.kind && TEXT_KINDS.has(b.kind) && (b.text?.trim().length ?? 0) >= 2).map((b) => (b.text as string).trim()),
    ),
  ].sort((a, b) => b.length - a.length);

/** Replaces every redacted string, and anything shaped like a phone number or handle, with a placeholder. */
export function sanitizeText(text: string, boxes: Box[] = []): string {
  let out = text.normalize('NFC');
  for (const b of boxes.slice().sort((x, y) => (y.text?.length ?? 0) - (x.text?.length ?? 0))) {
    const t = b.text?.trim().normalize('NFC');
    if (!b.kind || !TEXT_KINDS.has(b.kind) || !t || t.length < 2) continue;
    out = out.split(t).join(PLACEHOLDER[b.kind]);
  }
  return out.replace(PHONE_RE, '[PHONE]').replace(HANDLE_RE, '[HANDLE]');
}

/** One placeholder per accused name, handle or number, in the original order. */
export function accusePlaceholders(doc: CaseFile): string[] {
  const boxes = doc.redaction_boxes ?? [];
  return (doc.must_not?.accuse ?? []).map((a) => {
    const hit = boxes.find((b) => b.text && (b.text.includes(a) || a.includes(b.text)));
    if (hit?.kind && PLACEHOLDER[hit.kind]) return PLACEHOLDER[hit.kind] as string;
    if (/^\+?\d[\d ()-]{6,}$/.test(a)) return '[PHONE]';
    if (/^@/.test(a)) return '[HANDLE]';
    return '[NAME]';
  });
}

/** Accused strings that still appear in published data. Brands that stay visible in the image are fine; a person must look. */
export function accuseInPublished(published: unknown, doc: CaseFile): string[] {
  const blob = JSON.stringify(published).normalize('NFC');
  return (doc.must_not?.accuse ?? []).filter((a) => a.trim().length >= 3 && blob.includes(a.trim().normalize('NFC')));
}

/** Strings from the private file that must not appear anywhere in published data. */
export function leaks(published: unknown, boxes: Box[] = []): string[] {
  const blob = JSON.stringify(published).normalize('NFC');
  return hiddenStrings(boxes).filter((s) => blob.includes(s.normalize('NFC')));
}

type FactEntry = NonNullable<CaseFile['must_mention']>[number];

export function sanitizeFacts(facts: FactEntry[] = [], boxes: Box[] = []): FactEntry[] {
  const out: FactEntry[] = [];
  for (const f of facts) {
    if (typeof f === 'string') {
      out.push(f);
      continue;
    }
    const cleaned = (f.variants ?? []).map((v) => sanitizeText(v, boxes));
    if (cleaned.some((v) => /\[(NAME|PHONE|HANDLE|REDACTED)\]/.test(v))) continue;
    const variants = cleaned;
    out.push({ ...f, ...(f.variants ? { variants } : {}) });
  }
  return out;
}

/** The case as it may be published next to the redacted image: no names, no handles, no notes. */
export function sanitizeCase(doc: CaseFile, redactedFile: string): CaseFile {
  const boxes = doc.redaction_boxes ?? [];
  const { redaction_boxes: _b, notes: _n, translations: _t, synthetic: _s, ...rest } = doc;
  return {
    ...rest,
    file: redactedFile,
    source_text: `${sanitizeText(doc.source_text, boxes).trim()}\n`,
    must_mention: sanitizeFacts(doc.must_mention, boxes),
    must_not: { accuse: accusePlaceholders(doc), ...(doc.must_not?.advice ? { advice: doc.must_not.advice } : {}) },
    notes: 'Redacted copy. Names, photos, phone numbers and handles are hidden.',
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const flags = parseArgs(process.argv.slice(2));
  const cases = typeof flags.cases === 'string' ? resolve(flags.cases) : '';
  const out = typeof flags.out === 'string' ? resolve(flags.out) : '';
  const redacted = typeof flags.redacted === 'string' ? resolve(flags.redacted) : '';
  if (flags.help || !cases || !out || !redacted) {
    console.log(`npm run bench:redact-cases -- --cases DIR --redacted IMAGES --out DIR
  Writes sanitised case files that point at the redacted images, so bench v2 can run on them.`);
    process.exit(flags.help ? 0 : 2);
  }
  mkdirSync(out, { recursive: true });
  let n = 0;
  for (const f of readdirSync(cases).filter((x) => x.endsWith('.yaml') && !x.startsWith('_'))) {
    const doc = YAML.parse(readFileSync(join(cases, f), 'utf8')) as CaseFile;
    const clean = sanitizeCase(doc, `${relativeImages(out, redacted)}/${doc.id}.png`);
    writeFileSync(join(out, f), YAML.stringify(clean, { lineWidth: 0 }));
    n++;
  }
  console.log(`wrote ${n} sanitised case files to ${out}`);
}

function relativeImages(from: string, to: string): string {
  const a = from.split('/').filter(Boolean);
  const b = to.split('/').filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return [...a.slice(i).map(() => '..'), ...b.slice(i)].join('/');
}
