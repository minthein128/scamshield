import { createFirestoreFeedbackStore } from './firestore.js';
import { formatTallies } from './tally.js';

const store = createFirestoreFeedbackStore({
  projectId: process.env.INTEL_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'saferoute-aibc',
});
console.log(formatTallies(await store.listTallies()));
process.exit(0);
