// Builds the Kakwe brand set around the pyit taing htaung doll: concept SVGs, the contact sheet, and the final assets.
// Run from the repo root on Node 23.6+ (imports TypeScript): node scripts/render-brand.mjs
// Needs sharp and opentype.js. Install outside the repo: npm i sharp opentype.js
// then set BRAND_TOOLS=<dir with node_modules> (SHARP_PATH is still honoured).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { MARK_PATHS, markShapes } from '../src/components/dollMark.ts';

const toolsDir = process.env.BRAND_TOOLS || process.cwd();
const require = createRequire(path.join(toolsDir, 'x.js'));
const sharp = require(process.env.SHARP_PATH || 'sharp');
const opentype = require('opentype.js');

const CHOSEN = process.env.BRAND_CONCEPT || 'b';
const RED = '#B8321C';
const GOLD = '#F2B01E';
const CREAM = '#FFF6EA';
const INK = '#1F1A17';
const PAPER = '#F7F3EE';
const BLUE = '#1D4ED8';
const S = 1024;
const SAFE_ZONE = (S * 33) / 108;

const { egg: EGG, bun: BUN, face: FACE, hair: HAIR, smile: SMILE } = MARK_PATHS;
const eye = (cx, fill) => `<ellipse cx="${cx}" cy="40" rx="3" ry="3.7" fill="${fill}"/>`;
const stroke = (d, c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const svgShape = s => {
  const paint = `fill="${s.fill ?? 'none'}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"` : ''}${s.opacity ? ` opacity="${s.opacity}"` : ''}`;
  return s.circle ? `<circle cx="${s.circle[0]}" cy="${s.circle[1]}" r="${s.circle[2]}" ${paint}/>` : `<path d="${s.d}" ${paint}/>`;
};

/** Full-colour doll. rim draws an outline so the doll separates from a tile of the same colour. */
const dollColour = ({ rim } = {}) => markShapes(rim).map(svgShape).join('');

let uid = 0;
/** One-colour doll for the Android themed icon: silhouette, face window, eyes and smile. */
function dollMono(fg) {
  const id = `mono${uid++}`;
  return (
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120"><rect x="-10" y="-10" width="120" height="120" fill="#fff"/>` +
    `<path d="${FACE}" fill="#000"/><path d="${HAIR}" fill="#fff"/>${eye(41.5, '#fff')}${eye(58.5, '#fff')}${stroke(SMILE, '#fff', 2.6)}` +
    stroke('M21 69.5 C27 76.5 39 80 50 80 C61 80 73 76.5 79 69.5', '#000', 3) +
    `</mask><g mask="url(#${id})"><path d="${EGG}" fill="${fg}"/><path d="${BUN}" fill="${fg}"/></g>`
  );
}

// The rocker arc under concept C: the curve a roly-poly rocks on, drawn as a short route ending in a stop.
const ROUTE = (c, w = 4.2) => stroke('M14 97 Q50 108 80 96', c, w) + `<circle cx="84" cy="94.4" r="4.6" fill="${c}"/>`;

const concepts = {
  a: { slug: 'a-doll-lacquer', name: 'Doll on a lacquer-red tile, gold rim', tile: RED, rim: GOLD, mono: false },
  b: { slug: 'b-doll-medallion', name: 'Doll on a gold medallion, lacquer-black tile', tile: INK, rim: null, disc: GOLD },
  c: { slug: 'c-doll-blue', name: 'Doll on the old brand blue', tile: BLUE, rim: CREAM },
  d: { slug: 'd-doll-route', name: 'Doll on cream with a route accent', tile: CREAM, rim: null, route: RED },
};

const place = (inner, cx, cy, s) => `<g transform="translate(${cx} ${cy}) scale(${s})">${inner}</g>`;
const doc = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const png = async (svg, w, h = w) => sharp(Buffer.from(svg), { density: 72 }).resize(w, h).png().toBuffer();

const art = (c, mono, fg) => {
  const body = mono ? dollMono(fg) : dollColour({ rim: c.rim });
  return body + (c.route ? ROUTE(mono ? fg : c.route) : '');
};

// Bounding box centre and furthest reach of a mark, in 100-box units.
async function measure(c) {
  const svg = doc(1200, 1200, place(art(c, true, '#000'), 100, 100, 10));
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  const pts = [];
  for (let y = 0; y < info.height; y += 2) for (let x = 0; x < info.width; x += 2) {
    if (data[(y * info.width + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); pts.push([x, y]); }
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const R = Math.max(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)));
  return { cx: (cx - 100) / 10, cy: (cy - 100) / 10, R: R / 10, h: (y1 - y0) / 10 };
}

/** Mark centred at (px, py) with its furthest point at radius r. */
function placed(c, m, px, py, r, { mono = false, fg = '#000' } = {}) {
  if (c.disc && !mono) {
    const inner = r * 0.8;
    const s = inner / m.R;
    return `<circle cx="${px}" cy="${py}" r="${r}" fill="${c.disc}"/>` + place(art(c, mono, fg), px - m.cx * s, py - m.cy * s, s);
  }
  const s = r / m.R;
  return place(art(c, mono, fg), px - m.cx * s, py - m.cy * s, s);
}

