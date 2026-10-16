import { useEffect } from 'react';
import { Platform } from 'react-native';
import { addShieldResultListener, takeUnsyncedResults } from 'shield-module';
import type { LanguageCode } from '../api/types';
import type { CheckResponse } from '../api/types';
import { sourceLabel, toCheckResponse } from '../lib/shield';

export function useShieldSync(save: (result: CheckResponse, language: LanguageCode, source?: string) => Promise<void>, language: LanguageCode): void {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const saveResult = (r: Parameters<typeof toCheckResponse>[0]) => save(toCheckResponse(r), language, sourceLabel(r.kind)).catch(() => undefined);
    takeUnsyncedResults().then(list => list.forEach(saveResult));
    const sub = addShieldResultListener(saveResult);
    return () => sub.remove();
  }, [save, language]);
}
