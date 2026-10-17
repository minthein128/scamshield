import React from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, render, screen, type RenderResult } from '@testing-library/react-native';
import i18n from '../i18n';
import { NAMESPACES, en } from '../i18n/resources';
import { createMockClient } from '../api/mock';
import type { CheckResponse } from '../api/types';
import { HOTLINES } from '../data/hotlines';
import type { ShieldControl } from '../hooks/useShieldControl';
import { CheckScreen } from '../screens/CheckScreen';
import { HomeScreen } from '../screens/HomeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ShieldScreen } from '../screens/ShieldScreen';

const LOCALES = ['en', 'my', 'id', 'tl', 'th'] as const;

let mockShield: ShieldControl;
const mockProfile = {
  onboarded: false,
  homeCountry: 'MM',
  destinationCountry: 'TH',
  shareSignals: false,
  sharingAsked: true,
  keepHistory: true,
};

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
  useAppState: () => ({
    profile: mockProfile,
    history: [],
    contacts: [],
    contactAccess: 'signIn',
    language: require('../i18n').default.language,
    setLanguage: jest.fn(),
    updateProfile: jest.fn(),
    finishOnboarding: jest.fn(),
    setKeepHistory: jest.fn(),
    syncState: 'idle',
    clearSyncedCopies: jest.fn(),
    deleteLocalData: jest.fn(),
  }),
}));
jest.mock('../state/AuthState', () => ({
  useAuth: () => ({ status: { kind: 'anonymous', uid: 'anon' }, google: jest.fn(), facebook: jest.fn(), signOut: jest.fn(), deleteAccount: jest.fn() }),
}));
jest.mock('../services/social', () => ({ googleAvailable: true, facebookAvailable: true }));
jest.mock('firebase/auth', () => ({}));
jest.mock('../services/cloud', () => ({ deleteAllRemote: jest.fn() }));
jest.mock('../hooks/useHomeShield', () => ({ useHomeShield: () => mockShield }));
jest.mock('../hooks/useShieldControl', () => ({ ...jest.requireActual('../hooks/useShieldControl'), useShieldControl: () => mockShield }));
jest.mock('../config/runtime', () => ({
  ...jest.requireActual('../config/runtime'),
  useApiUrl: () => 'https://api.example.com',
  checkHealth: async () => true,
  refreshApiUrl: async () => 'https://api.example.com',
}));
jest.mock('expo-clipboard', () => ({ hasStringAsync: jest.fn(async () => true), getStringAsync: jest.fn(async () => 'copied') }));
jest.mock('../lib/speech', () => ({ ...jest.requireActual('../lib/speech'), speak: jest.fn(async () => undefined), stopSpeaking: jest.fn() }));

const NS = new Set<string>(NAMESPACES);
const KEY_PATHS = new Set<string>();
const collectKeys = (node: unknown, prefix: string) => {
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === '_meta') continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') KEY_PATHS.add(path.replace(/_(one|other)$/, ''));
    else collectKeys(v, path);
  }
};
Object.values(en).forEach(ns => collectKeys(ns, ''));

/** A key path ("errors.image") or a namespace and key ("check:title", "check.title"). */
function looksLikeKey(token: string): boolean {
  const ns = /^([a-z][A-Za-z]*)[:.]([A-Za-z0-9_.]+)$/.exec(token);
  if (ns && NS.has(ns[1])) return true;
  return token.includes('.') && KEY_PATHS.has(token);
}

const PROPS = ['accessibilityLabel', 'accessibilityHint', 'placeholder', 'title'];

/** Every string the user can see or hear: text children and the a11y and placeholder props. */
function visibleStrings(): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') return void out.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    const n = node as { props?: Record<string, unknown>; children?: unknown[] };
    for (const p of PROPS) if (typeof n.props?.[p] === 'string') out.push(n.props[p] as string);
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}

const missing: string[] = [];

