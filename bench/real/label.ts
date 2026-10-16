import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import type { Schema } from '@google/genai';
import { loadConfig } from '../../server/src/config.js';
import { createClient } from '../../server/src/extract.js';
import { FAMILIES, SCAM_TYPES } from '../../server/src/types.js';
import { IMAGE_EXT, parseArgs } from '../lib.js';
import { YAML } from '../v2/cases.js';
import { ADVICE_IDS, FACT_LIBRARY } from '../v2/lexicon.js';

const flags = parseArgs(process.argv.slice(2));
const str = (v: string | true | undefined) => (typeof v === 'string' ? v : undefined);
if (flags.help || !str(flags.dir) || !str(flags.out)) {
  console.log(`npm run bench:label-real -- --dir IMAGES --out CASES [options]
  One Gemini labelling pass per image, plus a cheap second transcription pass that cross-checks numbers.
  Writes draft case files (label_status: draft). Keep IMAGES and CASES outside git.
  --dir DIR      images named <id>.png, for example real-viber-001.png (the id starts real-<app>-)
  --out DIR      where the case YAML files go
  --model NAME   labelling model (default gemini-3.1-pro-preview)
  --check NAME   second-pass transcription model (default gemini-3.8-flash)
  --home CODE    user's home country (default MM)
  --only id,id   label only these ids
  --force        overwrite existing case files`);
  process.exit(flags.help ? 0 : 2);
}

const cfg = loadConfig({ ...process.env, MOCK: '0', LOG_SILENT: '1' });
if (!cfg.geminiApiKey) {
  console.error('bench:label-real: set GEMINI_API_KEY');
  process.exit(2);
}
const client = createClient(cfg);
const model = str(flags.model) ?? 'gemini-3.1-pro-preview';
const checkModel = str(flags.check) ?? 'gemini-3.8-flash';
const home = str(flags.home) ?? 'MM';
const dir = resolve(str(flags.dir) as string);
const outDir = resolve(str(flags.out) as string);
const only = str(flags.only)?.split(',');
const USER_LANG: Record<string, string> = { MM: 'my', TH: 'th', ID: 'id', PH: 'tl' };

const INSTRUCTIONS = `You label one real screenshot for SafeRoute, an anti-scam app for migrant workers from Myanmar, Indonesia, the Philippines and Thailand.
Judge the screenshot on its own. The folder name said "scam" but that can be wrong: it may be a normal message, an ad, a warning, or unclear. Say so honestly.
Return JSON:
- source_text: every word visible, in reading order, exactly as written, one line per message or line. Keep the original script. Do not translate, correct or complete text. Include names and numbers as shown.
- low_confidence: lines or words in source_text you are not sure you read right (blurry, small, rare Burmese letters). Quote each one with a short reason. Empty if none. Do not guess to fill gaps.
- numbers: every number, amount, percentage, date, phone number and account number visible. For each: as_written (exact characters), arabic (the same value with digits 0-9), script (my, latin, other), confident (false when the digits are small or could be confused). Burmese digits are ၀၁၂၃၄၅၆၇၈၉. Take special care: ၃ and ၂, ၅ and ၆, ၇ and ၈, ၀ and ၁ look alike.
- app: the app shown in the screenshot UI: messenger, facebook, instagram, telegram, whatsapp, viber, sms, line, tiktok or other.
- content_language: ISO 639-1 code of the main text (my, en, zh, th, ...).
- home: the likely home country code of the person who received this (MM, TH, ID, PH or other). Use MM when the text is Burmese.
- destination: country or town the message points to, only if the text says so. Else an empty string.
- is_scam: one of "yes", "probably", "unclear", "no".
- expected_verdict: safe, careful or danger, for a reader who has to decide what to do.
- scam_type: one of ${SCAM_TYPES.join(', ')}.
- families: red-flag families present, from ${FAMILIES.join(', ')}. Empty when safe.
- must_mention: 2-6 facts a good warning must tell the reader (amount, document asked for, link or handle, deadline, destination, what is offered). Each with id (snake_case) and variants: the fact as written, plus the same fact in English, Burmese, Thai, Indonesian and Tagalog where it makes sense. Give numbers both in the original digits and in 0-9 digits.
- must_advise: advice a good report gives, from ${ADVICE_IDS.join(', ')}.
- accuse: names, handles, usernames, company names and phone numbers shown in the screenshot (the report must not call them criminals).
- notes: two sentences at most: why this verdict, and anything uncertain. Say "not a scam" or "ambiguous" plainly when that is the case.
Library facts you may name by id: ${Object.keys(FACT_LIBRARY).join(', ')}.`;

const CHECK_INSTRUCTIONS =
  'Transcribe every word visible in this screenshot, in reading order, one line per message, exactly as written. Keep the original script and every digit exactly. Do not translate or correct. Return JSON {"text": string}.';

