import type { Flag } from '../api/types';
import { VERDICT_STYLES, filledSegments, groupFlags, hotlineNumber, telUrl, verdictFromScore } from '../lib/report';
import { draftFromShare } from '../lib/share';
import { buildRequest } from '../lib/request';
import { base64Bytes, prepareImage } from '../lib/image';
import { findVoiceLocale, pickSpeechLocale } from '../lib/speech';

const flag = (family: Flag['family'], severity: Flag['severity'], label = family): Flag => ({ family, severity, label, evidence: '' });

describe('report mapping', () => {
  it('maps score bands', () => {
    expect(verdictFromScore(34)).toBe('safe');
    expect(verdictFromScore(35)).toBe('careful');
    expect(verdictFromScore(69)).toBe('careful');
    expect(verdictFromScore(70)).toBe('danger');
    expect(filledSegments(0)).toBe(1);
    expect(filledSegments(100)).toBe(4);
  });

  it('has a colour per verdict', () => {
    expect(VERDICT_STYLES.danger.background).not.toBe(VERDICT_STYLES.careful.background);
    expect(VERDICT_STYLES.safe.label).toBe('Low risk');
  });

  it('groups flags by family in priority order, high severity first', () => {
    const groups = groupFlags([flag('pressure', 'low'), { ...flag('trafficking', 'medium'), label: 'b' }, { ...flag('trafficking', 'high'), label: 'a' }]);
    expect(groups.map(g => g.family)).toEqual(['trafficking', 'pressure']);
    expect(groups[0].flags.map(f => f.label)).toEqual(['a', 'b']);
  });

  it('builds tel urls and picks a hotline', () => {
    expect(telUrl('+66 (0) 2-123')).toBe('tel:+6602123');
    expect(hotlineNumber({ label: 'x', type: 'call', value: ' 1300 ' })).toBe('1300');
  });
});

describe('request building', () => {
  it('omits empty fields and adds context', () => {
    const r = buildRequest({ kind: 'job', text: ' hi ', url: '', destination: 'Bangkok', language: 'tl' });
    expect(r).toEqual({ kind: 'job', language: 'tl', text: 'hi', context: { destination: 'Bangkok' } });
  });
});

describe('share intent mapping', () => {
  it('treats a lone url as a link check', () => {
    expect(draftFromShare({ text: 'https://tiktok.com/@x/video/1' })).toMatchObject({ url: 'https://tiktok.com/@x/video/1', kind: 'link' });
  });
  it('keeps plain text and images', () => {
    expect(draftFromShare({ text: 'hello there' })).toMatchObject({ text: 'hello there', kind: 'message' });
    expect(draftFromShare({ files: [{ path: '/data/a.png', mimeType: 'image/png' }] })).toMatchObject({ imageUri: 'file:///data/a.png' });
    expect(draftFromShare({ text: '  ' })).toBeNull();
  });
});

describe('image preparation', () => {
  it('computes base64 byte size', () => {
    expect(base64Bytes('QUJD')).toBe(3);
    expect(base64Bytes('QUI=')).toBe(2);
  });
  it('steps down until the image fits', async () => {
    const sizes = [4000, 3000, 200];
    const calls: number[] = [];
    const manipulate = jest.fn(async (_u: string, width: number) => {
      calls.push(width);
      return { uri: 'out', base64: 'A'.repeat(sizes.shift() ?? 4) };
    });
    const out = await prepareImage('in', 1000, manipulate);
    expect(out.bytes).toBeLessThanOrEqual(1000);
    expect(manipulate).toHaveBeenCalledTimes(3);
  });
  it('throws when nothing fits', async () => {
    await expect(prepareImage('in', 10, async () => ({ uri: 'o', base64: 'A'.repeat(400) }))).rejects.toThrow(/too large/);
  });
});

describe('speech locale', () => {
  it('prefers an exact voice, then the same language, then English', () => {
    expect(pickSpeechLocale(['en-US', 'id-ID'], 'id')).toBe('id-ID');
    expect(pickSpeechLocale(['en-GB', 'fil-PH'], 'tl')).toBe('fil-PH');
    expect(pickSpeechLocale(['en-US'], 'my')).toBe('en-US');
  });
});

describe('voice lookup', () => {
  it('returns undefined when no voice matches', () => {
    expect(findVoiceLocale(['en-US'], 'my')).toBeUndefined();
    expect(findVoiceLocale(['my_MM'], 'my')).toBe('my_MM');
  });
});
