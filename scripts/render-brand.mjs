// Builds the SafeRoute brand set: four concept SVGs, the contact sheet, and the final assets.
// Run from the repo root: node scripts/render-brand.mjs
// Needs sharp and opentype.js. Install outside the repo: npm i sharp opentype.js
// then set BRAND_TOOLS=<dir with node_modules> (SHARP_PATH is still honoured).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const toolsDir = process.env.BRAND_TOOLS || process.cwd();
const require = createRequire(path.join(toolsDir, 'x.js'));
const sharp = require(process.env.SHARP_PATH || 'sharp');
const opentype = require('opentype.js');

const CHOSEN = process.env.BRAND_CONCEPT || 'b';
const BLUE = '#1D4ED8';
const NAVY = '#1E3A8A';
const PALE = '#DBE5FF';
const INK = '#0F1B2D';
const WARM = '#FDBA74';
const WARM_DEEP = '#B45309';
const S = 1024;

const st = (d, w, c = 'FG') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const fl = (d, c = 'FG') => `<path d="${d}" fill="${c}" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>`;
const dot = (x, y, r, c = 'FG') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const SHIELD = 'M50 6 L88 20 L88 50 Q88 80 50 94 Q12 80 12 50 L12 20 Z';

// Marks live in a 100 x 100 box. solid = main colour, cut = punched out, acc = warm accent.
const concepts = {
  a: {
    slug: 'a-route-shield',
    name: 'Route inside shield',
    solid: [fl(SHIELD)],
    cut: [st('M44 99 C44 80 68 74 60 56 C56 46 50 44 50 34', 10, '#000'), dot(50, 30, 14.5, '#000')],
    acc: [dot(50, 30, 9, 'AC')],
  },
  b: {
    slug: 'b-pin-shield',
    name: 'Pin with shield head',
    solid: [fl('M50 95 C40 82 16 60 16 38 A34 34 0 0 1 84 38 C84 60 60 82 50 95 Z')],
    cut: [fl('M50 19 L67 25 L67 40 Q67 53 50 60 Q33 53 33 40 L33 25 Z', '#000')],
    acc: [dot(50, 38, 7, 'AC')],
  },
  c: {
    slug: 'c-route-ribbon',
    name: 'Route ribbon',
    solid: [st('M12 93 C38 93 72 92 64 80 C58 72 50 76 50 68 Q18 60 18 44 L18 22 L50 9 L82 22 L82 44 Q82 60 50 68', 10)],
    cut: [],
    acc: [dot(50, 38, 8, 'AC')],
  },
  d: {
    slug: 'd-route-check',
    name: 'Route that ends in a check',
    solid: [st('M14 40 C26 32 28 60 42 77 C46 80 50 76 54 72 L76 44', 15)],
    cut: [dot(82, 28, 20, '#000')],
    acc: [dot(82, 28, 13, 'AC')],
  },
};

let uid = 0;
function markSvg(c, { fg, ac, mono = false }) {
  const id = `m${uid++}`;
  const sub = s => s.replaceAll('FG', fg).replaceAll('AC', mono ? fg : ac);
  const mk = (n, els) => `<mask id="${id}${n}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="#fff"/>${els.join('')}</mask>`;
  const hasCut = c.cut.length > 0;
  const behind = c.behind ? mk('b', c.gap) + `<g mask="url(#${id}b)">${c.behind.map(sub).join('')}</g>` : '';
  const main = (hasCut ? mk('c', c.cut) : '') + `<g${hasCut ? ` mask="url(#${id}c)"` : ''}>${c.solid.map(sub).join('')}</g>`;
  return `${behind}${main}${c.acc.map(sub).join('')}`;
}
const place = (inner, cx, cy, s) => `<g transform="translate(${cx} ${cy}) scale(${s})">${inner}</g>`;
const doc = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

const png = async (svg, w, h = w) => sharp(Buffer.from(svg), { density: 72 }).resize(w, h).png().toBuffer();

// Bounding box centre and furthest reach of a mark, in 100-box units.
async function measure(c) {
  const svg = doc(1000, 1000, place(markSvg(c, { fg: '#000', ac: '#000', mono: true }), 0, 0, 10));
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  const pts = [];
  for (let y = 0; y < info.height; y += 2) for (let x = 0; x < info.width; x += 2) {
    if (data[(y * info.width + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); pts.push([x, y]); }
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const R = Math.max(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)));
  return { cx: cx / 10, cy: cy / 10, R: R / 10 };
}

