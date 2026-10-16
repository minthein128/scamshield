import { existsSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { parseArgs } from '../lib.js';
import { CASES_DIR, loadCases } from './cases.js';

const flags = parseArgs(process.argv.slice(2));
if (flags.help) {
  console.log(`npm run bench:validate -- [--cases DIR] [--allow-drafts]
  Checks every case file against bench/cases/case.schema.json and the rules the schema cannot express.`);
  process.exit(0);
}
const dir = typeof flags.cases === 'string' ? resolve(flags.cases) : CASES_DIR;
if (!existsSync(dir) || !statSync(dir).isDirectory()) {
  console.error(`bench:validate: ${dir} is not a directory`);
  process.exit(2);
}
const { cases, problems, drafts } = loadCases(dir, { allowDrafts: Boolean(flags['allow-drafts']) });
const rel = (p: string) => relative(process.cwd(), p);
for (const p of problems) {
  console.log(`FAIL ${rel(p.path)}`);
  for (const e of p.errors) console.log(`  - ${e}`);
}
for (const d of drafts) console.log(`DRAFT ${rel(d)} (check it, then delete the "draft: true" line)`);
const ids = cases.map((c) => c.id);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
for (const d of dup) console.log(`FAIL duplicate id ${d}`);
const risky = cases.filter((c) => c.expected !== 'safe').length;
console.log(
  `bench:validate: ${cases.length} valid (${risky} risky, ${cases.length - risky} safe, ${cases.reduce((a, c) => a + c.translations.length, 0)} translations), ${problems.length} invalid, ${drafts.length} drafts`,
);
process.exit(problems.length || dup.length ? 1 : 0);
