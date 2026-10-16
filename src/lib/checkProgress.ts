import type { CheckStage, CheckUpdate } from '../api/types';

export type CheckPhase = 'read' | 'sources' | 'score';

/** Where the check really is. The ring fills to `floor` and may only creep toward `ceiling` until the next event. */
export interface CheckProgress {
  phase: CheckPhase;
  floor: number;
  ceiling: number;
  done: CheckStage[];
}

const READ_SHARE = 0.4;
const SOURCE_SHARE = 0.15;
const SOURCES: CheckStage[] = ['links', 'ground', 'intel'];

export const START: CheckProgress = { phase: 'read', floor: 0, ceiling: READ_SHARE, done: [] };

/** For checks that report no stages (plain JSON, Job Shield): one span that only completes on the result. */
export const UNSTAGED: CheckProgress = { phase: 'read', floor: 0, ceiling: 0.9, done: [] };

export const FINISHED: CheckProgress = { phase: 'score', floor: 1, ceiling: 1, done: [] };

export function advance(progress: CheckProgress, update: CheckUpdate): CheckProgress {
  if (update.type === 'final') return { ...FINISHED, done: progress.done };
  if (update.type !== 'stage' || update.status !== 'done' || progress.done.includes(update.stage)) return progress;
  const done = [...progress.done, update.stage];
  if (!done.includes('extract')) return { ...progress, done };
  const sources = done.filter(s => SOURCES.includes(s)).length;
  const floor = READ_SHARE + SOURCE_SHARE * sources;
  if (sources === SOURCES.length) return { phase: 'score', floor, ceiling: 0.97, done };
  return { phase: 'sources', floor, ceiling: floor + SOURCE_SHARE, done };
}

/** checking:steps key for the label under the doll. */
export function stageKey(progress: CheckProgress): 'read' | 'links' | 'score' {
  return progress.phase === 'sources' ? 'links' : progress.phase;
}
