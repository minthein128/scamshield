import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GoogleGenAI, Schema } from '@google/genai';
import { LANG_NAMES } from '../../server/src/prompt.js';
import type { CheckResponse } from '../../server/src/types.js';
import { BENCH_DIR } from '../lib.js';
import type { Case } from './cases.js';
import { sha } from './runner.js';

export const JUDGE_MODEL = 'gemini-3.8-flash';
const JUDGE_CACHE = join(BENCH_DIR, '.cache', 'v2', 'judge');
const RUBRIC_VERSION = 1;

export const RUBRIC = `You review one report from Kakwe, an anti-scam app for migrant workers in Southeast Asia.
Imagine the reader: a frightened 22-year-old migrant worker with limited reading skill, reading on a phone in their own language.
Question: after reading this report, would they understand what is going on and exactly what to do next?

Score 1-5:
5 = clear and calm; names the specific danger in this message; gives concrete next steps in plain words; nothing confusing.
4 = clear next steps, small problems (a long sentence, a vague phrase).
3 = the reader gets the general idea but must guess at least one next step, or the text is long or abstract.
2 = hard to follow: jargon, wrong language, mixed messages, or no clear action.
1 = misleading, frightening without guidance, or tells them the wrong thing.

Judge only clarity and usefulness for this reader. Do not judge whether the verdict is correct.
Reply as JSON: {"score": 1-5, "reason": "one short English sentence"}.`;

export interface JudgeResult {
  score: number;
  reason: string;
  model: string;
}

function reportText(res: CheckResponse): string {
  return [
    `Verdict shown: ${res.verdict}`,
    `Title: ${res.title}`,
    `Summary: ${res.summary}`,
    `Spoken warning: ${res.spokenWarning}`,
    'Warning signs:',
    ...res.flags.map((f) => `- ${f.label}`),
    'Buttons:',
    ...res.actions.map((a) => `- ${a.label}${a.value && a.type === 'call' ? ` (${a.value})` : ''}`),
  ].join('\n');
}

/** Rates comprehension with a different model. Advisory: never part of the score. */
export async function judge(
  client: Pick<GoogleGenAI, 'models'>,
  c: Case,
  res: CheckResponse,
  model = JUDGE_MODEL,
): Promise<JudgeResult | undefined> {
  const prompt = `${RUBRIC}\n\nReader's language: ${LANG_NAMES[c.language]}\n\nThe message they checked:\n${c.sourceText ?? '(screenshot, text not labelled)'}\n\nThe report they got:\n${reportText(res)}`;
  const key = sha(JSON.stringify([RUBRIC_VERSION, model, prompt]));
  const file = join(JUDGE_CACHE, `${key}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as JudgeResult;
  try {
    const out = await client.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: { score: { type: 'INTEGER' }, reason: { type: 'STRING' } },
          required: ['score', 'reason'],
        } as Schema,
        temperature: 0,
        maxOutputTokens: 2048,
        abortSignal: AbortSignal.timeout(30_000),
      },
    });
    const parsed = JSON.parse(out.text ?? '{}') as { score?: number; reason?: string };
    if (typeof parsed.score !== 'number' || parsed.score < 1 || parsed.score > 5) return undefined;
    const result = { score: Math.round(parsed.score), reason: String(parsed.reason ?? '').slice(0, 240), model };
    mkdirSync(JUDGE_CACHE, { recursive: true });
    writeFileSync(file, JSON.stringify(result));
    return result;
  } catch {
    return undefined;
  }
}
