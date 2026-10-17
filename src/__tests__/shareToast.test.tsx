import React from 'react';
import { Alert, Share } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { shareText } from '../lib/notify';
import { ToastHost } from '../components/ToastHost';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Share, 'share').mockRejectedValue(new Error('no share'));
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('share fallback', () => {
  it('copies and shows a toast instead of a blocking alert, with the warning text by default', async () => {
    render(<ToastHost />);
    await act(async () => { await shareText('Careful: scam'); });
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Careful: scam');
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(screen.getByText(/The warning is copied/)).toBeTruthy();
    act(() => { jest.advanceTimersByTime(4000); });
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('uses the caller text for a report', async () => {
    render(<ToastHost />);
    await act(async () => { await shareText('log', 'Problem report copied'); });
    expect(screen.getByText('Problem report copied')).toBeTruthy();
    expect(screen.queryByText(/warning/)).toBeNull();
  });
});
