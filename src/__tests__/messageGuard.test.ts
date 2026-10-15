import * as ShieldModule from 'shield-module';
import { sourceLabel } from '../lib/shield';

describe('message guard web fallbacks', () => {
  it('grants access through the settings call and stores the switch', async () => {
    expect(await ShieldModule.hasNotificationAccess()).toBe(false);
    expect(await ShieldModule.openNotificationAccessSettings()).toBe(true);
    expect(await ShieldModule.hasNotificationAccess()).toBe(true);
    expect(await ShieldModule.isMessageGuardEnabled()).toBe(false);
    await ShieldModule.setMessageGuardEnabled(true);
    expect(await ShieldModule.isMessageGuardEnabled()).toBe(true);
  });

  it('lists the allowlisted apps and keeps the chosen ones', async () => {
    const all = await ShieldModule.getMessageGuardApps();
    expect(all.map(a => a.id)).toEqual(['messages', 'whatsapp', 'viber', 'telegram', 'line', 'messenger', 'zalo', 'signal']);
    await ShieldModule.setMessageGuardApps(['whatsapp', 'signal']);
    const chosen = (await ShieldModule.getMessageGuardApps()).filter(a => a.enabled).map(a => a.id);
    expect(chosen).toEqual(['whatsapp', 'signal']);
  });

  it('accepts a config without a native module', async () => {
    expect(await ShieldModule.configureMessageGuard({ apiUrl: 'https://api.example.org', language: 'my', shareSignals: false })).toBe(true);
  });
});

describe('result source label', () => {
  it('names message checks apart from screen checks', () => {
    expect(sourceLabel('message')).toBe('Message check');
    expect(sourceLabel('screen')).toBe('Screen check');
    expect(sourceLabel(undefined)).toBe('Screen check');
  });
});
