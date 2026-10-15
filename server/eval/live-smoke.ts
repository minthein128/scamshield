import { writeFileSync } from 'node:fs';
import { GoogleGenAI, Type } from '@google/genai';
import WebSocket from 'ws';
import { findCertainty } from '../src/language-guard.js';
import { allowedNumbers } from '../src/live-prompt.js';
import { pcmToWav } from '../src/speak.js';
import type { CheckResponse, Lang } from '../src/types.js';

const API = (process.env.LIVE_SMOKE_API ?? process.argv.find((a) => a.startsWith('--api='))?.slice(6) ?? 'http://localhost:8080').replace(
  /\/$/,
  '',
);
const JUDGE_MODEL = process.env.LIVE_JUDGE_MODEL ?? 'gemini-3.8-flash';
const ONLY = process.argv
  .find((a) => a.startsWith('--only='))
  ?.slice(7)
  ?.split(',');
const HOME = 'MM';
const DEST = 'TH';

const POSTS: Record<string, string> = {
  my: 'အရေးပေါ် ဝန်ထမ်းခေါ်ယူနေပါသည်။ ထိုင်းနိုင်ငံ မဲဆောက်ဘက်ခြမ်းရှိ ကုမ္ပဏီတွင် အွန်လိုင်းဖောက်သည်ဝန်ဆောင်မှု လုပ်ငန်း၊ အတွေ့အကြုံမလို၊ လစာ ဒေါ်လာ ၁၅၀၀၊ အစားအသောက်နှင့် နေရာထိုင်ခင်း အခမဲ့။ ပတ်စပို့ကို ကုမ္ပဏီက ကိုင်ထားပေးမည်။ ကားဖြင့် နယ်စပ်ကို ခရီးသွားရမည်။ ကြိုတင်ကြေး ကျပ် ၃၀၀၀၀၀ ကို Telegram @fictionalhr မှတစ်ဆင့် ယနေ့ပဲ ပေးပို့ပါ။',
  en: 'Urgent hiring! Online customer service agents near Myawaddy, no experience needed, USD 1500 a month, free housing and food. We keep your passport for safety. Travel by car through the border. Pay a 300 USD booking fee to @fictional_hr on Telegram today only.',
};

const QUESTIONS: Record<string, string> = {
  my: 'ဒီအလုပ်က ဘေးကင်းလား။ ကြိုတင်ပြီး ပိုက်ဆံပေးရမယ်လို့ ပြောတယ်။ ကျွန်တော် ဘာလုပ်သင့်လဲ။',
  en: 'Is this job safe? They want me to pay a fee first. What should I do?',
  danger: 'They are keeping my passport and I cannot leave the building. I am scared. Please help me.',
  recheck: 'Okay. Now I opened a different message. Can you check this new message on my screen?',
  th: 'งานนี้ปลอดภัยไหม เขาให้จ่ายค่าธรรมเนียมก่อน ฉันควรทำอย่างไรดี',
  myBack: 'ကောင်းပြီ။ ဒါဆို ကျွန်တော် ဘယ်သူ့ကို အကူအညီတောင်းရမလဲ။',
};

interface LangTurn {
  q: keyof typeof QUESTIONS;
  speakAs: Lang;
  expect: 'my' | 'th' | 'latin';
}

const LANG_SCENARIOS: { id: string; session: Lang; turns: LangTurn[] }[] = [
  {
    id: 'lang-my-en-my',
    session: 'my',
    turns: [
      { q: 'en', speakAs: 'en', expect: 'latin' },
      { q: 'myBack', speakAs: 'my', expect: 'my' },
    ],
  },
  { id: 'lang-th-en', session: 'th', turns: [{ q: 'en', speakAs: 'en', expect: 'latin' }] },
  { id: 'lang-en-my', session: 'en', turns: [{ q: 'my', speakAs: 'my', expect: 'my' }] },
  { id: 'voice-th-th', session: 'th', turns: [{ q: 'th', speakAs: 'th', expect: 'th' }] },
  { id: 'voice-my-my', session: 'my', turns: [{ q: 'my', speakAs: 'my', expect: 'my' }] },
];

