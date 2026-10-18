import { execFileSync } from 'node:child_process';
import WebSocket from 'ws';

const API = (process.env.LIVE_SMOKE_API ?? 'http://localhost:8080').replace(/\/$/, '');
const CHUNK = 3200;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

function ffPcm(args: string[]): Buffer {
  return execFileSync('ffmpeg', ['-v', 'error', ...args, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], { maxBuffer: 1 << 26 });
}

const burst = {
  'pink noise 150ms': () => ffPcm(['-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.5:duration=0.15:sample_rate=16000']),
  'cough-like 300ms': () =>
    ffPcm(['-f', 'lavfi', '-i', 'anoisesrc=color=brown:amplitude=0.9:duration=0.3:sample_rate=16000', '-af', 'afade=t=out:st=0.05:d=0.25,highpass=f=200']),
};

async function speech(text: string): Promise<Buffer> {
  const r = (await post('/v1/speak', { text, language: 'en' })) as { audioBase64: string };
  const dir = `/tmp/barge-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`;
  (await import('node:fs')).writeFileSync(dir, Buffer.from(r.audioBase64, 'base64'));
  return ffPcm(['-i', dir]);
}

async function trial(name: string, checkId: string, question: Buffer, interruption: Buffer) {
  const ws = new WebSocket(`${API.replace(/^http/, 'ws')}/v1/live`);
  let ready = false;
  let audioAt = 0;
  let lastAudio = 0;
  let interrupts: number[] = [];
  let err = '';
  ws.on('message', (d) => {
    const f = JSON.parse(d.toString());
    if (f.type === 'ready') ready = true;
    else if (f.type === 'audio') {
      audioAt ||= Date.now();
      lastAudio = Date.now();
    } else if (f.type === 'interrupted') interrupts.push(Date.now());
    else if (f.type === 'error') err = f.code;
  });
  await new Promise<void>((ok, bad) => {
    ws.once('open', () => ok());
    ws.once('error', bad);
  });
  ws.send(JSON.stringify({ type: 'start', checkId, language: 'en', mode: 'self', home: 'MM', destination: 'TH' }));
  while (!ready && !err) await sleep(20);
  const send = (b: Buffer) => ws.send(JSON.stringify({ type: 'audio', data: b.toString('base64') }));
  const t0 = Date.now();
  let i = 0;
  const tick = () => sleep(Math.max(0, t0 + (++i) * 100 - Date.now()));
  const stream = async (pcm: Buffer) => {
    for (let o = 0; o < pcm.length; o += CHUNK) {
      send(pcm.subarray(o, o + CHUNK));
      await tick();
    }
  };
  await stream(question);
  while (!audioAt && Date.now() - t0 < 30_000) {
    send(Buffer.alloc(CHUNK));
    await tick();
  }
  for (let k = 0; k < 15; k++) {
    send(Buffer.alloc(CHUNK));
    await tick();
  }
  const speakingAtInjection = Date.now() - lastAudio < 1500;
  interrupts = [];
  const tInject = Date.now();
  await stream(interruption);
  for (let k = 0; k < 40; k++) {
    send(Buffer.alloc(CHUNK));
    await tick();
  }
  const hit = interrupts.find((t) => t >= tInject);
  ws.send(JSON.stringify({ type: 'end' }));
  ws.close();
  console.log(`${name.padEnd(20)} speaking=${speakingAtInjection} interrupted=${hit ? `YES after ${hit - tInject}ms` : 'no'}${err ? ` err=${err}` : ''}`);
  await sleep(1500);
}

const report = (await post('/v1/check', {
  kind: 'job',
  text: 'Urgent hiring near Myawaddy, USD 1500 a month. We keep your passport. Pay a 300 USD booking fee on Telegram today.',
  language: 'en',
  shareSignals: false,
  context: { destination: 'Thailand', home: 'Myanmar' },
})) as { id: string };
const question = await speech('Please explain slowly and in detail, step by step, everything I should do if a job recruiter keeps my passport.');
const phrase = await speech('Wait, stop. I have a different question for you.');
for (const [n, make] of Object.entries(burst)) await trial(n, report.id, question, make());
await trial('spoken phrase', report.id, question, phrase);
