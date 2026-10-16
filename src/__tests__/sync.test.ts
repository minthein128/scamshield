import { buildMockResponse } from '../api/mock';
import type { TrustedContact } from '../lib/contacts';
import { mergeContacts } from '../lib/contacts';
import { MAX_HISTORY, type HistoryEntry } from '../lib/history';
import {
  contactToDoc,
  docToContact,
  docToHistory,
  docToProfile,
  historyMissingRemotely,
  historyToDoc,
  mergeHistory,
  isLegacyDoc,
  legacyToSlim,
  MAX_SUMMARY_CHARS,
  profileToDoc,
  scoreBucket,
} from '../lib/sync';

const entry = (n: number, createdAt = `2026-10-${String(10 + n).padStart(2, '0')}T08:00:00.000Z`): HistoryEntry => {
  const result = { ...buildMockResponse({ kind: 'job', language: 'en', text: `offer ${n}` }), id: `chk_${n}`, createdAt };
  return { id: result.id, createdAt, language: 'en', source: `offer ${n}`, result };
};

const SLIM_KEYS = ['createdAt', 'kind', 'language', 'scamType', 'scoreBucket', 'summary', 'title', 'verdict'];

const detailed = (n: number): HistoryEntry => {
  const e = entry(n);
  const result = {
    ...e.result,
    verdict: 'danger' as const,
    score: 87,
    title: 'Job offer shows warning signs',
    summary: 'The offer asks for a fee before the job starts.',
    flags: [{ family: 'payment_route' as const, label: 'Fee first', evidence: 'Send 5000 baht to Khun Somchai at 0812345678', severity: 'high' as const }],
    linkChecks: [{ url: 'https://pay-fee.example/a?u=me', webRisk: 'unknown' as const }],
    sources: [{ title: 'Report', url: 'https://news.example/x' }],
    actions: [{ label: 'Block 0812345678', type: 'block' as const, value: '0812345678' }],
    spokenWarning: 'Do not pay Khun Somchai',
    imageBase64: 'AAAA',
  };
  return { ...e, source: 'Hi Mya, send 5000 to 0812345678', result } as HistoryEntry;
};