const scriptOf = (t: string): 'my' | 'th' | 'latin' => {
  const my = (t.match(/[\u1000-\u109F]/g) ?? []).length;
  const th = (t.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  const latin = (t.match(/[A-Za-z]/g) ?? []).length;
  return my >= th && my >= latin ? 'my' : th >= latin ? 'th' : 'latin';
};

const FEMALE = /ကျွန်မ|ရှင့်|ရှင်|ค่ะ|คะ|ดิฉัน/g;
const MALE = /ကျွန်တော်|ခင်ဗျာ|ခင်ဗျ|ครับ|ผม/g;

const SECOND_POST =
  'Hi, this is Kerry Express. Your parcel will arrive tomorrow between 9 and 12. No payment is needed. Track it in the Kerry app.';

interface Scenario {
  id: string;
  postLang: Lang;
  startLang: Lang;
  question: keyof typeof QUESTIONS;
  questionLang: Lang;
  expectAction?: boolean;
}

const SCENARIOS: Scenario[] = [
  { id: 'my-my', postLang: 'my', startLang: 'my', question: 'my', questionLang: 'my' },
  { id: 'en-en', postLang: 'en', startLang: 'en', question: 'en', questionLang: 'en' },
  { id: 'my-report-en-question', postLang: 'my', startLang: 'my', question: 'en', questionLang: 'en' },
  { id: 'en-danger', postLang: 'en', startLang: 'en', question: 'danger', questionLang: 'en', expectAction: true },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const post = async (path: string, body: unknown) => {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
};

function wavToPcm16k(wav: Buffer): Buffer {
  let off = 12;
  let rate = 24000;
  let data: Buffer = Buffer.alloc(0);
  while (off + 8 <= wav.length) {
    const id = wav.toString('ascii', off, off + 4);
    const size = wav.readUInt32LE(off + 4);
    if (id === 'fmt ') rate = wav.readUInt32LE(off + 12);
    if (id === 'data') data = wav.subarray(off + 8, Math.min(wav.length, off + 8 + size));
    off += 8 + size + (size % 2);
  }
  const src = new Int16Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.length - (data.length % 2)));
  const n = Math.floor((src.length * 16000) / rate);
  const out = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const pos = (i * rate) / 16000;
    const i0 = Math.floor(pos);
    const f = pos - i0;
    const v = (src[i0] ?? 0) * (1 - f) + (src[i0 + 1] ?? src[i0] ?? 0) * f;
    out.writeInt16LE(Math.round(v), i * 2);
  }
  return out;
}

interface RunResult {
  scenario: Scenario;
  ttfaFromEndOfSpeechMs?: number;
  ttfaFromReadyMs?: number;
  connectMs: number;
  userText: string;
  modelText: string;
  actions: string[];
  audioPath?: string;
  audioSeconds: number;
  closed?: string;
  errors: string[];
  certaintyHits: number;
}

