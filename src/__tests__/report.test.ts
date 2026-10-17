import type { Flag } from '../api/types';
import { VERDICT_STYLES, filledSegments, groupFlags, linkStatus, sourceLines, telUrl, verdictFromScore } from '../lib/report';
import { scamTypeLabel, verdictLabel } from '../lib/labels';
import { draftFromShare } from '../lib/share';
import { buildRequest } from '../lib/request';
import { base64Bytes, prepareImage, prepareSharedImage } from '../lib/image';
import { findVoiceLocale, pickSpeechLocale } from '../lib/speech';
import { isCleartext, reportIdFromUrl, toCheckResponse } from '../lib/shield';

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
    expect(verdictLabel('safe')).toBe('Low risk');
  });

  it('groups flags by family in priority order, high severity first', () => {
    const groups = groupFlags([flag('pressure', 'low'), { ...flag('trafficking', 'medium'), label: 'b' }, { ...flag('trafficking', 'high'), label: 'a' }]);
    expect(groups.map(g => g.family)).toEqual(['trafficking', 'pressure']);
    expect(groups[0].flags.map(f => f.label)).toEqual(['a', 'b']);
  });

  it('builds tel urls and picks a hotline', () => {
    expect(telUrl('+66 (0) 2-123')).toBe('tel:+6602123');
  });
});

