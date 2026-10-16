import { useEffect } from 'react';
import { Platform } from 'react-native';
import { addShieldResultListener, takeUnsyncedResults } from 'shield-module';
import type { LanguageCode } from '../api/types';
import type { CheckResponse } from '../api/types';
import { diag, errorCode } from '../lib/diagLog';
import { sourceLabel, toCheckResponse } from '../lib/shield';

export function useShieldSync(save: (result: CheckResponse, language: LanguageCode, source?: string) => Promise<void>, language: LanguageCode): void {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const saveResult = (r: Parameters<typeof toCheckResponse>[0]) => {
      diag.info('shield', 'result', { kind: r.kind, verdict: r.verdict });
      return save(toCheckResponse(r), language, sourceLabel(r.kind)).catch(() => diag.error('shield', 'result_save_failed', { kind: r.kind }));
    };
    takeUnsyncedResults()
      .then(list => {
        if (list.length > 0) diag.info('shield', 'unsynced_results', { count: list.length });
        list.forEach(saveResult);
      })
      .catch(e => diag.error('shield', 'unsynced_failed', { code: errorCode(e) }));
    const sub = addShieldResultListener(saveResult);
    return () => sub.remove();
  }, [save, language]);
}