async function runLive(s: Scenario, checkId: string, questionPcm: Buffer): Promise<RunResult> {
  const wsUrl = `${API.replace(/^http/, 'ws')}/v1/live`;
  const res: RunResult = {
    scenario: s,
    connectMs: 0,
    userText: '',
    modelText: '',
    actions: [],
    audioSeconds: 0,
    errors: [],
    certaintyHits: 0,
  };
  const audio: Buffer[] = [];
  const tConnect = Date.now();
  const ws = new WebSocket(wsUrl);
  let ready = 0;
  let endOfSpeech = 0;
  let firstAudio = 0;
  let modelFinal = false;
  const lines: string[] = [];
  let current = '';
  ws.on('message', (d) => {
    const f = JSON.parse(d.toString());
    if (f.type === 'ready') ready = Date.now();
    else if (f.type === 'audio') {
      firstAudio ||= Date.now();
      audio.push(Buffer.from(f.data, 'base64'));
    } else if (f.type === 'transcript') {
      if (f.role === 'user') res.userText = f.text;
      else {
        if (f.final) {
          lines.push(f.text);
          current = '';
          modelFinal = true;
        } else current = f.text;
        res.modelText = [...lines, current].filter(Boolean).join(' ');
      }
    } else if (f.type === 'action') res.actions.push(f.screen);
    else if (f.type === 'error') res.errors.push(`${f.code}: ${f.message}`);
    else if (f.type === 'closed') res.closed = f.reason;
  });
  await new Promise<void>((ok, bad) => {
    ws.once('open', () => ok());
    ws.once('error', bad);
  });
  ws.send(JSON.stringify({ type: 'start', checkId, language: s.startLang, mode: 'self', home: HOME, destination: DEST }));
  while (!ready && !res.errors.length) await sleep(20);
  if (res.errors.length) return res;
  res.connectMs = ready - tConnect;

  const CHUNK = 3200;
  const silence = Buffer.alloc(CHUNK);
  const send = (b: Buffer) => ws.send(JSON.stringify({ type: 'audio', data: b.toString('base64') }));
  const t0 = Date.now();
  let i = 0;
  const tick = () => sleep(Math.max(0, t0 + (i + 1) * 100 - Date.now()));
  for (; i * CHUNK < questionPcm.length; i++) {
    send(questionPcm.subarray(i * CHUNK, (i + 1) * CHUNK));
    await tick();
  }
  endOfSpeech = Date.now();
  const deadline = Date.now() + 40_000;
  let quiet = 0;
  while (Date.now() < deadline && !res.errors.length) {
    send(silence);
    i++;
    await tick();
    if (modelFinal) quiet++;
    if (quiet > 8 && (!s.expectAction || res.actions.length)) break;
  }
  ws.send(JSON.stringify({ type: 'end' }));
  await Promise.race([new Promise((r) => ws.once('close', r)), sleep(3000)]);
  if (firstAudio) {
    res.ttfaFromEndOfSpeechMs = firstAudio - endOfSpeech;
    res.ttfaFromReadyMs = firstAudio - ready;
  }
  const pcm = Buffer.concat(audio);
  res.audioSeconds = pcm.length / 2 / 24000;
  if (pcm.length) {
    res.audioPath = `/tmp/saferoute-live-${s.id}.wav`;
    writeFileSync(res.audioPath, pcmToWav(pcm, 24000));
  }
  res.certaintyHits = findCertainty(res.modelText, s.startLang).length;
  return res;
}

const sentences = (t: string) => t.split(/[.!?။՜؟।]+(?:\s+|$)|[။]/u).filter((x) => x.trim().length > 1).length;

async function judge(ai: GoogleGenAI, r: RunResult, report: CheckResponse) {
  if (!r.audioPath) return undefined;
  const { readFileSync } = await import('node:fs');
  const wav = readFileSync(r.audioPath).toString('base64');
  const prompt = `You judge a voice assistant reply. First transcribe the audio exactly in its own language. Then judge it.
Expected reply language: ${r.scenario.startLang}. The listener asked (language ${r.scenario.questionLang}): "${QUESTIONS[r.scenario.question]}"
The risk report the assistant must stay grounded in:
${JSON.stringify({ verdict: report.verdict, score: report.score, summary: report.summary, flags: report.flags.map((f) => ({ label: f.label, severity: f.severity })) })}
Phone numbers the assistant may say: ${JSON.stringify(allowedNumbers(HOME, DEST))}
Answer as JSON: transcript, detectedLanguage (ISO 639-1), inExpectedLanguage (bool), grounded (bool: facts match the report, nothing invented), hedges (bool: speaks in likelihood terms, never states a scam as fact), sentenceCount (int), underThreeSentences (bool: three or fewer), saysUnlistedNumber (bool), notes (one short sentence).`;
  const out = await ai.models.generateContent({
    model: JUDGE_MODEL,
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'audio/wav', data: wav } }, { text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcript: { type: Type.STRING },
          detectedLanguage: { type: Type.STRING },
          inExpectedLanguage: { type: Type.BOOLEAN },
          grounded: { type: Type.BOOLEAN },
          hedges: { type: Type.BOOLEAN },
          sentenceCount: { type: Type.INTEGER },
          underThreeSentences: { type: Type.BOOLEAN },
          saysUnlistedNumber: { type: Type.BOOLEAN },
          notes: { type: Type.STRING },
        },
        required: [
          'transcript',
          'detectedLanguage',
          'inExpectedLanguage',
          'grounded',
          'hedges',
          'sentenceCount',
          'underThreeSentences',
          'saysUnlistedNumber',
          'notes',
        ],
      },
    },
  });
  return JSON.parse(out.text ?? '{}') as Record<string, unknown>;
}

