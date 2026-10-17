import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import i18n from '../i18n';
import { BigShieldButtonView } from '../components/BigShieldButton';
import { CheckScreen } from '../screens/CheckScreen';
import type { ShieldControl } from '../hooks/useShieldControl';
import { pickScreenshot, prepareSharedImage, type PreparedImage } from '../lib/image';

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ getParent: () => undefined, dispatch: jest.fn() }),
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb, []),
}));
jest.mock('expo-clipboard', () => ({ hasStringAsync: jest.fn(async () => false), getStringAsync: jest.fn(async () => 'copied text') }));
jest.mock('../lib/image', () => ({ ...jest.requireActual('../lib/image'), pickScreenshot: jest.fn(), prepareSharedImage: jest.fn() }));
jest.mock('../state/AppState', () => ({
  useAppState: () => ({ language: 'en', setLanguage: jest.fn(), profile: { destinationCountry: '', homeCountry: '', shareSignals: false } }),
}));

type Node = { props: { children?: unknown } };
const flat = (children: unknown): string =>
  Array.isArray(children) ? children.map(flat).join('') : typeof children === 'string' ? children : children && typeof children === 'object' && 'props' in children ? flat((children as Node).props.children) : '';
const textOf = (id: string): string => flat(screen.getByTestId(id));

const control = (patch: Partial<ShieldControl> = {}): ShieldControl => ({ support: 'ready', running: false, on: patch.running ?? false, step: 'idle', error: null, setEnabled: jest.fn(async () => undefined), checkNow: jest.fn(async () => true), ...patch });

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

  it('web: the circle offers the Android app and opens the download page, with no toggle', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const c = control({ support: 'web' });
    render(<BigShieldButtonView control={c} />);
    expect(textOf('shield-download')).toBe('Download the Android app');
    expect(screen.queryByText('Turn on')).toBeNull();
    fireEvent.press(screen.getByTestId('shield-button'));
    expect(open).toHaveBeenCalledWith('https://saferoute-aibc.web.app/saferoute.apk');
    expect(c.setEnabled).not.toHaveBeenCalled();
  });

  it('unavailable build: same circle, disabled, with the existing status text', () => {
    const c = control({ support: 'insecure-service' });
    render(<BigShieldButtonView control={c} />);
    expect(screen.getByTestId('shield-button').props.accessibilityState.disabled).toBe(true);
    expect(textOf('shield-hint')).toContain('insecure service address');
    fireEvent.press(screen.getByTestId('shield-button'));
    expect(c.setEnabled).not.toHaveBeenCalled();
  });

  it('while a permission step runs: disabled and shows the step', () => {
    render(<BigShieldButtonView control={control({ step: 'notifications' })} />);
    expect(screen.getByTestId('shield-button').props.accessibilityState.disabled).toBe(true);
    expect(textOf('shield-hint')).toContain('Step 2 of 3');
  });

  it('busy: shows a spinner, disables the circle and shows the permission step', () => {
    render(<BigShieldButtonView control={control({ step: 'overlay' })} />);
    expect(screen.getByTestId('shield-busy')).toBeTruthy();
    expect(screen.getByTestId('shield-button').props.accessibilityState.busy).toBe(true);
  });

  it('shows the existing error text when start fails', () => {
    render(<BigShieldButtonView control={control({ error: 'The shield did not start. Try again.' })} />);
    expect(textOf('shield-error')).toBe('The shield did not start. Try again.');
  });

  it('renders nothing where the shield is unsupported', () => {
    render(<BigShieldButtonView control={control({ support: 'unsupported' })} />);
    expect(screen.queryByTestId('shield-card')).toBeNull();
  });
});

const IMAGE = { uri: 'file:///a.jpg', base64: 'x', mimeType: 'image/jpeg', bytes: 250880, name: 'job-offer.jpg' } as PreparedImage;

