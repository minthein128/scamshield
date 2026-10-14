// Renders assets/brand/*.svg to PNG. Needs sharp: npm i --no-save sharp
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_PATH || 'sharp');

const BLUE = '#1D4ED8';
const S = 1024;

// Shield from BubbleView.buildShield, scaled to a box of `size` centred in the canvas.
function shield(size, fill) {
  const x0 = (S - size) / 2;
  const y0 = (S - size) / 2 + size * 0.01;
  const p = (u, v) => `${(x0 + u * size).toFixed(1)} ${(y0 + v * size).toFixed(1)}`;
  return `<path fill="${fill}" stroke="${fill}" stroke-width="${size * 0.03}" stroke-linejoin="round" d="M${p(0.5, 0.02)} L${p(0.92, 0.18)} L${p(0.92, 0.5)} Q${p(0.92, 0.86)} ${p(0.5, 0.98)} Q${p(0.08, 0.86)} ${p(0.08, 0.5)} L${p(0.08, 0.18)} Z"/>`;
}
function check(size, stroke) {
  const x0 = (S - size) / 2;
  const y0 = (S - size) / 2 + size * 0.01;
  const p = (u, v) => `${(x0 + u * size).toFixed(1)} ${(y0 + v * size).toFixed(1)}`;
  return `<path d="M${p(0.3, 0.5)} L${p(0.44, 0.64)} L${p(0.7, 0.36)}" fill="none" stroke="${stroke}" stroke-width="${size * 0.125}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${body}</svg>`;

const files = {
  'icon.svg': svg(`<rect width="${S}" height="${S}" fill="${BLUE}"/>${shield(720, '#FFFFFF')}${check(720, BLUE)}`),
  'adaptive-foreground.svg': svg(`${shield(580, '#FFFFFF')}${check(580, BLUE)}`),
  'adaptive-background.svg': svg(`<rect width="${S}" height="${S}" fill="${BLUE}"/>`),
  'adaptive-monochrome.svg': svg(`<mask id="m"><rect width="${S}" height="${S}" fill="#fff"/>${check(580, '#000')}</mask><g mask="url(#m)">${shield(580, '#000')}</g>`),
  'splash-icon.svg': svg(`${shield(560, BLUE)}${check(560, '#FFFFFF')}`),
  'favicon.svg': svg(`<rect width="${S}" height="${S}" rx="224" fill="${BLUE}"/>${shield(780, '#FFFFFF')}${check(780, BLUE)}`),
};

const targets = [
  ['icon.svg', 'icon.png', 1024],
  ['adaptive-foreground.svg', 'adaptive-foreground.png', 1024],
  ['adaptive-background.svg', 'adaptive-background.png', 1024],
  ['adaptive-monochrome.svg', 'adaptive-monochrome.png', 1024],
  ['splash-icon.svg', 'splash-icon.png', 1024],
  ['favicon.svg', 'favicon.png', 48],
];

fs.mkdirSync('assets/brand', { recursive: true });
for (const [name, content] of Object.entries(files)) fs.writeFileSync(`assets/brand/${name}`, content);
for (const [src, out, size] of targets) {
  await sharp(`assets/brand/${src}`, { density: 384 }).resize(size, size).png().toFile(`assets/${out}`);
}
console.log('rendered');
