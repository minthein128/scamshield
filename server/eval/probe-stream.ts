import { loadConfig, thinkingOf } from '../src/config.js';
import { createClient, responseSchema } from '../src/extract.js';
import { buildUserParts, SYSTEM_PROMPT } from '../src/prompt.js';
import { CASES } from './cases.js';

const cfg = loadConfig({ ...process.env, MOCK: '0', LOG_SILENT: '1' });
const client = createClient(cfg);
const rest = [
  'flags',
  'scamType',
  'verdictDraft',
  'unsolicited',
  'summary',
  'spokenWarning',
  'urls',
  'template',
  'templateSafe',
  'campaign',
  'inputLanguage',
];
const variants: Record<string, string[]> = {
  current: ['flags', 'scamType', 'verdictDraft', 'unsolicited', 'summary', 'spokenWarning', 'urls'],
  entitiesFirst: ['entities', 'sender', ...rest],
};

function scanObject(text: string, key: string): string | undefined {
  const at = text.indexOf(`"${key}"`);
  if (at < 0) return undefined;
  const open = text.indexOf('{', at);
  if (open < 0) return undefined;
  let depth = 0;
  let inStr = false;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === '\\') i++;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return text.slice(open, i + 1);
  }
  return undefined;
}

const only = (process.env.ONLY ?? 'job-traf-en,legit-sms-en,job-traf-my,job-fakeagency-en').split(',');
const picked = CASES.filter((c) => only.includes(c.id) || only[0] === 'all');
const names = Object.keys(variants);
for (const c of picked) {
  for (let k = 0; k < names.length; k++) {
    const name = names[(k + picked.indexOf(c)) % names.length] as string;
    const t0 = performance.now();
    let text = '';
    let first = 0;
    let ent = 0;
    let usage: { candidatesTokenCount?: number; promptTokenCount?: number } | undefined;
    const stream = await client.models.generateContentStream({
      model: cfg.model,
      contents: [{ role: 'user', parts: [{ text: buildUserParts({ kind: c.kind, language: c.lang, text: c.text }) }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: { ...responseSchema, propertyOrdering: variants[name] },
        temperature: 0.2,
        ...thinkingOf(cfg),
        maxOutputTokens: 2048,
      },
    });
    for await (const chunk of stream) {
      if (!first) first = performance.now() - t0;
      text += chunk.text ?? '';
      usage = chunk.usageMetadata ?? usage;
      if (!ent && scanObject(text, 'entities')) ent = performance.now() - t0;
    }
    const total = performance.now() - t0;
    let order = '';
    try {
      order = Object.keys(JSON.parse(text)).join('>').slice(0, 90);
    } catch {}
    console.log(
      `${c.id.padEnd(22)}${name.padEnd(14)} first=${first.toFixed(0).padStart(5)} entities=${ent.toFixed(0).padStart(5)} total=${total.toFixed(0).padStart(5)} out=${usage?.candidatesTokenCount} in=${usage?.promptTokenCount} order=${order}`,
    );
  }
}
