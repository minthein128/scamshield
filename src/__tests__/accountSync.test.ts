import { buildMockResponse } from '../api/mock';
import { syncAccount, type AccountCloud, type AccountLocal, type LocalSnapshot } from '../lib/accountSync';
import type { TrustedContact } from '../lib/contacts';
import type { HistoryEntry } from '../lib/history';
import { DEFAULT_PROFILE, type Profile } from '../lib/profile';

const denied = () => Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
const contact = (id: string, name: string, phone: string, updatedAt = '2026-10-17T06:00:00.000Z'): TrustedContact => ({ id, name, phone, updatedAt });
const check = (id: string): HistoryEntry => {
  const result = { ...buildMockResponse({ kind: 'job', language: 'en', text: id }), id, createdAt: '2026-10-17T05:00:00.000Z' };
  return { id, createdAt: result.createdAt, language: 'en', result };
};
const onboarded: Profile = { ...DEFAULT_PROFILE, onboarded: true, keepHistory: true };

function fakeCloud(over: Partial<AccountCloud> = {}): jest.Mocked<AccountCloud> {
  return {
    pullContacts: jest.fn().mockResolvedValue([]),
    pushContact: jest.fn().mockResolvedValue(undefined),
    pullProfile: jest.fn().mockResolvedValue(null),
    pushProfile: jest.fn().mockResolvedValue(undefined),
    pullHistory: jest.fn().mockResolvedValue({ history: [], legacy: 0 }),
    slimRemoteHistory: jest.fn().mockResolvedValue(0),
    pushHistory: jest.fn().mockResolvedValue(undefined),
    ...over,
  } as jest.Mocked<AccountCloud>;
}

function fakeDevice(start: Partial<LocalSnapshot> = {}) {
  const state: LocalSnapshot = { profile: onboarded, language: 'en', history: [], contacts: [], ...start };
  const local: jest.Mocked<AccountLocal> = {
    read: jest.fn(() => state),
    applyContacts: jest.fn(async list => void (state.contacts = list)),
    applyProfile: jest.fn(async (p, lang) => {
      state.profile = p;
      if (lang) state.language = lang;
    }),
    applyHistory: jest.fn(async list => void (state.history = list)),
    historySlimmed: jest.fn().mockResolvedValue(true),
    markHistorySlimmed: jest.fn().mockResolvedValue(undefined),
  };
  return { state, local };
}

const saved = [contact('c_1', 'Sister', '+66810000001'), contact('c_2', 'Brother', '+959000000002')];

