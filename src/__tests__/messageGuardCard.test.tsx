import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { MessageGuardApp } from 'shield-module';
import { MessageGuardCardView } from '../components/MessageGuardCard';
import { MessageGuardConsent } from '../components/MessageGuardConsent';
import type { MessageGuardControl } from '../hooks/useMessageGuard';
import type { MessageGuardHealth } from '../hooks/useMessageGuardHealth';

jest.mock('../hooks/useMessageGuard', () => ({
  useMessageGuard: jest.fn(),
  useMessageGuardLog: () => ({ entries: [], loading: false, reload: jest.fn(), deleteAll: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});

const APPS: MessageGuardApp[] = [
  { id: 'sms', label: 'Messages (SMS)', enabled: false, recommended: true },
  { id: 'whatsapp', label: 'WhatsApp', enabled: false },
];

function control(over: Partial<MessageGuardControl> = {}): MessageGuardControl {
  return {
    support: 'ready',
    enabled: false,
    access: false,
    apps: APPS,
    error: null,
    pausedReason: null,
    consent: null,
    setEnabled: jest.fn(async () => undefined),
    confirmConsent: jest.fn(async () => undefined),
    cancelConsent: jest.fn(),
    toggleApp: jest.fn(async () => undefined),
    turnOffAndRevoke: jest.fn(async () => undefined),
    ...over,
  };
}

describe('Message Guard consent', () => {
  it('starts with no app chosen and the SMS app first and recommended', () => {
    const onConfirm = jest.fn();
    const screen = render(<MessageGuardConsent request={{ mode: 'enable' }} apps={APPS} onConfirm={onConfirm} onCancel={jest.fn()} />);
    expect(screen.getByText('What leaves your phone')).toBeTruthy();
    expect(screen.getByText("Kakwe's server and Google's AI check the message and send back a result.")).toBeTruthy();
    expect(screen.getByText('Recommended')).toBeTruthy();
    expect(screen.getByTestId('message-guard-consent-app-sms').props.value).toBe(false);
    expect(screen.getByTestId('message-guard-consent-app-whatsapp').props.value).toBe(false);

    fireEvent.press(screen.getByTestId('message-guard-consent-turn-on'));
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent(screen.getByTestId('message-guard-consent-app-sms'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('message-guard-consent-turn-on'));
    expect(onConfirm).toHaveBeenCalledWith(['sms']);
  });

  it('asks again for one extra app', () => {
    const onConfirm = jest.fn();
    const screen = render(
      <MessageGuardConsent request={{ mode: 'addApp', app: APPS[1] }} apps={APPS} onConfirm={onConfirm} onCancel={jest.fn()} />,
    );
    expect(screen.getByText('Let Message Guard read WhatsApp?')).toBeTruthy();
    expect(screen.queryByTestId('message-guard-consent-app-sms')).toBeNull();
    fireEvent.press(screen.getByTestId('message-guard-consent-turn-on'));
    expect(onConfirm).toHaveBeenCalledWith(['whatsapp']);
  });

  it('Not now cancels', () => {
    const onCancel = jest.fn();
    const screen = render(<MessageGuardConsent request={{ mode: 'enable' }} apps={APPS} onConfirm={jest.fn()} onCancel={onCancel} />);
    fireEvent.press(screen.getByTestId('message-guard-consent-not-now'));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('Message Guard card', () => {
  it('shows the pause reason', () => {
    const screen = render(<MessageGuardCardView control={control({ pausedReason: 'daily_limit', access: true })} />);
    expect(screen.getByTestId('message-guard-status').props.children).toContain('60 checks');
  });

  it('offers one tap to turn off and remove access', () => {
    const c = control({ enabled: true, access: true, apps: [{ ...APPS[0], enabled: true }, APPS[1]] });
    const screen = render(<MessageGuardCardView control={c} />);
    fireEvent.press(screen.getByTestId('message-guard-kill'));
    expect(c.turnOffAndRevoke).toHaveBeenCalled();
    expect(screen.getByTestId('message-guard-log-open')).toBeTruthy();
  });

  const health = (over: Partial<MessageGuardHealth> = {}): MessageGuardHealth => ({
    watching: true,
    problems: [],
    missingApps: [],
    last: null,
    openBatterySettings: jest.fn(async () => undefined),
    ...over,
  });
  const onControl = () => control({ enabled: true, access: true, apps: [{ ...APPS[0], enabled: true }, APPS[1]] });

  it('says it is waiting before the first message', () => {
    const screen = render(<MessageGuardCardView control={onControl()} health={health()} />);
    expect(screen.getByTestId('message-guard-last').props.children).toBe('Waiting for messages from the apps you chose.');
  });

  it('shows the last decision without any message content', () => {
    const last = { seq: 4, at: Date.now() - 2 * 60_000, app: 'viber', label: 'Viber', outcome: 'skipped_not_risky' };
    const screen = render(<MessageGuardCardView control={onControl()} health={health({ last })} />);
    expect(screen.getByTestId('message-guard-last').props.children).toBe('Last message from Viber, 2 min ago: looked normal, not sent');
  });

  it('shows one line per problem and offers the battery setting', () => {
    const h = health({ problems: ['notConnected', 'missingApps', 'battery'], missingApps: ['LINE'] });
    const screen = render(<MessageGuardCardView control={onControl()} health={h} />);
    expect(screen.getByTestId('message-guard-problem-notConnected')).toBeTruthy();
    expect(screen.getByTestId('message-guard-problem-missingApps').props.children).toBe('Not installed on this phone: LINE.');
    expect(screen.getByText('Android may stop Message Guard to save battery.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('message-guard-battery'));
    expect(h.openBatterySettings).toHaveBeenCalled();
  });

  it('hides checks while Message Guard is off', () => {
    const screen = render(<MessageGuardCardView control={control()} health={health({ watching: false, problems: ['battery'] })} />);
    expect(screen.queryByTestId('message-guard-health')).toBeNull();
  });
});