interface Listener {
  ws: WebSocket;
  ready: number;
  lines: string[];
  current: string;
  finals: number;
  audio: Buffer[];
  firstAudioAfter: (t: number) => number | undefined;
  actions: string[];
  errors: string[];
  closed?: string;
}

function listen(ws: WebSocket): Listener {
  const stamps: number[] = [];
  const l: Listener = {
    ws,
    ready: 0,
    lines: [],
    current: '',
    finals: 0,
    audio: [],
    actions: [],
    errors: [],
    firstAudioAfter: (t) => stamps.find((x) => x >= t),
  };
  ws.on('message', (d) => {
    const f = JSON.parse(d.toString());
    if (f.type === 'ready') l.ready = Date.now();
    else if (f.type === 'audio') {
      stamps.push(Date.now());
      l.audio.push(Buffer.from(f.data, 'base64'));
    } else if (f.type === 'transcript' && f.role === 'model') {
      if (f.final) {
        l.lines.push(f.text);
        l.current = '';
        l.finals++;
      } else l.current = f.text;
    } else if (f.type === 'action') l.actions.push(f.screen);
    else if (f.type === 'error') l.errors.push(`${f.code}: ${f.message}`);
    else if (f.type === 'closed') l.closed = f.reason;
  });
  return l;
}

/** Streams speech in real time, then silence until the model finishes a line (or `until` holds). */
async function speakAndWait(l: Listener, pcm: Buffer, until: () => boolean, maxMs = 40_000) {
  const CHUNK = 3200;
  const silence = Buffer.alloc(CHUNK);
  const send = (b: Buffer) => l.ws.send(JSON.stringify({ type: 'audio', data: b.toString('base64') }));
  const t0 = Date.now();
  let i = 0;
  const tick = () => sleep(Math.max(0, t0 + (i + 1) * 100 - Date.now()));
  for (; i * CHUNK < pcm.length; i++) {
    send(pcm.subarray(i * CHUNK, (i + 1) * CHUNK));
    await tick();
  }
  const endOfSpeech = Date.now();
  const deadline = endOfSpeech + maxMs;
  let quiet = 0;
  while (Date.now() < deadline && !l.errors.length) {
    send(silence);
    i++;
    await tick();
    if (until()) quiet++;
    if (quiet > 8) break;
  }
  return endOfSpeech;
}

