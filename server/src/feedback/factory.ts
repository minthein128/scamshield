import type { Config } from '../config.js';
import type { Intel } from '../intel/service.js';
import { createFirestoreFeedbackStore } from './firestore.js';
import { createFeedback, type Feedback } from './service.js';
import { createMemoryFeedbackStore } from './store.js';

/** Real Firestore with a pepper, memory in mock mode, otherwise off. Mirrors the intel factory. */
export function createFeedbackFromConfig(cfg: Config, intel: Intel | undefined): Feedback | undefined {
  if (!intel) return undefined;
  if (cfg.mock) return createFeedback({ intel, store: createMemoryFeedbackStore(), pepper: cfg.intelPepper ?? 'mock-pepper' });
  if (!cfg.intelPepper) return undefined;
  const store = createFirestoreFeedbackStore({ projectId: cfg.intelProject });
  setInterval(() => void store.sweepExpired(new Date()).catch(() => undefined), 6 * 3_600_000).unref();
  return createFeedback({ intel, store, pepper: cfg.intelPepper });
}
