import { createHash } from 'node:crypto';
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { ActivityHandling, EndSensitivity, type LiveConnectConfig, Modality, StartSensitivity, Type } from '@google/genai';
import { type RawData, type WebSocket, WebSocketServer } from 'ws';
import { z } from 'zod';
import { clientIp, type Limits } from './app.js';
import { bearerToken, type TokenVerifier } from './auth.js';
import type { Config } from './config.js';
import { findCertainty, findMaleFormsAny, findPromises, fixAppName, genderCounters, promiseCounters } from './language-guard.js';
import {
  ACTION_SCREENS,
  type ActionScreen,
  buildContextTurn,
  buildSystemInstruction,
  LIVE_MODES,
  type LiveMode,
  type LiveReport,
  RECHECK_SCREEN,
  RECHECK_TOOL,
  speechLocale,
} from './live-prompt.js';
import { log } from './log.js';
import type { Pipeline } from './pipeline.js';
import { FAMILIES, LANGS, type Lang, SCAM_TYPES, SEVERITIES } from './types.js';

export const LIVE_PATH = '/v1/live';
const START_TIMEOUT_MS = 10_000;
const MAX_START_BYTES = 64 * 1024;
const MAX_AUDIO_B64 = 64 * 1024;
const MAX_PAYLOAD = 128 * 1024;
const SESSION_COST = 2;
const MAX_CONTEXT_BYTES = 64 * 1024;
const MAX_CONTEXTS = 10;

export const liveCounters = { live_certainty_hit: 0, gender_form_hit: 0, promise_hit: 0, sessions: 0 };

const country = z
  .string()
  .regex(/^[A-Za-z]{2}$/)
  .transform((s) => s.toUpperCase());

const reportSchema = z.object({
  verdict: z.enum(['safe', 'careful', 'danger']),
  score: z.number().min(0).max(100),
  title: z.string().max(300),
  summary: z.string().max(2000),
  scamType: z.enum(SCAM_TYPES),
  flags: z
    .array(
      z.object({
        family: z.enum(FAMILIES),
        label: z.string().max(300),
        evidence: z.string().max(600),
        severity: z.enum(SEVERITIES),
      }),
    )
    .max(20),
  sources: z
    .array(z.object({ title: z.string().max(200), url: z.string().max(500) }))
    .max(10)
    .default([]),
  network: z.object({ seenCount: z.number().int().min(0) }).optional(),
});

const startSchema = z
  .object({
    type: z.literal('start'),
    checkId: z.string().min(1).max(64).optional(),
    report: reportSchema.optional(),
    language: z.enum(LANGS).default('en'),
    mode: z.enum(LIVE_MODES).default('self'),
    home: country.optional(),
    destination: country.optional(),
    token: z.string().max(4096).optional(),
  })
  .refine((v) => Boolean(v.checkId || v.report), { message: 'checkId or report is required' });

export type StartFrame = z.infer<typeof startSchema>;

const contextSchema = z
  .object({
    type: z.literal('context'),
    checkId: z.string().min(1).max(64).optional(),
    report: reportSchema.optional(),
    error: z.literal('check_failed').optional(),
  })
  .refine((v) => Boolean(v.checkId || v.report || v.error), { message: 'checkId, report or error is required' });

export type ContextFrame = z.infer<typeof contextSchema>;

export type ContextResult = { ok: true; context: ContextFrame } | { ok: false; message: string };

/** Validates a companion `context` frame: a re-checked report the app sends after a RECHECK action. */
export function parseContext(raw: string): ContextResult {
  if (raw.length > MAX_CONTEXT_BYTES) return { ok: false, message: 'context frame is too large' };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'frame must be JSON' };
  }
  const r = contextSchema.safeParse(json);
  if (!r.success) return { ok: false, message: r.error.issues.map((i) => `${i.path.join('.') || 'context'}: ${i.message}`).join('; ') };
  return { ok: true, context: r.data };
}

export type StartResult = { ok: true; start: StartFrame } | { ok: false; message: string };

export function parseStart(raw: string): StartResult {
  if (raw.length > MAX_START_BYTES) return { ok: false, message: 'start frame is too large' };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'frame must be JSON' };
  }
  const r = startSchema.safeParse(json);
  if (!r.success) return { ok: false, message: r.error.issues.map((i) => `${i.path.join('.') || 'start'}: ${i.message}`).join('; ') };
  return { ok: true, start: r.data };
}

