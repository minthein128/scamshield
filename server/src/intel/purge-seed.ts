import { createFirestoreStore } from './firestore.js';

const store = createFirestoreStore({ projectId: process.env.INTEL_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'saferoute-aibc' });
const r = await store.purgeSeed();
console.log(`purged ${r.signals} seed signals, removed ${r.aggregates} seed-only aggregates`);
process.exit(0);
