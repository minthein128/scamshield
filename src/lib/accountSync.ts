import type { LanguageCode } from '../api/types';
import { mergeContacts, type TrustedContact } from './contacts';
import type { HistoryEntry } from './history';
import type { Profile } from './profile';
import { historyMissingRemotely, mergeHistory } from './sync';

export type SyncStep = 'contacts' | 'profile' | 'history';

export interface SyncFailure {
  step: SyncStep;
  stage: 'pull' | 'push' | 'local';
  error: unknown;
}

export interface AccountCloud {
  pullContacts(uid: string): Promise<TrustedContact[]>;
  pushContact(uid: string, contact: TrustedContact): Promise<void>;
  pullProfile(uid: string): Promise<{ profile: Profile; language: LanguageCode } | null>;
  pushProfile(uid: string, profile: Profile, language: LanguageCode): Promise<void>;
  pullHistory(uid: string): Promise<{ history: HistoryEntry[]; legacy: number }>;
  slimRemoteHistory(uid: string): Promise<number>;
  pushHistory(uid: string, entries: HistoryEntry[]): Promise<void>;
}

export interface LocalSnapshot {
  profile: Profile;
  language: LanguageCode;
  history: HistoryEntry[];
  contacts: TrustedContact[];
}

export interface AccountLocal {
  /** The device's current state; read again after every await. */
  read(): LocalSnapshot;
  applyContacts(list: TrustedContact[]): Promise<void>;
  applyProfile(profile: Profile, language: LanguageCode | null): Promise<void>;
  applyHistory(list: HistoryEntry[]): Promise<void>;
  historySlimmed(uid: string): Promise<boolean>;
  markHistorySlimmed(uid: string): Promise<void>;
}

type Step = (fail: (stage: SyncFailure['stage'], error: unknown) => void) => Promise<void>;

/** Merges contacts, profile and history with the account; each part runs and fails on its own. */
export async function syncAccount(uid: string, cloud: AccountCloud, local: AccountLocal, cancelled: () => boolean = () => false): Promise<SyncFailure[]> {
  const contacts: Step = async fail => {
    let remote: TrustedContact[];
    try {
      remote = await cloud.pullContacts(uid);
    } catch (e) {
      return fail('pull', e);
    }
    if (cancelled()) return;
    const merged = mergeContacts(local.read().contacts, remote);
    await local.applyContacts(merged);
    const remoteStamp = new Map(remote.map(c => [c.id, c.updatedAt]));
    const pending = merged.filter(c => (remoteStamp.get(c.id) ?? '') < c.updatedAt);
    const pushed = await Promise.allSettled(pending.map(c => cloud.pushContact(uid, c)));
    const refused = pushed.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (refused) fail('push', refused.reason);
  };

  const profile: Step = async fail => {
    let remote: Awaited<ReturnType<AccountCloud['pullProfile']>>;
    try {
      remote = await cloud.pullProfile(uid);
    } catch (e) {
      return fail('pull', e);
    }
    if (cancelled()) return;
    const { profile: mine, language } = local.read();
    if (remote) {
      const { shareSignals, sharingAsked, keepHistory } = mine;
      await local.applyProfile({ ...remote.profile, shareSignals, sharingAsked, keepHistory }, remote.language);
    } else if (mine.onboarded) {
      await cloud.pushProfile(uid, mine, language).catch(e => fail('push', e));
    }
  };

  const history: Step = async fail => {
    const keep = local.read().profile.keepHistory;
    let remote: Awaited<ReturnType<AccountCloud['pullHistory']>> | null = null;
    if (keep) {
      try {
        remote = await cloud.pullHistory(uid);
      } catch (e) {
        return fail('pull', e);
      }
    }
    try {
      if ((remote?.legacy ?? 0) > 0 || !(await local.historySlimmed(uid))) {
        await cloud.slimRemoteHistory(uid);
        await local.markHistorySlimmed(uid);
      }
    } catch (e) {
      fail('push', e);
    }
    if (!remote || cancelled()) return;
    const merged = mergeHistory(local.read().history, remote.history);
    await local.applyHistory(merged);
    await cloud.pushHistory(uid, historyMissingRemotely(merged, remote.history)).catch(e => fail('push', e));
  };

  const failures: SyncFailure[] = [];
  const run = (step: SyncStep, body: Step) =>
    body((stage, error) => {
      failures.push({ step, stage, error });
    }).catch(error => {
      failures.push({ step, stage: 'local', error });
    });
  await Promise.all([run('contacts', contacts), run('profile', profile), run('history', history)]);
  return failures;
}
