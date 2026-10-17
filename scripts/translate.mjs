#!/usr/bin/env node
// Translates missing keys in src/i18n/locales/<lang>/*.json from the English source with Gemini.
// Usage: node scripts/translate.mjs [--lang my,id] [--ns common,home] [--dry-run]
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = join(ROOT, 'src/i18n/locales');
const TARGETS = ['my', 'id', 'tl', 'th'];
const MODEL = process.env.GEMINI_TRANSLATE_MODEL || 'gemini-3.8-flash';
const BATCH = 40;

const LANG_NAMES = {
  my: 'Burmese (Myanmar language, standard Unicode, never Zawgyi)',
  id: 'Bahasa Indonesia',
  tl: 'Tagalog / Filipino',
  th: 'Thai',
};

// Product terms. null means keep the English text exactly as written.
const GLOSSARY = {
  Kakwe: { my: 'ကာကွယ်', id: 'Kakwe', tl: 'Kakwe', th: 'Kakwe' },
  'Screen shield': { all: null },
  'Pyit Taing Htaung (the voice companion)': { my: 'ပစ်တိုင်းထောင်', id: 'Pyit Taing Htaung', tl: 'Pyit Taing Htaung', th: 'Pyit Taing Htaung' },
  'Low risk (the safe verdict; never "Safe", it must read as a likelihood)': { my: 'အန္တရာယ်နည်း', id: 'Risiko rendah', tl: 'Mababang panganib', th: 'ความเสี่ยงต่ำ' },
  'Be careful (the careful verdict)': { my: 'သတိထားပါ', id: 'Hati-hati', tl: 'Mag-ingat', th: 'ระวัง' },
  'High risk (the danger verdict)': { my: 'အန္တရာယ်မြင့်', id: 'Risiko tinggi', tl: 'Mataas na panganib', th: 'ความเสี่ยงสูง' },
  'Scam radar': { my: 'လိမ်လည်မှု ရေဒါ', id: 'Radar penipuan', tl: 'Scam radar', th: 'เรดาร์การหลอกลวง' },
  'Trusted contacts': { my: 'ယုံကြည်ရသူများ', id: 'Kontak tepercaya', tl: 'Mga pinagkakatiwalaang contact', th: 'ผู้ติดต่อที่ไว้ใจ' },
};

const STYLE_RULES = `
- Audience: migrant workers with low literacy. Use plain, short, kind sentences and everyday words. No slang, no jargon.
- Speak in likelihood, not certainty. Describe risk and warning signs. Never say a thing "is a scam", "is fake", "confirmed" or call a person a "scammer". Keep the hedge in the source: "looks risky", "shows warning signs", "likely", "possible".
- Keep every {{placeholder}} exactly as written, with the same name. Do not translate placeholder names.
- Keep digits, URLs, "+95", "KB" and emoji as in the source. Keep the same punctuation style and sentence count.
- Keep short UI labels short. Buttons and chips must stay a few words.
- Burmese must use standard Unicode (Myanmar3 style), never Zawgyi.
- Thai: polite, neutral register, no spaces inside words, natural Thai sentence spacing.
- Return only translations. No notes.`;

function loadKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const file = process.env.SAFEROUTE_ENV_FILE || join(homedir(), 'work/scamshield-secrets/.env');
  if (!existsSync(file)) return '';
  const line = readFileSync(file, 'utf8').split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
  return line ? line.slice('GEMINI_API_KEY='.length).trim().replace(/^["']|["']$/g, '') : '';
}

export function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_meta') continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out[key] = String(v);
  }
  return out;
}

export function unflatten(flat) {
  const out = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.');
    let node = out;
    parts.slice(0, -1).forEach(p => (node = node[p] ??= {}));
    node[parts.at(-1)] = value;
  }
  return out;
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

export function pluralCategories(lang) {
  return new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
}

