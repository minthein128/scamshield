/**
 * Vector art and pose rules for the SafeRoute voice avatar, in a 100 x 100 box.
 * Shared by Avatar.tsx and scripts/render-avatar.mjs, so keep it free of imports.
 */

export type AvatarConcept = 'A' | 'B' | 'C';
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
  /** Fades in with the feature motion: closed eyelids (A) or a lit mane (B). */
  overlay: Shape[];
  front: Shape[];
  /** Rotation origin of the figure, in box units. */
  pivot: [number, number];
  /** Square of the box [x, y, size] that fills the disc. */
  view: [number, number, number];
}

const n = (v: number) => Math.round(v * 100) / 100;

/** An ellipse as a path, rotated by deg around its centre. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, deg = 0): string {
  const a = (deg * Math.PI) / 180;
  const dx = rx * Math.cos(a);
  const dy = rx * Math.sin(a);
  return `M${n(cx + dx)} ${n(cy + dy)}A${rx} ${ry} ${deg} 1 0 ${n(cx - dx)} ${n(cy - dy)}A${rx} ${ry} ${deg} 1 0 ${n(cx + dx)} ${n(cy + dy)}Z`;
}

const fill = (d: string, color: string, opacity?: number): Shape => ({ d, fill: color, opacity });
const line = (d: string, color: string, width: number): Shape => ({ d, stroke: color, width });
const dot = (cx: number, cy: number, r: number, color: string): Shape => ({ circle: [cx, cy, r], fill: color });

function blossom(cx: number, cy: number, r: number, petal: string, heart: string): Shape[] {
  const petals = [0, 1, 2, 3, 4].map(i => {
    const a = (i * 72 - 90) * (Math.PI / 180);
    return dot(n(cx + Math.cos(a) * r), n(cy + Math.sin(a) * r), r * 0.95, petal);
  });
  return [...petals, dot(cx, cy, r * 0.62, heart)];
}

/** A soft hand-painted patch: an ellipse with a slightly uneven edge. */
function blob(cx: number, cy: number, rx: number, ry: number, jitter: number[]): string {
  const pts = jitter.map((j, i) => {
    const a = (i / jitter.length) * Math.PI * 2;
    return [cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j];
  });
  const mid = (i: number) => {
    const [x0, y0] = pts[i % pts.length];
    const [x1, y1] = pts[(i + 1) % pts.length];
    return `${n((x0 + x1) / 2)} ${n((y0 + y1) / 2)}`;
  };
  return `M${mid(0)}${pts.map((_, i) => `Q${n(pts[(i + 1) % pts.length][0])} ${n(pts[(i + 1) % pts.length][1])} ${mid(i + 1)}`).join('')}Z`;
}

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}`;
};

/** A ring of flame-shaped mane tufts that flow down both sides, in the Myanmar scroll style. */
function flames(cx: number, cy: number, count: number, inner: number, outer: number, spread: number, curl: number, color: string, offset = 0): Shape[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i * 360) / count + offset;
    const side = Math.cos((a * Math.PI) / 180);
    const c = Math.abs(side) < 0.2 ? 0 : Math.sign(side) * curl;
    const mid = (inner + outer) / 2;
    return fill(
      `M${polar(cx, cy, inner, a - spread)}Q${polar(cx, cy, mid + 3, a - spread * 0.6 + c * 0.2)} ${polar(cx, cy, outer, a + c)}Q${polar(cx, cy, mid + 3, a + spread * 0.6 + c * 0.2)} ${polar(cx, cy, inner, a + spread)}Z`,
      color,
    );
  });
}

const A_COL = {
  disc: '#DBE5FF',
  hair: '#1F1A17',
  sheen: '#4A403A',
  skin: '#D39A6B',
  shade: '#B67A4C',
  thanaka: '#F3E4B9',
  blouse: '#1D4ED8',
  blouseLine: '#DBE5FF',
  gold: '#F2B01E',
  goldDeep: '#B45309',
  leaf: '#4D7C0F',
  lips: '#A3402A',
};

const woman: AvatarArt = {
  name: 'Myanmar woman in yinzi with thanaka and a padauk sprig',
  disc: A_COL.disc,
  ground: [],
  back: [
    fill(ellipse(50, 45, 20.5, 22), A_COL.hair),
    dot(46, 20, 10.5, A_COL.hair),
    line('M39.5 19.5 Q44.5 13.5 51.5 15.2', A_COL.sheen, 1.1),
    fill('M42.5 55L57.5 55L59 72L41 72Z', A_COL.shade),
    fill('M4 99C6 81 23 72 40 70.5L60 70.5C77 72 94 81 96 99Z', A_COL.blouse),
    fill('M39.5 70.6Q50 80 60.5 70.6L63 72.2Q50 85 37 72.2Z', A_COL.blouseLine),
    line('M50 80.5C58 81.5 66 83 73 88', A_COL.blouseLine, 1.4),
    dot(57, 81.3, 1.3, A_COL.gold),
    dot(63.5, 82.6, 1.3, A_COL.gold),
    dot(69.5, 85.4, 1.3, A_COL.gold),
    fill(ellipse(33.2, 48.5, 3.2, 4.6), A_COL.skin),
    fill(ellipse(66.8, 48.5, 3.2, 4.6), A_COL.skin),
    dot(33.2, 54.2, 1.7, A_COL.gold),
    dot(66.8, 54.2, 1.7, A_COL.gold),
    fill('M33.5 44.5 C33.5 32.5 41 27.5 50 27.5 C59 27.5 66.5 32.5 66.5 44.5 C66.5 56.5 59 66 50 66 C41 66 33.5 56.5 33.5 44.5 Z', A_COL.skin),
    fill('M32.2 47 C30.5 32 38.5 24.5 50 24.5 C61.5 24.5 69.5 32 67.8 47 C66.5 38.5 59.5 33 50 33 C40.5 33 33.5 38.5 32.2 47 Z', A_COL.hair),
    fill(blob(40.2, 53.4, 6, 5.1, [1, 0.92, 1.06, 0.95, 1.04, 0.9, 1.05, 0.97, 1.02, 0.93]), A_COL.thanaka, 0.4),
    fill(blob(40.2, 53.4, 4.8, 4.1, [1, 0.92, 1.06, 0.95, 1.04, 0.9, 1.05, 0.97, 1.02, 0.93]), A_COL.thanaka, 0.85),
    fill(blob(59.8, 53.4, 6, 5.1, [0.96, 1.05, 0.91, 1.03, 0.95, 1.06, 0.92, 1.02, 0.97, 1.04]), A_COL.thanaka, 0.4),
    fill(blob(59.8, 53.4, 4.8, 4.1, [0.96, 1.05, 0.91, 1.03, 0.95, 1.06, 0.92, 1.02, 0.97, 1.04]), A_COL.thanaka, 0.85),
    line('M39.2 41.6 Q43.4 39.2 47.2 41.2', A_COL.hair, 1.4),
    line('M52.8 41.2 Q56.6 39.2 60.8 41.6', A_COL.hair, 1.4),
    fill(ellipse(43.5, 47, 1.8, 2.1), A_COL.hair),
    fill(ellipse(56.5, 47, 1.8, 2.1), A_COL.hair),
    line('M40.9 45.6 Q43.5 43.7 46.1 45.4', A_COL.hair, 1.1),
    line('M53.9 45.4 Q56.5 43.7 59.1 45.6', A_COL.hair, 1.1),
    dot(44.1, 46.3, 0.55, '#FFFFFF'),
    dot(57.1, 46.3, 0.55, '#FFFFFF'),
    line('M48.8 52.2 Q50 53.3 51.2 52.2', A_COL.shade, 1.1),
    fill('M45.8 57.2 Q50 61.2 54.2 57.2 Q50 58.8 45.8 57.2 Z', A_COL.lips),
    line('M45.8 57.2 Q50 61.2 54.2 57.2', A_COL.lips, 1.2),
    fill(ellipse(62.5, 18.6, 3.6, 1.5, -40), A_COL.leaf),
    fill(ellipse(60.6, 29.4, 3.2, 1.3, 30), A_COL.leaf),
    ...blossom(57.4, 20.6, 1.35, A_COL.gold, A_COL.goldDeep),
    ...blossom(61.6, 23.4, 1.25, A_COL.gold, A_COL.goldDeep),
    ...blossom(57.8, 25.6, 1.2, A_COL.gold, A_COL.goldDeep),
    dot(61.2, 18.8, 0.9, A_COL.gold),
    dot(63.8, 27.4, 0.85, A_COL.gold),
    dot(54.6, 23.4, 0.8, A_COL.gold),
  ],
  overlay: [
    fill(ellipse(43.5, 46.4, 3.2, 3.4), A_COL.skin),
    fill(ellipse(56.5, 46.4, 3.2, 3.4), A_COL.skin),
    line('M41 46.9 Q43.5 48.5 46 46.9', A_COL.hair, 1.2),
    line('M54 46.9 Q56.5 48.5 59 46.9', A_COL.hair, 1.2),
  ],
  front: [],
  pivot: [50, 78],
  view: [12, 7, 78],
};

const B_COL = {
  disc: '#1D4ED8',
  maneBack: '#D97706',
  mane: '#F2A516',
  maneBackLit: '#F59E0B',
  maneLit: '#FCD86A',
  face: '#FFF3DF',
  muzzle: '#FDE2C0',
  brow: '#B45309',
  ink: '#1E293B',
  nose: '#B45309',
  ear: '#FDBA74',
  mouth: '#9A3412',
};

const MANE: [number, number] = [50, 53];
const mane = (back: string, front: string): Shape[] => [
  ...flames(MANE[0], MANE[1], 12, 26, 42, 15, 14, back, -90),
  ...flames(MANE[0], MANE[1], 12, 24, 37, 14, 12, front, -90 + 15),
  dot(MANE[0], MANE[1], 31, front),
];

const chinthe: AvatarArt = {
  name: 'Chinthe guardian lion head',
  disc: B_COL.disc,
  ground: [],
  back: mane(B_COL.maneBack, B_COL.mane),
  overlay: mane(B_COL.maneBackLit, B_COL.maneLit),
  front: [
    fill('M31.5 40 Q28.5 32 30 27.5 Q31 26.4 32.4 27.2 Q38 30 41 34 Z', B_COL.face),
    fill('M68.5 40 Q71.5 32 70 27.5 Q69 26.4 67.6 27.2 Q62 30 59 34 Z', B_COL.face),
    fill('M32.6 36.6 Q31.4 32 32 29.8 Q35.6 31.6 37.6 34 Z', B_COL.ear),
    fill('M67.4 36.6 Q68.6 32 68 29.8 Q64.4 31.6 62.4 34 Z', B_COL.ear),
    fill('M29 50 C29 38 38 32 50 32 C62 32 71 38 71 50 L71.5 60 C71.5 70 62 77 50 77 C38 77 28.5 70 28.5 60 Z', B_COL.face),
    line('M34.5 44 Q38 37.5 44.5 40.5 Q46.8 41.8 47 44', B_COL.brow, 2.6),
    line('M65.5 44 Q62 37.5 55.5 40.5 Q53.2 41.8 53 44', B_COL.brow, 2.6),
    { circle: [41.2, 49, 4.6], fill: '#FFFFFF', stroke: B_COL.ink, width: 1.1 },
    { circle: [58.8, 49, 4.6], fill: '#FFFFFF', stroke: B_COL.ink, width: 1.1 },
    dot(41.6, 49.8, 2.5, B_COL.ink),
    dot(58.4, 49.8, 2.5, B_COL.ink),
    dot(42.3, 49.6, 0.75, '#FFFFFF'),
    dot(59.1, 49.6, 0.75, '#FFFFFF'),
    fill('M36.2 46.6 A5.2 5.2 0 0 1 46.2 46.6 Q41.2 45.6 36.2 46.6 Z', B_COL.face),
    fill('M53.8 46.6 A5.2 5.2 0 0 1 63.8 46.6 Q58.8 45.6 53.8 46.6 Z', B_COL.face),
    line('M36.9 46.5 Q41.2 45.3 45.5 46.5', B_COL.ink, 1.1),
    line('M54.5 46.5 Q58.8 45.3 63.1 46.5', B_COL.ink, 1.1),
    fill('M39 58 H61 Q65 58 65 62 V64.5 Q65 69.5 60 69.5 H40 Q35 69.5 35 64.5 V62 Q35 58 39 58 Z', B_COL.muzzle),
    fill('M43.2 54.6 Q50 51.4 56.8 54.6 Q58.2 59.8 53.6 60.4 Q50 59 46.4 60.4 Q41.8 59.8 43.2 54.6 Z', B_COL.nose),
    dot(46.8, 58.2, 0.9, B_COL.mouth),
    dot(53.2, 58.2, 0.9, B_COL.mouth),
    fill('M42 63.6 Q50 72.6 58 63.6 Q50 65.6 42 63.6 Z', B_COL.mouth),
    fill('M45.2 64.4 Q50 65.5 54.8 64.4 L54.2 66 Q50 66.9 45.8 66 Z', '#FFFFFF'),
    dot(38.2, 62.2, 0.6, B_COL.brow),
    dot(37.4, 64.8, 0.6, B_COL.brow),
    dot(61.8, 62.2, 0.6, B_COL.brow),
    dot(62.6, 64.8, 0.6, B_COL.brow),
  ],
  pivot: [50, 53],
  view: [0, 0, 100],
};

const C_COL = {
  disc: '#DBE5FF',
  body: '#B8321C',
  bodyDeep: '#8E2614',
  face: '#FFF6EA',
  hair: '#1F1A17',
  gold: '#F2B01E',
  cheek: '#F6A08C',
  lips: '#B8321C',
  shadow: '#1E3A8A',
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
  overlay: [],
  front: [],
  pivot: [50, 74],
  view: [3, 0, 95],
};

export const AVATAR_ART: Record<AvatarConcept, AvatarArt> = { A: woman, B: chinthe, C: doll };

export const HALO_COLORS: Record<AvatarState, string> = {
  idle: '#1D4ED8',
  listening: '#F59E0B',
  speaking: '#1D4ED8',
  thinking: '#1D4ED8',
};

/** Where every animated value rests for a state and level; loops add motion on top. */
export interface AvatarPose {
  haloScale: number;
  haloOpacity: number;
  haloColor: string;
  /** Held tilt of the figure, in degrees. */
  tilt: number;
  /** Swing of the rocking loop, in degrees each way; 0 stops it. */
  swing: number;
  overlay: number;
  /** Halo breathes on a slow loop. */
  breathe: boolean;
  blink: boolean;
}

const clamp = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

export function avatarPose(concept: AvatarConcept, state: AvatarState, level = 0, reduceMotion = false): AvatarPose {
  const haloColor = HALO_COLORS[state];
  if (reduceMotion) {
    const haloOpacity = { idle: 0, listening: 0.5, speaking: 0.5, thinking: 0.3 }[state];
    return { haloScale: 1.12, haloOpacity, haloColor, tilt: 0, swing: 0, overlay: 0, breathe: false, blink: false };
  }
  const amp = clamp(level);
  const pose: AvatarPose = { haloScale: 1, haloOpacity: 0, haloColor, tilt: 0, swing: 0, overlay: 0, breathe: false, blink: concept === 'A' };
  if (state === 'listening') {
    pose.haloScale = 1.08 + 0.16 * amp;
    pose.haloOpacity = 0.35 + 0.4 * amp;
    pose.tilt = concept === 'A' ? -4 : concept === 'C' ? -3 : 0;
    pose.overlay = concept === 'B' ? 0.25 + 0.3 * amp : 0;
  } else if (state === 'speaking') {
    pose.haloScale = 1.06 + 0.2 * amp;
    pose.haloOpacity = 0.3 + 0.45 * amp;
    pose.swing = concept === 'A' ? 1 + 2.5 * amp : concept === 'C' ? 2 + 6 * amp : 0;
    pose.overlay = concept === 'B' ? 0.2 + 0.8 * amp : 0;
  } else if (state === 'thinking') {
    pose.haloScale = 1.1;
    pose.haloOpacity = 0.3;
    pose.breathe = true;
    pose.tilt = concept === 'A' ? 3 : 0;
    pose.swing = concept === 'C' ? 2 : 0;
    pose.overlay = concept === 'B' ? 0.3 : 0;
  }
  return pose;
}
