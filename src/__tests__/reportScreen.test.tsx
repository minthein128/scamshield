import React from 'react';
import { Dimensions, Text } from 'react-native';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
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

describe('Report screen, phone call button', () => {
  afterEach(() => jest.restoreAllMocks());
  it('keeps the call sub label to one line once measured', async () => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 390, height: 844, scale: 2, fontScale: 1 });
    await renderReport({ ...base, verdict: 'danger', attention: undefined });
    const layout = (el: never, height: number) => fireEvent(el, 'layout', { nativeEvent: { layout: { height, width: 150, x: 0, y: 0 } } });
    const texts = (id: string) => within(screen.getByTestId(id, { hidden: true })).UNSAFE_getAllByType(Text);
    const warn = texts('report-warn');
    const call = texts('report-call');
    expect(call.length).toBe(2);
    await act(async () => {
      layout(warn[0] as never, 20);
      layout(call[0] as never, 20);
      layout(call[1] as never, 16);
    });
    const sub = within(screen.getByTestId('report-call')).UNSAFE_getAllByType(Text)[1];
    expect(sub.props.numberOfLines).toBe(1);
  });
});

describe('Report screen, Job Shield duplicates', () => {
  it('shows a mismatch once, under What does not match', async () => {
    const description = 'The ad says no fee, but the chat asks for 15000 THB';
    const conflict = { field: 'workerFee', code: 'fee_vs_no_fee', fieldLabel: 'Worker fee', adValue: 'none', adQuote: 'No fee', chatValue: '15000 THB', chatQuote: 'pay 15000 THB', description, family: 'payment_route', severity: 'high' };
    const flags = [
      { family: 'payment_route', severity: 'high', label: description, evidence: 'Ad: "No fee" / Chat: "pay 15000 THB"' },
      { family: 'trafficking', severity: 'medium', label: 'They ask for a passport photo', evidence: '' },
    ];
    await renderReport({ ...base, verdict: 'danger', attention: 'pause', attentionHeadline: 'Pause', conflicts: [conflict], flags } as never);
    expect(within(screen.getByTestId('report-conflicts')).getAllByText(description).length).toBeGreaterThan(0);
    expect(screen.getAllByText(description)).toHaveLength(1);
    expect(screen.getByText('They ask for a passport photo')).toBeTruthy();
  });
});
