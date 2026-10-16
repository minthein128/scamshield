import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildCandidates, type Candidate, mergeCandidates } from './candidates.js';
import { createFirestoreFeedbackStore } from './firestore.js';

const OUT = fileURLToPath(new URL('../../eval/candidates.json', import.meta.url));

const store = createFirestoreFeedbackStore({
  projectId: process.env.INTEL_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'saferoute-aibc',
});
const fresh = buildCandidates(await store.listFeedback(2000));
const existing: Candidate[] = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')) as Candidate[]) : [];
const merged = mergeCandidates(existing, fresh);
writeFileSync(OUT, `${JSON.stringify(merged, null, 2)}\n`);
console.log(`wrote ${merged.length} candidate cases (${fresh.length} from feedback) to eval/candidates.json. The file is gitignored.`);
process.exit(0);