/** Source text the target language needs, keyed by target key. English plural forms are mapped by category. */
export function requiredKeys(enFlat, lang) {
  const cats = pluralCategories(lang);
  const out = {};
  for (const [key, text] of Object.entries(enFlat)) {
    const m = PLURAL_SUFFIX.exec(key);
    if (!m) {
      out[key] = text;
      continue;
    }
    const base = key.slice(0, m.index);
    for (const cat of cats) out[`${base}_${cat}`] = enFlat[`${base}_${cat}`] ?? enFlat[`${base}_other`];
  }
  return out;
}

const placeholders = s => [...s.matchAll(/\{\{\s*[\w.]+\s*\}\}/g)].map(m => m[0].replace(/\s/g, '')).sort().join('|');

async function callGemini(apiKey, lang, entries, retries = 3) {
  const glossary = Object.entries(GLOSSARY)
    .map(([term, tr]) => `- "${term}" => ${tr.all === null ? 'keep in English' : `"${tr[lang]}"`}`)
    .join('\n');
  const system = `You translate UI strings of Kakwe, an anti-scam app for migrant workers, from English into ${LANG_NAMES[lang]}.
Glossary (use exactly these):
${glossary}
Rules:${STYLE_RULES}
The input is a JSON object of key to English text. Reply with a JSON object with the same keys and the translations as values.`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(entries, null, 1) }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  };
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
      const parsed = JSON.parse(text);
      for (const [k, en] of Object.entries(entries)) {
        const tr = parsed[k];
        if (typeof tr !== 'string' || !tr.trim()) throw new Error(`missing ${k}`);
        if (placeholders(tr) !== placeholders(en)) throw new Error(`placeholders differ in ${k}`);
      }
      return parsed;
    } catch (e) {
      if (attempt === retries) throw new Error(`Gemini failed for ${lang}: ${e.message}`);
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
}

function readJson(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

function parseArgs(argv) {
  const get = name => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1]?.split(',') : undefined;
  };
  return { langs: get('--lang') ?? TARGETS, ns: get('--ns'), dry: argv.includes('--dry-run') };
}

async function main() {
  const { langs, ns, dry } = parseArgs(process.argv.slice(2));
  const apiKey = dry ? '' : loadKey();
  if (!dry && !apiKey) throw new Error('GEMINI_API_KEY not found in the environment or SAFEROUTE_ENV_FILE');
  const files = readdirSync(join(LOCALES, 'en')).filter(f => f.endsWith('.json')).filter(f => !ns || ns.includes(f.replace('.json', '')));
  let total = 0;
  for (const lang of langs) {
    mkdirSync(join(LOCALES, lang), { recursive: true });
    for (const file of files) {
      const enFlat = flatten(readJson(join(LOCALES, 'en', file)));
      const target = join(LOCALES, lang, file);
      const current = readJson(target);
      const meta = current._meta ?? { reviewed: false };
      const have = flatten(current);
      const need = requiredKeys(enFlat, lang);
      const missing = Object.fromEntries(Object.entries(need).filter(([k]) => !(k in have) || !have[k].trim()));
      const keys = Object.keys(missing);
      const stale = Object.keys(have).filter(k => !(k in need));
      if (!keys.length && !stale.length && existsSync(target)) continue;
      total += keys.length;
      console.log(`${lang}/${file}: ${keys.length} missing, ${stale.length} stale`);
      if (dry) continue;
      const merged = Object.fromEntries(Object.entries(have).filter(([k]) => k in need));
      for (let i = 0; i < keys.length; i += BATCH) {
        const chunk = Object.fromEntries(keys.slice(i, i + BATCH).map(k => [k, missing[k]]));
        Object.assign(merged, await callGemini(apiKey, lang, chunk));
      }
      // A reviewed file stays reviewed. New keys are listed so reviewers find them.
      const out = { _meta: meta.reviewed ? { reviewed: true, unreviewed: [...new Set([...(meta.unreviewed ?? []), ...keys])].sort() } : { reviewed: false } };
      const ordered = Object.fromEntries(Object.keys(need).filter(k => k in merged).map(k => [k, merged[k]]));
      Object.assign(out, unflatten(ordered));
      writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`);
    }
  }
  console.log(dry ? `${total} keys would be translated` : `${total} keys translated with ${MODEL}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => {
    console.error(e.message);
    process.exit(1);
  });
}
