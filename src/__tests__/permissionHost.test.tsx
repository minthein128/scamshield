import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { PermissionHost } from '../components/PermissionHost';
import { explainPermission, showPermissionHelp } from '../lib/permissions';

describe('PermissionHost', () => {
  it('shows the reason and resolves true on Continue', async () => {
    const screen = render(<PermissionHost />);
    let answer: boolean | null = null;
    act(() => {
      explainPermission('mic').then(v => (answer = v));
    });
    expect(screen.getByText('Allow the microphone')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('permission-continue'));
    });
    expect(answer).toBe(true);
    expect(screen.queryByTestId('permission-dialog')).toBeNull();
  });

  it('resolves false on Not now', async () => {
    const screen = render(<PermissionHost />);
    let answer: boolean | null = null;
    act(() => {
      explainPermission('overlay').then(v => (answer = v));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('permission-not-now'));
    });
    expect(answer).toBe(false);
  });

  it('offers Open Settings after a refusal', async () => {
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const screen = render(<PermissionHost />);
    act(() => showPermissionHelp('mic'));
    expect(screen.getByTestId('permission-close')).toBeTruthy();
    fireEvent.press(screen.getByTestId('permission-open-settings'));
    expect(open).toHaveBeenCalled();
  });
});
