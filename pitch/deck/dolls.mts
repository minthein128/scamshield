import { writeFileSync } from 'node:fs';
import { MARK_VIEW, markShapes, type MarkShape } from '../../src/components/dollMark.ts';
import { moodFace, type DollMood } from '../../src/components/avatarArt.ts';

const [VX, VY, VS] = MARK_VIEW;
const paint = (s: MarkShape) =>
  `fill="${s.fill ?? 'none'}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.width}"` : ''} stroke-linecap="round" stroke-linejoin="round"${s.opacity != null ? ` opacity="${s.opacity}"` : ''}`;
const body = (shapes: MarkShape[]) =>
  shapes.map(s => (s.circle ? `<circle cx="${s.circle[0]}" cy="${s.circle[1]}" r="${s.circle[2]}" ${paint(s)}/>` : `<path d="${s.d}" ${paint(s)}/>`)).join('');

function svg(mood: DollMood | undefined, medallion?: string) {
  const shapes = body(markShapes(undefined, mood ? moodFace(mood) : undefined));
  const cx = VX + VS / 2, cy = VY + VS / 2;
  const inner = medallion
    ? `<circle cx="${cx}" cy="${cy}" r="${VS / 2}" fill="${medallion}"/><g transform="translate(${cx} ${cy + 1}) scale(0.78) translate(${-cx} ${-cy})">${shapes}</g>`
    : shapes;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VX} ${VY} ${VS} ${VS}">${inner}</svg>`;
}

const out = new URL('./img/', import.meta.url);
writeFileSync(new URL('medallion.svg', out), svg(undefined, '#F2B01E'));
for (const m of ['calm', 'concerned', 'worried'] as const) writeFileSync(new URL(`doll-${m}.svg`, out), svg(m));
