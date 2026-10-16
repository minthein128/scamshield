import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import i18n from '../i18n';
import { BigShieldButtonView } from '../components/BigShieldButton';
import { SourceBlock } from '../components/SourceBlock';
import { CheckScreen } from '../screens/CheckScreen';
import type { ShieldControl } from '../hooks/useShieldControl';
import type { PreparedImage } from '../lib/image';

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ getParent: () => undefined, dispatch: jest.fn() }),
}));
jest.mock('../state/AppState', () => ({
  useAppState: () => ({ language: 'en', setLanguage: jest.fn(), profile: { destinationCountry: '', homeCountry: '', shareSignals: false } }),
}));

type Node = { props: { children?: unknown } };
const flat = (children: unknown): string =>
  Array.isArray(children) ? children.map(flat).join('') : typeof children === 'string' ? children : children && typeof children === 'object' && 'props' in children ? flat((children as Node).props.children) : '';
const textOf = (id: string): string => flat(screen.getByTestId(id));

const control = (patch: Partial<ShieldControl> = {}): ShieldControl => ({ support: 'ready', running: false, step: 'idle', error: null, setEnabled: jest.fn(async () => undefined), checkNow: jest.fn(async () => true), ...patch });

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('big shield button', () => {
  it('off: says OFF, shows Turn on and starts the shield on tap', () => {
    const c = control();
    render(<BigShieldButtonView control={c} />);
    expect(textOf('shield-status')).toBe('Shield is OFF');
    expect(screen.getByText('Turn on')).toBeTruthy();
    expect(textOf('shield-hint')).toBe('Tap the circle. The doll will stay on top of your other apps.');
    fireEvent.press(screen.getByTestId('shield-button'));
    expect(c.setEnabled).toHaveBeenCalledWith(true);
  });

  it('on: says ON, shows On and stops the shield on tap', () => {
    const c = control({ running: true });
    render(<BigShieldButtonView control={c} />);
    expect(textOf('shield-status')).toBe('Shield is ON');
    expect(screen.getByText('On')).toBeTruthy();
    expect(textOf('shield-hint')).toBe('See a job ad or a chat? Tap the doll on your screen.');
    fireEvent.press(screen.getByTestId('shield-button'));
    expect(c.setEnabled).toHaveBeenCalledWith(false);
  });

  it('web: keeps the circle, explains it needs the Android app and has no toggle', () => {
    const c = control({ support: 'web' });
    render(<BigShieldButtonView control={c} />);
    expect(screen.getByTestId('shield-button').props.accessibilityState.disabled).toBe(true);
    expect(textOf('shield-hint')).toBe('The shield works in the Android app.');
    expect(screen.queryByText('Turn on')).toBeNull();
    fireEvent.press(screen.getByTestId('shield-button'));
    expect(c.setEnabled).not.toHaveBeenCalled();
  });

  it('while a permission step runs: disabled and shows the step', () => {
    render(<BigShieldButtonView control={control({ step: 'capture' })} />);
    expect(screen.getByTestId('shield-button').props.accessibilityState.disabled).toBe(true);
    expect(textOf('shield-hint')).toContain('Step 3 of 4');
  });

  it('renders nothing where the shield is unsupported', () => {
    render(<BigShieldButtonView control={control({ support: 'unsupported' })} />);
    expect(screen.queryByTestId('shield-card')).toBeNull();
  });
});

const IMAGE: PreparedImage = { uri: 'file:///a.jpg', base64: 'x', mimeType: 'image/jpeg', bytes: 250880 } as PreparedImage;

function block(patch: Partial<React.ComponentProps<typeof SourceBlock>> = {}) {
  const props = { testID: 'job-ad', icon: 'briefcase' as const, title: 'The job ad', hint: 'Paste the post, or add a picture of it.', a11y: 'Text of the job ad', placeholder: 'Paste the job ad here', pickHint: 'A picture of the ad from your phone', text: '', image: null, busy: false, onText: jest.fn(), onPaste: jest.fn(), onPick: jest.fn(), onRemove: jest.fn(), ...patch };
  render(<SourceBlock {...props} />);
  return props;
}

describe('Check input blocks', () => {
  it('empty: header, text box with Paste, or divider and the Pick a screenshot card', () => {
    const p = block();
    expect(screen.getByText('The job ad')).toBeTruthy();
    expect(screen.getByText('or')).toBeTruthy();
    expect(screen.getByText('Pick a screenshot')).toBeTruthy();
    expect(screen.getByText('A picture of the ad from your phone')).toBeTruthy();
    fireEvent.press(screen.getByTestId('job-ad-text-paste'));
    expect(p.onPaste).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('job-ad-pick'));
    expect(p.onPick).toHaveBeenCalled();
  });

  it('filled screenshot: size, Change and Remove replace the picker', () => {
    const p = block({ image: IMAGE });
    expect(screen.getByText('245 KB, ready to send')).toBeTruthy();
    expect(screen.queryByText('Pick a screenshot')).toBeNull();
    fireEvent.press(screen.getByTestId('job-ad-pick-change'));
    expect(p.onPick).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('job-ad-pick-remove'));
    expect(p.onRemove).toHaveBeenCalled();
  });

  it('optional block shows the Optional chip', () => {
    block({ optional: true });
    expect(screen.getByText('Optional')).toBeTruthy();
  });
});

describe('Check page submit', () => {
  const renderCheck = () => {
    const navigation = { navigate: jest.fn(), getParent: () => ({ navigate: jest.fn() }) } as never;
    render(<CheckScreen navigation={navigation} route={{ params: undefined } as never} />);
  };

  it('Job offer: the button is disabled and the hint says why until something is added', () => {
    renderCheck();
    expect(textOf('check-submit-hint')).toBe('Add the job ad or the chat first');
    expect(screen.getByTestId('check-submit').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText('Read these texts')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('job-ad-text'), 'Factory workers needed');
    expect(screen.queryByTestId('check-submit-hint')).toBeNull();
    expect(screen.getByTestId('check-submit').props.accessibilityState.disabled).toBe(false);
  });
});