async function judgeText(ai: GoogleGenAI, reply: string, first: CheckResponse, second: CheckResponse) {
  const prompt = `A voice assistant had explained report A. Then the listener's screen was checked again and report B arrived. Here is what the assistant said right after report B arrived:
"${reply}"
Report A: ${JSON.stringify({ verdict: first.verdict, title: first.title, summary: first.summary })}
Report B: ${JSON.stringify({ verdict: second.verdict, title: second.title, summary: second.summary })}
Answer as JSON: explainsReportB (bool: the reply is about report B and matches its verdict), mixesUpReports (bool: it describes report A as the current one), hedges (bool: likelihood wording, no certainty), sentenceCount (int), notes (one short sentence).`;
  const out = await ai.models.generateContent({
    model: JUDGE_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explainsReportB: { type: Type.BOOLEAN },
          mixesUpReports: { type: Type.BOOLEAN },
          hedges: { type: Type.BOOLEAN },
          sentenceCount: { type: Type.INTEGER },
          notes: { type: Type.STRING },
        },
        required: ['explainsReportB', 'mixesUpReports', 'hedges', 'sentenceCount', 'notes'],
      },
    },
  });
  return JSON.parse(out.text ?? '{}') as Record<string, unknown>;
}

const payload = (r: CheckResponse) => ({
  verdict: r.verdict,
  score: r.score,
  title: r.title,
  summary: r.summary,
  scamType: r.scamType,
  flags: r.flags.map((f) => ({ family: f.family, label: f.label, evidence: f.evidence.slice(0, 600), severity: f.severity })),
  sources: (r.sources ?? []).slice(0, 10),
});

/** Companion: start with report A, ask, trigger recheck_screen by voice, inject report B, check the reply explains B. */
async function runCompanion(ai: GoogleGenAI | undefined) {
  console.log('\n== companion');
  const check = (text: string, kind: string) =>
    post('/v1/check', {
      kind,
      text,
      language: 'en',
      shareSignals: false,
      context: { destination: 'Thailand', home: 'Myanmar' },
    }) as Promise<CheckResponse>;
  const first = await check(POSTS.en as string, 'job');
  console.log(`report A ${first.id}: ${first.verdict} ${first.score}`);
  const voice = async (key: keyof typeof QUESTIONS) =>
    wavToPcm16k(
      Buffer.from(((await post('/v1/speak', { text: QUESTIONS[key], language: 'en' })) as { audioBase64: string }).audioBase64, 'base64'),
    );
  const q1 = await voice('en');
  const q2 = await voice('recheck');

  const tConnect = Date.now();
  const ws = new WebSocket(`${API.replace(/^http/, 'ws')}/v1/live`);
  const l = listen(ws);
  await new Promise<void>((ok, bad) => {
    ws.once('open', () => ok());
    ws.once('error', bad);
  });
  ws.send(
    JSON.stringify({
      type: 'start',
      checkId: first.id,
      report: payload(first),
      language: 'en',
      mode: 'companion',
      home: HOME,
      destination: DEST,
    }),
  );
  while (!l.ready && !l.errors.length) await sleep(20);
  if (l.errors.length) {
    console.log(`errors ${JSON.stringify(l.errors)}`);
    return { id: 'companion', errors: l.errors };
  }
  console.log(`connect-to-ready ${l.ready - tConnect} ms`);

  const finalsBefore1 = l.finals;
  const end1 = await speakAndWait(l, q1, () => l.finals > finalsBefore1);
  const ttfa1 = (l.firstAudioAfter(end1) ?? 0) - end1;
  console.log(`Q1 time to first audio: ${ttfa1} ms after end of question`);
  console.log(`Q1 said: ${l.lines.slice(finalsBefore1).join(' ')}`);

  const end2 = await speakAndWait(l, q2, () => l.actions.includes('RECHECK'), 20_000);
  const recheckMs = l.actions.includes('RECHECK') ? 'fired' : 'not fired';
  console.log(`recheck_screen: ${recheckMs}; said: ${[...l.lines.slice(finalsBefore1 + 1), l.current].filter(Boolean).join(' ')}`);
  if (!l.actions.includes('RECHECK')) return { id: 'companion', ttfa1, recheck: false, errors: l.errors };

  const second = await check(SECOND_POST, 'message');
  console.log(`report B ${second.id}: ${second.verdict} ${second.score}`);
  await sleep(1500);
  const finalsBefore3 = l.finals;
  const tContext = Date.now();
  ws.send(JSON.stringify({ type: 'context', checkId: second.id, report: payload(second) }));
  await speakAndWait(l, Buffer.alloc(0), () => l.finals > finalsBefore3, 30_000);
  const ttfa3 = (l.firstAudioAfter(tContext) ?? 0) - tContext;
  const reply = l.lines.slice(finalsBefore3).join(' ');
  console.log(`context time to first audio: ${ttfa3} ms after the context frame`);
  console.log(`after context said: ${reply}`);
  ws.send(JSON.stringify({ type: 'end' }));
  await Promise.race([new Promise((r) => ws.once('close', r)), sleep(3000)]);
  const pcm = Buffer.concat(l.audio);
  writeFileSync('/tmp/saferoute-live-companion.wav', pcmToWav(pcm, 24000));
  console.log(
    `audio ${(pcm.length / 48000).toFixed(1)} s -> /tmp/saferoute-live-companion.wav; actions ${JSON.stringify(l.actions)}; closed ${l.closed}; errors ${JSON.stringify(l.errors)}`,
  );
  const certainty = findCertainty(l.lines.join(' '), 'en').length;
  const verdict = ai && reply ? await judgeText(ai, reply, first, second).catch((e: Error) => ({ judgeError: e.message })) : undefined;
  if (verdict) console.log(`judge: ${JSON.stringify(verdict)}`);
  console.log(`certainty hits (guard, detect only): ${certainty}`);
  return {
    id: 'companion',
    ttfa1,
    recheck: true,
    ttfaAfterContext: ttfa3,
    reportA: first.verdict,
    reportB: second.verdict,
    certaintyHits: certainty,
    judge: verdict,
  };
}

