import { MAX_HISTORY, addHistory, clearHistory, loadHistory } from '../lib/history';
import { buildMockResponse } from '../api/mock';

const entry = (n: number) => {
  const result = buildMockResponse({ kind: 'job', language: 'en', text: `offer ${n}` });
  return { id: `chk_${n}`, createdAt: result.createdAt, language: 'en' as const, result };
};

describe('history storage', () => {
  beforeEach(() => clearHistory());

  it('stores newest first and de-duplicates by id', async () => {
    await addHistory(entry(1));
    await addHistory(entry(2));
    const list = await addHistory(entry(1));
    expect(list.map(e => e.id)).toEqual(['chk_1', 'chk_2']);
    expect((await loadHistory()).length).toBe(2);
  });

  it('caps the list', async () => {
    for (let i = 0; i < MAX_HISTORY + 5; i++) await addHistory(entry(i));
    expect((await loadHistory()).length).toBe(MAX_HISTORY);
  });
});