const str1 = { type: 'STRING' };
const schema = {
  type: 'OBJECT',
  properties: {
    source_text: str1,
    low_confidence: { type: 'ARRAY', items: str1 },
    numbers: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { as_written: str1, arabic: str1, script: str1, confident: { type: 'BOOLEAN' } },
        required: ['as_written', 'arabic', 'script', 'confident'],
      },
    },
    app: str1,
    content_language: str1,
    home: str1,
    destination: str1,
    is_scam: { type: 'STRING', enum: ['yes', 'probably', 'unclear', 'no'] },
    expected_verdict: { type: 'STRING', enum: ['safe', 'careful', 'danger'] },
    scam_type: { type: 'STRING', enum: [...SCAM_TYPES] },
    families: { type: 'ARRAY', items: { type: 'STRING', enum: [...FAMILIES] } },
    must_mention: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { id: str1, variants: { type: 'ARRAY', items: str1 } },
        required: ['id', 'variants'],
      },
    },
    must_advise: { type: 'ARRAY', items: { type: 'STRING', enum: [...ADVICE_IDS] } },
    accuse: { type: 'ARRAY', items: str1 },
    notes: str1,
  },
  required: [
    'source_text',
    'low_confidence',
    'numbers',
    'app',
    'content_language',
    'home',
    'destination',
    'is_scam',
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
  low_confidence: string[];
  numbers: { as_written: string; arabic: string; script: string; confident: boolean }[];
  app: string;
  content_language: string;
  home: string;
  destination: string;
  is_scam: 'yes' | 'probably' | 'unclear' | 'no';
  expected_verdict: 'safe' | 'careful' | 'danger';
  scam_type: string;
  families: string[];
  must_mention: { id: string; variants: string[] }[];
  must_advise: string[];
  accuse: string[];
  notes: string;
}

const BURMESE_DIGITS = '၀၁၂၃၄၅၆၇၈၉';
const toArabic = (s: string) => s.replace(/[၀-၉]/g, (d) => String(BURMESE_DIGITS.indexOf(d)));
const digitRuns = (t: string) => [...new Set((toArabic(t).match(/\d[\d,.]*\d|\d/g) ?? []).map((x) => x.replace(/[,.]/g, '')))].sort();

async function call<T>(m: string, parts: object[], responseSchema: Schema, max: number): Promise<T> {
  let last: unknown;
  for (let i = 0; i < 4; i++) {
    try {
      const res = await client.models.generateContent({
        model: m,
        contents: [{ role: 'user', parts }],
        config: { responseMimeType: 'application/json', responseSchema, temperature: 0.1, maxOutputTokens: max },
      });
      return JSON.parse(res.text ?? '{}') as T;
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw last;
}

const files = readdirSync(dir)
  .filter((f) => extname(f).toLowerCase() in IMAGE_EXT)
  .sort()
  .filter((f) => !only || only.includes(basename(f, extname(f))));
mkdirSync(outDir, { recursive: true });

for (const f of files) {
  const id = basename(f, extname(f));
  const out = join(outDir, `${id}.yaml`);
  if (existsSync(out) && !flags.force) {
    console.log(`skip ${id} (exists)`);
    continue;
  }
  const path = join(dir, f);
  const part = { inlineData: { data: readFileSync(path).toString('base64'), mimeType: IMAGE_EXT[extname(f).toLowerCase()] } };
  try {
    const d = await call<Draft>(model, [{ text: INSTRUCTIONS }, part], schema, 32768);
    const second = await call<{ text: string }>(
      checkModel,
      [{ text: CHECK_INSTRUCTIONS }, part],
      { type: 'OBJECT', properties: { text: str1 }, required: ['text'] } as Schema,
      16384,
    );
    const a = digitRuns(d.source_text);
    const b = digitRuns(second.text ?? '');
    const onlyA = a.filter((x) => !b.includes(x));
    const onlyB = b.filter((x) => !a.includes(x));
    const unsure = d.numbers.filter((n) => !n.confident).map((n) => n.as_written);
    const flagsOut: string[] = [];
    if (onlyA.length || onlyB.length)
      flagsOut.push(
        `NUMBER MISMATCH between two readings: ${model} only [${onlyA.join(' ')}], ${checkModel} only [${onlyB.join(' ')}]. Check digits against the image.`,
      );
    if (unsure.length) flagsOut.push(`Unsure numbers: ${unsure.join(' | ')}.`);
    if (d.low_confidence.length) flagsOut.push(`Low-confidence text: ${d.low_confidence.join(' | ')}.`);
    if (d.is_scam !== 'yes') flagsOut.push(`NOT CLEARLY A SCAM: model says is_scam=${d.is_scam}.`);
    const homeCode = d.home && d.home.length === 2 ? d.home.toUpperCase() : home;
    const lang = USER_LANG[homeCode] ?? 'en';
    const folderApp = id.split('-')[1] ?? 'unspecified';
    const app = folderApp === 'batch2' ? d.app || 'unspecified' : folderApp;
    const doc = {
      id,
      file: relative(outDir, path),
      language: lang,
      ...(d.content_language && d.content_language !== lang ? { content_language: d.content_language } : {}),
      home: homeCode,
      ...(d.destination ? { destination: d.destination } : {}),
      app: app === 'fb' ? 'facebook' : app,
      scam_type: d.expected_verdict === 'safe' ? 'none' : d.scam_type,
      expected_verdict: d.expected_verdict,
      families: d.expected_verdict === 'safe' ? [] : d.families,
      source_text: `${d.source_text.trim()}\n`,
      must_mention: d.must_mention.map((m) =>
        FACT_LIBRARY[m.id] ? m.id : { id: m.id, variants: [...new Set(m.variants.filter(Boolean))] },
      ),
      must_advise: d.must_advise,
      must_not: { accuse: [...new Set(d.accuse.filter(Boolean))] },
      label_status: 'draft',
      labelled_by: model,
      notes: [`Model view: ${d.notes}`, ...flagsOut].join(' '),
      public: false,
    };
    writeFileSync(out, YAML.stringify(doc, { lineWidth: 0 }));
    console.log(`${id} ${d.expected_verdict} ${d.scam_type} scam=${d.is_scam}${flagsOut.length ? ` flags=${flagsOut.length}` : ''}`);
  } catch (err) {
    console.error(`${id} FAILED ${(err as Error).message.split('\n')[0]}`);
  }
}