export interface ServerMsg {
  setupComplete?: unknown;
  serverContent?: {
    modelTurn?: { parts?: { inlineData?: { data?: string } }[] };
    turnComplete?: boolean;
    interrupted?: boolean;
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
  };
  toolCall?: { functionCalls?: { id?: string; name?: string; args?: Record<string, unknown> }[] };
}

export interface LiveCallbacks {
  onmessage: (m: ServerMsg) => void;
  onerror?: (e: { message?: string }) => void;
  onclose?: (e: { code?: number }) => void;
}

export interface LiveSessionLike {
  sendRealtimeInput(p: { audio?: { data: string; mimeType: string }; audioStreamEnd?: boolean }): void;
  sendToolResponse(p: { functionResponses: { id?: string; name?: string; response: Record<string, unknown> }[] }): void;
  sendClientContent(p: { turns: { role: string; parts: { text: string }[] }[]; turnComplete: boolean }): void;
  close(): void;
}

export interface LiveContext {
  language: Lang;
  verdict: LiveReport['verdict'];
}

export type LiveConnect = (
  p: { model: string; config: LiveConnectConfig; callbacks: LiveCallbacks },
  ctx: LiveContext,
) => Promise<LiveSessionLike>;

const RECHECK_DECLARATION = {
  name: RECHECK_TOOL,
  description:
    'Capture and check the screen again when the listener asks about something new on their screen. The new report arrives later as a NEW CURRENT REPORT message.',
};

/** One session language. Native audio models reject speechConfig.languageCode, so the prompt pins output. */
export function liveConfig(
  cfg: Pick<Config, 'liveVoice'> &
    Partial<Pick<Config, 'liveStartSensitivity' | 'liveEndSensitivity' | 'livePrefixPaddingMs' | 'liveSilenceMs'>>,
  systemInstruction: string,
  allowed: readonly Lang[],
  mode: LiveMode = 'self',
): LiveConnectConfig {
  return {
    responseModalities: [Modality.AUDIO],
    systemInstruction,
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cfg.liveVoice } } },
    realtimeInputConfig: {
      activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
      automaticActivityDetection: {
        startOfSpeechSensitivity:
          cfg.liveStartSensitivity === 'high' ? StartSensitivity.START_SENSITIVITY_HIGH : StartSensitivity.START_SENSITIVITY_LOW,
        endOfSpeechSensitivity:
          cfg.liveEndSensitivity === 'high' ? EndSensitivity.END_SENSITIVITY_HIGH : EndSensitivity.END_SENSITIVITY_LOW,
        prefixPaddingMs: cfg.livePrefixPaddingMs ?? 400,
        silenceDurationMs: cfg.liveSilenceMs ?? 700,
      },
    },
    outputAudioTranscription: {},
    inputAudioTranscription: { languageCodes: allowed.map(speechLocale) },
    tools: [
      {
        functionDeclarations: [
          {
            name: 'open_action_sheet',
            description: 'Open an app screen for the listener: the hotlines (Get help) screen or the warn-family sheet.',
            parameters: {
              type: Type.OBJECT,
              properties: { screen: { type: Type.STRING, enum: [...ACTION_SCREENS] } },
              required: ['screen'],
            },
          },
          ...(mode === 'companion' ? [RECHECK_DECLARATION] : []),
        ],
      },
    ],
  };
}

export interface LiveDeps {
  cfg: Config;
  pipeline: Pipeline;
  verifier?: TokenVerifier;
  limits: Limits;
  connect: LiveConnect;
}

const hashId = (id: string | undefined) => (id ? createHash('sha256').update(id).digest('hex').slice(0, 12) : 'inline');

