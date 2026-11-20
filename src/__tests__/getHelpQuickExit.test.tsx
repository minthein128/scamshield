import React from 'react';
import { render, screen } from '@testing-library/react-native';
import GetHelpScreen from '../screens/GetHelpScreen';

jest.mock('../state/AppState', () => ({ useAppState: () => ({ profile: {} }) }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ getParent: () => undefined, dispatch: jest.fn() }),
}));

it('Get help shows Quick exit', () => {
  render(<GetHelpScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never} route={{ key: 'k', name: 'GetHelp' } as never} />);
  expect(screen.getByTestId('leave-quickly')).toBeTruthy();
});
