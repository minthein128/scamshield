import React from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import i18n from '../i18n';
import { QuickSettingsTileCard } from '../components/QuickSettingsTileCard';

jest.mock('shield-module', () => ({
  quickSettingsTileSupport: jest.fn(),
  requestAddQuickSettingsTile: jest.fn(),
}));
const shield = jest.requireMock('shield-module') as {
  quickSettingsTileSupport: jest.Mock;
  requestAddQuickSettingsTile: jest.Mock;
};

const realOS = Platform.OS;
afterAll(() => Object.defineProperty(Platform, 'OS', { value: realOS, configurable: true }));

beforeEach(async () => {
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  await i18n.changeLanguage('en');
  shield.quickSettingsTileSupport.mockReset();
  shield.requestAddQuickSettingsTile.mockReset();
});

async function mount() {
  render(<QuickSettingsTileCard />);
  await act(async () => undefined);
}

async function tapAdd() {
  await act(async () => {
    fireEvent.press(screen.getByTestId('quick-settings-tile-add'));
  });
}

describe('quick settings tile card', () => {
  it('offers the system prompt on Android 13+ with the localized tile name', async () => {
    shield.quickSettingsTileSupport.mockResolvedValue('request');
    shield.requestAddQuickSettingsTile.mockResolvedValue('added');
    await mount();
    expect(screen.queryByText(i18n.t('shield:tile.hint'))).toBeNull();
    await tapAdd();
    expect(shield.requestAddQuickSettingsTile).toHaveBeenCalledWith(i18n.t('live:companion.a11yShield'));
    expect(screen.getByText(i18n.t('shield:tile.added'))).toBeTruthy();
    expect(screen.queryByTestId('quick-settings-tile-add')).toBeNull();
  });

  it('treats an existing tile as added', async () => {
    shield.quickSettingsTileSupport.mockResolvedValue('request');
    shield.requestAddQuickSettingsTile.mockResolvedValue('already');
    await mount();
    await tapAdd();
    expect(screen.getByText(i18n.t('shield:tile.added'))).toBeTruthy();
  });

  it('keeps the button after the user says no, and explains a failure', async () => {
    shield.quickSettingsTileSupport.mockResolvedValue('request');
    shield.requestAddQuickSettingsTile.mockResolvedValueOnce('declined').mockResolvedValueOnce('error');
    await mount();
    await tapAdd();
    expect(screen.getByTestId('quick-settings-tile-add')).toBeTruthy();
    expect(screen.queryByText(i18n.t('shield:tile.failed'))).toBeNull();
    await tapAdd();
    expect(screen.getByText(i18n.t('shield:tile.failed'))).toBeTruthy();
  });

  it('shows a one-line how-to before Android 13', async () => {
    shield.quickSettingsTileSupport.mockResolvedValue('manual');
    await mount();
    expect(screen.getByText(i18n.t('shield:tile.hint'))).toBeTruthy();
    expect(screen.queryByTestId('quick-settings-tile-add')).toBeNull();
  });

  it('renders nothing on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    shield.quickSettingsTileSupport.mockResolvedValue('request');
    await mount();
    expect(screen.queryByTestId('quick-settings-tile-card')).toBeNull();
  });

  it('names the tile in every language', async () => {
    for (const lang of ['en', 'my', 'id', 'tl', 'th']) {
      await i18n.changeLanguage(lang);
      for (const key of ['title', 'body', 'add', 'added', 'failed', 'hint'] as const) {
        expect(i18n.t(`shield:tile.${key}`)).not.toContain('$t(');
        expect(i18n.exists(`shield:tile.${key}`, { lng: lang, fallbackLng: false })).toBe(true);
      }
      expect(i18n.exists('live:companion.sharingNotice', { lng: lang, fallbackLng: false })).toBe(true);
    }
  });
});
