import React from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import i18n from '../i18n';
import { VoiceCompanionCard } from '../components/VoiceCompanionCard';

jest.mock('../lib/permissions', () => ({ ensureMicrophone: jest.fn() }));
const { ensureMicrophone } = jest.requireMock('../lib/permissions') as { ensureMicrophone: jest.Mock };

const realOS = Platform.OS;
beforeAll(() => Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true }));
afterAll(() => Object.defineProperty(Platform, 'OS', { value: realOS, configurable: true }));

beforeEach(async () => {
  await i18n.changeLanguage('en');
  ensureMicrophone.mockReset();
  jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
});

async function mount() {
  render(<VoiceCompanionCard />);
  await act(async () => undefined);
}

async function tapAllow() {
  await act(async () => {
    fireEvent.press(screen.getByTestId('voice-companion-allow'));
  });
}

describe('voice companion microphone card', () => {
  it('a one-time deny can ask again and does not say blocked', async () => {
    ensureMicrophone.mockResolvedValue('denied');
    await mount();
    await tapAllow();
    expect(screen.queryByText(i18n.t('live:companion.micBlocked'))).toBeNull();
    await tapAllow();
    expect(ensureMicrophone).toHaveBeenCalledTimes(2);
  });

  it('only a permanent refusal shows blocked', async () => {
    ensureMicrophone.mockResolvedValue('blocked');
    await mount();
    await tapAllow();
    expect(screen.getByText(i18n.t('live:companion.micBlocked'))).toBeTruthy();
  });

  it('shows the microphone as allowed once granted', async () => {
    ensureMicrophone.mockResolvedValue('granted');
    await mount();
    await tapAllow();
    expect(screen.getByText(i18n.t('live:companion.micOn'))).toBeTruthy();
  });
});
