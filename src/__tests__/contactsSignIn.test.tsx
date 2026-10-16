import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppStateProvider, useAppState } from '../state/AppState';
import { WarnFamilySheet } from '../components/WarnFamilySheet';
import { ContactsScreen } from '../screens/ContactsScreen';
import { CONTACTS_KEY } from '../lib/contacts';
import * as cloud from '../services/cloud';
import * as notify from '../lib/notify';
import type { AuthStatus } from '../services/accounts';

let mockStatus: AuthStatus = { kind: 'anonymous', uid: 'anon' };
const mockNavigate = jest.fn();

jest.mock('../state/AuthState', () => ({ useAuth: () => ({ status: mockStatus }) }));
jest.mock('../hooks/useShieldSync', () => ({ useShieldSync: jest.fn() }));
jest.mock('../services/cloud', () => ({
  pullAll: jest.fn().mockResolvedValue({ history: [], contacts: [], legacyHistory: 0 }),
  pushContact: jest.fn().mockResolvedValue(undefined),
  pushHistory: jest.fn().mockResolvedValue(undefined),
  pushProfile: jest.fn().mockResolvedValue(undefined),
  slimRemoteHistory: jest.fn().mockResolvedValue(undefined),
  deleteContactRemote: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@react-navigation/native', () => {
  const React = jest.requireActual('react');
  return { NavigationContext: React.createContext({ navigate: (...a: unknown[]) => mockNavigate(...a) }) };
});
jest.mock('../lib/notify', () => ({ ...jest.requireActual('../lib/notify'), shareText: jest.fn().mockResolvedValue(undefined) }));

const mockPush = cloud.pushContact as jest.Mock;
const legacy = { id: 'c_old', name: 'Aunt', phone: '+959111111', updatedAt: '2026-10-01T00:00:00.000Z' };
const person = { name: 'Brother', phone: '+959123456' };

let api!: ReturnType<typeof useAppState>;
const Probe: React.FC = () => {
  api = useAppState();
  return <Text>{api.ready ? 'ready' : 'loading'}</Text>;
};

const mount = async (ui?: React.ReactNode) => {
  render(<AppStateProvider><Probe />{ui}</AppStateProvider>);
  await screen.findByText('ready');
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockStatus = { kind: 'anonymous', uid: 'anon' };
});

describe('addContact gate', () => {
  it.each([
    ['anonymous', { kind: 'anonymous', uid: 'anon' } as AuthStatus],
    ['loading', { kind: 'loading' } as AuthStatus],
    ['unavailable', { kind: 'unavailable' } as AuthStatus],
  ])('refuses and stores nothing when %s', async (_n, status) => {
    mockStatus = status;
    await mount();
    let result: string | null = null;
    act(() => { result = api.addContact(person); });
    expect(result).toEqual(expect.any(String));
    expect(api.contacts).toEqual([]);
    expect(await AsyncStorage.getItem(CONTACTS_KEY)).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('saves and syncs for a provider account', async () => {
    mockStatus = { kind: 'account', uid: 'u1', email: 'a@b.co' };
    await mount();
    act(() => { expect(api.addContact(person)).toBeNull(); });
    expect(api.contacts).toHaveLength(1);
    expect(mockPush).toHaveBeenCalledWith('u1', expect.objectContaining({ name: 'Brother' }));
  });
});

describe('contacts saved before the gate', () => {
  beforeEach(async () => {
    await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify([legacy]));
  });

  it('stay visible, local and removable while signed out', async () => {
    await mount(<ContactsScreen />);
    expect(await screen.findByText('Aunt')).toBeTruthy();
    expect(screen.getByText('Sign in to keep these contacts with your account.')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    act(() => api.removeContact('c_old'));
    expect(api.contacts).toEqual([]);
  });

  it('sync to the account after sign-in', async () => {
    mockStatus = { kind: 'account', uid: 'u1', email: 'a@b.co' };
    await mount();
    expect(api.contacts).toEqual([legacy]);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('u1', legacy));
  });
});

describe('ContactsScreen prompt', () => {
  it('explains, opens sign-in, and dismisses with Not now', async () => {
    await mount(<ContactsScreen />);
    fireEvent.press(await screen.findByTestId('contact-add-gated'));
    expect(screen.getByText('Sign in to save trusted contacts, so they are kept safely with your account.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('contacts-gate-sign-in'));
    expect(mockNavigate).toHaveBeenCalledWith('Account', { mode: 'signIn' });
    fireEvent.press(screen.getByTestId('contacts-gate-dismiss'));
    expect(screen.queryByTestId('contacts-gate')).toBeNull();
  });

  it('shows the form for a signed-in user', async () => {
    mockStatus = { kind: 'account', uid: 'u1', email: 'a@b.co' };
    await mount(<ContactsScreen />);
    expect(await screen.findByTestId('contact-add')).toBeTruthy();
    expect(screen.queryByTestId('contact-add-gated')).toBeNull();
  });

  it('says saving is unavailable and offers no sign-in when auth is unavailable', async () => {
    mockStatus = { kind: 'unavailable' };
    await mount(<ContactsScreen />);
    fireEvent.press(await screen.findByTestId('contact-add-gated'));
    expect(screen.getByText('Saving contacts needs an account, which is not available in this version.')).toBeTruthy();
    expect(screen.queryByTestId('contacts-gate-sign-in')).toBeNull();
  });
});

describe('Warn my family without an account', () => {
  const sheet = (onAdd = jest.fn(), onClose = jest.fn()) => (
    <WarnFamilySheet visible message="Careful: scam" onClose={onClose} onAddContact={onAdd} />
  );

  it('puts sharing first and offers sign-in as the secondary action', async () => {
    const onAdd = jest.fn();
    await mount(sheet(onAdd));
    expect(await screen.findByText('Share this warning')).toBeTruthy();
    expect(screen.queryByTestId('warn-add')).toBeNull();
    expect(screen.getByText('Sign in to save trusted contacts, so they are kept safely with your account.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('warn-sign-in'));
    expect(mockNavigate).toHaveBeenCalledWith('Account', { mode: 'signIn' });
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shares the warning with no account', async () => {
    const onClose = jest.fn();
    await mount(sheet(jest.fn(), onClose));
    fireEvent.press(await screen.findByTestId('warn-share'));
    expect(notify.shareText).toHaveBeenCalledWith('Careful: scam');
    expect(onClose).toHaveBeenCalled();
  });

  it('shares with no account when auth is unavailable', async () => {
    mockStatus = { kind: 'unavailable' };
    await mount(sheet());
    expect(await screen.findByText('Saving contacts needs an account, which is not available in this version.')).toBeTruthy();
    expect(screen.queryByTestId('warn-sign-in')).toBeNull();
    fireEvent.press(screen.getByTestId('warn-share'));
    expect(notify.shareText).toHaveBeenCalledWith('Careful: scam');
  });

  it('still lists legacy contacts for texting', async () => {
    await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify([legacy]));
    await mount(sheet());
    expect(await screen.findByTestId('warn-c_old')).toBeTruthy();
    expect(screen.getByTestId('warn-legacy')).toBeTruthy();
  });

  it('adds directly for a signed-in user', async () => {
    mockStatus = { kind: 'account', uid: 'u1', email: 'a@b.co' };
    const onAdd = jest.fn();
    await mount(sheet(onAdd));
    fireEvent.press(await screen.findByTestId('warn-add'));
    expect(onAdd).toHaveBeenCalled();
  });
});