const FONT = opentype.parse(fs.readFileSync('assets/fonts/PlusJakartaSans-ExtraBold.ttf').buffer.slice(0));
function wordmark(x, baseline, size, safeColor, routeColor) {
  const k = size / FONT.unitsPerEm;
  let pen = x;
  let prev = null;
  let out = '';
  [...'Kakwe'].forEach((ch, i) => {
    const g = FONT.charToGlyph(ch);
    if (prev) pen += FONT.getKerningValue(prev, g) * k;
    const d = [2, 3, 1].map(dp => g.getPath(pen, baseline, size).toPathData(dp)).find(p => !p.includes('NaN')) ?? g.getPath(pen + 0.01, baseline, size).toPathData(2);
    out += `<path d="${d}" fill="${i < 3 ? safeColor : routeColor}"/>`;
    pen += g.advanceWidth * k;
    prev = g;
  });
  return { svg: out, width: pen - x, cap: (FONT.tables.os2.sCapHeight || 700) * k };
}

const THEMES = {
  light: { safe: INK, route: RED },
  dark: { safe: '#FFFFFF', route: GOLD },
};
/** Doll and wordmark: the doll stands free on light grounds and sits on the gold medallion on dark ones. */
function lockup(m, theme) {
  const t = THEMES[theme];
  const medallion = theme === 'dark';
  const mark = medallion ? concepts.b : { ...concepts.b, disc: null };
  const H = 150, markR = medallion ? 66 : 62, gap = 22, size = 80;
  const half = medallion ? markR : markR * 0.72;
  const wm0 = wordmark(0, 0, size, t.safe, t.route);
  const x = 20 + half * 2 + gap;
  const wm = wordmark(x, H / 2 + wm0.cap / 2, size, t.safe, t.route);
  const W = Math.ceil(x + wm.width + 20);
  return doc(W, H, placed(mark, m, 20 + half, H / 2, markR) + wm.svg);
}

const tile = (c, m, { r = 0.33, radius = 0.225 } = {}) =>
  doc(S, S, `<rect width="${S}" height="${S}" rx="${S * radius}" fill="${c.tile}"/>` + placed(c, m, S / 2, S / 2, S * r));
const monoTile = (c, m, bg, fg, { r = 0.33, radius = 0.5 } = {}) =>
  doc(S, S, `<rect width="${S}" height="${S}" rx="${S * radius}" fill="${bg}"/>` + placed(c, m, S / 2, S / 2, S * r, { mono: true, fg }));

const guide = `<circle cx="512" cy="512" r="${SAFE_ZONE.toFixed(1)}" fill="none" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="5" stroke-dasharray="22 16"/>`;
const guideDark = guide.replace('#FFFFFF', '#1F1A17');