function expectTranslated(where: string) {
  const strings = visibleStrings();
  expect(strings.length).toBeGreaterThan(0);
  const raw = strings.flatMap(s => s.split(/[\s,;:()"'!?]+(?=\S)|\s+/).filter(looksLikeKey).map(k => `${where}: "${k}" in "${s}"`));
  const whole = strings.filter(s => looksLikeKey(s.trim())).map(s => `${where}: "${s}"`);
  expect([...whole, ...raw]).toEqual([]);
  expect(missing.splice(0)).toEqual([]);
}

const realOS = Platform.OS;
beforeAll(() => {
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  i18n.options.fallbackLng = false;
  i18n.options.saveMissing = true;
  i18n.options.missingKeyHandler = (lngs, ns, key) => void missing.push(`${lngs.join(',')} ${ns}:${key}`);
});
afterAll(() => {
  Object.defineProperty(Platform, 'OS', { value: realOS, configurable: true });
});

let report: CheckResponse;
beforeAll(async () => {
  report = await createMockClient({ delayMs: 0 }).check({
    kind: 'message',
    text: 'URGENT high salary, free visa to Thailand. Pay the processing fee deposit by bank transfer today only, contact on Telegram.',
    language: 'en',
  });
});

const nav = () => ({ navigate: jest.fn(), getParent: () => ({ navigate: jest.fn() }), goBack: jest.fn(), canGoBack: () => true, setOptions: jest.fn() }) as never;

async function settle(view?: RenderResult) {
  await act(async () => undefined);
  return view;
}

describe.each(LOCALES)('every main screen in %s', lng => {
  beforeEach(async () => {
    missing.length = 0;
    await i18n.changeLanguage(lng);
    mockShield = { support: 'ready', running: false, step: 'idle', error: null, setEnabled: jest.fn(async () => undefined), checkNow: jest.fn(async () => true) };
  });

  it('onboarding, each step', async () => {
    render(<OnboardingScreen />);
    await settle();
    expectTranslated('onboarding language');
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expectTranslated('onboarding account');
    fireEvent.press(screen.getByTestId('onboarding-anonymous'));
    expectTranslated('onboarding countries');
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expectTranslated('onboarding how');
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expect(screen.getByTestId('onboarding-share-yes')).toBeTruthy();
    expectTranslated('onboarding sharing');
  });

  it('Home with the shield off and on', async () => {
    const view = render(<HomeScreen navigation={nav()} route={{ key: 'Home', name: 'Home' } as never} />);
    await settle();
    const off = JSON.stringify(screen.getByTestId('shield-status').props.children);
    expectTranslated('home off');
    mockShield = { ...mockShield, running: true };
    view.rerender(<HomeScreen navigation={nav()} route={{ key: 'Home', name: 'Home' } as never} />);
    await settle();
    expect(JSON.stringify(screen.getByTestId('shield-status').props.children)).not.toBe(off);
    expectTranslated('home on');
  });

  it('Check, each chip and the filled Job offer', async () => {
    render(<CheckScreen navigation={nav()} route={{ key: 'Check', name: 'Check', params: undefined } as never} />);
    await settle();
    for (const mode of ['message', 'job', 'shop', 'general']) {
      fireEvent.press(screen.getByTestId(`check-mode-${mode}`));
      expectTranslated(`check ${mode}`);
    }
    fireEvent.press(screen.getByTestId('check-mode-job'));
    fireEvent.changeText(screen.getByTestId('job-ad-text'), 'Factory workers needed');
    fireEvent.changeText(screen.getByTestId('job-chat-text'), 'Pay a deposit first');
    fireEvent.press(screen.getByTestId('check-more'));
    expect(screen.getByTestId('job-added')).toBeTruthy();
    expectTranslated('check job filled');
  });

  it('a High risk report from the offline mock', async () => {
    expect(report.verdict).toBe('danger');
    render(<ReportScreen navigation={nav()} route={{ key: 'Report', name: 'Report', params: { result: report, language: lng } } as never} />);
    await settle();
    expect(screen.getByTestId('verdict-danger')).toBeTruthy();
    expectTranslated('report');
    const names = new Set(HOTLINES.map(h => h.name));
    expect(visibleStrings().some(s => names.has(s))).toBe(lng === 'en');
  });

  it('Settings', async () => {
    render(<SettingsScreen navigation={nav()} route={{ key: 'Settings', name: 'Settings' } as never} />);
    await settle();
    expectTranslated('settings');
    expect(screen.getByTestId('settings-open-log')).toBeTruthy();
    expect(visibleStrings()).toContain(i18n.t('settings:problemReport'));
    expect(screen.queryByTestId('settings-connection')).toBeNull();
    expect(screen.queryByTestId('settings-recheck')).toBeNull();
  });

  it('Screen shield details', async () => {
    render(<ShieldScreen navigation={nav()} route={{ key: 'Shield', name: 'Shield' } as never} />);
    await settle();
    expectTranslated('shield');
    const shown = visibleStrings().join('').replace(/\u200B/g, '');
    expect(shown).toContain(i18n.t('shield:needs.title'));
    if (lng !== 'en') expect(shown).not.toContain('What the shield needs');
  });
});
