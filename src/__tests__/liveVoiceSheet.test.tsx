import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import i18n from '../i18n';
import { LiveVoiceSheet } from '../components/LiveVoiceSheet';
import type { LiveView } from '../hooks/useLiveVoice';
import type { CheckResponse } from '../api/types';

let mockView: Partial<LiveView> = {};
const mockStart = jest.fn();

jest.mock('../hooks/useLiveVoice', () => ({
  useLiveVoice: () => ({
    state: 'idle',
    caption: '',
    userCaption: '',
    remainingSec: 120,
    muted: false,
    error: null,
    fallback: false,
    warning: false,
    endedBy: null,
    ...mockView,
    start: mockStart,
    reset: jest.fn(),
    end: jest.fn(),
    changeMode: jest.fn(),
    setMuted: jest.fn(),
    outputLevel: () => 0,
    inputLevel: () => 0,
  }),
}));

const realOS = Platform.OS;
const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

const sheet = () =>
  render(<LiveVoiceSheet visible result={{ id: 'c1', verdict: 'danger' } as CheckResponse} language="en" onClose={jest.fn()} onAction={jest.fn()} onGetHelp={jest.fn()} />);

beforeEach(async () => {
  await i18n.changeLanguage('en');
  mockStart.mockClear();
});
afterEach(() => setOS(realOS));

describe('live voice sheet microphone states', () => {
  it('Not now ends in declined: only Try again, no Open settings', () => {
    setOS('android');
    mockView = { state: 'declined' };
    sheet();
    expect(screen.getByTestId('live-status').props.children).toBe(i18n.t('live:declined'));
    expect(screen.queryByTestId('live-open-settings')).toBeNull();
    mockStart.mockClear();
    fireEvent.press(screen.getByTestId('live-retry'));
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('a refused microphone on Android offers Open settings', () => {
    setOS('android');
    mockView = { state: 'error', error: 'mic_denied' };
    sheet();
    expect(screen.getByTestId('live-open-settings')).toBeTruthy();
    expect(screen.getByTestId('live-status').props.children).toBe(i18n.t('live:errors.mic_denied'));
  });

  it('hides Open settings on web and points to the browser settings', () => {
    setOS('web');
    mockView = { state: 'error', error: 'mic_denied' };
    sheet();
    expect(screen.queryByTestId('live-open-settings')).toBeNull();
    expect(screen.getByTestId('live-status').props.children).toBe(i18n.t('live:errors.mic_denied_web'));
    expect(screen.getByTestId('live-retry')).toBeTruthy();
  });
});