export function attachLive(server: Server, deps: LiveDeps) {
  const { cfg } = deps;
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });
  const active = new Set<string>();

  const originAllowed = (origin: string | undefined) => !origin || cfg.allowedOrigins.includes('*') || cfg.allowedOrigins.includes(origin);

  const onUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(req.url ?? '/', 'http://local');
    if (url.pathname !== LIVE_PATH) return;
    if (!originAllowed(req.headers.origin)) {
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      return;
    }
    const fwd = req.headers['x-forwarded-for'];
    const ip = clientIp(Array.isArray(fwd) ? fwd[0] : fwd, req.socket.remoteAddress);
    const token = url.searchParams.get('token') ?? bearerToken(req.headers.authorization);
    wss.handleUpgrade(req, socket, head, (ws) => runSession(ws, ip, token ?? undefined));
  };
  server.on('upgrade', onUpgrade);

  function runSession(ws: WebSocket, ip: string, queryToken: string | undefined) {
    const t0 = Date.now();
    type Phase = 'await_start' | 'connecting' | 'live' | 'done';
    let phase = 'await_start' as Phase;
    const closed = () => phase === 'done';
    let session: LiveSessionLike | undefined;
    let activeKey: string | undefined;
    let mode: LiveMode = 'self';
    let contexts = 0;
    let checkId: string | undefined;
    let turns = 0;
    let certaintyHits = 0;
    let actionFired = false;
    let userText = '';
    let modelText = '';
    let capTimer: NodeJS.Timeout | undefined;
    const startTimer = setTimeout(() => fail('bad_request', 'No start frame received'), START_TIMEOUT_MS);

    const send = (o: Record<string, unknown>) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(o));
    };

    const endModelLine = () => {
      if (!modelText) return;
      send({ type: 'transcript', role: 'model', text: fixAppName(modelText, 'th'), final: true });
      const hits = LANGS.reduce((n, l) => n + findCertainty(modelText, l).length, 0);
      certaintyHits += hits;
      liveCounters.live_certainty_hit += hits;
      const male = findMaleFormsAny(modelText).length;
      liveCounters.gender_form_hit += male;
      genderCounters.gender_form_hit += male;
      const promises = findPromises(modelText).length;
      liveCounters.promise_hit += promises;
      promiseCounters.promise_hit += promises;
      turns++;
      modelText = '';
    };
    const endUserLine = () => {
      if (!userText) return;
      send({ type: 'transcript', role: 'user', text: userText, final: true });
      userText = '';
    };

    function finish(reason: 'cap' | 'end' | 'error') {
      if (phase === 'done') return;
      const wasLive = phase === 'live';
      phase = 'done';
      clearTimeout(startTimer);
      clearTimeout(capTimer);
      endUserLine();
      endModelLine();
      try {
        session?.close();
      } catch {
        // already closed
      }
      send({ type: 'closed', reason });
      if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) ws.close(1000);
      if (activeKey) active.delete(activeKey);
      if (wasLive) {
        log('INFO', 'live_session_done', {
          checkIdHash: hashId(checkId),
          durationMs: Date.now() - t0,
          turns,
          actionFired,
          certaintyHits,
        });
      }
    }

    function fail(code: string, message: string) {
      send({ type: 'error', code, message });
      finish('error');
    }

    const onServer = (m: ServerMsg) => {
      if (phase !== 'live') return;
      const c = m.serverContent;
      if (c?.interrupted) {
        endModelLine();
        send({ type: 'interrupted' });
      }
      for (const p of c?.modelTurn?.parts ?? []) {
        if (p.inlineData?.data) send({ type: 'audio', data: p.inlineData.data });
      }
      const heard = c?.inputTranscription?.text;
      if (heard) {
        endModelLine();
        userText += heard;
        send({ type: 'transcript', role: 'user', text: userText });
      }
      const said = c?.outputTranscription?.text;
      if (said) {
        endUserLine();
        modelText += said;
        send({ type: 'transcript', role: 'model', text: fixAppName(modelText, 'th') });
      }
      if (c?.turnComplete) endModelLine();
      for (const fc of m.toolCall?.functionCalls ?? []) {
        const screen = fc.args?.screen;
        const recheck = fc.name === RECHECK_TOOL && mode === 'companion';
        const ok = recheck || (fc.name === 'open_action_sheet' && ACTION_SCREENS.includes(screen as ActionScreen));
        if (ok) {
          actionFired = true;
          send({ type: 'action', screen: recheck ? RECHECK_SCREEN : screen });
        }
        const response = recheck
          ? { result: 'The app is checking the screen again. Wait for the NEW CURRENT REPORT message and do not guess the result.' }
          : ok
            ? { result: 'opened' }
            : { error: 'unknown action' };
        try {
          session?.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response }] });
        } catch {
          // session closed while answering
        }
      }
    };

    async function onStart(raw: string) {
      const parsed = parseStart(raw);
      if (!parsed.ok) return fail('bad_request', parsed.message);
      const { start } = parsed;
      if (!cfg.liveLanguages.includes(start.language)) return fail('unsupported_language', 'Voice is not available in this language');
      phase = 'connecting';
      clearTimeout(startTimer);
      mode = start.mode;
      checkId = start.checkId;

      const cached = start.checkId ? deps.pipeline.byId?.(start.checkId) : undefined;
      const report: LiveReport | undefined = cached ?? start.report;
      if (!report) return fail('not_found', 'This check is no longer available. Run it again.');

      const token = start.token ?? queryToken;
      const identity = token && deps.verifier ? await deps.verifier(token) : null;
      if (closed()) return;
      const key = identity?.uid ?? `ip:${ip}`;
      if (active.has(key)) return fail('busy', 'A voice session is already open');
      if (active.size >= cfg.liveMaxConcurrent) return fail('busy', 'Voice is busy, try again soon');

      if (!deps.limits.ip.check(ip, undefined, SESSION_COST).allowed) return fail('rate_limited', 'Too many requests, retry in a minute');
      if (identity) {
        const max = identity.anonymous ? cfg.anonPerHour : cfg.userPerHour;
        if (!deps.limits.hourly.check(identity.uid, max, SESSION_COST).allowed) return fail('rate_limited', 'Hourly check limit reached');
      }
      active.add(key);
      activeKey = key;

      const system = buildSystemInstruction({
        report,
        language: start.language,
        mode: start.mode,
        home: start.home,
        destination: start.destination,
      });
      try {
        const opened = await deps.connect(
          {
            model: cfg.liveModel,
            config: liveConfig(cfg, system, [start.language], start.mode),
            callbacks: {
              onmessage: onServer,
              onerror: () => fail('upstream', 'Voice service error'),
              onclose: () => {
                if (phase === 'live') fail('upstream', 'Voice service closed');
              },
            },
          },
          { language: start.language, verdict: report.verdict },
        );
        if (closed()) {
          opened.close();
          return;
        }
        session = opened;
      } catch (err) {
        log('WARNING', 'live_connect_failed', { error: (err as Error).message.slice(0, 120) });
        return fail('upstream', 'Voice service is unavailable');
      }
      phase = 'live';
      liveCounters.sessions++;
      const maxMs = mode === 'companion' ? cfg.liveCompanionMaxMs : cfg.liveMaxMs;
      capTimer = setTimeout(() => finish('cap'), maxMs);
      send({ type: 'ready', maxMs });
    }

    function onContext(raw: string) {
      if (mode !== 'companion') return fail('bad_request', 'context frames need companion mode');
      const parsed = parseContext(raw);
      if (!parsed.ok) return fail('bad_request', parsed.message);
      if (++contexts > MAX_CONTEXTS) return fail('bad_request', 'too many context frames');
      const { context } = parsed;
      const cached = context.checkId ? deps.pipeline.byId?.(context.checkId) : undefined;
      const report: LiveReport | undefined = context.error ? undefined : (cached ?? context.report);
      if (!report && !context.error) return fail('not_found', 'This check is no longer available. Run it again.');
      try {
        session?.sendClientContent({ turns: [{ role: 'user', parts: [{ text: buildContextTurn(report) }] }], turnComplete: true });
      } catch {
        fail('upstream', 'Voice service error');
      }
    }

    function onFrame(data: RawData, isBinary: boolean) {
      if (isBinary) return fail('bad_request', 'Frames must be JSON text');
      const raw = data.toString();
      if (phase === 'await_start') {
        onStart(raw).catch((err: Error) => {
          log('ERROR', 'live_start_failed', { error: err.message.slice(0, 120) });
          fail('upstream', 'Voice service error');
        });
        return;
      }
      if (phase !== 'live') return;
      let msg: { type?: unknown; data?: unknown };
      try {
        msg = JSON.parse(raw);
      } catch {
        return fail('bad_request', 'frame must be JSON');
      }
      if (msg.type === 'audio') {
        if (typeof msg.data !== 'string' || msg.data.length > MAX_AUDIO_B64) return fail('bad_request', 'audio frame is invalid');
        try {
          session?.sendRealtimeInput({ audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' } });
        } catch {
          fail('upstream', 'Voice service error');
        }
      } else if (msg.type === 'context') onContext(raw);
      else if (msg.type === 'end') finish('end');
    }

    ws.on('message', onFrame);
    ws.on('close', () => finish('end'));
    ws.on('error', () => finish('error'));
  }

  return {
    activeCount: () => active.size,
    close() {
      server.off('upgrade', onUpgrade);
      for (const c of wss.clients) c.close(1001);
      wss.close();
    },
  };
}
