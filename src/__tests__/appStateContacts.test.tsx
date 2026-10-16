import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppStateProvider, useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import * as cloud from '../services/cloud';
import type { AuthStatus } from '../services/accounts';

jest.mock('../state/AuthState', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/cloud', () => ({
  pullAll: jest.fn().mockResolvedValue({ history: [], contacts: [] }),
  pushContact: jest.fn().mockResolvedValue(undefined),
  pushHistory: jest.fn().mockResolvedValue(undefined),
  pushProfile: jest.fn().mockResolvedValue(undefined),
  deleteContactRemote: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../hooks/useShieldSync', () => ({
  useShieldSync: jest.fn(),
}));

const mockUseAuth = useAuth as unknown as jest.Mock;
const mockPushContact = cloud.pushContact as unknown as jest.Mock;

describe('AppState addContact authentication requirement', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  const Consumer: React.FC<{
    onState: (state: ReturnType<typeof useAppState>) => void;
  }> = ({ onState }) => {
    const appState = useAppState();
    onState(appState);
    return <Text testID="ready-label">{appState.ready ? 'ready' : 'loading'}</Text>;
  };

  it('rejects adding contacts and does not persist when user is anonymous / not signed in', async () => {
    mockUseAuth.mockReturnValue({
      status: { kind: 'anonymous', uid: 'anon_1' } as AuthStatus,
    });

    let current!: ReturnType<typeof useAppState>;
    render(
      <AppStateProvider>
        <Consumer onState={s => { current = s; }} />
      </AppStateProvider>,
    );

    await screen.findByText('ready');

    let errorResult: string | null = null;
    act(() => {
      errorResult = current.addContact({ name: 'Brother', phone: '+95912345678' });
    });

    expect(errorResult).toBe('You must be signed in to save family contacts.');
    expect(current.contacts).toHaveLength(0);
    expect(mockPushContact).not.toHaveBeenCalled();
    const stored = await AsyncStorage.getItem('saferoute.contacts.v1');
    expect(stored).toBeNull();
  });

  it('allows adding contacts and persists when user is signed in with an account', async () => {
    mockUseAuth.mockReturnValue({
      status: { kind: 'account', uid: 'u_123', email: 'user@example.com' } as AuthStatus,
    });

    let current!: ReturnType<typeof useAppState>;
    render(
      <AppStateProvider>
        <Consumer onState={s => { current = s; }} />
      </AppStateProvider>,
    );

    await screen.findByText('ready');

    let result: string | null = 'init';
    act(() => {
      result = current.addContact({ name: 'Sister', phone: '+95987654321' });
    });

    expect(result).toBeNull();
    expect(current.contacts).toHaveLength(1);
    expect(current.contacts[0].name).toBe('Sister');
    expect(current.contacts[0].phone).toBe('+95987654321');
    expect(mockPushContact).toHaveBeenCalledWith('u_123', expect.objectContaining({
      name: 'Sister',
      phone: '+95987654321',
    }));
  });
});
