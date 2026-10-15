// Renders the voice avatar concepts: one SVG per concept, a speaking frame each, and a contact sheet.
// Run from the repo root on Node 23.6+ (imports TypeScript): node scripts/render-avatar.mjs
// Needs sharp outside the repo (npm i sharp), found through BRAND_TOOLS=<dir with node_modules>.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { AVATAR_ART, avatarPose } from '../src/components/avatarArt.ts';

const toolsDir = process.env.BRAND_TOOLS || process.cwd();
const require = createRequire(path.join(toolsDir, 'x.js'));
const sharp = require(process.env.SHARP_PATH || 'sharp');

const OUT = 'assets/avatar';
const INK = '#0F1B2D';
const SLUG = { A: 'a-woman', B: 'b-chinthe', C: 'c-pyit-taing-htaung' };
const FONT = 'DejaVu Sans, sans-serif';

const shapeSvg = s => {
  const paint = `fill="${s.fill ?? 'none'}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.width ?? 1}" stroke-linecap="round" stroke-linejoin="round"` : ''}${s.opacity != null ? ` opacity="${s.opacity}"` : ''}`;
  return s.circle ? `<circle cx="${s.circle[0]}" cy="${s.circle[1]}" r="${s.circle[2]}" ${paint}/>` : `<path d="${s.d}" ${paint}/>`;
};
const layer = (shapes, opacity = 1) => (shapes.length && opacity > 0 ? `<g opacity="${opacity}">${shapes.map(shapeSvg).join('')}</g>` : '');

let uid = 0;
/** The avatar in a 100 box at the origin, with an optional pose. */
function avatarBody(key, { angle = 0, overlay = 0, halo = null } = {}) {
  const a = AVATAR_ART[key];
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
const place = (inner, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

/** A pose from the shared rules, frozen mid-motion for a still frame. */
function frame(key, state, level) {
  const p = avatarPose(key, state, level);
  return {
    angle: p.tilt + p.swing * 0.8,
    overlay: key === 'A' ? 0 : p.overlay,
    halo: { scale: p.haloScale, opacity: p.haloOpacity, color: p.haloColor },
  };
}

async function png(svg, size) {
  return sharp(Buffer.from(svg), { density: 72 * 4 }).resize(size, size).png().toBuffer();
}
const embed = async (svg, size, x, y) => `<image x="${x}" y="${y}" width="${size}" height="${size}" href="data:image/png;base64,${(await png(svg, size)).toString('base64')}"/>`;

/** Square SVG with room around the disc for the halo. */
const padded = (key, pose, size) => doc(size, size, avatarBody(key, pose), '-16 -16 132 132');
const plain = (key, pose, size) => doc(size, size, avatarBody(key, pose), '0 0 100 100');

async function sheet() {
  const W = 1500, head = 110, rowH = 300;
  const T = (x, y, s, size = 16, fill = '#475569', weight = 400) => `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}">${s}</text>`;
  let body = `<rect width="${W}" height="${head + rowH * 3 + 10}" fill="#F4F6F8"/>`;
  body += T(40, 56, 'SafeRoute voice avatar concepts', 30, INK, 700);
  body += T(40, 88, '160 light  |  48 light  |  160 dark  |  48 dark  |  speaking (level 0.8)  |  listening  |  blink / glow / rock frame');
  const keys = Object.keys(AVATAR_ART);
  for (const [i, key] of keys.entries()) {
    const a = AVATAR_ART[key];
    const y = head + i * rowH;
    body += `<rect x="20" y="${y}" width="${W - 40}" height="${rowH - 16}" rx="16" fill="#FFFFFF"/>`;
    body += T(40, y + 36, `${key}  ${a.name}`, 19, INK, 700);
    const top = y + 60;
    body += await embed(plain(key, {}, 160), 160, 40, top);
    body += await embed(plain(key, {}, 48), 48, 220, top + 56);
    body += `<rect x="290" y="${top - 10}" width="330" height="180" rx="14" fill="${INK}"/>`;
    body += await embed(plain(key, {}, 160), 160, 305, top);
    body += await embed(plain(key, {}, 48), 48, 520, top + 56);
    const sp = frame(key, 'speaking', 0.8);
    body += await embed(padded(key, sp, 200), 200, 650, top - 20);
    const li = frame(key, 'listening', 0.5);
    body += await embed(padded(key, li, 200), 200, 870, top - 20);
    const motion = key === 'A' ? { overlay: 1 } : key === 'B' ? { overlay: 1 } : { angle: -8 };
    body += await embed(padded(key, motion, 200), 200, 1090, top - 20);
    body += `<rect x="1300" y="${top - 10}" width="170" height="180" rx="14" fill="${INK}"/>`;
    body += await embed(padded(key, sp, 140), 140, 1315, top + 10);
    body += T(1100, top + 200, key === 'A' ? 'blink' : key === 'B' ? 'mane glow' : 'rock', 14);
    body += T(660, top + 200, 'speaking', 14) + T(880, top + 200, 'listening', 14) + T(1310, top + 200, 'speaking, dark', 14);
  }
  const svg = doc(W, head + rowH * 3 + 10, body);
  await sharp(Buffer.from(svg), { density: 72 }).png().toFile(`${OUT}/concepts.png`);
}

fs.mkdirSync(OUT, { recursive: true });
for (const key of Object.keys(AVATAR_ART)) {
  fs.writeFileSync(`${OUT}/${SLUG[key]}.svg`, plain(key, {}, 160));
  fs.writeFileSync(`${OUT}/${SLUG[key]}-speaking.svg`, padded(key, frame(key, 'speaking', 0.8), 200));
}
await sheet();
console.log(`rendered ${OUT}/concepts.png`);
