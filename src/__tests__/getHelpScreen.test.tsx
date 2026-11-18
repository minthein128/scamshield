import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import i18n from '../i18n';
import GetHelpScreen from '../screens/GetHelpScreen';
import type { CountryCode } from '../data/countries';
import { HOTLINES } from '../data/hotlines';
import { refreshConfig, resetRuntimeConfig } from '../lib/runtimeConfig';

let mockProfile: { homeCountry?: CountryCode; destinationCountry?: CountryCode } = {};
const mockNavigate = jest.fn();

jest.mock('../state/AppState', () => ({ useAppState: () => ({ profile: mockProfile }) }));
jest.mock('../components/LeaveQuickly', () => ({ HeaderWithLeave: () => null }));

const nav = { navigate: mockNavigate, goBack: jest.fn() } as never;
const route = { key: 'k', name: 'GetHelp' } as never;
const press = (id: string) => fireEvent.press(screen.getByTestId(id));

beforeEach(async () => {
  mockProfile = {};
  mockNavigate.mockClear();
  resetRuntimeConfig();
  await i18n.changeLanguage('en');
});

describe('get help list states', () => {
  it('shows only the prompt and a show-all button when no country is chosen', () => {
    render(<GetHelpScreen navigation={nav} route={route} />);
    expect(screen.getByTestId('help-no-countries')).toBeTruthy();
    expect(screen.queryByTestId('hotline-th-rtp-ahtd-1599')).toBeNull();
    expect(screen.getByText('Show all countries')).toBeTruthy();
  });

  it('shows all countries after the button and can go back to the prompt', () => {
    render(<GetHelpScreen navigation={nav} route={route} />);
    press('help-toggle-all');
    expect(screen.queryByTestId('help-no-countries')).toBeNull();
    expect(screen.getByTestId('hotline-th-rtp-ahtd-1599')).toBeTruthy();
    expect(screen.getByText('Hide all countries')).toBeTruthy();
    press('help-toggle-all');
    expect(screen.getByTestId('help-no-countries')).toBeTruthy();
  });

  it('shows only the chosen country sections when entries exist', () => {
    mockProfile = { destinationCountry: 'TH' };
    render(<GetHelpScreen navigation={nav} route={route} />);
    expect(screen.getByTestId('hotline-th-rtp-ahtd-1599')).toBeTruthy();
    expect(screen.queryByTestId('hotline-mm-police-199')).toBeNull();
    expect(screen.queryByTestId('help-none-listed')).toBeNull();
    press('help-toggle-all');
    expect(screen.getByTestId('hotline-mm-police-199')).toBeTruthy();
    expect(screen.getByText('Show only my countries')).toBeTruthy();
  });

  it('shows a no-contacts state, not the full list, for a country without entries', async () => {
    const items = HOTLINES.filter(h => h.country === 'TH');
    const fetchImpl = (async () => ({ ok: true, json: async () => ({ version: 1, items }) })) as unknown as typeof fetch;
    await act(async () => {
      await refreshConfig(fetchImpl, 'https://api.example');
    });
    mockProfile = { destinationCountry: 'KH' };
    render(<GetHelpScreen navigation={nav} route={route} />);
    expect(screen.getByTestId('help-none-listed')).toBeTruthy();
    expect(screen.queryByTestId('hotline-th-rtp-ahtd-1599')).toBeNull();
    expect(screen.getByText('Choose countries')).toBeTruthy();
    press('help-toggle-all');
    expect(screen.queryByTestId('help-none-listed')).toBeNull();
    expect(screen.getByTestId('hotline-th-rtp-ahtd-1599')).toBeTruthy();
  });

  it('renders Burmese hotline copy with English fallback and untouched numbers', async () => {
    await i18n.changeLanguage('my');
    mockProfile = { destinationCountry: 'TH' };
    render(<GetHelpScreen navigation={nav} route={route} />);
    expect(screen.getByText(/AHTD/)).toBeTruthy();
    expect(screen.getByText('1599')).toBeTruthy();
  });
});