const navigate = jest.fn();
const renderCheck = (params?: object, mode: string | null = 'message') => {
  const navigation = { navigate: jest.fn(), getParent: () => ({ navigate }) } as never;
  render(<CheckScreen navigation={navigation} route={{ params } as never} />);
  if (mode) fireEvent.press(screen.getByTestId(`check-mode-${mode}`));
};

beforeEach(() => {
  navigate.mockClear();
  (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(false);
  (Clipboard.getStringAsync as jest.Mock).mockReset().mockResolvedValue('copied text');
});

describe('Check page v3', () => {
  it('every entry point opens the same Check page on the Message chip', async () => {
    const layouts: string[] = [];
    const entries: [string, object | undefined][] = [['tab', undefined], ['link', { intent: 'link', nonce: 1 }], ['image', { intent: 'image', nonce: 2 }], ['text', { intent: 'text', nonce: 3 }]];
    for (const [name, params] of entries) {
      (pickScreenshot as jest.Mock).mockClear();
      const view = render(<CheckScreen navigation={{ navigate: jest.fn(), getParent: () => ({ navigate }) } as never} route={{ params } as never} />);
      await waitFor(() => expect(screen.getByTestId('check-mode-message').props.accessibilityState.selected).toBe(true));
      expect(screen.getByText('Your message')).toBeTruthy();
      expect(screen.queryByText('1. Job offer')).toBeNull();
      if (name !== 'link') layouts.push(JSON.stringify(screen.toJSON(), (k, v) => (k === 'value' || typeof v === 'function' ? undefined : v)));
      if (name === 'image') expect(pickScreenshot).toHaveBeenCalledTimes(1);
      else expect(pickScreenshot).not.toHaveBeenCalled();
      expect(screen.getByTestId('check-text')).toBeTruthy();
      if (name !== 'link') expect(screen.getByTestId('check-pick')).toBeTruthy();
      expect(screen.getByTestId('check-more')).toBeTruthy();
      view.unmount();
    }
    expect(layouts).toHaveLength(3);
    for (const l of layouts) expect(l).toBe(layouts[0]);
  });

  it('Home Link pastes the clipboard into the Message text box and treats it as a link', async () => {
    (Clipboard.getStringAsync as jest.Mock).mockResolvedValue('https://example.com/x');
    renderCheck({ intent: 'link', nonce: 1 }, null);
    await waitFor(() => expect(screen.getByTestId('check-text').props.value).toBe('https://example.com/x'));
    fireEvent.press(screen.getByTestId('check-submit'));
    expect(navigate.mock.calls[0][1].request.kind).toBe('link');
  });

  it('a chip the user picked stays selected', () => {
    renderCheck({ intent: 'text', nonce: 3 }, 'shop');
    expect(screen.getByTestId('check-mode-shop').props.accessibilityState.selected).toBe(true);
  });

  it('shows the four chips and the Message card', () => {
    renderCheck();
    for (const m of ['message', 'job', 'shop', 'general']) expect(screen.getByTestId(`check-mode-${m}`)).toBeTruthy();
    expect(screen.getByText('Your message')).toBeTruthy();
    expect(screen.getByText('Upload a screenshot or photo')).toBeTruthy();
    expect(screen.getByText('Quick exit')).toBeTruthy();
    expect(textOf('check-warn')).toContain('can miss scams');
  });

  it('each chip swaps the card title and placeholder', () => {
    renderCheck();
    fireEvent.press(screen.getByTestId('check-mode-shop'));
    expect(screen.getByText('The shop or post')).toBeTruthy();
    fireEvent.press(screen.getByTestId('check-mode-general'));
    expect(screen.getByText('What you got')).toBeTruthy();
    expect(screen.getByPlaceholderText('Paste anything here: a message, link or ad')).toBeTruthy();
  });

  it('disabled button with the reason until something is added', () => {
    renderCheck();
    expect(textOf('check-submit-hint')).toBe('Add a message, link or picture first');
    expect(screen.getByTestId('check-submit').props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(screen.getByTestId('check-text'), 'hello');
    expect(screen.queryByTestId('check-submit-hint')).toBeNull();
  });

  it('Not sure goes to the server as a message check', () => {
    renderCheck();
    fireEvent.press(screen.getByTestId('check-mode-general'));
    fireEvent.changeText(screen.getByTestId('check-text'), 'Pay a fee to get the visa');
    fireEvent.press(screen.getByTestId('check-submit'));
    expect(navigate.mock.calls[0][1].request.kind).toBe('message');
  });

  it('a pasted web address becomes a link check; Shopping stays shop', () => {
    renderCheck();
    fireEvent.changeText(screen.getByTestId('check-text'), 'https://example.com/apply');
    fireEvent.press(screen.getByTestId('check-submit'));
    expect(navigate.mock.calls[0][1].request).toMatchObject({ kind: 'link', url: 'https://example.com/apply' });
    navigate.mockClear();
    fireEvent.press(screen.getByTestId('check-mode-shop'));
    fireEvent.press(screen.getByTestId('check-submit'));
    expect(navigate.mock.calls[0][1].request.kind).toBe('shop');
  });

  it('Job offer: two steps, hint, added bar and Check and compare', () => {
    renderCheck(undefined, 'job');
    expect(screen.getByText('1. Job offer')).toBeTruthy();
    expect(textOf('job-chat')).toContain('optional');
    expect(textOf('check-submit-hint')).toBe('Add the job offer first');
    expect(screen.getByText('Check and compare')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('job-ad-text'), 'Factory workers needed');
    fireEvent.changeText(screen.getByTestId('job-chat-text'), 'Pay a deposit');
    expect(screen.getByText('Job offer added')).toBeTruthy();
    expect(screen.getByText('Messages added')).toBeTruthy();
    fireEvent.press(screen.getByTestId('check-submit'));
    expect(navigate.mock.calls[0][1].job.phase).toBe('extract');
  });

  it('added picture shows the file card with Replace and Remove', async () => {
    (pickScreenshot as jest.Mock).mockResolvedValue(IMAGE);
    renderCheck();
    fireEvent.press(screen.getByTestId('check-pick'));
    await waitFor(() => expect(screen.getByText('job-offer.jpg')).toBeTruthy());
    expect(screen.getByText('Screenshot added')).toBeTruthy();
    expect(screen.queryByText('Upload a screenshot or photo')).toBeNull();
    fireEvent.press(screen.getByTestId('check-file-remove'));
    expect(screen.getByText('Upload a screenshot or photo')).toBeTruthy();
  });

  it('no Paste chip and no clipboard read when the clipboard is empty', async () => {
    renderCheck();
    expect(screen.queryByText('Paste what you copied')).toBeNull();
    expect(Clipboard.getStringAsync).not.toHaveBeenCalled();
  });

  it('with clipboard text the chip appears without reading, then fills the box on tap', async () => {
    (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(true);
    (Clipboard.getStringAsync as jest.Mock).mockClear();
    renderCheck();
    await waitFor(() => expect(screen.getByText('Paste what you copied')).toBeTruthy());
    expect(Clipboard.getStringAsync).not.toHaveBeenCalled();
    await act(async () => { fireEvent.press(screen.getByTestId('check-text-clip')); });
    expect(screen.getByTestId('check-text').props.value).toBe('copied text');
    expect(screen.queryByText('Paste what you copied')).toBeNull();
  });

  it('a share replaces the whole draft: after a typed message, only the shared screenshot is sent', async () => {
    (prepareSharedImage as jest.Mock).mockResolvedValue(IMAGE);
    const navigation = { navigate: jest.fn(), getParent: () => ({ navigate }) } as never;
    const view = render(<CheckScreen navigation={navigation} route={{ params: undefined } as never} />);
    fireEvent.changeText(screen.getByTestId('check-text'), 'Pay a deposit of 500 dollars');
    fireEvent.press(screen.getByTestId('check-submit'));
    expect(navigate.mock.calls[0][1].request.text).toBe('Pay a deposit of 500 dollars');
    navigate.mockClear();

    view.rerender(<CheckScreen navigation={navigation} route={{ params: { draft: { imageUri: 'file:///shot.png' }, nonce: 7 } } as never} />);
    await waitFor(() => expect(screen.getByText('job-offer.jpg')).toBeTruthy());
    expect(prepareSharedImage).toHaveBeenCalledWith('file:///shot.png');
    fireEvent.press(screen.getByTestId('check-submit'));
    const request = navigate.mock.calls[0][1].request;
    expect(request.imageBase64).toBe('x');
    expect(request.text).toBeUndefined();
    expect(request.url).toBeUndefined();
  });

  it('a Home intent clears both Job offer steps before it applies', async () => {
    const navigation = { navigate: jest.fn(), getParent: () => ({ navigate }) } as never;
    const view = render(<CheckScreen navigation={navigation} route={{ params: undefined } as never} />);
    fireEvent.press(screen.getByTestId('check-mode-job'));
    fireEvent.changeText(screen.getByTestId('job-ad-text'), 'Factory workers needed');
    fireEvent.changeText(screen.getByTestId('job-chat-text'), 'Pay a deposit');
    view.rerender(<CheckScreen navigation={navigation} route={{ params: { intent: 'text', nonce: 8 } } as never} />);
    await waitFor(() => expect(screen.getByTestId('check-text').props.value).toBe(''));
    fireEvent.press(screen.getByTestId('check-mode-job'));
    expect(screen.getByTestId('job-ad-text').props.value).toBe('');
    expect(screen.getByTestId('job-chat-text').props.value).toBe('');
  });

  it('the Paste chip comes back when the box is cleared, and shows in each empty Job offer step', async () => {
    (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(true);
    renderCheck();
    await waitFor(() => expect(screen.getByTestId('check-text-clip')).toBeTruthy());
    await act(async () => { fireEvent.press(screen.getByTestId('check-text-clip')); });
    expect(screen.queryByTestId('check-text-clip')).toBeNull();
    fireEvent.changeText(screen.getByTestId('check-text'), '');
    expect(screen.getByTestId('check-text-clip')).toBeTruthy();

    fireEvent.press(screen.getByTestId('check-mode-job'));
    await act(async () => { fireEvent.press(screen.getByTestId('job-ad-text-clip')); });
    expect(screen.getByTestId('job-ad-text').props.value).toBe('copied text');
    expect(screen.getByTestId('job-chat-text-clip')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByTestId('job-chat-text-clip')); });
    expect(screen.getByTestId('job-chat-text').props.value).toBe('copied text');
  });

  it('a clipboard read error on any Paste chip shows the clipboard notice', async () => {
    (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(true);
    (Clipboard.getStringAsync as jest.Mock).mockRejectedValue(new Error('denied'));
    renderCheck();
    await waitFor(() => expect(screen.getByTestId('check-text-clip')).toBeTruthy());
    for (const id of ['check-text-clip', 'job-ad-text-clip', 'job-chat-text-clip']) {
      if (id === 'job-ad-text-clip') fireEvent.press(screen.getByTestId('check-mode-job'));
      await act(async () => { fireEvent.press(screen.getByTestId(id)); });
      expect(screen.getByText('Your clipboard is empty.')).toBeTruthy();
    }
  });

  it('More details unfolds the two existing fields', () => {
    renderCheck();
    expect(screen.queryByTestId('check-destination')).toBeNull();
    fireEvent.press(screen.getByTestId('check-more'));
    expect(screen.getByTestId('check-destination')).toBeTruthy();
    expect(screen.getByTestId('check-language')).toBeTruthy();
  });
});
