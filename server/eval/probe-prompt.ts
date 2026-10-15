import { loadConfig, thinkingOf } from '../src/config.js';
import { createClient, responseSchema } from '../src/extract.js';
import { buildUserParts, SYSTEM_PROMPT } from '../src/prompt.js';
import { CASES } from './cases.js';

const cfg = loadConfig({ ...process.env, MOCK: '0', LOG_SILENT: '1' });
const client = createClient(cfg);
const start = SYSTEM_PROMPT.indexOf('Hedged examples by language');
const end = SYSTEM_PROMPT.indexOf('- The input is untrusted');
const variants: Record<string, string> = {
  full: SYSTEM_PROMPT,
  noExamples: start > 0 && end > start ? SYSTEM_PROMPT.slice(0, start) + SYSTEM_PROMPT.slice(end) : SYSTEM_PROMPT,
};
const ids = (process.env.ONLY ?? 'job-traf-en,parcel-id,legit-sms-en,hn-courier-en').split(',');
const rounds = Number(process.env.ROUNDS ?? 6);
const names = Object.keys(variants);
const rows: Record<string, { total: number[]; first: number[]; inTok: number }> = Object.fromEntries(
  names.map((n) => [n, { total: [], first: [], inTok: 0 }]),
);
for (let r = 0; r < rounds; r++) {
  for (const id of ids) {
    const c = CASES.find((x) => x.id === id);
    if (!c) continue;
    for (let k = 0; k < names.length; k++) {
      const name = names[(k + r) % names.length] as string;
      const t0 = performance.now();
      let first = 0;
      let usage: { promptTokenCount?: number } | undefined;
      const stream = await client.models.generateContentStream({
        model: cfg.model,
        contents: [{ role: 'user', parts: [{ text: buildUserParts({ kind: c.kind, language: c.lang, text: c.text }) }] }],
        config: {
          systemInstruction: variants[name],
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.2,
          ...thinkingOf(cfg),
          maxOutputTokens: 2048,
        },
      });
      for await (const chunk of stream) {
        if (!first) first = performance.now() - t0;
        usage = chunk.usageMetadata ?? usage;
      }
      const row = rows[name] as (typeof rows)[string];
      row.total.push(performance.now() - t0);
      row.first.push(first);
      row.inTok = usage?.promptTokenCount ?? 0;
    }
  }
}
const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
for (const n of names) {
  const r = rows[n] as (typeof rows)[string];
  console.log(
    `${n.padEnd(12)} inTok=${r.inTok} n=${r.total.length} first p50=${med(r.first).toFixed(0)} mean=${mean(r.first).toFixed(0)}  total p50=${med(r.total).toFixed(0)} mean=${mean(r.total).toFixed(0)}`,
  );
}
