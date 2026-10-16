import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CheckResponse, LanguageCode } from '../api/types';
import { t, setUiLanguage } from '../i18n';
import { useUiLanguage } from '../i18n/useUiLanguage';
import { clearUiLanguage } from '../i18n/storage';
import { useShieldSync } from '../hooks/useShieldSync';
import {
  CONTACTS_KEY,
  loadContacts,
  makeContact,
  mergeContacts,
  removeContact as removeFromList,
  saveContacts,
  upsertContact,
  validateContact,
  type TrustedContact,
} from '../lib/contacts';
import { HistoryEntry, addHistory, clearHistory, historySlimmed, loadHistory, markHistorySlimmed, saveHistory } from '../lib/history';
import {
  DEFAULT_PROFILE,
  PROFILE_KEY,
  applyChoices,
  finishOnboarding as finishProfile,
  loadProfile,
  saveProfile,
  type Profile,
  type ProfileChoices,
} from '../lib/profile';
import { historyMissingRemotely, mergeHistory } from '../lib/sync';
import * as cloud from '../services/cloud';
import { useAuth } from './AuthState';

export type SyncState = 'off' | 'syncing' | 'done' | 'error';

interface AppStateValue {
  ready: boolean;
  profile: Profile;
  /** The one language setting. Also the UI language. */
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  updateProfile: (choices: ProfileChoices) => void;
  finishOnboarding: (choices?: ProfileChoices) => void;
  history: HistoryEntry[];
  saveCheck: (result: CheckResponse, language: LanguageCode, source?: string) => Promise<void>;
  /** Off deletes saved checks here and in the account, and stops saving and syncing them. */
  setKeepHistory: (keep: boolean) => Promise<void>;
  contacts: TrustedContact[];
  addContact: (input: { name: string; phone: string }) => string | null;
  removeContact: (id: string) => void;
  syncState: SyncState;
  clearSyncedCopies: () => Promise<void>;
  deleteLocalData: () => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAuth();
  const uid = status.kind === 'account' ? status.uid : null;
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const { uiLanguage: language } = useUiLanguage();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [syncState, setSyncState] = useState<SyncState>('off');
  const latest = useRef({ profile, history, contacts, uid, language });
  latest.current = { profile, history, contacts, uid, language };

