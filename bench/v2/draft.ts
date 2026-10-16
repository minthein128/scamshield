import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import type { Schema } from '@google/genai';
import { loadConfig } from '../../server/src/config.js';
import { createClient } from '../../server/src/extract.js';
import { FAMILIES, LANGS, SCAM_TYPES } from '../../server/src/types.js';
import { BENCH_DIR, IMAGE_EXT, parseArgs } from '../lib.js';
import { YAML } from './cases.js';
import { ADVICE_IDS, FACT_LIBRARY } from './lexicon.js';

const flags = parseArgs(process.argv.slice(2));
const str = (v: string | true | undefined) => (typeof v === 'string' ? v : undefined);
const image = str(flags.image);
if (flags.help || !image) {
  console.log(`npm run bench:draft -- --image PATH [options]
  Drafts a case file from a screenshot with Gemini (OCR and suggested labels). A person must check it.
  --image PATH        screenshot to label (required)
  --id ID             case id (default: the image file name)
  --language CODE     the user's language: en, id, tl, my, th (default: guessed from the text)
  --home CODE         user's home country (MM, TH, ID, PH, ...)
  --destination TEXT  destination country or town
  --app NAME          where the screenshot came from
  --out DIR           where to write the draft (default bench/private/cases, which git ignores)
  --model NAME        default gemini-3.8-flash`);
  process.exit(flags.help ? 0 : 2);
}
const path = resolve(image);
const mime = IMAGE_EXT[extname(path).toLowerCase()];
if (!existsSync(path) || !mime) {
  console.error(`bench:draft: ${path} is not a png, jpg or webp file`);
  process.exit(2);
}

const cfg = loadConfig({ ...process.env, MOCK: '0', LOG_SILENT: '1' });
if (!cfg.geminiApiKey && !(cfg.useVertex && cfg.project)) {
  console.error('bench:draft: set GEMINI_API_KEY');
  process.exit(2);
}
const model = str(flags.model) ?? 'gemini-3.8-flash';

const INSTRUCTIONS = `You help label a benchmark for SafeRoute, an anti-scam app for migrant workers in Southeast Asia.
Read the screenshot and return JSON:
- source_text: every word visible in the screenshot, in reading order, exactly as written (keep the original language and script, one line per message or line). Do not translate or fix spelling.
- content_language: ISO 639-1 code of the text.
- expected_verdict: your suggestion: safe, careful or danger.
- scam_type: one of ${SCAM_TYPES.join(', ')}.
- families: red-flag families present, from ${FAMILIES.join(', ')}. Empty for a safe message.
- must_mention: the 2-6 facts a good warning must tell the reader (amounts, the document they ask for, the chat handle, the destination town, the deadline). For each: id (snake_case) and variants: the fact as written, plus the same fact in English, Burmese, Thai, Indonesian and Tagalog where it makes sense. Write numbers without thousands separators as one variant.
- must_advise: advice a good report gives, from ${ADVICE_IDS.join(', ')}.
- accuse: names of people, companies or handles in the screenshot (the report must not call them criminals).
- notes: one sentence on why you suggest this verdict.
Library facts you can name by id instead: ${Object.keys(FACT_LIBRARY).join(', ')}.`;

const schema = {
  type: 'OBJECT',
  properties: {
    source_text: { type: 'STRING' },
    content_language: { type: 'STRING' },
    expected_verdict: { type: 'STRING', enum: ['safe', 'careful', 'danger'] },
    scam_type: { type: 'STRING', enum: [...SCAM_TYPES] },
    families: { type: 'ARRAY', items: { type: 'STRING', enum: [...FAMILIES] } },
    must_mention: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { id: { type: 'STRING' }, variants: { type: 'ARRAY', items: { type: 'STRING' } } },
        required: ['id', 'variants'],
      },
    },
    must_advise: { type: 'ARRAY', items: { type: 'STRING', enum: [...ADVICE_IDS] } },
    accuse: { type: 'ARRAY', items: { type: 'STRING' } },
    notes: { type: 'STRING' },
  },
  required: [
    'source_text',
    'content_language',
    'expected_verdict',
    'scam_type',
    'families',
    'must_mention',
    'must_advise',
    'accuse',
    'notes',
  ],
} as Schema;

interface Draft {
  source_text: string;
  content_language: string;
  expected_verdict: 'safe' | 'careful' | 'danger';
  scam_type: string;
  families: string[];
  must_mention: { id: string; variants: string[] }[];
  must_advise: string[];
  accuse: string[];
  notes: string;
}

const res = await createClient(cfg).models.generateContent({
  model,
  contents: [
    { role: 'user', parts: [{ text: INSTRUCTIONS }, { inlineData: { data: readFileSync(path).toString('base64'), mimeType: mime } }] },
  ],
  config: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.1, maxOutputTokens: 8192 },
});
const d = JSON.parse(res.text ?? '{}') as Draft;
const id = (str(flags.id) ?? basename(path, extname(path))).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
const outDir = resolve(str(flags.out) ?? join(BENCH_DIR, 'private', 'cases'));
mkdirSync(outDir, { recursive: true });
const lang = str(flags.language) ?? ((LANGS as readonly string[]).includes(d.content_language) ? d.content_language : 'en');
const doc = {
  id,
  draft: true,
  file: relative(outDir, path),
  language: lang,
  ...(d.content_language && d.content_language !== lang ? { content_language: d.content_language } : {}),
  ...(str(flags.home) ? { home: str(flags.home) } : {}),
  ...(str(flags.destination) ? { destination: str(flags.destination) } : {}),
  app: str(flags.app) ?? 'unspecified',
  scam_type: d.scam_type,
  expected_verdict: d.expected_verdict,
  families: d.expected_verdict === 'safe' ? [] : d.families,
  source_text: `${d.source_text.trim()}\n`,
  must_mention: d.must_mention.map((f) => (FACT_LIBRARY[f.id] ? f.id : { id: f.id, variants: [...new Set(f.variants)] })),
  must_advise: d.must_advise,
  must_not: { accuse: d.accuse },
  notes: `DRAFT by ${model} on ${new Date().toISOString().slice(0, 10)}. Check every field against the image, then delete the draft line. Model note: ${d.notes}`,
  public: false,
};
const out = join(outDir, `${id}.yaml`);
if (existsSync(out) && !flags.force) {
  console.error(`bench:draft: ${out} exists; pass --force to overwrite`);
  process.exit(2);
}
writeFileSync(out, YAML.stringify(doc, { lineWidth: 0 }));
console.log(`wrote draft ${relative(process.cwd(), out)}`);
console.log(`next: check it, delete "draft: true", then: npm run bench:validate -- --cases ${relative(process.cwd(), dirname(out))}`);