async function buildSheet(measures) {
  const rowH = 330, head = 120, W = 2140;
  const T = (x, y, s, size = 17, fill = '#57514B', weight = 400) => `<text x="${x}" y="${y}" font-family="DejaVu Sans, sans-serif" font-weight="${weight}" font-size="${size}" fill="${fill}">${s}</text>`;
  const embed = async (svg, size, x, y) => `<image x="${x}" y="${y}" width="${size}" height="${size}" href="data:image/png;base64,${(await png(svg, size)).toString('base64')}"/>`;
  const inline = (svg, x, y, scale) => `<g transform="translate(${x} ${y}) scale(${scale})">${svg.replace(/^<svg[^>]*>/, '').replace('</svg>', '')}</g>`;
  let body = `<rect width="${W}" height="${head + rowH * 4}" fill="${PAPER}"/>` +
    T(40, 58, 'Kakwe mark concepts: pyit taing htaung', 30, INK, 700) +
    T(40, 92, '1024 (dashed = Android 66 dp safe zone)  |  192 / 48 / 24 on light  |  on dark  |  themed icon (monochrome) light and dark  |  lockups', 18);
  let i = 0;
  for (const [key, c] of Object.entries(concepts)) {
    const m = measures[key];
    const y = head + i * rowH;
    body += `<rect x="20" y="${y}" width="${W - 40}" height="${rowH - 14}" rx="16" fill="#FFFFFF"/>`;
    body += T(40, y + 36, `${key.toUpperCase()}  ${c.name}${key === CHOSEN ? '  (chosen)' : ''}`, 20, INK, 700);
    const fg = doc(S, S, `<rect width="${S}" height="${S}" fill="${c.tile}"/>` + placed(c, m, S / 2, S / 2, SAFE_ZONE * 0.92) + (c.tile === CREAM ? guideDark : guide));
    body += inline(fg, 40, y + 52, 240 / S);
    body += T(40, y + 312, '1024 adaptive', 14);
    const t = tile(c, m);
    body += await embed(t, 192, 300, y + 52) + await embed(t, 48, 506, y + 52) + await embed(t, 24, 568, y + 52);
    body += T(300, y + 264, '192', 14) + T(506, y + 120, '48', 14) + T(568, y + 96, '24', 14);
    body += `<rect x="620" y="${y + 44}" width="340" height="230" rx="14" fill="#141110"/>`;
    body += await embed(t, 192, 634, y + 58) + await embed(t, 48, 840, y + 58) + await embed(t, 24, 902, y + 58);
    body += T(620, y + 296, 'on a dark launcher', 14);
    body += `<rect x="980" y="${y + 44}" width="270" height="230" rx="14" fill="#E9E1F5"/>`;
    const mLight = monoTile(c, m, '#D9CCEB', '#3B2A55');
    body += await embed(mLight, 128, 994, y + 58) + await embed(mLight, 48, 1134, y + 58) + await embed(mLight, 24, 1196, y + 58);
    body += `<rect x="1260" y="${y + 44}" width="270" height="230" rx="14" fill="#1E1A24"/>`;
    const mDark = monoTile(c, m, '#3B2F4A', '#E6D9F7');
    body += await embed(mDark, 128, 1274, y + 58) + await embed(mDark, 48, 1414, y + 58) + await embed(mDark, 24, 1476, y + 58);
    body += T(980, y + 296, 'themed icon, light and dark wallpaper', 14);
    const lk = lockup(measures.b, 'light');
    const lkW = Number(lk.match(/width="(\d+)"/)[1]);
    const k = 460 / lkW;
    body += inline(lk, 1560, y + 44, k);
    body += `<rect x="1550" y="${y + 52 + 150 * k}" width="480" height="${150 * k + 16}" rx="12" fill="${INK}"/>`;
    body += inline(lockup(measures.b, 'dark'), 1560, y + 60 + 150 * k, k);
    i++;
  }
  const svg = doc(W, head + rowH * 4, body);
  await sharp(Buffer.from(svg), { density: 72 }).png().toFile('assets/brand/concepts/sheet.png');
}

fs.mkdirSync('assets/brand/concepts', { recursive: true });
const measures = {};
for (const [k, c] of Object.entries(concepts)) measures[k] = await measure(c);

for (const [k, c] of Object.entries(concepts)) {
  fs.writeFileSync(`assets/brand/concepts/${c.slug}.svg`, tile(c, measures[k]));
  fs.writeFileSync(`assets/brand/concepts/${c.slug}-monochrome.svg`, doc(S, S, placed(c, measures[k], S / 2, S / 2, SAFE_ZONE * 0.92, { mono: true })));
}
await buildSheet(measures);

const c = concepts[CHOSEN];
const m = measures[CHOSEN];
const free = { ...c, rim: null, disc: null };
const files = {
  'icon.svg': doc(S, S, `<rect width="${S}" height="${S}" fill="${c.tile}"/>` + placed(c, m, S / 2, S / 2, 360)),
  'adaptive-foreground.svg': doc(S, S, placed(c, m, S / 2, S / 2, SAFE_ZONE * 0.92)),
  'adaptive-background.svg': doc(S, S, `<rect width="${S}" height="${S}" fill="${c.tile}"/>`),
  'adaptive-monochrome.svg': doc(S, S, placed(c, m, S / 2, S / 2, SAFE_ZONE * 0.92, { mono: true })),
  'splash-icon.svg': doc(S, S, placed(free, m, S / 2, S / 2, 300)),
  'favicon.svg': tile(c, m, { r: 0.4, radius: 0.22 }),
  'logo-horizontal.svg': lockup(measures.b, 'light'),
  'logo-horizontal-dark.svg': lockup(measures.b, 'dark'),
  'logo-mark.svg': doc(S, S, placed(free, m, S / 2, S / 2, 480)),
};
for (const [name, content] of Object.entries(files)) fs.writeFileSync(`assets/brand/${name}`, content);

const targets = [
  ['icon.svg', 'assets/icon.png', 1024],
  ['adaptive-foreground.svg', 'assets/adaptive-foreground.png', 1024],
  ['adaptive-background.svg', 'assets/adaptive-background.png', 1024],
  ['adaptive-monochrome.svg', 'assets/adaptive-monochrome.png', 1024],
  ['splash-icon.svg', 'assets/splash-icon.png', 1024],
  ['favicon.svg', 'assets/favicon.png', 48],
  ['logo-horizontal.svg', 'assets/brand/logo-horizontal.png', null],
  ['logo-horizontal-dark.svg', 'assets/brand/logo-horizontal-dark.png', null],
];
for (const [src, out, size] of targets) {
  const img = sharp(`assets/brand/${src}`, { density: 384 });
  await (size ? img.resize(size, size) : img.resize({ height: 320 })).png().toFile(out);
}
console.log(`rendered, chosen concept ${CHOSEN}`);