  useEffect(() => {
    Promise.all([loadProfile(), loadHistory(), loadContacts()]).then(([p, h, c]) => {
      setProfile(p);
      setHistory(h);
      setContacts(c);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!uid || !ready) {
      setSyncState('off');
      return;
    }
    let cancelled = false;
    setSyncState('syncing');
    (async () => {
      try {
        const keepsHistory = latest.current.profile.keepHistory;
        const snap = await cloud.pullAll(uid, keepsHistory);
        if (cancelled) return;
        const { profile: localProfile, history: localHistory, contacts: localContacts } = latest.current;
        if (snap.profile) {
          const { shareSignals, sharingAsked, keepHistory } = localProfile;
          const adopted = { ...snap.profile, shareSignals, sharingAsked, keepHistory };
          setProfile(adopted);
          await saveProfile(adopted);
          if (snap.language) await setUiLanguage(snap.language);
        } else if (localProfile.onboarded) {
          await cloud.pushProfile(uid, localProfile, latest.current.language);
        }
        if (snap.legacyHistory > 0 || !(await historySlimmed(uid))) {
          await cloud.slimRemoteHistory(uid);
          await markHistorySlimmed(uid);
        }
        if (keepsHistory) {
          const mergedHistory = mergeHistory(localHistory, snap.history);
          setHistory(mergedHistory);
          await saveHistory(mergedHistory);
          await cloud.pushHistory(uid, historyMissingRemotely(mergedHistory, snap.history));
        }
        const mergedContacts = mergeContacts(localContacts, snap.contacts);
        setContacts(mergedContacts);
        await saveContacts(mergedContacts);
        const remoteStamp = new Map(snap.contacts.map(c => [c.id, c.updatedAt]));
        await Promise.all(mergedContacts.filter(c => (remoteStamp.get(c.id) ?? '') < c.updatedAt).map(c => cloud.pushContact(uid, c)));
        if (!cancelled) setSyncState('done');
      } catch {
        if (!cancelled) setSyncState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, ready]);

  const persistProfile = useCallback((next: Profile) => {
    setProfile(next);
    saveProfile(next).catch(() => undefined);
    const id = latest.current.uid;
    if (id && next.onboarded) cloud.pushProfile(id, next, latest.current.language).catch(() => setSyncState('error'));
  }, []);

  const updateProfile = useCallback((choices: ProfileChoices) => persistProfile(applyChoices(latest.current.profile, choices)), [persistProfile]);
  const setLanguage = useCallback((code: LanguageCode) => {
    latest.current.language = code;
    setUiLanguage(code).catch(() => undefined);
    const { uid: id, profile: current } = latest.current;
    if (id && current.onboarded) cloud.pushProfile(id, current, code).catch(() => setSyncState('error'));
  }, []);
  const finishOnboarding = useCallback((choices?: ProfileChoices) => persistProfile(finishProfile(latest.current.profile, choices)), [persistProfile]);

  const saveCheck = useCallback(async (result: CheckResponse, lang: LanguageCode, source?: string) => {
    if (!latest.current.profile.keepHistory) return;
    const entry: HistoryEntry = { id: result.id, createdAt: result.createdAt, language: lang, source, result };
    setHistory(await addHistory(entry));
    const id = latest.current.uid;
    if (id) cloud.pushHistory(id, [entry]).catch(() => setSyncState('error'));
  }, []);

  const setKeepHistory = useCallback(
    async (keep: boolean) => {
      persistProfile(applyChoices(latest.current.profile, { keepHistory: keep }));
      if (keep) return;
      setHistory([]);
      await clearHistory();
      const id = latest.current.uid;
      if (id) await cloud.deleteRemoteHistory(id).catch(() => setSyncState('error'));
    },
    [persistProfile],
  );

  const addContact = useCallback((input: { name: string; phone: string }) => {
    const problem = validateContact(input);
    if (problem) return problem;
    const contact = makeContact(input);
    const next = upsertContact(latest.current.contacts, contact);
    if (next === latest.current.contacts) return t('contacts:errors.duplicate');
    setContacts(next);
    saveContacts(next).catch(() => undefined);
    const id = latest.current.uid;
    if (id) cloud.pushContact(id, contact).catch(() => setSyncState('error'));
    return null;
  }, []);

  const removeContact = useCallback((contactId: string) => {
    const next = removeFromList(latest.current.contacts, contactId);
    setContacts(next);
    saveContacts(next).catch(() => undefined);
    const id = latest.current.uid;
    if (id) cloud.deleteContactRemote(id, contactId).catch(() => setSyncState('error'));
  }, []);

  const clearSyncedCopies = useCallback(async () => {
    await clearHistory();
    await AsyncStorage.removeItem(CONTACTS_KEY);
    setHistory([]);
    setContacts([]);
  }, []);

  const deleteLocalData = useCallback(async () => {
    await clearHistory();
    await AsyncStorage.multiRemove([CONTACTS_KEY, PROFILE_KEY]);
    await clearUiLanguage();
    setHistory([]);
    setContacts([]);
    setProfile(DEFAULT_PROFILE);
  }, []);

  useShieldSync(saveCheck, language);

  const value = useMemo(
    () => ({
      ready,
      profile,
      language,
      setLanguage,
      updateProfile,
      finishOnboarding,
      history,
      saveCheck,
      setKeepHistory,
      contacts,
      addContact,
      removeContact,
      syncState,
      clearSyncedCopies,
      deleteLocalData,
    }),
    [ready, profile, language, setLanguage, updateProfile, finishOnboarding, history, saveCheck, setKeepHistory, contacts, addContact, removeContact, syncState, clearSyncedCopies, deleteLocalData],
  );
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