/** Live language and voice checks: which language each reply comes back in, and its speaker particles. */
async function runLanguages(only?: string[]) {
  const out: Record<string, unknown>[] = [];
  const reports = new Map<Lang, CheckResponse>();
  const audioFor = new Map<string, Buffer>();
  for (const sc of LANG_SCENARIOS.filter((x) => !only || only.includes(x.id) || only.includes('lang'))) {
    console.log(`\n== ${sc.id}`);
    if (!reports.has(sc.session)) {
      const text = sc.session === 'my' ? (POSTS.my as string) : (POSTS.en as string);
      reports.set(
        sc.session,
        (await post('/v1/check', {
          kind: 'job',
          text,
          language: sc.session,
          shareSignals: false,
          context: { destination: 'Thailand', home: 'Myanmar' },
        })) as CheckResponse,
      );
    }
    const report = reports.get(sc.session) as CheckResponse;
    const ws = new WebSocket(`${API.replace(/^http/, 'ws')}/v1/live`);
    const l = listen(ws);
    await new Promise<void>((ok, bad) => {
      ws.once('open', () => ok());
      ws.once('error', bad);
    });
    ws.send(
      JSON.stringify({
        type: 'start',
        checkId: report.id,
        report: payload(report),
        language: sc.session,
        mode: 'self',
        home: HOME,
        destination: DEST,
      }),
    );
    while (!l.ready && !l.errors.length) await sleep(20);
    const turns: Record<string, unknown>[] = [];
    for (const t of sc.turns) {
      if (l.errors.length) break;
      const key = `${t.speakAs}:${t.q}`;
      if (!audioFor.has(key)) {
        const sp = (await post('/v1/speak', { text: QUESTIONS[t.q], language: t.speakAs })) as { audioBase64: string };
        audioFor.set(key, wavToPcm16k(Buffer.from(sp.audioBase64, 'base64')));
      }
      const before = l.finals;
      const end = await speakAndWait(l, audioFor.get(key) as Buffer, () => l.finals > before);
      const reply = l.lines.slice(before).join(' ');
      const got = scriptOf(reply);
      const female = reply.match(FEMALE) ?? [];
      const male = reply.match(MALE) ?? [];
      const ttfa = (l.firstAudioAfter(end) ?? 0) - end;
      console.log(
        `asked in ${t.speakAs}: reply script ${got} (expected ${t.expect}) ${got === t.expect ? 'OK' : 'MISMATCH'}; ttfa ${ttfa} ms`,
      );
      console.log(`said : ${reply}`);
      console.log(`particles female ${JSON.stringify(female)} male ${JSON.stringify(male)}`);
      turns.push({ askedIn: t.speakAs, expected: t.expect, got, ok: got === t.expect, ttfa, female, male, reply });
    }
    ws.send(JSON.stringify({ type: 'end' }));
    await Promise.race([new Promise((r) => ws.once('close', r)), sleep(3000)]);
    if (l.errors.length) console.log(`errors ${JSON.stringify(l.errors)}`);
    out.push({ id: sc.id, session: sc.session, turns, errors: l.errors });
  }
  return out;
}

