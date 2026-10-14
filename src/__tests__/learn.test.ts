import type { FlagFamily } from '../api/types';
import { RED_FLAGS, SCAM_TYPES, SHIELD_STEPS, findScamType } from '../screens/learn/content';

const FAMILIES: FlagFamily[] = ['too_good', 'pressure', 'payment_route', 'identity', 'link_risk', 'known_bad', 'trafficking'];

describe('learn content', () => {
  it('has the five scam types with unique ids', () => {
    expect(SCAM_TYPES).toHaveLength(5);
    expect(new Set(SCAM_TYPES.map(s => s.id)).size).toBe(5);
  });

  it.each(SCAM_TYPES.map(s => [s.id, s] as const))('%s guide is complete', (_id, scam) => {
    expect(scam.title).toBeTruthy();
    expect(scam.hook).toBeTruthy();
    expect(scam.howItStarts.length).toBeGreaterThan(40);
    expect(scam.signs.length).toBeGreaterThanOrEqual(4);
    expect(scam.signs.length).toBeLessThanOrEqual(5);
    scam.signs.forEach(s => expect(FAMILIES).toContain(s.family));
    expect(scam.example.length).toBeGreaterThanOrEqual(2);
    expect(scam.actions.map(a => a.kind).sort()).toEqual(['check', 'help', 'noPay']);
    expect(findScamType(scam.id)).toBe(scam);
  });

  it('has a chip for every flag family', () => {
    expect(RED_FLAGS.map(f => f.family).sort()).toEqual([...FAMILIES].sort());
    RED_FLAGS.forEach(f => {
      expect(f.name).toBeTruthy();
      expect(f.explain).toBeTruthy();
      expect(f.phrase).toBeTruthy();
    });
  });

  it('has a 3-step shield how-to', () => {
    expect(SHIELD_STEPS).toHaveLength(3);
  });
});
