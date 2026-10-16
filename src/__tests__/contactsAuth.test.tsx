import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ContactsScreen from '../screens/ContactsScreen';
import { useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import type { AuthStatus } from '../services/accounts';
import type { TrustedContact } from '../lib/contacts';

jest.mock('../state/AppState', () => ({
  useAppState: jest.fn(),
}));

jest.mock('../state/AuthState', () => ({
  useAuth: jest.fn(),
}));

const mockUseAppState = useAppState as unknown as jest.Mock;
const mockUseAuth = useAuth as unknown as jest.Mock;

describe('ContactsScreen auth gate', () => {
  const mockAddContact = jest.fn();
  const mockRemoveContact = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppState.mockReturnValue({
      contacts: [] as TrustedContact[],
      addContact: mockAddContact,
      removeContact: mockRemoveContact,
    });
  });

  describe('when user is NOT signed in (anonymous / guest)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        status: { kind: 'anonymous', uid: 'anon_123' } as AuthStatus,
      });
    });

    it('renders the auth prompt instead of the contact input form', () => {
      const { getByTestId, queryByTestId, getByText } = render(
        <ContactsScreen navigation={{ navigate: mockNavigate } as never} />,
      );

      expect(getByTestId('contacts-auth-prompt')).toBeTruthy();
      expect(getByTestId('contacts-sign-in')).toBeTruthy();
      expect(getByTestId('contacts-create-account')).toBeTruthy();
      expect(queryByTestId('contact-name-input')).toBeNull();
      expect(queryByTestId('contact-phone-input')).toBeNull();
      expect(queryByTestId('contact-add')).toBeNull();
      expect(getByText('You must be signed in to save family contacts.')).toBeTruthy();
    });

    it('navigates to Account signIn mode when clicking Sign In', () => {
      const { getByTestId } = render(
        <ContactsScreen navigation={{ navigate: mockNavigate } as never} />,
      );

      fireEvent.press(getByTestId('contacts-sign-in'));
      expect(mockNavigate).toHaveBeenCalledWith('Account', { mode: 'signIn' });
    });

    it('navigates to Account signUp mode when clicking Create Account', () => {
      const { getByTestId } = render(
        <ContactsScreen navigation={{ navigate: mockNavigate } as never} />,
      );

      fireEvent.press(getByTestId('contacts-create-account'));
      expect(mockNavigate).toHaveBeenCalledWith('Account', { mode: 'signUp' });
    });
  });

  describe('when user IS signed in with an account', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        status: { kind: 'account', uid: 'user_456', email: 'test@example.com' } as AuthStatus,
      });
    });

    it('renders the add contact form and does not show the auth prompt', () => {
      const { getByTestId, queryByTestId, getByText } = render(
        <ContactsScreen navigation={{ navigate: mockNavigate } as never} />,
      );

      expect(queryByTestId('contacts-auth-prompt')).toBeNull();
      expect(getByTestId('contact-name-input')).toBeTruthy();
      expect(getByTestId('contact-phone-input')).toBeTruthy();
      expect(getByTestId('contact-add')).toBeTruthy();
      expect(getByText('Your contacts are synced to your account.')).toBeTruthy();
    });

    it('calls addContact when submitting the form', () => {
      mockAddContact.mockReturnValue(null);
      const { getByTestId } = render(
        <ContactsScreen navigation={{ navigate: mockNavigate } as never} />,
      );

      fireEvent.changeText(getByTestId('contact-name-input'), 'Sister');
      fireEvent.changeText(getByTestId('contact-phone-input'), '+95912345678');
      fireEvent.press(getByTestId('contact-add'));

      expect(mockAddContact).toHaveBeenCalledWith({
        name: 'Sister',
        phone: '+95912345678',
      });
    });
  });
});
