import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import i18n from '../i18n';
import { createMockClient } from '../api/mock';
import type { CheckResponse } from '../api/types';
import { ReportScreen } from '../screens/ReportScreen';

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), getParent: () => undefined, dispatch: jest.fn(), goBack: jest.fn(), canGoBack: () => true }),
  useIsFocused: () => true,
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb, []),
}));
jest.mock('../state/AppState', () => ({
  useAppState: () => ({ profile: { homeCountry: 'MM', destinationCountry: 'TH' }, language: 'en', history: [], contacts: [] }),
}));
jest.mock('../config/runtime', () => ({
  ...jest.requireActual('../config/runtime'),
  useApiUrl: () => 'https://api.example.com',
}));
jest.mock('../lib/speech', () => ({ ...jest.requireActual('../lib/speech'), speak: jest.fn(async () => undefined), stopSpeaking: jest.fn() }));

const nav = () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true }) as never;

async function renderReport(result: CheckResponse) {
  render(<ReportScreen navigation={nav()} route={{ key: 'Report', name: 'Report', params: { result, language: 'en' } } as never} />);
  await act(async () => undefined);
}

let base: CheckResponse;
beforeAll(async () => {
  await i18n.changeLanguage('en');
  base = await createMockClient({ delayMs: 0 }).check({ kind: 'message', text: 'Pay a deposit first, urgent visa fee.', language: 'en' } as never);
});

describe('Report screen, Low risk', () => {
  it('shows the can-miss-scams note and makes Warn secondary', async () => {
    await renderReport({ ...base, verdict: 'safe', attention: undefined });
    expect(screen.getByTestId('report-disclaimer')).toBeTruthy();
    expect(JSON.stringify(screen.getByTestId('report-disclaimer').props.children)).toContain('can miss scams');
    const style = [screen.getByTestId('report-warn').props.style].flat(3).filter(Boolean) as { borderWidth?: number }[];
    expect(style.some(s => s.borderWidth === 1)).toBe(true);
  });

  it('omits the note on a High risk report', async () => {
    await renderReport({ ...base, verdict: 'danger', attention: undefined });
    expect(screen.queryByTestId('report-disclaimer')).toBeNull();
    const style = [screen.getByTestId('report-warn').props.style].flat(3).filter(Boolean) as { borderWidth?: number }[];
    expect(style.some(s => s.borderWidth === 1)).toBe(false);
  });
});