async function main() {
  const key = process.env.GEMINI_API_KEY;
  const ai = key ? new GoogleGenAI({ apiKey: key }) : undefined;
  if (!ai) console.log('GEMINI_API_KEY not set: judging is skipped');
  const reports = new Map<string, CheckResponse>();
  const questions = new Map<string, Buffer>();
  const summary: Record<string, unknown>[] = [];
  for (const s of SCENARIOS.filter((x) => !ONLY || ONLY.includes(x.id))) {
    console.log(`\n== ${s.id}`);
    const rk = `${s.postLang}`;
    if (!reports.has(rk)) {
      const r = (await post('/v1/check', {
        kind: 'job',
        text: POSTS[s.postLang],
        language: s.postLang,
        shareSignals: false,
        context: { destination: 'Thailand', home: 'Myanmar' },
      })) as CheckResponse;
      reports.set(rk, r);
      console.log(`check ${r.id}: ${r.verdict} ${r.score}`);
    }
    const report = reports.get(rk) as CheckResponse;
    const qk = `${s.questionLang}:${s.question}`;
    if (!questions.has(qk)) {
      const sp = (await post('/v1/speak', { text: QUESTIONS[s.question], language: s.questionLang })) as { audioBase64: string };
      questions.set(qk, wavToPcm16k(Buffer.from(sp.audioBase64, 'base64')));
    }
    const result = await runLive(s, report.id, questions.get(qk) as Buffer);
    console.log(
      `connect-to-ready ${result.connectMs} ms; time to first audio: ${result.ttfaFromEndOfSpeechMs ?? 'none'} ms after end of question (${result.ttfaFromReadyMs ?? 'none'} ms after ready)`,
    );
    console.log(`heard: ${result.userText}`);
    console.log(`said : ${result.modelText}`);
    console.log(
      `audio ${result.audioSeconds.toFixed(1)} s -> ${result.audioPath ?? '-'}; actions ${JSON.stringify(result.actions)}; closed ${result.closed}; errors ${JSON.stringify(result.errors)}`,
    );
    console.log(`certainty hits (guard, detect only): ${result.certaintyHits}; sentences by split: ${sentences(result.modelText)}`);
    const verdict = ai ? await judge(ai, result, report).catch((e: Error) => ({ judgeError: e.message })) : undefined;
    if (verdict) console.log(`judge: ${JSON.stringify(verdict)}`);
    summary.push({
      id: s.id,
      ttfaMs: result.ttfaFromEndOfSpeechMs,
      connectMs: result.connectMs,
      certaintyHits: result.certaintyHits,
      actions: result.actions,
      sentences: sentences(result.modelText),
      judge: verdict,
    });
  }
  if (!ONLY || ONLY.includes('companion')) summary.push(await runCompanion(ai));
  if (!ONLY || ONLY.some((x) => x === 'lang' || x.startsWith('lang-') || x.startsWith('voice-')))
    summary.push(...(await runLanguages(ONLY)));
  writeFileSync('/tmp/saferoute-live-smoke.json', JSON.stringify(summary, null, 2));
  console.log('\nsummary written to /tmp/saferoute-live-smoke.json');
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
