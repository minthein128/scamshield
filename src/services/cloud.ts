import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  initializeFirestore,
  limit,
  orderBy,
  query,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { LanguageCode } from '../api/types';
import type { TrustedContact } from '../lib/contacts';
import type { HistoryEntry } from '../lib/history';
import type { Profile } from '../lib/profile';
import { contactToDoc, docToContact, docToHistory, docToProfile, historyToDoc, isLegacyDoc, legacyToSlim, profileToDoc } from '../lib/sync';
import { getFirebaseApp } from './firebaseApp';

const PULL_LIMIT = 50;
const BATCH_LIMIT = 400;

let cached: Firestore | null = null;

function db(): Firestore {
  if (cached) return cached;
  const app = getFirebaseApp();
  if (!app) throw new Error('Cloud sync is not configured');
  try {
    cached = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    cached = getFirestore(app);
  }
  return cached;
}

export interface CloudSnapshot {
  profile: Profile | null;
  language: LanguageCode | null;
  history: HistoryEntry[];
  /** Pulled history docs still in the old full-report shape. */
  legacyHistory: number;
  contacts: TrustedContact[];
}

export async function pullAll(uid: string, withHistory = true): Promise<CloudSnapshot> {
  const d = db();
  const [profileSnap, historySnap, contactSnap] = await Promise.all([
    getDoc(doc(d, 'users', uid)),
    withHistory ? getDocs(query(collection(d, 'users', uid, 'history'), orderBy('createdAt', 'desc'), limit(PULL_LIMIT))) : null,
    getDocs(collection(d, 'users', uid, 'contacts')),
  ]);
  const profileData = profileSnap.exists() ? profileSnap.data() : null;
  const remote = profileData ? docToProfile(profileData) : null;
  return {
    profile: remote?.profile ?? null,
    language: remote?.language ?? null,
    history: historySnap?.docs.flatMap(s => docToHistory(s.id, s.data()) ?? []) ?? [],
    legacyHistory: historySnap?.docs.filter(s => isLegacyDoc(s.data())).length ?? 0,
    contacts: contactSnap.docs.flatMap(s => docToContact(s.id, s.data()) ?? []),
  };
}

export async function pushProfile(uid: string, profile: Profile, language: LanguageCode): Promise<void> {
  await setDoc(doc(db(), 'users', uid), profileToDoc(profile, language));
}

export async function pushHistory(uid: string, entries: HistoryEntry[]): Promise<void> {
  const d = db();
  const batch = writeBatch(d);
  let count = 0;
  for (const entry of entries) {
    batch.set(doc(d, 'users', uid, 'history', entry.id), historyToDoc(entry));
    count += 1;
  }
  if (count > 0) await batch.commit();
}

/** Rewrites every old full-report history doc in the slim shape. Unreadable ones are deleted. Returns the count. */
export async function slimRemoteHistory(uid: string): Promise<number> {
  const d = db();
  const legacy = (await getDocs(collection(d, 'users', uid, 'history'))).docs.filter(s => isLegacyDoc(s.data()));
  for (let i = 0; i < legacy.length; i += BATCH_LIMIT) {
    const batch = writeBatch(d);
    for (const s of legacy.slice(i, i + BATCH_LIMIT)) {
      const slim = legacyToSlim(s.data());
      if (slim) batch.set(s.ref, slim);
      else batch.delete(s.ref);
    }
    await batch.commit();
  }
  return legacy.length;
}

export async function deleteRemoteHistory(uid: string): Promise<void> {
  const d = db();
  const snap = await getDocs(collection(d, 'users', uid, 'history'));
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(d);
    for (const s of snap.docs.slice(i, i + BATCH_LIMIT)) batch.delete(s.ref);
    await batch.commit();
  }
}

export async function pushContact(uid: string, contact: TrustedContact): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'contacts', contact.id), contactToDoc(contact));
}

export async function deleteContactRemote(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db(), 'users', uid, 'contacts', id));
}

export async function deleteAllRemote(uid: string): Promise<void> {
  const d = db();
  for (const name of ['history', 'contacts']) {
    const snap = await getDocs(collection(d, 'users', uid, name));
    await Promise.all(snap.docs.map(s => deleteDoc(s.ref)));
  }
  await deleteDoc(doc(d, 'users', uid)).catch(() => undefined);
}
