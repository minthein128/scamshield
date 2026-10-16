/**
 * Vector art and pose rules for SafeRoute's voice avatar, the pyit taing htaung doll, in a 100 x 100 box.
 * Shared by Avatar.tsx and scripts/render-avatar.mjs, so keep it free of imports.
 */

export type AvatarConcept = 'C';
export type AvatarState = 'idle' | 'listening' | 'speaking' | 'thinking';

export interface Shape {
  d?: string;
  circle?: [number, number, number];
  fill?: string;
  stroke?: string;
  width?: number;
  opacity?: number;
}

export interface AvatarArt {
  name: string;
  disc: string;
  /** Drawn inside the disc but outside the moving figure. */
  ground: Shape[];
  back: Shape[];
  front: Shape[];
  /** Rotation origin of the figure, in box units. */
  pivot: [number, number];
  /** Square of the box [x, y, size] that fills the disc. */
  view: [number, number, number];
}

export const n = (v: number) => Math.round(v * 100) / 100;

/** An ellipse as a path, rotated by deg around its centre. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, deg = 0): string {
  const a = (deg * Math.PI) / 180;
  const dx = rx * Math.cos(a);
  const dy = rx * Math.sin(a);
  return `M${n(cx + dx)} ${n(cy + dy)}A${rx} ${ry} ${deg} 1 0 ${n(cx - dx)} ${n(cy - dy)}A${rx} ${ry} ${deg} 1 0 ${n(cx + dx)} ${n(cy + dy)}Z`;
}

export const fill = (d: string, color: string, opacity?: number): Shape => ({ d, fill: color, opacity });
export const line = (d: string, color: string, width: number): Shape => ({ d, stroke: color, width });
export const dot = (cx: number, cy: number, r: number, color: string): Shape => ({ circle: [cx, cy, r], fill: color });

export function blossom(cx: number, cy: number, r: number, petal: string, heart: string): Shape[] {
  const petals = [0, 1, 2, 3, 4].map(i => {
    const a = (i * 72 - 90) * (Math.PI / 180);
    return dot(n(cx + Math.cos(a) * r), n(cy + Math.sin(a) * r), r * 0.95, petal);
  });
  return [...petals, dot(cx, cy, r * 0.62, heart)];
}

const C_COL = {
  disc: '#FCEFD2',
  body: '#B8321C',
  bodyDeep: '#8E2614',
  face: '#FFF6EA',
  hair: '#1F1A17',
  gold: '#F2B01E',
  cheek: '#F6A08C',
  lips: '#B8321C',
  shadow: '#1F1A17',
};

const EGG = 'M50 12 C69 12 80.5 32 80.5 57 C80.5 78 67.5 91 50 91 C32.5 91 19.5 78 19.5 57 C19.5 32 31 12 50 12 Z';

const doll: AvatarArt = {
  name: 'Pyit taing htaung roly-poly doll',
  disc: C_COL.disc,
  ground: [fill(ellipse(50, 92.5, 21, 3.2), C_COL.shadow, 0.16)],
  back: [
    fill(EGG, C_COL.body),
    fill('M19.7 53 C20.5 30.5 31.5 12 50 12 C68.5 12 79.5 30.5 80.3 53 Q50 62 19.7 53 Z', C_COL.face),
    line('M19.9 53.2 Q50 62.2 80.1 53.2', C_COL.gold, 1.8),
    fill('M20.6 69 C27 76.5 39 80 50 80 C61 80 73 76.5 79.4 69 C76.5 82 64.5 91 50 91 C35.5 91 23.5 82 20.6 69 Z', C_COL.bodyDeep),
    line('M20.8 69 C27 76.5 39 80 50 80 C61 80 73 76.5 79.2 69', C_COL.gold, 1.6),
    ...blossom(50, 70.5, 2.2, C_COL.gold, C_COL.bodyDeep),
    dot(38, 68, 1.2, C_COL.gold),
    dot(62, 68, 1.2, C_COL.gold),
    dot(50, 85.5, 1.2, C_COL.gold),
    fill('M24 34 C16.5 33 15.5 45 23.5 46 Z', C_COL.face),
    fill('M76 34 C83.5 33 84.5 45 76.5 46 Z', C_COL.face),
    line('M22.4 37.4 Q19.6 40 22.4 42.6', C_COL.body, 1.2),
    line('M77.6 37.4 Q80.4 40 77.6 42.6', C_COL.body, 1.2),
    fill('M23.6 31 C28 19 38 12 50 12 C62 12 72 19 76.4 31 C69 25.5 60 23.5 50 25 C40 23.5 31 25.5 23.6 31 Z', C_COL.hair),
    fill('M50 1.5 C56 1.5 58.5 6 57.2 10.6 Q50 14.4 42.8 10.6 C41.5 6 44 1.5 50 1.5 Z', C_COL.hair),
    line('M43.8 11.4 Q50 14.2 56.2 11.4', C_COL.gold, 1.3),
    line('M36.2 35 Q40.5 29.6 46 33.4', C_COL.hair, 1.2),
    line('M54 33.4 Q59.5 29.6 63.8 35', C_COL.hair, 1.2),
    fill(ellipse(42, 39.8, 2, 2.5), C_COL.hair),
    fill(ellipse(58, 39.8, 2, 2.5), C_COL.hair),
    dot(42.6, 39.1, 0.6, '#FFFFFF'),
    dot(58.6, 39.1, 0.6, '#FFFFFF'),
    { circle: [36.5, 46.5, 3.6], fill: C_COL.cheek, opacity: 0.75 },
    { circle: [63.5, 46.5, 3.6], fill: C_COL.cheek, opacity: 0.75 },
    fill('M46.6 47.6 Q50 51.4 53.4 47.6 Q50 49 46.6 47.6 Z', C_COL.lips),
    line('M46.6 47.6 Q50 51.4 53.4 47.6', C_COL.lips, 1.1),
  ],
  front: [],
  pivot: [50, 74],
  view: [3, 0, 95],
};

export const AVATAR_ART: Record<AvatarConcept, AvatarArt> = { C: doll };

export const HALO_COLORS: Record<AvatarState, string> = {
  idle: '#F2B01E',
  listening: '#B8321C',
  speaking: '#F2B01E',
  thinking: '#F2B01E',
};

/** Where every animated value rests for a state and level; loops add motion on top. */
export interface AvatarPose {
  haloScale: number;
  haloOpacity: number;
  haloColor: string;
  /** Held lean of the doll, in degrees. */
  tilt: number;
  /** Swing of the rocking loop, in degrees each way; 0 stops it. */
  swing: number;
  /** Halo breathes on a slow loop. */
  breathe: boolean;
}

const clamp = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

export function avatarPose(state: AvatarState, level = 0, reduceMotion = false): AvatarPose {
  const haloColor = HALO_COLORS[state];
  if (reduceMotion) {
    const haloOpacity = { idle: 0, listening: 0.5, speaking: 0.5, thinking: 0.3 }[state];
    return { haloScale: 1.12, haloOpacity, haloColor, tilt: 0, swing: 0, breathe: false };
  }
  const amp = clamp(level);
  switch (state) {
    case 'listening':
      return { haloScale: 1.08 + 0.16 * amp, haloOpacity: 0.35 + 0.4 * amp, haloColor, tilt: -3, swing: 0, breathe: false };
    case 'speaking':
      return { haloScale: 1.06 + 0.2 * amp, haloOpacity: 0.3 + 0.45 * amp, haloColor, tilt: 0, swing: 2 + 6 * amp, breathe: false };
    case 'thinking':
      return { haloScale: 1.1, haloOpacity: 0.3, haloColor, tilt: 0, swing: 2, breathe: true };
    default:
      return { haloScale: 1, haloOpacity: 0, haloColor, tilt: 0, swing: 0, breathe: false };
  }
}