describe('history sync mapping', () => {
  it('uploads only the verdict, score bucket, type, title, summary, language, kind and date', () => {
    const doc = historyToDoc(detailed(1));
    expect(Object.keys(doc).sort()).toEqual(SLIM_KEYS);
    expect(doc).toMatchObject({ verdict: 'danger', scoreBucket: 80, kind: 'job', language: 'en', title: 'Job offer shows warning signs' });
    const text = JSON.stringify(doc);
    for (const leak of ['0812345678', 'Somchai', 'Mya', 'pay-fee.example', 'news.example', 'AAAA', 'evidence', 'source']) expect(text).not.toContain(leak);
  });

  it('buckets scores 20 wide and clips long text', () => {
    expect([0, 19, 20, 59, 60, 99, 100, -5, Number.NaN].map(scoreBucket)).toEqual([0, 0, 20, 40, 60, 80, 80, 0, 0]);
    const e = entry(3);
    const doc = historyToDoc({ ...e, result: { ...e.result, summary: 'x'.repeat(70000) } });
    expect(doc.summary.length).toBe(MAX_SUMMARY_CHARS);
  });

  it('reads a slim document back as a report without flags', () => {
    const e = detailed(4);
    const back = docToHistory(e.id, historyToDoc(e) as unknown as Record<string, unknown>);
    expect(back?.result).toMatchObject({ id: e.id, verdict: 'danger', score: 80, title: e.result.title, flags: [], linkChecks: [], actions: [] });
    expect(back?.source).toBeUndefined();
  });

  it('rewrites an old full-report document in the slim shape', () => {
    const e = detailed(5);
    const legacy = { createdAt: e.createdAt, language: 'en', source: e.source, report: JSON.stringify(e.result) };
    expect(isLegacyDoc(legacy)).toBe(true);
    const slim = legacyToSlim(legacy);
    expect(slim).toEqual(historyToDoc(e));
    expect(JSON.stringify(slim)).not.toContain('0812345678');
    expect(docToHistory(e.id, legacy)?.result.flags).toEqual([]);
  });

  it('drops malformed remote documents', () => {
    expect(docToHistory('a', { createdAt: 'x', report: '{oops' })).toBeNull();
    expect(docToHistory('a', { createdAt: 'x', report: '{"verdict":"maybe"}' })).toBeNull();
    expect(docToHistory('a', { report: '{}' })).toBeNull();
    expect(docToHistory('a', { createdAt: 'x', verdict: 'nope' })).toBeNull();
    expect(legacyToSlim({ createdAt: 'x', report: '{oops' })).toBeNull();
  });

  it('keeps the full local report when the account has the slim copy', () => {
    const local = detailed(6);
    const remote = docToHistory(local.id, historyToDoc(local) as unknown as Record<string, unknown>) as HistoryEntry;
    expect(mergeHistory([local], [remote])[0].result.flags).toHaveLength(1);
  });

  it('merges local and remote by id, newest first, capped', () => {
    const local = [entry(1), entry(2)];
    const remote = [entry(2), entry(3)];
    expect(mergeHistory(local, remote).map(e => e.id)).toEqual(['chk_3', 'chk_2', 'chk_1']);
    const many = Array.from({ length: MAX_HISTORY + 5 }, (_, i) => entry(i % 20, `2026-09-${String((i % 28) + 1).padStart(2, '0')}T00:00:${String(i).padStart(2, '0')}.000Z`));
    expect(mergeHistory(many, []).length).toBeLessThanOrEqual(MAX_HISTORY);
  });

  it('finds the checks that still need uploading', () => {
    expect(historyMissingRemotely([entry(1), entry(2)], [entry(2)]).map(e => e.id)).toEqual(['chk_1']);
  });
});

describe('contacts and profile sync mapping', () => {
  const contact: TrustedContact = { id: 'c_1', name: 'Mother', phone: '+959123456', updatedAt: '2026-10-14T00:00:00.000Z' };

  it('round-trips a contact', () => {
    expect(docToContact('c_1', contactToDoc(contact) as unknown as Record<string, unknown>)).toEqual(contact);
    expect(docToContact('c_2', { name: 'x' })).toBeNull();
  });

  it('merges contacts, keeping the newest copy and dropping duplicate numbers', () => {
    const newer = { ...contact, name: 'Mum', updatedAt: '2026-10-15T00:00:00.000Z' };
    const other = { id: 'c_2', name: 'Friend', phone: '+66811111', updatedAt: '2026-10-13T00:00:00.000Z' };
    const merged = mergeContacts([contact, other], [newer]);
    expect(merged.map(c => c.name)).toEqual(['Friend', 'Mum']);
    const dup = { id: 'c_9', name: 'Copy', phone: '+959123456', updatedAt: '2026-10-16T00:00:00.000Z' };
    expect(mergeContacts([contact], [dup]).length).toBe(1);
  });

  it('round-trips a profile and omits unset countries', () => {
    const doc = profileToDoc({ onboarded: true, shareSignals: true, sharingAsked: true, keepHistory: true, homeCountry: 'PH' }, 'tl', new Date('2026-10-14T00:00:00Z'));
    expect(doc).toEqual({ language: 'tl', homeCountry: 'PH', updatedAt: '2026-10-14T00:00:00.000Z' });
    expect(docToProfile(doc as unknown as Record<string, unknown>)).toEqual({ language: 'tl', profile: { onboarded: true, shareSignals: false, sharingAsked: false, keepHistory: true, homeCountry: 'PH' } });
    expect(docToProfile({ language: 'zz' })).toBeNull();
  });
});
