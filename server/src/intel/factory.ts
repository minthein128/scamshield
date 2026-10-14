import type { Config } from '../config.js';
import { log } from '../log.js';
import { createFirestoreStore } from './firestore.js';
import { runSeed } from './seed-data.js';
import { createIntel, type Intel } from './service.js';
import { createMemoryStore } from './store.js';

/** Real Firestore when a pepper is set; an in-memory demo network in mock mode; otherwise off. */
export async function createIntelFromConfig(cfg: Config): Promise<Intel | undefined> {
  if (cfg.mock) {
    const intel = createIntel({ store: createMemoryStore(), pepper: cfg.intelPepper ?? 'mock-pepper' });
    const r = await runSeed(intel);
    log('INFO', 'intel_mock_seeded', { recorded: r.recorded });
    return intel;
  }
  if (!cfg.intelPepper) {
    log('WARNING', 'intel_disabled', { reason: 'INTEL_PEPPER is not set' });
    return undefined;
  }
  return createIntel({ store: createFirestoreStore({ projectId: cfg.intelProject }), pepper: cfg.intelPepper });
}
