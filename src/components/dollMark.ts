/**
 * The SafeRoute brand mark: the pyit taing htaung doll, simplified from avatarArt.ts so it reads at 24 px.
 * Shared by BrandMark.tsx and scripts/render-brand.mjs, so keep it free of imports.
 */

export interface MarkShape {
  d?: string;
  circle?: [number, number, number];
  fill?: string;
  stroke?: string;
  width?: number;
  opacity?: number;
}

export const MARK_COLORS = {
  body: '#B8321C',
  bodyDeep: '#8E2614',
  face: '#FFF6EA',
  ink: '#1F1A17',
  gold: '#F2B01E',
  cheek: '#F6A08C',
} as const;

export const MARK_PATHS = {
  egg: 'M50 12 C69 12 80.5 32 80.5 57 C80.5 78 67.5 91 50 91 C32.5 91 19.5 78 19.5 57 C19.5 32 31 12 50 12 Z',
  bun: 'M50 1.5 C56 1.5 58.5 6 57.2 10.6 Q50 14.4 42.8 10.6 C41.5 6 44 1.5 50 1.5 Z',
  face: 'M19.7 53 C20.5 30.5 31.5 12 50 12 C68.5 12 79.5 30.5 80.3 53 Q50 62 19.7 53 Z',
  hair: 'M23.6 31 C28 19 38 12 50 12 C62 12 72 19 76.4 31 C69 25.5 60 23.5 50 25 C40 23.5 31 25.5 23.6 31 Z',
  hem: 'M20.6 69 C27 76.5 39 80 50 80 C61 80 73 76.5 79.4 69 C76.5 82 64.5 91 50 91 C35.5 91 23.5 82 20.6 69 Z',
  belt: 'M19.9 53.2 Q50 62.2 80.1 53.2',
  hemLine: 'M20.8 69 C27 76.5 39 80 50 80 C61 80 73 76.5 79.2 69',
  knot: 'M43.8 11.4 Q50 14.2 56.2 11.4',
  smile: 'M45.4 48 Q50 52.8 54.6 48',
  eyeLeft: 'M44.5 40A3 3.7 0 1 0 38.5 40A3 3.7 0 1 0 44.5 40Z',
  eyeRight: 'M61.5 40A3 3.7 0 1 0 55.5 40A3 3.7 0 1 0 61.5 40Z',
} as const;

/** Square box around the doll with room for a 3.5-unit rim: [x, y, size]. */
export const MARK_VIEW: [number, number, number] = [3, -2, 96];

function blossom(cx: number, cy: number, r: number, petal: string, heart: string): MarkShape[] {
  const petals = [0, 1, 2, 3, 4].map(i => {
    const a = ((i * 72 - 90) * Math.PI) / 180;
    return { circle: [Math.round((cx + Math.cos(a) * r) * 100) / 100, Math.round((cy + Math.sin(a) * r) * 100) / 100, r * 0.95], fill: petal } as MarkShape;
  });
  return [...petals, { circle: [cx, cy, r * 0.62], fill: heart }];
}

/** Full-colour doll. A rim colour outlines it so it separates from a dark or same-colour ground. */
export function markShapes(rim?: string): MarkShape[] {
  const p = MARK_PATHS;
  const c = MARK_COLORS;
  const outline: MarkShape[] = rim
    ? [
        { d: p.egg, fill: rim, stroke: rim, width: 7 },
        { d: p.bun, fill: rim, stroke: rim, width: 7 },
      ]
    : [];
  return [
    ...outline,
    { d: p.egg, fill: c.body },
    { d: p.bun, fill: c.ink },
    { d: p.face, fill: c.face },
    { d: p.hem, fill: c.bodyDeep },
    { d: p.belt, stroke: c.gold, width: 3.2 },
    { d: p.hemLine, stroke: c.gold, width: 2.2 },
    ...blossom(50, 70.5, 2.6, c.gold, c.bodyDeep),
    { d: p.hair, fill: c.ink },
    { d: p.knot, stroke: c.gold, width: 1.6 },
    { d: p.eyeLeft, fill: c.ink },
    { d: p.eyeRight, fill: c.ink },
    { circle: [35.5, 47.5, 3.8], fill: c.cheek, opacity: 0.8 },
    { circle: [64.5, 47.5, 3.8], fill: c.cheek, opacity: 0.8 },
    { d: p.smile, stroke: c.body, width: 2.2 },
  ];
}
