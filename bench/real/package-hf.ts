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
  --labels2 FILE   second labeller JSON; its app replaces the folder-derived app, its labels go in second_label
  --id-map FILE    write the private map from published ids to case ids
  --exclude id,id  real case ids to leave out (exact duplicates)
  --synthetic DIR  synthetic case files (default bench/cases)`);
  process.exit(flags.help ? 0 : 2);
}

const out = resolve(str(flags.out) as string);
const synDir = resolve(str(flags.synthetic) ?? CASES_DIR);
const realDir = str(flags.cases) ? resolve(str(flags.cases) as string) : undefined;
const exclude = new Set(str(flags.exclude)?.split(',') ?? []);
const labels2 = str(flags.labels2) ? (JSON.parse(readFileSync(resolve(str(flags.labels2) as string), 'utf8')) as SecondLabel[]) : [];
const idMapOut = str(flags['id-map']) ? resolve(str(flags['id-map']) as string) : undefined;
const redDir = str(flags.redacted) ? resolve(str(flags.redacted) as string) : undefined;

interface SecondLabel {
  id: string;
  app: string;
  is_scam: string;
  expected_verdict: string;
  scam_type: string;
  amounts?: unknown[];
}

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
  second_label?: { labeller: string; verdict: string; is_scam: string; scam_type: string; amounts: string[] };
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
  const second = new Map(labels2.map((l) => [l.id, l]));
  const files = readdirSync(realDir)
    .filter((x) => x.endsWith('.yaml') && !x.startsWith('_'))
    .sort()
    .map((f) => YAML.parse(readFileSync(join(realDir, f), 'utf8')) as CaseFile)
    .filter((c) => !exclude.has(c.id));
  const seq = new Map<string, number>();
  const idMap: Record<string, string> = {};
  for (const raw of files) {
    const s = second.get(raw.id);
    const app = s?.app ?? raw.app ?? 'unspecified';
    const n = (seq.get(app) ?? 0) + 1;
    seq.set(app, n);
    const pub = `real-${app.replace(/[^a-z0-9]+/g, '-')}-${String(n).padStart(3, '0')}`;
    idMap[pub] = raw.id;
    const img = join(redDir, `${raw.id}.png`);
    if (!existsSync(img)) {
      problems.push(`${raw.id}: no redacted image`);
      continue;
    }
    const clean = sanitizeCase({ ...raw, app }, `${pub}.png`);
    const row = toRow(
      { ...clean, id: pub },
      {
        fileName: `${pub}.png`,
        source: 'real',
        label: [s ? 'draft-2-model' : (raw.label_status ?? 'draft'), raw.labelled_by ?? 'unknown'],
        redaction: raw.redaction ?? 'unchecked',
        accuse: true,
      },
    );
    if (s) {
      row.second_label = {
        labeller: 'claude',
        verdict: s.expected_verdict,
        is_scam: s.is_scam,
        scam_type: s.scam_type,
        amounts: (s.amounts ?? []).map((a) => (typeof a === 'string' ? a : JSON.stringify(a))),
      };
    }
    const soft = accuseInPublished(row, raw);
    if (soft.length) console.warn(`package-hf: ${pub}: accused string still in metadata, check it is a visible brand: ${soft.length}`);
    const hit = leaks(row, raw.redaction_boxes);
    if (hit.length) problems.push(`${pub}: redacted text still in metadata (${hit.length})`);
    copyFileSync(img, join(realOut, row.file_name));
    realRows.push(row);
  }
  if (idMapOut) writeFileSync(idMapOut, `${JSON.stringify(idMap, null, 1)}\n`);
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
