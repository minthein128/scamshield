import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CheckResponse, LanguageCode } from '../api/types';
import { useShieldSync } from '../hooks/useShieldSync';
import { HistoryEntry, addHistory, loadHistory, loadLanguage, saveLanguage } from '../lib/history';

interface AppStateValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  history: HistoryEntry[];
  saveCheck: (result: CheckResponse, language: LanguageCode, source?: string) => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    loadHistory().then(setHistory);
    loadLanguage().then(setLanguageState);
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    saveLanguage(code).catch(() => undefined);
  }, []);

  const saveCheck = useCallback(async (result: CheckResponse, lang: LanguageCode, source?: string) => {
    const next = await addHistory({ id: result.id, createdAt: result.createdAt, language: lang, source, result });
    setHistory(next);
  }, []);

  useShieldSync(saveCheck, language);

  const value = useMemo(() => ({ language, setLanguage, history, saveCheck }), [language, setLanguage, history, saveCheck]);
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
