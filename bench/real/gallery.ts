import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from '../lib.js';
import type { BenchResultV2 } from '../v2/bench.js';
import { type CaseFile, YAML } from '../v2/cases.js';

const flags = parseArgs(process.argv.slice(2));
const str = (v: string | true | undefined) => (typeof v === 'string' ? v : undefined);
if (flags.help || !str(flags.cases) || !str(flags.out)) {
  console.log(`npm run bench:gallery -- --cases DIR --out DIR/index.html [--orig RESULTS --redacted RESULTS]
  Builds one offline HTML page: original next to redacted image, draft labels, A/B outputs, CSV export.
  --cases DIR      private case files
  --out FILE       index.html to write (keep it outside git; image links are relative to it)
  --orig DIR[,DIR]  out dir(s) of the bench run on original images (holds results-v2/)
  --redacted DIR   out dir of the bench run on redacted images
  --redacted-images DIR  redacted images (default: sibling "redacted" folder of the case dir's images)`);
  process.exit(flags.help ? 0 : 2);
}

const casesDir = resolve(str(flags.cases) as string);
const outFile = resolve(str(flags.out) as string);
const outDir = dirname(outFile);
const redImages = resolve(str(flags['redacted-images']) ?? join(casesDir, '..', 'redacted'));

type Cell = {
  verdict: string;
  score: number | null;
  runs: { verdict: string; score: number | null; critical: string[]; invented: string[] }[];
  critical: string[];
  missed: string[];
  output?: unknown;
} | null;

function loadResults(roots?: string): Record<string, Record<string, Cell>> {
  const byPrompt: Record<string, Record<string, Cell>> = {};
  for (const root of (roots ?? '').split(',').filter(Boolean)) {
    const dir = join(resolve(root), 'results-v2');
    if (!existsSync(dir)) continue;
    const latest = new Map<string, BenchResultV2>();
    for (const f of readdirSync(dir)
      .filter((x) => x.endsWith('.json') && !x.startsWith('ab-'))
      .sort()) {
      const r = JSON.parse(readFileSync(join(dir, f), 'utf8')) as BenchResultV2;
      latest.set(r.prompt.name, r);
    }
    for (const [name, r] of latest) {
      byPrompt[name] = {
        ...(byPrompt[name] ?? {}),
        ...Object.fromEntries(
          r.cases.map((c) => [
            c.id,
            {
              verdict: c.verdict,
              score: c.score,
              runs: c.runs ?? [],
              critical: c.critical,
              missed: c.facts.missed,
              output: c.output,
            } satisfies Cell,
          ]),
        ),
      };
    }
  }
  return byPrompt;
}

const orig = loadResults(str(flags.orig));
const red = loadResults(str(flags.redacted));

const cases = readdirSync(casesDir)
  .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
  .sort()
  .map((f) => {
    const c = YAML.parse(readFileSync(join(casesDir, f), 'utf8')) as CaseFile;
    const img = resolve(casesDir, c.file);
    return {
      id: c.id,
      app: c.app,
      language: c.language,
      content_language: c.content_language ?? '',
      home: c.home ?? '',
      destination: c.destination ?? '',
      scam_type: c.scam_type ?? '',
      expected_verdict: c.expected_verdict,
      families: c.families ?? [],
      source_text: c.source_text,
      must_mention: (c.must_mention ?? []).map((m) => (typeof m === 'string' ? m : `${m.id}: ${(m.variants ?? []).join(' | ')}`)),
      must_advise: (c.must_advise ?? []).map((a) => (typeof a === 'string' ? a : a.id)),
      accuse: c.must_not?.accuse ?? [],
      label_status: c.label_status ?? 'draft',
      labelled_by: c.labelled_by ?? '',
      redaction: c.redaction ?? '',
      boxes: c.redaction_boxes?.length ?? 0,
      notes: c.notes ?? '',
      original: relative(outDir, img),
      redacted: relative(outDir, join(redImages, `${basename(f, '.yaml')}.png`)),
      results: Object.fromEntries(
        [...new Set([...Object.keys(orig), ...Object.keys(red)])].map((p) => [
          p,
          { original: orig[p]?.[c.id] ?? null, redacted: red[p]?.[c.id] ?? null },
        ]),
      ),
    };
  });

