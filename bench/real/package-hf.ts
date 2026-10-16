import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from '../lib.js';
import { CASES_DIR, type CaseFile, resolveFacts, VERDICT_BAND, YAML } from '../v2/cases.js';
import { accuseInPublished, leaks, sanitizeCase } from './sanitize.js';

const flags = parseArgs(process.argv.slice(2));
const str = (v: string | true | undefined) => (typeof v === 'string' ? v : undefined);
if (flags.help || !str(flags.out)) {
  console.log(`npm run bench:package-hf -- --out DIR [--cases PRIVATE_CASES --redacted IMAGES] [--synthetic DIR]
  Builds a Hugging Face imagefolder dataset locally. Nothing is uploaded.
  --out DIR        target folder (it is emptied first)
  --cases DIR      private real case files (omit to package synthetic only)
  --redacted DIR   redacted images named <id>.png
  --exclude id,id  real case ids to leave out (exact duplicates)
  --synthetic DIR  synthetic case files (default bench/cases)`);
  process.exit(flags.help ? 0 : 2);
}

const out = resolve(str(flags.out) as string);
const synDir = resolve(str(flags.synthetic) ?? CASES_DIR);
const realDir = str(flags.cases) ? resolve(str(flags.cases) as string) : undefined;
const exclude = new Set(str(flags.exclude)?.split(',') ?? []);
const redDir = str(flags.redacted) ? resolve(str(flags.redacted) as string) : undefined;

interface Row {
  file_name: string;
  config: 'synthetic' | 'real';
  split: 'test';
  source: 'synthetic' | 'real';
  id: string;
  parent_id: string | null;
  variant: 'original' | 'translation';
  language: string;
  content_language: string;
  app: string | null;
  home: string | null;
  destination: string | null;
  scam_type: string;
  expected_verdict: string;
  score_range: number[];
  families: string[];
  source_text: string;
  must_mention: { id: string; variants: string[] }[];
  must_advise: string[];
  must_not_accuse: string[];
  must_not_advice: string[];
  label_status: string;
  labelled_by: string;
  redaction: string;
}

function toRow(
  c: CaseFile,
  o: { fileName: string; source: 'synthetic' | 'real'; label: [string, string]; redaction: string; accuse: boolean },
): Row {
  return {
    file_name: o.fileName,
    config: o.source,
    split: 'test',
    source: o.source,
    id: c.id,
    parent_id: null,
    variant: 'original',
    language: c.language,
    content_language: c.content_language ?? c.language,
    app: c.app ?? null,
    home: c.home ?? null,
    destination: c.destination ?? null,
    scam_type: c.scam_type ?? (c.expected_verdict === 'safe' ? 'none' : 'other'),
    expected_verdict: c.expected_verdict,
    score_range: c.score_range ?? VERDICT_BAND[c.expected_verdict],
    families: c.families ?? [],
    source_text: c.source_text.trim(),
    must_mention: resolveFacts(c.must_mention).map((f) => ({ id: f.id, variants: f.variants as string[] })),
    must_advise: (c.must_advise ?? []).map((a) => (typeof a === 'string' ? a : a.id)),
    must_not_accuse: o.accuse ? (c.must_not?.accuse ?? []) : [],
    must_not_advice: c.must_not?.advice ?? [],
    label_status: o.label[0],
    labelled_by: o.label[1],
    redaction: o.redaction,
  };
}

rmSync(out, { recursive: true, force: true });
const synOut = join(out, 'data', 'synthetic');
mkdirSync(synOut, { recursive: true });
const synRows: Row[] = [];
for (const f of readdirSync(synDir)
  .filter((x) => /\.ya?ml$/.test(x) && !x.startsWith('_'))
  .sort()) {
  const c = YAML.parse(readFileSync(join(synDir, f), 'utf8')) as CaseFile;
  if (c.draft || c.public === false) continue;
  const img = resolve(synDir, c.file);
  if (!existsSync(img)) throw new Error(`${c.id}: image ${img} is missing; run npm run bench:render`);
  copyFileSync(img, join(synOut, `${c.id}.png`));
  synRows.push(
    toRow(c, { fileName: `${c.id}.png`, source: 'synthetic', label: ['authored', 'bench authors'], redaction: 'not_needed', accuse: true }),
  );
  for (const t of c.translations ?? []) {
    if (!t.file || !existsSync(resolve(synDir, t.file))) continue;
    const name = `${c.id}.${t.language}.png`;
    copyFileSync(resolve(synDir, t.file), join(synOut, name));
    synRows.push({
      ...(synRows[synRows.length - 1] as Row),
      file_name: name,
      id: `${c.id}-${t.language}`,
      parent_id: c.id,
      variant: 'translation',
      language: t.language,
      content_language: t.language,
      source_text: t.source_text.trim(),
    });
  }
}
const jsonl = (rows: Row[]) => `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`;
writeFileSync(join(synOut, 'metadata.jsonl'), jsonl(synRows));

const realRows: Row[] = [];
if (realDir && redDir) {
  const realOut = join(out, 'data', 'real_redacted');
  mkdirSync(realOut, { recursive: true });
  const problems: string[] = [];
  for (const f of readdirSync(realDir)
    .filter((x) => x.endsWith('.yaml') && !x.startsWith('_'))
    .sort()) {
    const raw = YAML.parse(readFileSync(join(realDir, f), 'utf8')) as CaseFile;
    if (exclude.has(raw.id)) continue;
    const img = join(redDir, `${raw.id}.png`);
    if (!existsSync(img)) {
      problems.push(`${raw.id}: no redacted image`);
      continue;
    }
    const clean = sanitizeCase(raw, `${raw.id}.png`);
    const row = toRow(clean, {
      fileName: `${raw.id}.png`,
      source: 'real',
      label: [raw.label_status ?? 'draft', raw.labelled_by ?? 'unknown'],
      redaction: raw.redaction ?? 'unchecked',
      accuse: true,
    });
    const soft = accuseInPublished(row, raw);
    if (soft.length) console.warn(`package-hf: ${raw.id}: accused string still in metadata, check it is a visible brand: ${soft.length}`);
    const hit = leaks(row, raw.redaction_boxes);
    if (hit.length) problems.push(`${raw.id}: redacted text still in metadata (${hit.length})`);
    copyFileSync(img, join(realOut, row.file_name));
    realRows.push(row);
  }
  writeFileSync(join(realOut, 'metadata.jsonl'), jsonl(realRows));
  if (problems.length) {
    console.error(`package-hf: ${problems.length} problems\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
}

const count = (rows: Row[], k: keyof Row) => {
  const m = new Map<string, number>();
  for (const r of rows) m.set(String(r[k]), (m.get(String(r[k])) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const table = (rows: Row[], k: keyof Row) =>
  count(rows, k)
    .map(([v, n]) => `| ${v} | ${n} |`)
    .join('\n');
const cardPath = join(dirname(new URL(import.meta.url).pathname), 'dataset-card.md');
const card = readFileSync(cardPath, 'utf8')
  .replace('{{N_SYNTHETIC}}', String(synRows.length))
  .replace('{{N_REAL}}', String(realRows.length))
  .replace('{{REAL_BY_APP}}', realRows.length ? table(realRows, 'app') : '| none | 0 |')
  .replace('{{REAL_BY_VERDICT}}', realRows.length ? table(realRows, 'expected_verdict') : '| none | 0 |')
  .replace('{{SYN_BY_VERDICT}}', table(synRows, 'expected_verdict'));
writeFileSync(join(out, 'README.md'), card);
console.log(`packaged ${synRows.length} synthetic and ${realRows.length} real images into ${out}`);
