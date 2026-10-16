// Renders the voice avatar: the shipped doll (SVG, speaking frame, 96/512/1024 PNGs) and the
// concept contact sheet, which keeps the unshipped concepts A (woman) and B (chinthe) for reference.
// Run from the repo root on Node 23.6+ (imports TypeScript): node scripts/render-avatar.mjs
// Needs sharp outside the repo (npm i sharp), found through BRAND_TOOLS=<dir with node_modules>.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { AVATAR_ART, avatarPose, blossom, dot, ellipse, fill, line, n } from '../src/components/avatarArt.ts';

const toolsDir = process.env.BRAND_TOOLS || process.cwd();
const require = createRequire(path.join(toolsDir, 'x.js'));
const sharp = require(process.env.SHARP_PATH || 'sharp');

const OUT = 'assets/avatar';
const INK = '#0F1B2D';
const FONT = 'DejaVu Sans, sans-serif';

/** A soft hand-painted patch: an ellipse with a slightly uneven edge. */
function blob(cx, cy, rx, ry, jitter) {
  const pts = jitter.map((j, i) => {
    const a = (i / jitter.length) * Math.PI * 2;
    return [cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j];
  });
  const mid = (i) => {
    const [x0, y0] = pts[i % pts.length];
    const [x1, y1] = pts[(i + 1) % pts.length];
    return `${n((x0 + x1) / 2)} ${n((y0 + y1) / 2)}`;
  };
  return `M${mid(0)}${pts.map((_, i) => `Q${n(pts[(i + 1) % pts.length][0])} ${n(pts[(i + 1) % pts.length][1])} ${mid(i + 1)}`).join('')}Z`;
}

const polar = (cx, cy, r, deg) => {
  const a = (deg * Math.PI) / 180;
  return `${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}`;
};

