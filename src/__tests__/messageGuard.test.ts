import * as ShieldModule from 'shield-module';
import { sourceLabel } from '../lib/shield';

describe('message guard web fallbacks', () => {
  it('stays off without consent and turns on after it', async () => {
    expect(await ShieldModule.hasNotificationAccess()).toBe(false);
    expect(await ShieldModule.openNotificationAccessSettings()).toBe(true);
    expect(await ShieldModule.hasNotificationAccess()).toBe(true);
    expect(await ShieldModule.isMessageGuardEnabled()).toBe(false);
    expect(await ShieldModule.setMessageGuardEnabled(true)).toBe(false);
    expect(await ShieldModule.isMessageGuardEnabled()).toBe(false);
    expect(await ShieldModule.grantMessageGuardConsent(['messages'])).toBe(true);
    expect(await ShieldModule.setMessageGuardEnabled(true)).toBe(true);
    expect(await ShieldModule.isMessageGuardEnabled()).toBe(true);
    expect((await ShieldModule.getMessageGuardStatus()).consent).toBe(true);
  });

  it('turning off withdraws consent and clears the chosen apps', async () => {
    await ShieldModule.setMessageGuardEnabled(false);
    expect((await ShieldModule.getMessageGuardStatus()).consent).toBe(false);
    expect((await ShieldModule.getMessageGuardApps()).some(a => a.enabled)).toBe(false);
  });

  it('lists the allowlisted apps with none on and SMS first', async () => {
    const all = await ShieldModule.getMessageGuardApps();
    expect(all.map(a => a.id)).toEqual(['messages', 'whatsapp', 'viber', 'telegram', 'line', 'messenger', 'zalo', 'signal']);
    expect(all.every(a => !a.enabled)).toBe(true);
    expect(all[0].recommended).toBe(true);
  });

  it('adds apps only through consent', async () => {
    await ShieldModule.grantMessageGuardConsent(['whatsapp']);
    await ShieldModule.setMessageGuardApps(['whatsapp', 'signal']);
    let chosen = (await ShieldModule.getMessageGuardApps()).filter(a => a.enabled).map(a => a.id);
    expect(chosen).toEqual(['whatsapp']);
    await ShieldModule.grantMessageGuardConsent(['whatsapp', 'signal']);
    chosen = (await ShieldModule.getMessageGuardApps()).filter(a => a.enabled).map(a => a.id);
    expect(chosen).toEqual(['whatsapp', 'signal']);
  });

  it('has an empty sent log that can be cleared', async () => {
    expect(await ShieldModule.getMessageGuardLog()).toEqual([]);
    expect(await ShieldModule.clearMessageGuardLog()).toBe(true);
  });

  it('accepts a config without a native module', async () => {
    expect(
      await ShieldModule.configureMessageGuard({ apiUrl: 'https://api.example.org', language: 'my', shareSignals: false, noticeBody: 'x', noticeOpen: 'y' }),
    ).toBe(true);
  });
});

describe('result source label', () => {
  it('names message checks apart from screen checks', () => {
    expect(sourceLabel('message')).toBe('Message check');
    expect(sourceLabel('screen')).toBe('Screen check');
    expect(sourceLabel(undefined)).toBe('Screen check');
  });
});
