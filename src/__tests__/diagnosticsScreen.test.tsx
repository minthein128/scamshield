import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { DiagnosticsScreen } from '../screens/DiagnosticsScreen';
import { diag, readLog, resetDiagMemory } from '../lib/diagLog';
import * as notify from '../lib/notify';

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));
jest.mock('../config/runtime', () => ({ connectionReport: jest.fn().mockResolvedValue('chosen api.example.com') }));
jest.mock('../lib/notify', () => ({
  notify: jest.fn(),
  shareText: jest.fn().mockResolvedValue(undefined),
  confirmAction: jest.fn().mockResolvedValue(true),
}));

const nav = { goBack: jest.fn() } as never;
const mount = () => render(<DiagnosticsScreen navigation={nav} route={{ key: 'k', name: 'Diagnostics' } as never} />);

beforeEach(async () => {
  await AsyncStorage.clear();
  resetDiagMemory();
  jest.clearAllMocks();
  diag.info('app', 'start');
  diag.error('auth', 'failed', { method: 'google', code: '10' });
});

describe('DiagnosticsScreen', () => {
  it('shows the privacy line and entries, newest first, errors marked', async () => {
    mount();
    expect(screen.getByText(/stays on your phone/)).toBeTruthy();
    await screen.findByTestId('diagnostics-list');
    expect(screen.getAllByTestId(/diagnostics-row-/).map(r => r.props.testID)).toEqual(['diagnostics-row-error', 'diagnostics-row-info']);
    expect(screen.getByText('method=google code=10')).toBeTruthy();
  });

  it('filters to errors only', async () => {
    mount();
    await screen.findByTestId('diagnostics-list');
    fireEvent.press(screen.getByTestId('diagnostics-filter-errors'));
    expect(screen.queryByTestId('diagnostics-row-info')).toBeNull();
    expect(screen.getByTestId('diagnostics-row-error')).toBeTruthy();
  });

  it('copies and shares one report', async () => {
    mount();
    await screen.findByTestId('diagnostics-list');
    fireEvent.press(screen.getByTestId('diagnostics-copy'));
    await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith(expect.stringContaining('chosen api.example.com')));
    expect((Clipboard.setStringAsync as jest.Mock).mock.calls[0][0]).toContain('auth.failed');
    fireEvent.press(screen.getByTestId('diagnostics-share'));
    await waitFor(() => expect(notify.shareText).toHaveBeenCalledWith(expect.stringContaining('Kakwe diagnostics report'), 'Problem report copied'));
  });

  it('clears the log after confirmation and shows the empty state', async () => {
    mount();
    await screen.findByTestId('diagnostics-list');
    fireEvent.press(screen.getByTestId('diagnostics-clear'));
    await screen.findByTestId('diagnostics-empty');
    expect(notify.confirmAction).toHaveBeenCalled();
    expect(await readLog()).toEqual([]);
  });
});
