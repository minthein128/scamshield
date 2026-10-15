#!/usr/bin/env node
// Merges native-reviewer answers back into src/i18n/locales/<lang>/<namespace>.json.
// Usage: node scripts/i18n-apply-review.mjs <review.json|review.csv> [--lang my,id] [--locales <dir>] [--write]
// Dry run by default. Nothing is written without --write.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

// Reviewer verdict words. Anything else (blank, "unsure", "skip") leaves the string pending.
const OK = new Set(['ok', 'okay', 'good', 'approve', 'approved', 'correct', 'right', 'yes']);
const FIX = new Set(['fix', 'fixed', 'corrected', 'edit', 'edited', 'change', 'changed', 'wrong']);

export function parseCsv(text) {
  const src = text.replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [head, ...body] = rows;
  return body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ''])));
}

/** Returns rows of { language, id, english, translation, verdict, correction, note }. */
export function readReview(file) {
  const raw = readFileSync(file, 'utf8');
  if (/\.csv$/i.test(file)) {
    return parseCsv(raw).map(r => ({
      language: r.language,
      id: r.id,
      english: r.english,
      translation: r.translation,
      verdict: r.reviewer_verdict,
      correction: r.reviewer_correction,
    }));
  }
  const json = JSON.parse(raw.replace(/^﻿/, ''));
  const out = [];
  for (const [language, block] of Object.entries(json.languages ?? {})) {
    for (const it of block.items ?? []) {
      out.push({ language, id: it.id, english: it.english, translation: it.translation, verdict: it.reviewer_verdict, correction: it.reviewer_correction });
    }
  }
  return out;
}

export function classify(verdict, correction) {
  const v = String(verdict ?? '').trim().toLowerCase();
  const c = String(correction ?? '').trim();
  if (!v && !c) return { kind: 'pending' };
  if (OK.has(v) && !c) return { kind: 'ok' };
  if (FIX.has(v) || c) {
    if (!c) return { kind: 'error', reason: `verdict "${v}" needs a reviewer_correction` };
    return { kind: 'fix', value: c };
  }
  if (OK.has(v)) return { kind: 'ok' };
  return { kind: 'pending' };
}

const placeholders = s =>
  [...String(s).matchAll(/\{\{\s*[\w.]+\s*\}\}/g)]
    .map(m => m[0].replace(/\s/g, ''))
    .sort()
    .join('|');

function getPath(obj, path) {
  return path.split('.').reduce((n, p) => (n && typeof n === 'object' ? n[p] : undefined), obj);
}
function setPath(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const node = parts.reduce((n, p) => n?.[p], obj);
  node[last] = value;
}
function leafPaths(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_meta') continue;
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') leafPaths(v, p, out);
    else out.push(p);
  }
  return out;
}

export function apply({ reviewFile, locales, langs, write }) {
  const rows = readReview(reviewFile).filter(r => !langs || langs.includes(r.language));
  const report = { langs: {}, errors: [], filesWritten: [] };
  const byFile = new Map();
  for (const r of rows) {
    if (!r.language || !r.id) continue;
    const dot = r.id.indexOf('.');
    const ns = r.id.slice(0, dot);
    const key = r.id.slice(dot + 1);
    const file = join(locales, r.language, `${ns}.json`);
    if (!byFile.has(file)) byFile.set(file, { language: r.language, ns, rows: [] });
    byFile.get(file).rows.push({ ...r, key });
  }

  for (const [file, { language, ns, rows: fileRows }] of byFile) {
    const lang = (report.langs[language] ??= { fixed: 0, ok: 0, pending: 0, errors: 0, reviewedNow: [], changes: [] });
    if (!existsSync(file)) {
      report.errors.push(`${language}/${ns}: locale file not found`);
      lang.errors += fileRows.length;
      continue;
    }
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const before = JSON.stringify(data);
    const allKeys = leafPaths(data);
    const verdicts = new Map();
    for (const r of fileRows) {
      const c = classify(r.verdict, r.correction);
      const current = getPath(data, r.key);
      if (typeof current !== 'string') {
        report.errors.push(`${language}/${r.id}: key not found in locale file`);
        lang.errors++;
        continue;
      }
      if (c.kind === 'error') {
        report.errors.push(`${language}/${r.id}: ${c.reason}`);
        lang.errors++;
        verdicts.set(r.key, 'pending');
        continue;
      }
      if (c.kind === 'fix') {
        if (placeholders(c.value) !== placeholders(current)) {
          report.errors.push(`${language}/${r.id}: correction changes the {{placeholders}}; skipped`);
          lang.errors++;
          verdicts.set(r.key, 'pending');
          continue;
        }
        if (c.value !== current) {
          setPath(data, r.key, c.value);
          lang.changes.push({ id: r.id, from: current, to: c.value });
        }
        lang.fixed++;
        verdicts.set(r.key, 'done');
      } else if (c.kind === 'ok') {
        lang.ok++;
        verdicts.set(r.key, 'done');
      } else {
        lang.pending++;
        verdicts.set(r.key, 'pending');
      }
    }

    // A namespace counts as reviewed only when every key in the file has an ok or corrected answer.
    const meta = data._meta ?? { reviewed: false };
    const done = k => verdicts.get(k) === 'done';
    const complete = allKeys.every(done);
    if (meta.reviewed && Array.isArray(meta.unreviewed)) {
      const left = meta.unreviewed.filter(k => !done(k));
      if (left.length !== meta.unreviewed.length) {
        if (left.length) meta.unreviewed = left;
        else delete meta.unreviewed;
      }
    }
    if (!meta.reviewed && complete) {
      meta.reviewed = true;
      lang.reviewedNow.push(ns);
    }
    data._meta = { reviewed: meta.reviewed, ...(meta.unreviewed ? { unreviewed: meta.unreviewed } : {}) };
    const ordered = { _meta: data._meta, ...Object.fromEntries(Object.entries(data).filter(([k]) => k !== '_meta')) };
    if (JSON.stringify(ordered) !== before && write) {
      writeFileSync(file, `${JSON.stringify(ordered, null, 2)}\n`);
      report.filesWritten.push(file);
    }
  }
  return report;
}

function main() {
  const argv = process.argv.slice(2);
  const flag = name => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const reviewFile = argv.find(a => !a.startsWith('--') && a !== flag('--lang') && a !== flag('--locales'));
  if (!reviewFile) {
    console.error('Usage: node scripts/i18n-apply-review.mjs <review.json|review.csv> [--lang my,id] [--locales <dir>] [--write]');
    process.exit(2);
  }
  const write = argv.includes('--write');
  const locales = resolve(flag('--locales') ?? join(ROOT, 'src/i18n/locales'));
  const langs = flag('--lang')?.split(',');
  const r = apply({ reviewFile: resolve(reviewFile), locales, langs, write });

  console.log(write ? 'Applying review (--write)' : 'Dry run. Nothing is written. Add --write to apply.');
  for (const [language, l] of Object.entries(r.langs)) {
    console.log(`\n${language}: ${l.fixed} corrected, ${l.ok} approved, ${l.pending} pending, ${l.errors} errors`);
    for (const c of l.changes) console.log(`  ~ ${c.id}\n    - ${c.from}\n    + ${c.to}`);
    if (l.reviewedNow.length) console.log(`  _meta.reviewed set to true: ${l.reviewedNow.join(', ')}`);
  }
  if (r.errors.length) {
    console.log('\nProblems:');
    for (const e of r.errors) console.log(`  ! ${e}`);
  }
  if (write) console.log(`\n${r.filesWritten.length} file(s) written.`);
  process.exit(r.errors.length ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
