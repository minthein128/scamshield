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

export async function pullContacts(uid: string): Promise<TrustedContact[]> {
  const snap = await getDocs(collection(db(), 'users', uid, 'contacts'));
  return snap.docs.flatMap(s => docToContact(s.id, s.data()) ?? []);
}

export async function pullProfile(uid: string): Promise<{ profile: Profile; language: LanguageCode } | null> {
  const snap = await getDoc(doc(db(), 'users', uid));
  return snap.exists() ? docToProfile(snap.data()) : null;
}

/** The newest history docs, and how many of them still have the old full-report shape. */
export async function pullHistory(uid: string): Promise<{ history: HistoryEntry[]; legacy: number }> {
  const snap = await getDocs(query(collection(db(), 'users', uid, 'history'), orderBy('createdAt', 'desc'), limit(PULL_LIMIT)));
  return {
    history: snap.docs.flatMap(s => docToHistory(s.id, s.data()) ?? []),
    legacy: snap.docs.filter(s => isLegacyDoc(s.data())).length,
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
