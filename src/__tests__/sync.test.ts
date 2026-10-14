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
  profileToDoc,
  stripImages,
} from '../lib/sync';

const entry = (n: number, createdAt = `2026-10-${String(10 + n).padStart(2, '0')}T08:00:00.000Z`): HistoryEntry => {
  const result = { ...buildMockResponse({ kind: 'job', language: 'en', text: `offer ${n}` }), id: `chk_${n}`, createdAt };
  return { id: result.id, createdAt, language: 'en', source: `offer ${n}`, result };
};

describe('history sync mapping', () => {
  it('round-trips a check through its document form', () => {
    const e = entry(1);
    const doc = historyToDoc(e);
    expect(doc).not.toBeNull();
    expect(typeof doc?.report).toBe('string');
    expect(docToHistory(e.id, doc as unknown as Record<string, unknown>)).toEqual(e);
  });

  it('never stores screenshot data', () => {
    const e = entry(2);
    const withImage = { ...e, result: { ...e.result, imageBase64: 'AAAA', nested: { imageBase64: 'BBBB', keep: 1 } } } as unknown as HistoryEntry;
    const doc = historyToDoc(withImage);
    expect(doc?.report).not.toContain('imageBase64');
    expect(doc?.report).not.toContain('AAAA');
    expect(JSON.parse(doc?.report ?? '{}').nested).toEqual({ keep: 1 });
    expect(stripImages({ a: [{ image: 'x', b: 1 }] })).toEqual({ a: [{ b: 1 }] });
  });

  it('skips a report that is too large for the rules', () => {
    const e = entry(3);
    expect(historyToDoc({ ...e, result: { ...e.result, summary: 'x'.repeat(70000) } })).toBeNull();
  });

  it('drops malformed remote documents', () => {
    expect(docToHistory('a', { createdAt: 'x', report: '{oops' })).toBeNull();
    expect(docToHistory('a', { createdAt: 'x', report: '{"verdict":"safe"}' })).toBeNull();
    expect(docToHistory('a', { report: '{}' })).toBeNull();
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
    const doc = profileToDoc({ onboarded: true, language: 'tl', shareSignals: true, homeCountry: 'PH' }, new Date('2026-10-14T00:00:00Z'));
    expect(doc).toEqual({ language: 'tl', homeCountry: 'PH', updatedAt: '2026-10-14T00:00:00.000Z' });
    expect(docToProfile(doc as unknown as Record<string, unknown>)).toEqual({ onboarded: true, language: 'tl', shareSignals: true, homeCountry: 'PH' });
    expect(docToProfile({ language: 'zz' })).toBeNull();
  });
});
