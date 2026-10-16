import type { CheckUpdate } from '../api/types';
import { advance, FINISHED, stageKey, START } from '../lib/checkProgress';

const done = (stage: 'extract' | 'links' | 'ground' | 'intel'): CheckUpdate => ({ type: 'stage', stage, status: 'done', ms: 0 });

describe('check progress', () => {
  it('moves only on finished stages and never backwards', () => {
    let p = advance(START, { type: 'stage', stage: 'extract', status: 'start', ms: 0 });
    expect(p).toBe(START);
    p = advance(p, done('extract'));
    expect(p.phase).toBe('sources');
    const floors = [p.floor];
    for (const s of ['links', 'intel', 'links', 'ground'] as const) {
      p = advance(p, done(s));
      floors.push(p.floor);
    }
    expect(floors).toEqual([...floors].sort((a, b) => a - b));
    expect(p.phase).toBe('score');
    expect(p.ceiling).toBeLessThan(1);
  });

  it('keeps reading until the input is read, even when a source finishes first', () => {
    const p = advance(START, done('ground'));
    expect(p.phase).toBe('read');
    expect(p.floor).toBe(0);
    expect(advance(p, done('extract')).floor).toBeGreaterThan(advance(START, done('extract')).floor);
  });

  it('fills the ring only when the final result arrives', () => {
    const p = advance(advance(START, done('extract')), { type: 'final', response: {} as never });
    expect(p.floor).toBe(FINISHED.floor);
    expect(stageKey(START)).toBe('read');
  });
});
