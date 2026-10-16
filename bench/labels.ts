import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { IMAGE_EXT, type LabelRow, parseArgs, readLabels, srcDir, toCsv } from './lib.js';

const flags = parseArgs(process.argv.slice(2));
const src = srcDir(flags.src);
if (!existsSync(src)) {
  console.error(`bench:labels: ${src} does not exist`);
  process.exit(2);
}
const path = join(src, 'labels.csv');
const rows: LabelRow[] = existsSync(path) ? readLabels(path) : [];
const known = new Set(rows.map((r) => r.file));
const images = readdirSync(src)
  .filter((f) => extname(f).toLowerCase() in IMAGE_EXT)
  .sort();
let added = 0;
for (const file of images) {
  if (known.has(file)) continue;
  const guess = file.match(/^([A-Za-z]+)[-_ .\d]/)?.[1]?.toLowerCase() ?? '';
  rows.push({ file, app: guess, expected: '', scam_type: '', language: '', notes: '', public: 'no' });
  added++;
}
writeFileSync(path, toCsv(rows));
const blank = rows.filter((r) => !r.expected).length;
console.log(
  `bench:labels: ${images.length} images, ${added} new rows added, ${blank} rows still need an expected value (safe, careful or danger)`,
);
console.log(`edit ${path}`);
