import { loadConfig } from '../src/config.js';
import { createClient, createGeminiExtractor } from '../src/extract.js';
import { redactDeterministic } from '../src/intel/redact.js';
import { finalizeTemplate } from '../src/intel/template.js';
import { leaks } from './leak.js';
import { PII_SET, type PiiType } from './pii-set.js';

const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(1)}%`);
const pad = (v: string | number, n: number) => String(v).padEnd(n);

const types: PiiType[] = ['email', 'phone', 'national_id', 'passport', 'card', 'account', 'iban', 'address', 'handle', 'dob', 'name'];
const total: Record<string, number> = {};
const missed: Record<string, number> = {};
let tp = 0;
let fp = 0;
let keepTotal = 0;
let keepLost = 0;
const misses: string[] = [];
const split = { core: { n: 0, m: 0 }, hard: { n: 0, m: 0 } };

for (const c of PII_SET) {
  const r = redactDeterministic(c.text);
  const ranges = c.pii.flatMap((p) => {
    const out: Array<[number, number]> = [];
    let i = c.text.indexOf(p.value);
    while (i !== -1) {
      out.push([i, i + p.value.length]);
      i = c.text.indexOf(p.value, i + 1);
    }
    return out;
  });
  for (const s of r.spans) {
    if (s.placeholder === '[AMOUNT]' || s.placeholder === '[LINK]') continue;
    if (ranges.some(([a, b]) => s.start < b && s.end > a)) tp++;
    else {
      fp++;
      misses.push(`FP  ${c.id}: ${c.text.slice(s.start, s.end)} -> ${s.placeholder}`);
    }
  }
  for (const p of c.pii) {
    total[p.type] = (total[p.type] ?? 0) + 1;
    const sp = split[c.hard ? 'hard' : 'core'];
    if (p.type !== 'name') sp.n++;
    if (leaks(p.value, r.text)) {
      if (p.type !== 'name') sp.m++;
      missed[p.type] = (missed[p.type] ?? 0) + 1;
      misses.push(`MISS ${c.id}: ${p.type} ${p.value}`);
    }
  }
  for (const k of c.keep ?? []) {
    keepTotal++;
    if (!r.text.includes(k)) keepLost++;
  }
}

console.log('Deterministic pass (regex and validators only), labelled set of', PII_SET.length, 'messages\n');
console.log(`${pad('type', 14)}${pad('items', 7)}${pad('removed', 9)}recall`);
let all = 0;
let allMissed = 0;
for (const t of types) {
  const n = total[t] ?? 0;
  if (!n) continue;
  const m = missed[t] ?? 0;
  all += t === 'name' ? 0 : n;
  allMissed += t === 'name' ? 0 : m;
  console.log(`${pad(t, 14)}${pad(n, 7)}${pad(n - m, 9)}${pct(n - m, n)}`);
}
console.log(`\nstructured PII (all types except name): recall ${pct(all - allMissed, all)}`);
console.log(
  `  core set ${pct(split.core.n - split.core.m, split.core.n)} (${split.core.n} items), hard set ${pct(split.hard.n - split.hard.m, split.hard.n)} (${split.hard.n} items)`,
);
console.log(`span precision (excluding amounts and links): ${pct(tp, tp + fp)}  (tp=${tp} fp=${fp})`);
console.log(`non-PII words preserved: ${pct(keepTotal - keepLost, keepTotal)}  (${keepTotal - keepLost}/${keepTotal})`);
for (const m of misses) console.log(' ', m);

const cfg = loadConfig({ ...process.env, MOCK: '0', LOG_SILENT: '1' });
if (!cfg.geminiApiKey && !(cfg.useVertex && cfg.project)) {
  console.log('\nGemini pass skipped: no GEMINI_API_KEY.');
  process.exit(0);
}
const extractor = createGeminiExtractor(cfg, createClient(cfg));
let items = 0;
let leaked = 0;
let nameItems = 0;
let nameLeaked = 0;
let templates = 0;
const leakLog: string[] = [];
for (const c of PII_SET.filter((x) => x.pii.length > 0)) {
  let template: string | undefined;
  try {
    const ex = await extractor.extract({ kind: 'message', language: c.lang === 'th' ? 'en' : c.lang, text: c.text });
    template = finalizeTemplate(ex.template, ex.templateSafe);
  } catch (e) {
    leakLog.push(`ERR  ${c.id}: ${(e as Error).message.slice(0, 80)}`);
  }
  if (template) templates++;
  for (const p of c.pii) {
    items++;
    const l = template ? leaks(p.value, template) : false;
    if (l) {
      leaked++;
      leakLog.push(`LEAK ${c.id}: ${p.type} ${p.value}  in: ${template}`);
    }
    if (p.type === 'name') {
      nameItems++;
      if (l) nameLeaked++;
    }
  }
  await new Promise((r) => setTimeout(r, 800));
}
const labelled = PII_SET.filter((x) => x.pii.length > 0).length;
console.log(`\nFull pipeline (Gemini template + second regex pass), model ${cfg.model}`);
console.log(
  `messages with PII: ${labelled}, template kept: ${templates} (${pct(templates, labelled)}), dropped fail-closed: ${labelled - templates}`,
);
console.log(
  `PII items: ${items}, readable in stored template: ${leaked}  -> recall ${pct(items - leaked, items)} (dropped templates counted as safe)`,
);
console.log(`names only: ${nameItems - nameLeaked}/${nameItems} removed (${pct(nameItems - nameLeaked, nameItems)})`);
for (const m of leakLog) console.log(' ', m);
