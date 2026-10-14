import { readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import type { CheckResponse } from '../src/types.js';
import { CASES } from './cases.js';

const IMAGE_EXT: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const readLabels = (path: string) =>
  readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [file = '', , expected = '', , language = ''] = line.split(',');
      return { file, expected, language };
    });

const args = process.argv.slice(2);
const opt = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
};
const api = (opt('api', `http://localhost:${process.env.PORT ?? 8080}`) as string).replace(/\/$/, '');
const sets = (opt('set', 'text') as string).split(',');
const runs = Number(opt('runs', '1'));
const delayMs = Number(opt('delay', '1000'));
const imageDir = resolve(opt('images', '../bench/public/synthetic') as string);
const jsonOut = opt('json');
const stream = args.includes('--stream');

interface Item {
  id: string;
  expectRisky: boolean;
  body: Record<string, unknown>;
}

const items: Item[] = [];
if (sets.includes('text')) {
  for (const c of CASES)
    items.push({
      id: c.id,
      expectRisky: c.expect === 'risky',
      body: { kind: c.kind, language: c.lang, text: c.text, shareSignals: false },
    });
}
if (sets.includes('images')) {
  for (const l of readLabels(join(imageDir, 'labels.csv'))) {
    const mime = IMAGE_EXT[extname(l.file).toLowerCase()];
    if (!mime || !['safe', 'careful', 'danger'].includes(l.expected)) continue;
    const language = ['en', 'id', 'tl', 'my'].includes(l.language) ? l.language : 'en';
    items.push({
      id: l.file,
      expectRisky: l.expected !== 'safe',
      body: {
        kind: 'screen',
        language,
        imageBase64: readFileSync(join(imageDir, l.file)).toString('base64'),
        imageMimeType: mime,
        shareSignals: false,
      },
    });
  }
}

const pct = (xs: number[], p: number) => {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  return s.length ? (s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)] as number) : Number.NaN;
};

type Sample = Record<string, number>;
const samples: Sample[] = [];
let correct = 0;
let total = 0;
const wrong: string[] = [];

interface Timed extends CheckResponse {
  timings?: {
    totalMs: number;
    spans: Record<string, { ms: number; startMs: number; endMs: number }>;
    calls: Record<string, { ms: number; inputTokens?: number; outputTokens?: number; thoughtTokens?: number }>;
    meta: Record<string, number>;
  };
}

async function viaStream(body: unknown, t0: number): Promise<{ res: Timed; firstVerdictMs?: number }> {
  const r = await fetch(`${api}/v1/check?stream=1&debug=1`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(body),
  });
  if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let firstVerdictMs: number | undefined;
  let final: Timed | undefined;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i = buf.indexOf('\n\n');
    while (i >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      i = buf.indexOf('\n\n');
      const ev = /^event: (.*)$/m.exec(block)?.[1];
      const data = /^data: (.*)$/m.exec(block)?.[1];
      if (ev === 'verdict' && firstVerdictMs === undefined) firstVerdictMs = performance.now() - t0;
      if (ev === 'final' && data) final = JSON.parse(data) as Timed;
      if (ev === 'error') throw new Error(data);
    }
  }
  if (!final) throw new Error('no final event');
  return { res: final, firstVerdictMs };
}

for (let run = 0; run < runs; run++) {
  for (const it of items) {
    const t0 = performance.now();
    try {
      let res: Timed;
      let firstVerdictMs: number | undefined;
      if (stream) ({ res, firstVerdictMs } = await viaStream(it.body, t0));
      else {
        const r = await fetch(`${api}/v1/check?debug=1`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(it.body),
        });
        res = (await r.json()) as Timed;
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      }
      const wall = performance.now() - t0;
      const tm = res.timings;
      total++;
      const ok = (res.verdict !== 'safe') === it.expectRisky;
      if (ok) correct++;
      else wrong.push(`${it.id}=${res.verdict}`);
      const s: Sample = {
        wall,
        server: tm?.totalMs ?? Number.NaN,
        overhead: wall - (tm?.totalMs ?? Number.NaN),
        imageKB: ((tm?.meta.imageBytes ?? 0) as number) / 1024,
      };
      if (firstVerdictMs !== undefined) s.firstVerdict = firstVerdictMs;
      for (const [k, v] of Object.entries(tm?.spans ?? {})) s[k] = v.ms;
      if (tm?.meta.scoreExplainMs !== undefined) s.scoreExplain = tm.meta.scoreExplainMs;
      for (const [k, v] of Object.entries(tm?.calls ?? {})) {
        s[`${k}.call`] = v.ms;
        s[`${k}.in`] = v.inputTokens ?? Number.NaN;
        s[`${k}.out`] = v.outputTokens ?? Number.NaN;
        s[`${k}.think`] = v.thoughtTokens ?? Number.NaN;
      }
      samples.push(s);
    } catch (e) {
      total++;
      wrong.push(`${it.id}=ERR(${(e as Error).message})`);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
}

const keys = [...new Set(samples.flatMap((s) => Object.keys(s)))];
const rows = keys.map((k) => {
  const xs = samples.map((s) => s[k] as number).filter((x) => x !== undefined);
  const present = xs.filter((x) => Number.isFinite(x));
  return {
    stage: k,
    n: present.length,
    p50: pct(present, 50),
    p95: pct(present, 95),
    mean: present.reduce((a, b) => a + b, 0) / (present.length || 1),
  };
});
const order = [
  'wall',
  'firstVerdict',
  'overhead',
  'server',
  'body',
  'validate',
  'extract',
  'ground',
  'links',
  'intel',
  'record',
  'scoreExplain',
];
rows.sort((a, b) => ((order.indexOf(a.stage) + 99) % 99) - ((order.indexOf(b.stage) + 99) % 99) || a.stage.localeCompare(b.stage));
console.log(
  `api=${api} set=${sets.join(',')} runs=${runs} stream=${stream} requests=${total} accuracy=${correct}/${total}${wrong.length ? ` wrong: ${wrong.join(', ')}` : ''}`,
);
console.log(`${'stage'.padEnd(16)}${'n'.padStart(4)}${'p50'.padStart(9)}${'p95'.padStart(9)}${'mean'.padStart(9)}`);
for (const r of rows)
  console.log(
    `${r.stage.padEnd(16)}${String(r.n).padStart(4)}${r.p50.toFixed(1).padStart(9)}${r.p95.toFixed(1).padStart(9)}${r.mean.toFixed(1).padStart(9)}`,
  );
if (jsonOut)
  await import('node:fs').then((fs) =>
    fs.writeFileSync(jsonOut, JSON.stringify({ api, sets, stream, total, correct, wrong, rows, samples }, null, 1)),
  );
