import { callLabel, splitExtension } from '../lib/callLabel';
import i18n, { t } from '../i18n';

const tr = { call: (number: string) => t('report:call', { number }), ext: (ext: string) => t('report:callExt', { ext }) };

describe('call button label', () => {
  it('splits an extension off the number', () => {
    expect(splitExtension('(02) 8834 4000 local 4031')).toEqual({ base: '(02) 8834 4000', ext: '4031' });
    expect(splitExtension('1300')).toEqual({ base: '1300' });
  });

  it('shows the number on the first line and the hotline name on the second', () => {
    expect(callLabel({ number: '1300', dial: '1300', name: 'Social Assistance Center', category: 'trafficking' as const }, tr)).toEqual({
      label: 'Call 1300',
      sub: 'Social Assistance Center',
    });
  });

  it('names the category in the UI language instead of the English hotline name', async () => {
    const police = { number: '199', dial: '199', name: 'Police emergency', category: 'police' as const };
    const labels: Record<string, string> = {};
    for (const lng of ['my', 'th', 'id', 'tl']) {
      await i18n.changeLanguage(lng);
      const out = callLabel(police, { ...tr, category: c => t(`report:callCategory.${c}`) });
      expect(out.sub).toBe(t('report:callCategory.police'));
      expect(out.sub).not.toBe('Police emergency');
      labels[lng] = out.sub ?? '';
    }
    expect(labels.my).toMatch(/[\u1000-\u109F]/);
    expect(labels.th).toMatch(/[\u0E00-\u0E7F]/);
    await i18n.changeLanguage('en');
  });

  it('puts the extension on the second line', () => {
    const out = callLabel({ number: '(02) 8834 4000 local 4031', dial: '+63288344000', name: 'DFA', category: 'consular' as const }, tr);
    expect(out).toEqual({ label: 'Call (02) 8834 4000', sub: 'then ask for local 4031' });
  });
});
