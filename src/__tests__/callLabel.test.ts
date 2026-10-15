import { callLabel, splitExtension } from '../lib/callLabel';
import { t } from '../i18n';

const tr = { call: (number: string) => t('report:call', { number }), ext: (ext: string) => t('report:callExt', { ext }) };

describe('call button label', () => {
  it('splits an extension off the number', () => {
    expect(splitExtension('(02) 8834 4000 local 4031')).toEqual({ base: '(02) 8834 4000', ext: '4031' });
    expect(splitExtension('1300')).toEqual({ base: '1300' });
  });

  it('shows the number on the first line and the hotline name on the second', () => {
    expect(callLabel({ number: '1300', dial: '1300', name: 'Social Assistance Center' }, tr)).toEqual({
      label: 'Call 1300',
      sub: 'Social Assistance Center',
    });
  });

  it('puts the extension on the second line', () => {
    const out = callLabel({ number: '(02) 8834 4000 local 4031', dial: '+63288344000', name: 'DFA' }, tr);
    expect(out).toEqual({ label: 'Call (02) 8834 4000', sub: 'then ask for local 4031' });
  });
});