/** A ring of flame-shaped mane tufts that flow down both sides, in the Myanmar scroll style. */
function flames(cx, cy, count, inner, outer, spread, curl, color, offset = 0) {
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

const woman = {
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

const MANE = [50, 53];
const mane = (back, front) => [
  ...flames(MANE[0], MANE[1], 12, 26, 42, 15, 14, back, -90),
  ...flames(MANE[0], MANE[1], 12, 24, 37, 14, 12, front, -90 + 15),
  dot(MANE[0], MANE[1], 31, front),
];

const chinthe = {
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

const CONCEPTS = {
  A: { slug: 'a-woman', art: woman, speak: { angle: 2.4 }, listen: { angle: -4 }, motion: ['blink', { overlay: 1 }] },
  B: { slug: 'b-chinthe', art: chinthe, speak: { overlay: 0.84 }, listen: { overlay: 0.4 }, motion: ['mane glow', { overlay: 1 }] },
  C: { slug: 'c-pyit-taing-htaung', art: AVATAR_ART.C, motion: ['rock', { angle: -8 }] },
};

const shapeSvg = s => {
  const paint = `fill="${s.fill ?? 'none'}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.width ?? 1}" stroke-linecap="round" stroke-linejoin="round"` : ''}${s.opacity != null ? ` opacity="${s.opacity}"` : ''}`;
  return s.circle ? `<circle cx="${s.circle[0]}" cy="${s.circle[1]}" r="${s.circle[2]}" ${paint}/>` : `<path d="${s.d}" ${paint}/>`;
};
const layer = (shapes = [], opacity = 1) => (shapes.length && opacity > 0 ? `<g opacity="${opacity}">${shapes.map(shapeSvg).join('')}</g>` : '');

let uid = 0;
/** The avatar in a 100 box at the origin, with an optional pose. */
function avatarBody(a, { angle = 0, overlay = 0, halo = null } = {}) {
  const id = `clip${uid++}`;
  const [px, py] = a.pivot;
  const [vx, vy, vs] = a.view;
  const haloSvg = halo && halo.opacity > 0 ? `<circle cx="50" cy="50" r="${50 * halo.scale}" fill="${halo.color}" opacity="${halo.opacity}"/>` : '';
  return `${haloSvg}<clipPath id="${id}"><circle cx="50" cy="50" r="50"/></clipPath>
<g clip-path="url(#${id})"><circle cx="50" cy="50" r="50" fill="${a.disc}"/>
<g transform="scale(${100 / vs}) translate(${-vx} ${-vy})">${layer(a.ground)}
<g transform="rotate(${angle} ${px} ${py})">${layer(a.back)}${layer(a.overlay, overlay)}${layer(a.front)}</g></g></g>`;
}

const doc = (w, h, body, vb = `0 0 ${w} ${h}`) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${body}</svg>`;

/** A still frame: the shared halo rules plus the concept's own feature pose. */
function frame(key, state, level) {
  const p = avatarPose(state, level);
  const own = (state === 'speaking' ? CONCEPTS[key].speak : CONCEPTS[key].listen) ?? { angle: p.tilt + p.swing * 0.8 };
  return { ...own, halo: { scale: p.haloScale, opacity: p.haloOpacity, color: p.haloColor } };
}

const png = (svg, size) => sharp(Buffer.from(svg), { density: 144 }).resize(size, size).png().toBuffer();
const embed = async (svg, size, x, y) => `<image x="${x}" y="${y}" width="${size}" height="${size}" href="data:image/png;base64,${(await png(svg, size)).toString('base64')}"/>`;

/** Square SVG with room around the disc for the halo. */
const padded = (key, pose, size) => doc(size, size, avatarBody(CONCEPTS[key].art, pose), '-16 -16 132 132');
const plain = (key, pose, size) => doc(size, size, avatarBody(CONCEPTS[key].art, pose), '0 0 100 100');

async function sheet() {
  const W = 1500, head = 110, rowH = 300;
  const T = (x, y, s, size = 16, fill = '#475569', weight = 400) => `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}">${s}</text>`;
  let body = `<rect width="${W}" height="${head + rowH * 3 + 10}" fill="#F4F6F8"/>`;
  body += T(40, 56, 'Kakwe voice avatar concepts (C ships)', 30, INK, 700);
  body += T(40, 88, '160 light  |  48 light  |  160 dark  |  48 dark  |  speaking (level 0.8)  |  listening  |  blink / glow / rock frame');
  for (const [i, key] of Object.keys(CONCEPTS).entries()) {
    const c = CONCEPTS[key];
    const y = head + i * rowH;
    body += `<rect x="20" y="${y}" width="${W - 40}" height="${rowH - 16}" rx="16" fill="#FFFFFF"/>`;
    body += T(40, y + 36, `${key}  ${c.art.name}`, 19, INK, 700);
    const top = y + 60;
    body += await embed(plain(key, {}, 160), 160, 40, top);
    body += await embed(plain(key, {}, 48), 48, 220, top + 56);
    body += `<rect x="290" y="${top - 10}" width="330" height="180" rx="14" fill="${INK}"/>`;
    body += await embed(plain(key, {}, 160), 160, 305, top);
    body += await embed(plain(key, {}, 48), 48, 520, top + 56);
    const sp = frame(key, 'speaking', 0.8);
    body += await embed(padded(key, sp, 200), 200, 650, top - 20);
    body += await embed(padded(key, frame(key, 'listening', 0.5), 200), 200, 870, top - 20);
    body += await embed(padded(key, c.motion[1], 200), 200, 1090, top - 20);
    body += `<rect x="1300" y="${top - 10}" width="170" height="180" rx="14" fill="${INK}"/>`;
    body += await embed(padded(key, sp, 140), 140, 1315, top + 10);
    body += T(660, top + 200, 'speaking', 14) + T(880, top + 200, 'listening', 14) + T(1100, top + 200, c.motion[0], 14) + T(1310, top + 200, 'speaking, dark', 14);
  }
  const svg = doc(W, head + rowH * 3 + 10, body);
  await sharp(Buffer.from(svg), { density: 72 }).png().toFile(`${OUT}/concepts.png`);
}

fs.mkdirSync(`${OUT}/concepts`, { recursive: true });
for (const [key, c] of Object.entries(CONCEPTS)) {
  fs.writeFileSync(`${OUT}/concepts/${c.slug}.svg`, plain(key, {}, 160));
  fs.writeFileSync(`${OUT}/concepts/${c.slug}-speaking.svg`, padded(key, frame(key, 'speaking', 0.8), 200));
}
const doll = plain('C', {}, 1024);
fs.writeFileSync(`${OUT}/doll.svg`, plain('C', {}, 160));
fs.writeFileSync(`${OUT}/doll-speaking.svg`, padded('C', frame('C', 'speaking', 0.8), 200));
for (const size of [96, 512, 1024]) fs.writeFileSync(`${OUT}/doll-${size}.png`, await png(size === 96 ? plain('C', {}, 96) : doll, size));
await sheet();
console.log(`rendered ${OUT}/doll-*.png and ${OUT}/concepts.png`);