const data = JSON.stringify({ generated: new Date().toISOString(), cases }).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SafeRoute real set review</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--ink:#16181d;--mute:#5d6470;--line:#dfe3e8;--danger:#b3261e;--careful:#a86400;--safe:#1b7a3e}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,sans-serif}
header{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid var(--line);padding:10px 16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
header h1{font-size:16px;margin:0 8px 0 0}button,select,input,textarea{font:inherit}button{padding:5px 10px;border:1px solid var(--line);background:#fff;border-radius:6px;cursor:pointer}
button.primary{background:#16181d;color:#fff;border-color:#16181d}main{padding:16px;display:grid;gap:16px;max-width:1500px;margin:auto}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}.card h2{margin:0 0 8px;font-size:15px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.imgs{display:grid;grid-template-columns:1fr 1fr;gap:10px}.imgs figure{margin:0}.imgs img{max-width:100%;max-height:640px;border:1px solid var(--line);border-radius:6px;display:block;margin:auto}
figcaption{font-size:12px;color:var(--mute);margin-bottom:4px}.grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:14px;margin-top:12px}
label{display:block;font-size:12px;color:var(--mute);margin-top:8px}input,select,textarea{width:100%;padding:5px 7px;border:1px solid var(--line);border-radius:6px;background:#fff}
textarea{min-height:90px;font-family:ui-monospace,monospace;font-size:12.5px}.pill{padding:1px 8px;border-radius:99px;font-size:12px;border:1px solid currentColor}
.danger{color:var(--danger)}.careful{color:var(--careful)}.safe{color:var(--safe)}table{border-collapse:collapse;width:100%;font-size:12.5px}td,th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
.warn{background:#fff4e5;border:1px solid #f0c27a;border-radius:6px;padding:6px 8px;font-size:12.5px}.out{background:#f3f4f6;border-radius:6px;padding:6px 8px;font-size:12.5px;margin-top:6px;white-space:pre-wrap}
details summary{cursor:pointer;color:var(--mute)}.hidden{display:none}@media(max-width:900px){.grid,.imgs{grid-template-columns:1fr}}
</style></head><body>
<header><h1>SafeRoute real set review</h1>
<input id="q" placeholder="filter by id, app or verdict" style="width:220px">
<select id="fv"><option value="">all verdicts</option><option>danger</option><option>careful</option><option>safe</option></select>
<select id="fs"><option value="">all status</option><option value="todo">not yet reviewed</option><option value="done">reviewed</option></select>
<span id="count"></span><span style="flex:1"></span>
<button id="export" class="primary">Export CSV</button><button id="reset">Clear my edits</button></header>
<main id="main"></main>
<script id="data" type="application/json">${data}</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
const KEY = 'saferoute-review-v1';
const store = JSON.parse(localStorage.getItem(KEY) || '{}');
const save = () => localStorage.setItem(KEY, JSON.stringify(store));
const el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [x, y] of Object.entries(a)) x === 'class' ? e.className = y : x.startsWith('on') ? e.addEventListener(x.slice(2), y) : e.setAttribute(x, y); for (const c of k.flat()) e.append(c); return e; };
const FIELDS = [['reviewed_verdict','select',['','safe','careful','danger']],['reviewed_scam_type','text'],['label_status','select',['draft','reviewed']],['redaction_ok','select',['','yes','no - see comment']],['comment','area']];
function cell(c) { if (!c) return '-'; const runs = c.runs.map(r => r.verdict + ' ' + r.score).join(', '); return c.verdict + ' ' + c.score + (c.critical.length ? ' [' + c.critical.join(',') + ']' : '') + (runs ? ' (runs: ' + runs + ')' : ''); }
function render() {
  const main = document.getElementById('main'); main.replaceChildren();
  const q = document.getElementById('q').value.toLowerCase(), fv = document.getElementById('fv').value, fs = document.getElementById('fs').value;
  let n = 0;
  for (const c of D.cases) {
    const s = store[c.id] || {};
    const done = (s.label_status || c.label_status) === 'reviewed';
    if (q && !(c.id + ' ' + c.app + ' ' + c.expected_verdict + ' ' + c.scam_type).toLowerCase().includes(q)) continue;
    if (fv && c.expected_verdict !== fv) continue;
    if (fs === 'todo' && done) continue; if (fs === 'done' && !done) continue;
    n++;
    const card = el('section', { class: 'card' });
    card.append(el('h2', {}, c.id, el('span', { class: 'pill ' + c.expected_verdict }, 'draft: ' + c.expected_verdict), el('span', { class: 'pill' }, c.scam_type), el('span', {}, c.app + ' / ' + c.language + (c.content_language ? ' (text ' + c.content_language + ')' : '')), el('span', { style: 'color:var(--mute);font-weight:400' }, 'redaction: ' + (c.redaction || 'none') + ', ' + c.boxes + ' boxes')));
    card.append(el('div', { class: 'imgs' }, el('figure', {}, el('figcaption', {}, 'Original (private)'), el('a', { href: c.original, target: '_blank' }, el('img', { src: c.original, loading: 'lazy' }))), el('figure', {}, el('figcaption', {}, 'Redacted (publishable)'), el('a', { href: c.redacted, target: '_blank' }, el('img', { src: c.redacted, loading: 'lazy' })))));
    const left = el('div'), right = el('div');
    if (/NOT CLEARLY A SCAM|MISMATCH|Unsure|Low-confidence/.test(c.notes)) left.append(el('div', { class: 'warn' }, c.notes));
    else left.append(el('div', { style: 'color:var(--mute);font-size:12.5px' }, c.notes));
    left.append(el('label', {}, 'Draft transcription (' + c.labelled_by + ')'), el('textarea', { readonly: '' }, c.source_text));
    left.append(el('label', {}, 'Transcription fix (write the corrected full text, or leave empty)'), el('textarea', { oninput: e => { (store[c.id] ||= {}).source_text_fixed = e.target.value; save(); } }, s.source_text_fixed || ''));
    left.append(el('label', {}, 'Must mention'), el('div', { class: 'out' }, c.must_mention.join('\\n')), el('label', {}, 'Must advise'), el('div', { class: 'out' }, c.must_advise.join(', ')), el('label', {}, 'Must not accuse'), el('div', { class: 'out' }, c.accuse.join(', ')));
    for (const [f, type, opts] of FIELDS) {
      const init = s[f] ?? (f === 'label_status' ? c.label_status : '');
      const on = e => { (store[c.id] ||= {})[f] = e.target.value; save(); };
      right.append(el('label', {}, f.replace(/_/g, ' ')), type === 'select' ? el('select', { onchange: on }, opts.map(o => el('option', o === init ? { selected: '' } : {}, o))) : type === 'area' ? el('textarea', { oninput: on }, init) : el('input', { value: init, oninput: on }));
    }
    const rows = Object.entries(c.results).map(([p, r]) => el('tr', {}, el('td', {}, p), el('td', {}, cell(r.original)), el('td', {}, cell(r.redacted))));
    if (rows.length) right.append(el('label', {}, 'Bench runs (draft labels, provisional)'), el('table', {}, el('tr', {}, el('th', {}, 'prompt'), el('th', {}, 'original'), el('th', {}, 'redacted')), rows));
    for (const [p, r] of Object.entries(c.results)) { const o = r.original && r.original.output; if (o) right.append(el('details', {}, el('summary', {}, 'Output: ' + p + ' on original'), el('div', { class: 'out' }, o.title + '\\n' + o.summary + '\\n\\n' + o.spokenWarning + '\\n\\n' + (o.flags || []).map(f => '- ' + f.label + (f.evidence ? ' | ' + f.evidence : '')).join('\\n')))); }
    card.append(el('div', { class: 'grid' }, left, right)); main.append(card);
  }
  document.getElementById('count').textContent = n + ' of ' + D.cases.length + ' shown';
}
const csvCell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
document.getElementById('export').onclick = () => {
  const head = ['id','app','language','draft_verdict','reviewed_verdict','draft_scam_type','reviewed_scam_type','label_status','redaction_ok','comment','source_text_draft','source_text_fixed','must_mention_draft','draft_notes'];
  const rows = D.cases.map(c => { const s = store[c.id] || {}; return [c.id, c.app, c.language, c.expected_verdict, s.reviewed_verdict || '', c.scam_type, s.reviewed_scam_type || '', s.label_status || c.label_status, s.redaction_ok || '', s.comment || '', c.source_text, s.source_text_fixed || '', c.must_mention.join(' ; '), c.notes].map(csvCell).join(','); });
  const blob = new Blob(['\\ufeff' + head.join(',') + '\\n' + rows.join('\\n')], { type: 'text/csv;charset=utf-8' });
  const a = el('a', { href: URL.createObjectURL(blob), download: 'saferoute-real-review.csv' }); document.body.append(a); a.click(); a.remove();
};
document.getElementById('reset').onclick = () => { if (confirm('Delete all edits saved in this browser?')) { localStorage.removeItem(KEY); location.reload(); } };
for (const id of ['q', 'fv', 'fs']) document.getElementById(id).addEventListener('input', render);
render();
</script></body></html>`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, html);
console.log(`wrote ${outFile} (${cases.length} cases)`);