// Mark centred at (px, py) with its furthest point at radius r.
function placed(c, m, px, py, r, colors, mono) {
  const s = r / m.R;
  return place(markSvg(c, { ...colors, mono }), px - m.cx * s, py - m.cy * s, s);
}

const FONT = opentype.parse(fs.readFileSync('assets/fonts/PlusJakartaSans-ExtraBold.ttf').buffer.slice(0));
function wordmark(x, baseline, size, safeColor, routeColor) {
  const k = size / FONT.unitsPerEm;
  let pen = x;
  let prev = null;
  let out = '';
  let safeEnd = 'Safe'.length;
  [...'SafeRoute'].forEach((ch, i) => {
    const g = FONT.charToGlyph(ch);
    if (prev) pen += FONT.getKerningValue(prev, g) * k;
    const d = g.getPath(pen, baseline, size).toPathData(2);
    out += `<path d="${d}" fill="${i < safeEnd ? safeColor : routeColor}"/>`;
    pen += g.advanceWidth * k;
    prev = g;
  });
  const cap = (FONT.tables.os2.sCapHeight || 700) * k;
  return { svg: out, width: pen - x, cap };
}

const THEMES = {
  light: { fg: BLUE, ac: WARM_DEEP, safe: INK, route: BLUE },
  dark: { fg: PALE, ac: WARM, safe: '#FFFFFF', route: PALE },
};
function lockup(c, m, theme) {
  const t = THEMES[theme];
  const H = 150, markR = 56, gap = 28, size = 80;
  const wm0 = wordmark(0, 0, size, t.safe, t.route);
  const x = 20 + markR * 2 + gap;
  const wm = wordmark(x, H / 2 + wm0.cap / 2, size, t.safe, t.route);
  const W = Math.ceil(x + wm.width + 20);
  return doc(W, H, placed(c, m, 20 + markR, H / 2, markR, { fg: t.fg, ac: t.ac }, false) + wm.svg);
}

const tile = (c, m, { bg, fg, ac, mono = false, r = 0.34, radius = 0.225 }) =>
  doc(S, S, `<rect width="${S}" height="${S}" rx="${S * radius}" fill="${bg}"/>` + placed(c, m, S / 2, S / 2, S * r, { fg, ac }, mono));

const guide = `<circle cx="512" cy="512" r="338" fill="none" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="5" stroke-dasharray="22 16"/>`;

