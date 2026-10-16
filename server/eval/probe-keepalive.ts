import { loadConfig } from '../src/config.js';
import { createClient } from '../src/extract.js';

const cfg = loadConfig({ ...process.env, MOCK: '0', LOG_SILENT: '1' });
const client = createClient(cfg);
const gapMs = Number(process.env.GAP_MS ?? 6000);
const n = Number(process.env.N ?? 8);
const ms: number[] = [];
for (let i = 0; i < n; i++) {
  const t = performance.now();
  await client.models.generateContent({
    model: cfg.model,
    contents: 'Reply with the single word ok.',
    config: { maxOutputTokens: 8, temperature: 0, thinkingConfig: { thinkingLevel: 'LOW' as never } },
  });
  ms.push(performance.now() - t);
  await new Promise((r) => setTimeout(r, gapMs));
}
const s = [...ms].sort((a, b) => a - b);
console.log(
  `gap=${gapMs} n=${n} first=${ms[0]?.toFixed(0)} p50=${s[Math.floor(n / 2)]?.toFixed(0)} min=${s[0]?.toFixed(0)} all=${ms.map((x) => x.toFixed(0)).join(',')}`,
);
