import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import type { Schema } from '@google/genai';
import { loadConfig } from '../../server/src/config.js';
import { createClient } from '../../server/src/extract.js';
import { IMAGE_EXT, parseArgs } from '../lib.js';
import { YAML } from '../v2/cases.js';

const flags = parseArgs(process.argv.slice(2));
const str = (v: string | true | undefined) => (typeof v === 'string' ? v : undefined);
if (flags.help || !str(flags.cases)) {
  console.log(`npm run bench:boxes -- --cases DIR [options]
  Asks Gemini to propose redaction boxes for each case image and stores them in the case file
  (redaction_boxes, in pixels of the original). A person must check every redacted image afterwards.
  --cases DIR    private case files (image path comes from each file)
  --model NAME   default gemini-3.1-pro-preview
  --only id,id   only these ids
  --force        replace boxes that already exist`);
  process.exit(flags.help ? 0 : 2);
}

const cfg = loadConfig({ ...process.env, MOCK: '0', LOG_SILENT: '1' });
if (!cfg.geminiApiKey) {
  console.error('bench:boxes: set GEMINI_API_KEY');
  process.exit(2);
}
const client = createClient(cfg);
const model = str(flags.model) ?? 'gemini-3.1-pro-preview';
const dir = resolve(str(flags.cases) as string);
const only = str(flags.only)?.split(',');

const INSTRUCTIONS = `Find every region of this chat screenshot that must be hidden before the image is published. Return tight boxes.
Hide:
- avatar: every profile photo, avatar, contact icon or group picture, including the default grey silhouette icons.
- face: any human face anywhere in the image, including photos sent in the chat.
- name: every personal name of a person (chat header, sender label, contact name, quoted-reply name, display name in a list), in any script. Also names of Facebook pages or channels that look like a person's name.
- phone: every phone number, wherever it appears, including inside message text.
- handle: every username, @handle, account id, bank or wallet account number, email address, and any link that contains a personal profile name or id (for example facebook.com/some.name). Keep scam website links that have no personal name.
Do not hide: message text, amounts, times, app buttons, status bar, ordinary words, scam domain names, company names for services such as KPay or Viber.
For each region return box_2d as [ymin, xmin, ymax, xmax] on a 0 to 1000 scale, kind, and text (the exact characters under the box, empty for avatar and face).
If the same name appears several times, return every occurrence. Return an empty list only when nothing needs hiding.`;

const schema = {
  type: 'OBJECT',
  properties: {
    regions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          box_2d: { type: 'ARRAY', items: { type: 'INTEGER' } },
          kind: { type: 'STRING', enum: ['avatar', 'face', 'name', 'phone', 'handle'] },
          text: { type: 'STRING' },
        },
        required: ['box_2d', 'kind', 'text'],
      },
    },
  },
  required: ['regions'],
} as Schema;

function pngSize(buf: Buffer): [number, number] {
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

const files = readdirSync(dir)
  .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
  .sort()
  .filter((f) => !only || only.includes(basename(f, '.yaml')));

for (const f of files) {
  const path = join(dir, f);
  const doc = YAML.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  const id = doc.id as string;
  if ((doc.redaction_boxes as unknown[] | undefined)?.length && !flags.force) {
    console.log(`skip ${id} (has boxes)`);
    continue;
  }
  const imgPath = resolve(dirname(path), doc.file as string);
  const buf = readFileSync(imgPath);
  const [w, h] = pngSize(buf);
  const pad = Math.max(3, Math.round(Math.min(w, h) * 0.008));
  try {
    const res = await client.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: INSTRUCTIONS },
            { inlineData: { data: buf.toString('base64'), mimeType: IMAGE_EXT[extname(imgPath).toLowerCase()] } },
          ],
        },
      ],
      config: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0, maxOutputTokens: 16384 },
    });
    const regions = (JSON.parse(res.text ?? '{}').regions ?? []) as { box_2d: number[]; kind: string; text: string }[];
    const boxes = regions
      .filter((r) => r.box_2d?.length === 4)
      .map((r) => {
        const [y0, x0, y1, x1] = r.box_2d as [number, number, number, number];
        const x = Math.max(0, Math.round((x0 / 1000) * w) - pad);
        const y = Math.max(0, Math.round((y0 / 1000) * h) - pad);
        const x2 = Math.min(w, Math.round((x1 / 1000) * w) + pad);
        const y2 = Math.min(h, Math.round((y1 / 1000) * h) + pad);
        return { x, y, w: Math.max(1, x2 - x), h: Math.max(1, y2 - y), kind: r.kind, ...(r.text ? { text: r.text } : {}) };
      });
    doc.redaction_boxes = boxes;
    doc.redaction = 'proposed by model, not yet checked';
    writeFileSync(path, YAML.stringify(doc, { lineWidth: 0 }));
    console.log(`${id} ${w}x${h} ${boxes.length} boxes`);
  } catch (err) {
    console.error(`${id} FAILED ${(err as Error).message.split('\n')[0]}`);
  }
}