async function buildSheet(measures) {
  const rowH = 345, head = 110, W = 1700;
  let body = `<rect width="${W}" height="${head + rowH * 4}" fill="#F4F6F8"/>
<text x="40" y="58" font-family="DejaVu Sans, sans-serif" font-weight="700" font-size="30" fill="${INK}">SafeRoute logo concepts</text>
<text x="40" y="90" font-family="DejaVu Sans, sans-serif" font-size="18" fill="#475569">1024 (dashed circle = Android safe zone)  |  192  |  48  |  24  |  lockup  |  monochrome  |  dark</text>`;
  let i = 0;
  for (const [key, c] of Object.entries(concepts)) {
    const m = measures[key];
    const y = head + i * rowH;
    const T = (x, yy, s, size = 17, fill = '#475569') => `<text x="${x}" y="${yy}" font-family="DejaVu Sans, sans-serif" font-size="${size}" fill="${fill}">${s}</text>`;
    body += `<rect x="20" y="${y}" width="${W - 40}" height="${rowH - 14}" rx="16" fill="#FFFFFF"/>`;
    body += T(40, y + 40, `${key.toUpperCase()}  ${c.name}`, 20, INK);
    const base = { bg: BLUE, fg: '#FFFFFF', ac: WARM };
    const big = tile(c, m, base).replace('</svg>', `${guide}</svg>`);
    const embed = async (svg, size, x, yy) => `<image x="${x}" y="${yy}" width="${size}" height="${size}" href="data:image/png;base64,${(await png(svg, size)).toString('base64')}"/>`;
    const smallTile = tile(c, m, base);
    body += place(big.replace(/^<svg[^>]*>/, '').replace('</svg>', ''), 40, y + 56, 244 / S);
    body += await embed(smallTile, 192, 320, y + 60);
    body += await embed(smallTile, 48, 540, y + 60);
    body += await embed(smallTile, 24, 620, y + 60);
    body += T(320, y + 270, '192', 15) + T(540, y + 122, '48', 15) + T(620, y + 100, '24', 15) + T(40, y + 322, "1024", 15);
    const lk = lockup(c, m, 'light');
    const lkW = Number(lk.match(/width="(\d+)"/)[1]);
    body += `<g transform="translate(700 ${y + 85}) scale(0.8)">${lk.replace(/^<svg[^>]*>/, '').replace('</svg>', '')}</g>`;
    body += T(700, y + 300, 'lockup', 15);
    body += `<rect x="${700 + lkW * 0.8 + 30}" y="${y + 60}" width="190" height="190" rx="43" fill="#E5E7EB"/>`;
    const mx = 700 + lkW * 0.8 + 30;
    body += placed(c, m, mx + 95, y + 155, 65, { fg: '#000', ac: '#000' }, true);
    body += await embed(tile(c, m, { bg: '#E5E7EB', fg: '#000', ac: '#000', mono: true }), 48, mx + 200, y + 60);
    body += T(mx, y + 270, 'monochrome (themed icon)', 15);
    const dx = mx + 270;
    body += `<rect x="${dx}" y="${y + 60}" width="190" height="190" rx="43" fill="${INK}"/>`;
    body += placed(c, m, dx + 95, y + 155, 65, { fg: PALE, ac: WARM }, false);
    body += T(dx, y + 270, 'dark', 15);
    i++;
  }
  const svg = doc(W, head + rowH * 4, body);
  await sharp(Buffer.from(svg), { density: 72 }).png().toFile('assets/brand/concepts/sheet.png');
}

fs.mkdirSync('assets/brand/concepts', { recursive: true });
const measures = {};
for (const [k, c] of Object.entries(concepts)) measures[k] = await measure(c);

for (const [k, c] of Object.entries(concepts)) {
  const m = measures[k];
  fs.writeFileSync(`assets/brand/concepts/${c.slug}.svg`, tile(c, m, { bg: BLUE, fg: '#FFFFFF', ac: WARM }));
  fs.writeFileSync(`assets/brand/concepts/${c.slug}-lockup.svg`, lockup(c, m, 'light'));
}
await buildSheet(measures);

const c = concepts[CHOSEN];
const m = measures[CHOSEN];
const SAFE_R = 338 * 0.98;
const onBlue = { fg: '#FFFFFF', ac: WARM };
const files = {
  'icon.svg': doc(S, S, `<rect width="${S}" height="${S}" fill="${BLUE}"/>` + placed(c, m, S / 2, S / 2, 380, onBlue, false)),
  'adaptive-foreground.svg': doc(S, S, placed(c, m, S / 2, S / 2, SAFE_R, onBlue, false)),
  'adaptive-background.svg': doc(S, S, `<rect width="${S}" height="${S}" fill="${BLUE}"/>`),
  'adaptive-monochrome.svg': doc(S, S, placed(c, m, S / 2, S / 2, SAFE_R, { fg: '#000', ac: '#000' }, true)),
  'splash-icon.svg': doc(S, S, placed(c, m, S / 2, S / 2, 330, { fg: BLUE, ac: WARM_DEEP }, false)),
  'favicon.svg': tile(c, m, { bg: BLUE, fg: '#FFFFFF', ac: WARM, r: 0.42, radius: 0.22 }),
  'logo-horizontal.svg': lockup(c, m, 'light'),
  'logo-horizontal-dark.svg': lockup(c, m, 'dark'),
  'logo-mark.svg': doc(S, S, placed(c, m, S / 2, S / 2, 480, { fg: BLUE, ac: WARM_DEEP }, false)),
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
  const file = `assets/brand/${src}`;
  const img = sharp(file, { density: 384 });
  await (size ? img.resize(size, size) : img.resize({ height: 320 })).png().toFile(out);
}
console.log(`rendered, chosen concept ${CHOSEN}`);
