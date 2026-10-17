import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import OnboardingScreen from '../screens/OnboardingScreen';
import { CHECKS_PER_HOUR } from '../lib/onboarding';
import type { AuthStatus } from '../services/accounts';

let mockStatus: AuthStatus = { kind: 'anonymous', uid: 'anon' };
let mockSocial = { googleAvailable: true, facebookAvailable: true };
let mockShield = 'ready';
const mockNavigate = jest.fn();
const mockFinish = jest.fn();
const mockGoogle = jest.fn();
const mockFacebook = jest.fn();
let mockProfile: Record<string, unknown> = { onboarded: false };

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }), useIsFocused: () => true }));
jest.mock('../state/AuthState', () => ({ useAuth: () => ({ status: mockStatus, google: mockGoogle, facebook: mockFacebook }) }));
jest.mock('../state/AppState', () => ({ useAppState: () => ({ profile: mockProfile, finishOnboarding: mockFinish }) }));
jest.mock('../services/social', () => ({
  get googleAvailable() { return mockSocial.googleAvailable; },
  get facebookAvailable() { return mockSocial.facebookAvailable; },
}));
jest.mock('firebase/auth', () => ({}));
jest.mock('../hooks/useShieldControl', () => ({ shieldSupport: () => mockShield }));
jest.mock('../config/runtime', () => ({ useApiUrl: () => 'https://api.example.com' }));

const press = (id: string) => fireEvent.press(screen.getByTestId(id));
const toAccount = () => press('onboarding-next');

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = { kind: 'anonymous', uid: 'anon' };
  mockSocial = { googleAvailable: true, facebookAvailable: true };
  mockShield = 'ready';
  mockProfile = { onboarded: false };
});

describe('onboarding screen', () => {
  it('shows the account step second', () => {
    render(<OnboardingScreen />);
    expect(screen.getByTestId('onboarding-hero')).toBeTruthy();
    toAccount();
    expect(screen.getByTestId('onboarding-card-without')).toBeTruthy();
    expect(screen.getByTestId('onboarding-card-with')).toBeTruthy();
    expect(screen.getByText('Talk with Kakwe by voice')).toBeTruthy();
    expect(screen.getByText('Tap the doll on your screen to check what you see')).toBeTruthy();
    expect(screen.getAllByText(/checks an hour/)).toHaveLength(1);
    expect(screen.getByText(`Up to ${CHECKS_PER_HOUR.account} checks an hour`)).toBeTruthy();
    expect(screen.queryByText(/new phone/)).toBeNull();
  });

  it('moves to the countries step after a Google sign-in and does not finish onboarding', async () => {
    mockGoogle.mockImplementation(async () => {
      mockStatus = { kind: 'account', uid: 'u', email: 'a@b.c' };
    });
    const view = render(<OnboardingScreen />);
    toAccount();
    await act(async () => {
      press('onboarding-google');
    });
    view.rerender(<OnboardingScreen />);
    expect(screen.getByText('Where are you from?')).toBeTruthy();
    expect(mockFinish).not.toHaveBeenCalled();
  });

  it('opens the account form for log in and returns to countries once signed in', () => {
    const view = render(<OnboardingScreen />);
    toAccount();
    press('onboarding-signin');
    expect(mockNavigate).toHaveBeenCalledWith('Account', { mode: 'signIn' });
    mockStatus = { kind: 'account', uid: 'u', email: 'a@b.c' };
    view.rerender(<OnboardingScreen />);
    expect(screen.getByText('Where are you from?')).toBeTruthy();
  });

  it('stays on the account step and shows the code when sign-in fails', async () => {
    mockFacebook.mockRejectedValue({ code: 'auth/some-new-failure' });
    render(<OnboardingScreen />);
    toAccount();
    await act(async () => {
      press('onboarding-facebook');
    });
    expect(screen.getByTestId('onboarding-error')).toBeTruthy();
    expect(screen.getByText(/\(code auth\/some-new-failure\)/)).toBeTruthy();
    expect(screen.getByTestId('onboarding-card-with')).toBeTruthy();
  });

  it('hides a social button that is not available', () => {
    mockSocial = { googleAvailable: false, facebookAvailable: true };
    render(<OnboardingScreen />);
    toAccount();
    expect(screen.queryByTestId('onboarding-google')).toBeNull();
    expect(screen.getByTestId('onboarding-facebook')).toBeTruthy();
  });

  it('shows card one and Next only when accounts are unavailable', () => {
    mockStatus = { kind: 'unavailable' };
    render(<OnboardingScreen />);
    toAccount();
    expect(screen.getByTestId('onboarding-card-without')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-card-with')).toBeNull();
    expect(screen.queryByTestId('onboarding-signin')).toBeNull();
    expect(screen.queryByTestId('onboarding-google')).toBeNull();
    toAccount();
    expect(screen.getByText('Where are you from?')).toBeTruthy();
  });

  it('finishes with the home country only and no destination', () => {
    render(<OnboardingScreen />);
    toAccount();
    press('onboarding-anonymous');
    fireEvent.press(screen.getByLabelText('Myanmar'));
    expect(screen.queryByText('Where will you work or travel?')).toBeNull();
    press('onboarding-next');
    press('onboarding-next');
    press('onboarding-share-no');
    expect(mockFinish).toHaveBeenCalledWith({ homeCountry: 'MM', shareSignals: false, sharingAsked: true });
  });

  it('hides Tap the doll where the shield is unavailable', () => {
    mockShield = 'web';
    render(<OnboardingScreen />);
    toAccount();
    press('onboarding-anonymous');
    press('onboarding-next');
    expect(screen.getByTestId('onboarding-how-check')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-how-doll')).toBeNull();
  });

  it('skip on how it helps goes to the sharing question', () => {
    render(<OnboardingScreen />);
    toAccount();
    press('onboarding-anonymous');
    press('onboarding-next');
    expect(screen.getByTestId('onboarding-how-doll')).toBeTruthy();
    press('onboarding-skip');
    expect(screen.getByTestId('onboarding-share-yes')).toBeTruthy();
  });
});
