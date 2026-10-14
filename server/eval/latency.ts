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
const apis = (opt('api', `http://localhost:${process.env.PORT ?? 8080}`) as string).split(',').map((a) => a.replace(/\/$/, ''));
const sets = (opt('set', 'text') as string).split(',');
const runs = Number(opt('runs', '1'));
const delayMs = Number(opt('delay', '1000'));
const imageDir = resolve(opt('images', '../bench/public/synthetic') as string);
const jsonOut = opt('json');
const stream = args.includes('--stream');
const only = opt('only')?.split(',');

interface Item {
  id: string;
  expectRisky: boolean;
  body: Record<string, unknown>;
}

const items: Item[] = [];
if (sets.includes('text')) {
  for (const c of CASES.filter((x) => !only || only.includes(x.id)))
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
const samples = new Map<string, Sample[]>(apis.map((a) => [a, []]));
const tally = new Map<string, { correct: number; total: number; wrong: string[] }>(
  apis.map((a) => [a, { correct: 0, total: 0, wrong: [] }]),
);

interface Timed extends CheckResponse {
  timings?: {
    totalMs: number;
    spans: Record<string, { ms: number; startMs: number; endMs: number }>;
    calls: Record<string, { ms: number; inputTokens?: number; outputTokens?: number; thoughtTokens?: number }>;
    meta: Record<string, number>;
  };
}

async function viaStream(api: string, body: unknown, t0: number): Promise<{ res: Timed; firstVerdictMs?: number }> {
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
  for (const [n, it] of items.entries()) {
    for (let k = 0; k < apis.length; k++) {
      const api = apis[(k + n) % apis.length] as string;
      const stat = tally.get(api) as { correct: number; total: number; wrong: string[] };
      const t0 = performance.now();
      try {
        let res: Timed;
        let firstVerdictMs: number | undefined;
        if (stream) ({ res, firstVerdictMs } = await viaStream(api, it.body, t0));
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
        stat.total++;
        const ok = (res.verdict !== 'safe') === it.expectRisky;
        if (ok) stat.correct++;
        else stat.wrong.push(`${it.id}=${res.verdict}`);
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
        samples.get(api)?.push(s);
      } catch (e) {
        stat.total++;
        stat.wrong.push(`${it.id}=ERR(${(e as Error).message})`);
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

const out: Record<string, unknown> = {};
for (const api of apis) {
  const list = samples.get(api) as Sample[];
  const st = tally.get(api) as { correct: number; total: number; wrong: string[] };
  const keys = [...new Set(list.flatMap((x) => Object.keys(x)))];
  const rows = keys.map((key) => {
    const present = list.map((x) => x[key] as number).filter((x) => Number.isFinite(x));
    return {
      stage: key,
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
    'reask',
    'ground',
    'linksEarly',
    'links',
    'intel',
    'record',
    'scoreExplain',
  ];
  const rank = (x: string) => (order.includes(x) ? order.indexOf(x) : 99);
  rows.sort((a, b) => rank(a.stage) - rank(b.stage) || a.stage.localeCompare(b.stage));
  console.log(
    `\napi=${api} set=${sets.join(',')} runs=${runs} stream=${stream} requests=${st.total} accuracy=${st.correct}/${st.total}${st.wrong.length ? ` wrong: ${st.wrong.join(', ')}` : ''}`,
  );
  console.log(`${'stage'.padEnd(16)}${'n'.padStart(4)}${'p50'.padStart(9)}${'p95'.padStart(9)}${'mean'.padStart(9)}`);
  for (const r of rows)
    console.log(
      `${r.stage.padEnd(16)}${String(r.n).padStart(4)}${r.p50.toFixed(1).padStart(9)}${r.p95.toFixed(1).padStart(9)}${r.mean.toFixed(1).padStart(9)}`,
    );
  out[api] = { total: st.total, correct: st.correct, wrong: st.wrong, rows, samples: list };
}
if (jsonOut) await import('node:fs').then((fs) => fs.writeFileSync(jsonOut, JSON.stringify({ sets, stream, ...out }, null, 1)));
