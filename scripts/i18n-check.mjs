#!/usr/bin/env node
// Lists missing, stale and unreviewed translation keys. Exit 1 when keys are missing.
// Usage: node scripts/i18n-check.mjs [--keys] [--strict]   (--strict also fails on unreviewed files)
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flatten, requiredKeys } from './translate.mjs';

const LOCALES = join(dirname(fileURLToPath(import.meta.url)), '../src/i18n/locales');
const TARGETS = ['my', 'id', 'tl', 'th'];
const showKeys = process.argv.includes('--keys');
const strict = process.argv.includes('--strict');

const read = file => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {});
const files = readdirSync(join(LOCALES, 'en')).filter(f => f.endsWith('.json'));

let missingTotal = 0;
let unreviewedTotal = 0;
const rows = [];

for (const lang of TARGETS) {
  let required = 0;
  let missing = 0;
  let unreviewed = 0;
  const lines = [];
  for (const file of files) {
    const need = requiredKeys(flatten(read(join(LOCALES, 'en', file))), lang);
    const json = read(join(LOCALES, lang, file));
    const have = flatten(json);
    const meta = json._meta ?? {};
    const gone = Object.keys(need).filter(k => !have[k]?.trim());
    const pending = meta.reviewed ? Object.keys(need).filter(k => (meta.unreviewed ?? []).includes(k) && !gone.includes(k)) : Object.keys(need).filter(k => !gone.includes(k));
    const stale = Object.keys(have).filter(k => !(k in need));
    required += Object.keys(need).length;
    missing += gone.length;
    unreviewed += pending.length;
    if (gone.length) lines.push(`  missing    ${lang}/${file}: ${showKeys ? gone.join(', ') : gone.length}`);
    if (stale.length) lines.push(`  stale      ${lang}/${file}: ${showKeys ? stale.join(', ') : stale.length}`);
    if (pending.length) lines.push(`  unreviewed ${lang}/${file}: ${showKeys ? pending.join(', ') : `${pending.length}${meta.reviewed ? '' : ' (file not reviewed)'}`}`);
  }
  missingTotal += missing;
  unreviewedTotal += unreviewed;
  rows.push({ lang, required, translated: required - missing, reviewed: required - missing - unreviewed, lines });
}

for (const r of rows) r.lines.forEach(l => console.log(l));
console.log('\nlang  keys  translated  reviewed');
for (const r of rows) console.log(`${r.lang.padEnd(5)} ${String(r.required).padStart(4)}  ${String(r.translated).padStart(10)}  ${String(r.reviewed).padStart(8)}`);
if (missingTotal) console.log(`\n${missingTotal} keys missing. Run: pnpm i18n:translate`);
if (unreviewedTotal) console.log(`${unreviewedTotal} keys are machine translated and not reviewed yet.`);
process.exit(missingTotal || (strict && unreviewedTotal) ? 1 : 0);
