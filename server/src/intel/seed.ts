import { createFirestoreStore } from './firestore.js';
import { runSeed } from './seed-data.js';
import { createIntel } from './service.js';
import { createMemoryStore } from './store.js';

const pepper = process.env.INTEL_PEPPER;
if (!pepper) {
  console.error('intel:seed needs INTEL_PEPPER (the same value the server uses).');
  process.exit(2);
}
const dry = process.argv.includes('--dry');
const store = dry
  ? createMemoryStore()
  : createFirestoreStore({ projectId: process.env.INTEL_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'saferoute-aibc' });
const intel = createIntel({ store, pepper });
const r = await runSeed(intel, new Date(), (n) => {
  if (n % 50 === 0) console.log(`  ${n} checks pushed`);
});
console.log(`seed done${dry ? ' (dry run, memory store)' : ''}: recorded ${r.recorded}, duplicate ${r.duplicate}, skipped ${r.skipped}`);
const out = await intel.insights('GLOBAL', 30);
for (const risk of out.risks) console.log(`  ${risk.scamType.padEnd(24)} ${String(risk.count).padStart(3)}  ${risk.trend}`);
process.exit(0);
