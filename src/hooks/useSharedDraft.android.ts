import { useEffect, useMemo } from 'react';
import { useShareIntent } from 'expo-share-intent';
import { Draft, draftFromShare } from '../lib/share';

export function useSharedDraft(): { draft: Draft | null; clear: () => void } {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const draft = useMemo(() => (hasShareIntent ? draftFromShare(shareIntent) : null), [hasShareIntent, shareIntent]);
  useEffect(() => {
    if (hasShareIntent && !draft) resetShareIntent();
  }, [hasShareIntent, draft, resetShareIntent]);
  return { draft, clear: () => resetShareIntent() };
}
