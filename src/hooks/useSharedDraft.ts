import type { Draft } from '../lib/share';

export function useSharedDraft(): { draft: Draft | null; clear: () => void } {
  return { draft: null, clear: () => undefined };
}