describe('syncAccount', () => {
  it('shows account contacts and profile when the history write is refused', async () => {
    const cloud = fakeCloud({
      pullContacts: jest.fn().mockResolvedValue(saved),
      pullProfile: jest.fn().mockResolvedValue({ profile: { ...onboarded, homeCountry: 'MM', destinationCountry: 'TH' }, language: 'my' }),
      pushHistory: jest.fn().mockRejectedValue(denied()),
    });
    const { state, local } = fakeDevice({ history: [check('chk_local')] });
    const failures = await syncAccount('u1', cloud, local);
    expect(state.contacts.map(c => c.name)).toEqual(['Brother', 'Sister']);
    expect(state.profile).toMatchObject({ homeCountry: 'MM', destinationCountry: 'TH' });
    expect(state.language).toBe('my');
    expect(state.history.map(h => h.id)).toEqual(['chk_local']);
    expect(failures).toEqual([{ step: 'history', stage: 'push', error: expect.objectContaining({ code: 'permission-denied' }) }]);
  });

  it('fills a fresh device from the account', async () => {
    const cloud = fakeCloud({ pullContacts: jest.fn().mockResolvedValue(saved), pullHistory: jest.fn().mockResolvedValue({ history: [check('chk_r')], legacy: 0 }) });
    const { state, local } = fakeDevice({ profile: DEFAULT_PROFILE });
    expect(await syncAccount('u1', cloud, local)).toEqual([]);
    expect(state.contacts).toHaveLength(2);
    expect(state.history.map(h => h.id)).toEqual(['chk_r']);
    expect(cloud.pushContact).not.toHaveBeenCalled();
    expect(cloud.pushProfile).not.toHaveBeenCalled();
  });

  it('pushes only contacts the account lacks or holds an older copy of', async () => {
    const newer = { ...saved[0], name: 'Sister M', updatedAt: '2026-10-17T07:00:00.000Z' };
    const added = contact('c_3', 'Aunt', '+959000000003');
    const cloud = fakeCloud({ pullContacts: jest.fn().mockResolvedValue(saved) });
    const { state, local } = fakeDevice({ contacts: [newer, added, saved[1]] });
    await syncAccount('u1', cloud, local);
    expect(cloud.pushContact.mock.calls.map(([, c]) => c.id).sort()).toEqual(['c_1', 'c_3']);
    expect(state.contacts.map(c => c.name)).toEqual(['Aunt', 'Brother', 'Sister M']);
  });

  it('keeps contacts on screen and reports it when a contact push is refused', async () => {
    const cloud = fakeCloud({ pushContact: jest.fn().mockRejectedValue(denied()) });
    const { state, local } = fakeDevice({ contacts: [saved[0]] });
    const failures = await syncAccount('u1', cloud, local);
    expect(state.contacts).toEqual([saved[0]]);
    expect(failures).toEqual([expect.objectContaining({ step: 'contacts', stage: 'push' })]);
  });

  it('still syncs profile and history when the contacts read fails', async () => {
    const cloud = fakeCloud({ pullContacts: jest.fn().mockRejectedValue(denied()), pullHistory: jest.fn().mockResolvedValue({ history: [check('chk_r')], legacy: 0 }) });
    const { state, local } = fakeDevice();
    const failures = await syncAccount('u1', cloud, local);
    expect(failures).toEqual([expect.objectContaining({ step: 'contacts', stage: 'pull' })]);
    expect(state.history.map(h => h.id)).toEqual(['chk_r']);
    expect(cloud.pushProfile).toHaveBeenCalledWith('u1', onboarded, 'en');
  });

  it('merges history even when rewriting old history docs is refused', async () => {
    const cloud = fakeCloud({ slimRemoteHistory: jest.fn().mockRejectedValue(denied()), pullHistory: jest.fn().mockResolvedValue({ history: [check('chk_r')], legacy: 1 }) });
    const { state, local } = fakeDevice();
    const failures = await syncAccount('u1', cloud, local);
    expect(state.history.map(h => h.id)).toEqual(['chk_r']);
    expect(local.markHistorySlimmed).not.toHaveBeenCalled();
    expect(failures).toEqual([expect.objectContaining({ step: 'history', stage: 'push' })]);
  });

  it('skips history but still slims old docs when keep history is off', async () => {
    const cloud = fakeCloud();
    const { local } = fakeDevice({ profile: { ...onboarded, keepHistory: false } });
    local.historySlimmed.mockResolvedValue(false);
    await syncAccount('u1', cloud, local);
    expect(cloud.pullHistory).not.toHaveBeenCalled();
    expect(cloud.slimRemoteHistory).toHaveBeenCalledWith('u1');
    expect(local.applyHistory).not.toHaveBeenCalled();
  });

  it('keeps the local privacy choices when it adopts the account profile', async () => {
    const cloud = fakeCloud({ pullProfile: jest.fn().mockResolvedValue({ profile: { ...onboarded, keepHistory: true, shareSignals: false }, language: 'en' }) });
    const { state, local } = fakeDevice({ profile: { ...onboarded, keepHistory: false, shareSignals: true, sharingAsked: true } });
    await syncAccount('u1', cloud, local);
    expect(state.profile).toMatchObject({ keepHistory: false, shareSignals: true, sharingAsked: true });
  });

  it('applies nothing after the account changed', async () => {
    const cloud = fakeCloud({ pullContacts: jest.fn().mockResolvedValue(saved), pullProfile: jest.fn().mockResolvedValue({ profile: onboarded, language: 'th' }) });
    const { local } = fakeDevice();
    await syncAccount('u1', cloud, local, () => true);
    expect(local.applyContacts).not.toHaveBeenCalled();
    expect(local.applyProfile).not.toHaveBeenCalled();
    expect(local.applyHistory).not.toHaveBeenCalled();
  });
});
