import { copyFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { SYSTEM_PROMPT } from '../../server/src/prompt.js';
import { parseArgs } from '../lib.js';
import { BASELINE, COMMON_HELP, optionsFromFlags, printSummary, runBench, writeResult } from './bench.js';
import { writeReportV2 } from './report.js';

const flags = parseArgs(process.argv.slice(2));
if (flags.help) {
  console.log(`npm run bench:v2 -- [options]
  Runs the Protection Score benchmark in process (no server) and writes bench/results-v2/ and bench/RESULTS-v2.md.
${COMMON_HELP}
  --prompt-variant FILE  swap the extraction system prompt (.txt/.md = whole prompt, .yaml/.json = patch)
  --dump-prompt FILE     write the production system prompt to FILE and stop
  --save-baseline        also save this run as bench/baseline-v2.json for bench:gate
  --no-write             print the summary only`);
  process.exit(0);
}
if (typeof flags['dump-prompt'] === 'string') {
  writeFileSync(flags['dump-prompt'], SYSTEM_PROMPT);
  console.log(`wrote the production prompt to ${flags['dump-prompt']}`);
  process.exit(0);
}

try {
  const result = await runBench(optionsFromFlags(flags));
  printSummary(result);
  if (!flags['no-write']) {
    const path = writeResult(result);
    writeReportV2();
    console.log(`wrote ${relative(process.cwd(), path)} and bench/RESULTS-v2.md`);
    if (flags['save-baseline']) {
      copyFileSync(path, BASELINE);
      console.log(`saved ${relative(process.cwd(), BASELINE)}`);
    }
  }
} catch (err) {
  console.error(`bench v2: ${(err as Error).message}`);
  process.exit(2);
}
