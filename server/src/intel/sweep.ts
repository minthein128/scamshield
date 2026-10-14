import { createFirestoreStore } from './firestore.js';

const store = createFirestoreStore({ projectId: process.env.INTEL_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'saferoute-aibc' });
console.log(`removed ${await store.sweepExpired(new Date())} expired intel documents`);
process.exit(0);
