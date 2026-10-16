import { HOTLINES } from '../data/hotlines.generated.js';
import { bundledToItem } from './changes.js';
import { createFirestoreConfigStore } from './store.js';

const force = process.argv.includes('--force');
const store = createFirestoreConfigStore({ projectId: process.env.FIREBASE_PROJECT_ID || 'saferoute-aibc' });
const at = new Date().toISOString();
const out = await store.seed(
  'hotlines',
  HOTLINES.map((h) => bundledToItem(h, at)),
  'seed',
  force,
);
console.log(`config/hotlines ${out.result} (version ${out.version}, ${HOTLINES.length} bundled items)`);