describe('request building', () => {
  it('sends home country and shares signals only when opted in', () => {
    const base = { kind: 'job' as const, text: 'x', url: '', destination: '', language: 'en' as const };
    expect(buildRequest({ ...base, home: 'Myanmar' })).toMatchObject({ context: { home: 'Myanmar' } });
    expect(buildRequest({ ...base, shareSignals: true })).toMatchObject({ shareSignals: true });
    expect(buildRequest(base)).toMatchObject({ shareSignals: false });
    expect(buildRequest({ ...base, shareSignals: false })).toMatchObject({ shareSignals: false });
  });

  it('omits empty fields and adds context', () => {
    const r = buildRequest({ kind: 'job', text: ' hi ', url: '', destination: 'Bangkok', language: 'tl' });
    expect(r).toEqual({ kind: 'job', language: 'tl', text: 'hi', context: { destination: 'Bangkok' }, shareSignals: false });
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
  it('reads a file-manager share through its content URI, not the raw storage path', () => {
    const shared = { files: [{ path: 'file:///storage/emulated/0/Pictures/offer.png', contentUri: 'content://com.android.externalstorage.documents/document/primary%3APictures%2Foffer.png', mimeType: 'image/png' }] };
    expect(draftFromShare(shared)?.imageUri).toBe(shared.files[0].contentUri);
  });
});

describe('shared image copy', () => {
  const deps = () => {
    const calls: string[] = [];
    return {
      calls,
      copy: jest.fn(async (from: string, to: string) => void calls.push(`copy ${from} -> ${to}`)),
      remove: jest.fn(async (uri: string) => void calls.push(`remove ${uri}`)),
      cacheDir: 'file:///data/user/0/app/cache/',
      prepare: jest.fn(async (uri: string) => {
        calls.push(`prepare ${uri}`);
        return { base64: 'x', mimeType: 'image/jpeg' as const, bytes: 1, uri: 'out' };
      }),
    };
  };

  it('copies a content URI into the app cache before reading, then deletes the copy', async () => {
    const d = deps();
    await prepareSharedImage('content://x/doc/1', d);
    expect(d.calls).toHaveLength(3);
    expect(d.calls[0]).toMatch(/^copy content:\/\/x\/doc\/1 -> file:\/\/\/data\/user\/0\/app\/cache\/shared-\d+$/);
    expect(d.calls[1]).toBe(`prepare ${d.calls[0].split(' -> ')[1]}`);
    expect(d.calls[2]).toBe(`remove ${d.calls[0].split(' -> ')[1]}`);
  });

  it('deletes the copy when reading fails, and reads app files directly', async () => {
    const d = deps();
    d.prepare.mockRejectedValueOnce(new Error('bad image'));
    await expect(prepareSharedImage('content://x/doc/2', d)).rejects.toThrow('bad image');
    expect(d.remove).toHaveBeenCalledTimes(1);
    const e = deps();
    await prepareSharedImage('file:///data/user/0/app/cache/IMG_1.png', e);
    expect(e.copy).not.toHaveBeenCalled();
    expect(e.prepare).toHaveBeenCalledWith('file:///data/user/0/app/cache/IMG_1.png');
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

describe('shield results', () => {
  it('parses report deep links', () => {
    expect(reportIdFromUrl('saferoute://report/chk_abc123')).toBe('chk_abc123');
    expect(reportIdFromUrl('https://example.com/report/1')).toBeNull();
    expect(reportIdFromUrl(null)).toBeNull();
  });
  it('maps an overlay result to a full response', () => {
    const r = toCheckResponse({ id: 'chk_1', createdAt: '2026-10-14T00:00:00Z', kind: 'screen', verdict: 'danger', score: 88, title: 't', summary: 's', flags: [{ family: 'pressure', label: 'Rush', severity: 'medium' }] });
    expect(r.flags[0].evidence).toBe('');
    expect(r.spokenWarning).toBe('s');
    expect(r.actions).toEqual([]);
    expect(isCleartext('http://x.test')).toBe(true);
  });
});

describe('link status pill', () => {
  const clean = { url: 'https://parcel-th.top/pay', webRisk: 'clean' as const };
  const serious = (evidence: string, family: Flag['family'] = 'link_risk'): Flag => ({ family, severity: 'high', label: 'Domain not registered', evidence });

  it('says "No known threats" only when nothing serious points at the link', () => {
    expect(linkStatus(clean, [])).toBe('clean');
    expect(linkStatus({ ...clean, domainAgeDays: 400 }, [flag('link_risk', 'medium')])).toBe('clean');
  });

  it('turns neutral for a very new domain or a serious link sign', () => {
    expect(linkStatus({ ...clean, domainAgeDays: 3 }, [])).toBe('notListed');
    expect(linkStatus(clean, [serious('parcel-th.top')])).toBe('notListed');
    expect(linkStatus(clean, [serious('', 'known_bad')])).toBe('notListed');
  });

  it('keeps the other link clean when the serious sign names a different link', () => {
    const other = { url: 'https://thailandpost.co.th', webRisk: 'clean' as const };
    const links = [clean, other];
    expect(linkStatus(other, [serious('https://parcel-th.top/pay')], links)).toBe('clean');
    expect(linkStatus(clean, [serious('https://parcel-th.top/pay')], links)).toBe('notListed');
  });

  it('leaves Google threat results as they are', () => {
    expect(linkStatus({ ...clean, webRisk: 'social_engineering', domainAgeDays: 2 }, [])).toBe('social_engineering');
    expect(linkStatus({ ...clean, webRisk: 'unknown' }, [])).toBe('unknown');
  });
});

describe('source lines', () => {
  it('shows the title and the real domain, never a redirect URL', () => {
    const redirect = 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AbC123';
    expect(sourceLines({ title: 'thaipost.net', url: redirect })).toEqual({ title: 'thaipost.net', domain: undefined });
    expect(sourceLines({ title: 'Thailand Post warns of SMS scam', url: 'https://www.google.com/url?q=https://www.thailandpost.co.th/news&sa=U' })).toEqual({
      title: 'Thailand Post warns of SMS scam',
      domain: 'thailandpost.co.th',
    });
    expect(sourceLines({ title: 'DMW', url: 'https://dmw.gov.ph/a' })).toEqual({ title: 'DMW', domain: 'dmw.gov.ph' });
    expect(sourceLines({ title: 'Scam alert', url: redirect })).toEqual({ title: 'Scam alert', domain: undefined });
  });
});

describe('scam type label', () => {
  it('names a link check as a suspicious link', () => {
    expect(scamTypeLabel('other', 'link')).toBe('Suspicious link');
    expect(scamTypeLabel('other', 'message')).toBe('Suspicious message');
    expect(scamTypeLabel('parcel_phishing', 'link')).toBe('Possible parcel phishing');
  });
});
