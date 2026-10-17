import { diag } from '../lib/diagLog';
import { ApiError, codeFromStatus } from './errors';
import { createSseParser } from './sse';
import type { ApiErrorBody, ApiErrorCode, CheckClient, CheckRequest, CheckResponse, CheckStage, CheckUpdate, FeedbackRequest, HealthResponse, Insights, JobAssessRequest, JobAssessResponse, JobExtractRequest, JobExtractResponse, RequestOptions, SpeakRequest, SpeakResponse } from './types';
import { hasInput, hasJobInput, isCheckResponse, isJobExtractResponse, normalizeJobResponse, normalizeResponse } from './validate';

export interface HttpClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  /** Timeout for /v1/check, which may upload a screenshot on a slow link. Defaults to timeoutMs when set, else 75 s. */
  checkTimeoutMs?: number;
  fetchImpl?: typeof fetch;
  getToken?: () => Promise<string | null>;
  /** Set false to never ask for a streamed check. Default true. */
  stream?: boolean;
  /** A streamed check whose body sends no byte this long after its headers falls back to the plain check. */
  streamFirstByteMs?: number;
}

const ENDPOINT_NAMES: Record<string, string> = {
  '/v1/check': 'check',
  '/v1/speak': 'speak',
  '/v1/feedback': 'feedback',
  '/v1/insights': 'insights',
  '/v1/job/extract': 'jobExtract',
  '/v1/job/assess': 'jobAssess',
  '/health': 'health',
  '/healthz': 'health',
};

function endpointName(path: string): string {
  const name = ENDPOINT_NAMES[path.split('?')[0] ?? ''] ?? 'other';
  return name === 'check' && path.includes('stream=1') ? 'checkStream' : name;
}

export const DEFAULT_TIMEOUT_MS = 30000;
export const CHECK_TIMEOUT_MS = 75000;
export const STREAM_FIRST_BYTE_MS = 20000;
/** The plain retry after a failed stream needs at least this much of the check budget left. */
export const MIN_FALLBACK_MS = 3000;
const STREAM_FALLBACK_CODES = new Set(['network', 'timeout', 'invalid_response', 'unknown']);

export type StreamFailureKind = 'network' | 'timeout' | 'first_byte_timeout' | 'invalid_response' | 'no_final' | 'unknown';

function isErrorBody(value: unknown): value is ApiErrorBody {
  return Boolean(value && typeof value === 'object' && 'error' in value && (value as ApiErrorBody).error?.code);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function emit(onUpdate: (u: CheckUpdate) => void, update: CheckUpdate) {
  try {
    onUpdate(update);
  } catch {
    // a failing listener must not fail the check
  }
}

interface StreamHooks {
  /** Called when the response headers arrive, after any upload. */
  open: () => void;
  /** Called once the body starts to arrive. */
  byte: () => void;
  final: (response: CheckResponse) => void;
}

/** Reads a /v1/check?stream=1 reply. A server that ignores the flag answers plain JSON, which is accepted. */
async function readCheckStream(response: Response, onUpdate: (u: CheckUpdate) => void, hooks: StreamHooks): Promise<unknown> {
  hooks.open();
  const type = response.headers?.get?.('content-type') ?? '';
  if (!type.includes('text/event-stream')) {
    hooks.byte();
    return readJson(response);
  }
  let final: CheckResponse | null = null;
  const parser = createSseParser(({ event, data }) => {
    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      return;
    }
    if (event === 'stage') {
      const p = payload as { stage: CheckStage; status: 'start' | 'done'; ms: number };
      emit(onUpdate, { type: 'stage', stage: p.stage, status: p.status, ms: p.ms });
    } else if (event === 'verdict' && isCheckResponse(payload)) {
      emit(onUpdate, { type: 'verdict', response: normalizeResponse(payload) });
    } else if (event === 'final' && isCheckResponse(payload) && !final) {
      final = normalizeResponse(payload);
      hooks.final(final);
      emit(onUpdate, { type: 'final', response: final });
    } else if (event === 'error' && isErrorBody(payload)) {
      throw new ApiError(payload.error.code as ApiErrorCode, payload.error.message);
    }
  });
  const reader = response.body?.getReader?.();
  if (reader && typeof TextDecoder !== 'undefined') {
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hooks.byte();
      parser.push(decoder.decode(value, { stream: true }));
    }
  } else {
    hooks.byte();
    parser.push(await response.text());
  }
  parser.end();
  return final;
}

function invalid(endpoint: string): never {
  diag.error('api', 'invalid_response', { endpoint });
  throw new ApiError('invalid_response', 'Unexpected response shape');
}

export function createHttpClient(config: HttpClientConfig): CheckClient {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const checkTimeoutMs = config.checkTimeoutMs ?? config.timeoutMs ?? CHECK_TIMEOUT_MS;
  const fetchImpl = config.fetchImpl ?? fetch;
  const streaming = config.stream !== false;
  const firstByteMs = config.streamFirstByteMs ?? STREAM_FIRST_BYTE_MS;

  async function send(
    path: string,
    init: RequestInit,
    options?: RequestOptions,
    readOk: (response: Response) => Promise<unknown> = readJson,
    accept = 'application/json',
    limitMs: number = timeoutMs
  ): Promise<unknown> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, limitMs);
    const onAbort = () => controller.abort();
    options?.signal?.addEventListener('abort', onAbort);
    const started = Date.now();
    const endpoint = endpointName(path);

    try {
      const token = (await config.getToken?.().catch(() => null)) ?? null;
      const response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Accept: accept,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });
      if (response.ok) {
        const parsed = await readOk(response);
        diag.info('api', 'request', { endpoint, status: response.status, ms: Date.now() - started });
        return parsed;
      }
      const body = await readJson(response);
      const retryAfter = Number(response.headers?.get?.('retry-after'));
      const retryAfterSec = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined;
      if (isErrorBody(body)) throw new ApiError(body.error.code, body.error.message, response.status, retryAfterSec);
      throw new ApiError(codeFromStatus(response.status), `HTTP ${response.status}`, response.status, retryAfterSec);
    } catch (e) {
      const failed = e instanceof ApiError ? e : timedOut ? new ApiError('timeout', 'Request timed out') : options?.signal?.aborted ? new ApiError('cancelled', 'Request cancelled') : new ApiError('network', e instanceof Error ? e.message : 'Network error');
      if (failed.code !== 'cancelled') {
        diag[failed.code === 'rate_limited' ? 'warn' : 'error']('api', 'request_failed', { endpoint, kind: failed.code, ms: Date.now() - started, ...(failed.status ? { status: failed.status } : {}) });
      }
      throw failed;
    } finally {
      clearTimeout(timer);
      options?.signal?.removeEventListener('abort', onAbort);
    }
  }

  async function plainCheck(payload: string, options: RequestOptions | undefined, limitMs: number): Promise<CheckResponse> {
    const body = await send('/v1/check', { method: 'POST', body: payload }, options, readJson, 'application/json', limitMs);
    if (!isCheckResponse(body)) return invalid('check');
    return normalizeResponse(body);
  }

  /** One streamed attempt. Returns the result, or why the stream failed so the caller can retry plainly. */
  async function streamCheck(
    payload: string,
    onUpdate: (u: CheckUpdate) => void,
    options: RequestOptions | undefined
  ): Promise<{ response: CheckResponse } | { kind: StreamFailureKind }> {
    const controller = new AbortController();
    let started = false;
    let stalled = false;
    let final: CheckResponse | null = null;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => controller.abort();
    options?.signal?.addEventListener('abort', onAbort);
    const hooks: StreamHooks = {
      open: () => {
        stallTimer = setTimeout(() => {
          if (started) return;
          stalled = true;
          controller.abort();
        }, firstByteMs);
      },
      byte: () => {
        started = true;
      },
      final: response => {
        final = response;
      },
    };
    try {
      const body = await send('/v1/check?stream=1', { method: 'POST', body: payload }, { signal: controller.signal }, r => readCheckStream(r, onUpdate, hooks), 'text/event-stream, application/json', checkTimeoutMs);
      if (isCheckResponse(body)) return { response: normalizeResponse(body) };
      return { kind: 'no_final' };
    } catch (e) {
      if (final) return { response: final };
      if (options?.signal?.aborted) throw new ApiError('cancelled', 'Request cancelled');
      if (stalled) return { kind: 'first_byte_timeout' };
      if (e instanceof ApiError && STREAM_FALLBACK_CODES.has(e.code)) return { kind: e.code as StreamFailureKind };
      throw e;
    } finally {
      clearTimeout(stallTimer);
      options?.signal?.removeEventListener('abort', onAbort);
    }
  }

  return {
    isMock: false,
    async check(request: CheckRequest, options?: RequestOptions): Promise<CheckResponse> {
      if (!hasInput(request)) throw new ApiError('bad_request', 'Nothing to check');
      const payload = JSON.stringify(request);
      const onUpdate = options?.onUpdate;
      if (!onUpdate || !streaming) return plainCheck(payload, options, checkTimeoutMs);
      const started = Date.now();
      const streamed = await streamCheck(payload, onUpdate, options);
      if ('response' in streamed) return streamed.response;
      const elapsed = Date.now() - started;
      diag.warn('api', 'stream_fallback', { kind: streamed.kind, ms: elapsed });
      const remaining = checkTimeoutMs - elapsed;
      if (remaining < MIN_FALLBACK_MS) throw new ApiError('timeout', 'Request timed out');
      return plainCheck(payload, options, remaining);
    },
    async speak(request: SpeakRequest, options?: RequestOptions): Promise<SpeakResponse> {
      const body = (await send('/v1/speak', { method: 'POST', body: JSON.stringify(request) }, options)) as SpeakResponse | null;
      if (!body || typeof body.audioBase64 !== 'string') return invalid('speak');
      return body;
    },
    async feedback(request: FeedbackRequest, options?: RequestOptions): Promise<void> {
      await send('/v1/feedback', { method: 'POST', body: JSON.stringify(request) }, options);
    },
    async insights(country: string, options?: RequestOptions): Promise<Insights> {
      const body = (await send(`/v1/insights?country=${encodeURIComponent(country)}&days=30`, { method: 'GET' }, options)) as Insights | null;
      if (!body || !Array.isArray(body.risks)) return invalid('insights');
      return { ...body, domains: body.domains ?? [] };
    },
    async extractJob(request: JobExtractRequest, options?: RequestOptions): Promise<JobExtractResponse> {
      if (!hasJobInput(request.ad) && !hasJobInput(request.chat)) throw new ApiError('bad_request', 'Nothing to read');
      const body = await send('/v1/job/extract', { method: 'POST', body: JSON.stringify(request) }, options, readJson, 'application/json', checkTimeoutMs);
      if (!isJobExtractResponse(body)) return invalid('jobExtract');
      return { jobId: body.jobId, ad: body.ad ?? null, chat: body.chat ?? null };
    },
    async assessJob(request: JobAssessRequest, options?: RequestOptions): Promise<JobAssessResponse> {
      const body = await send('/v1/job/assess', { method: 'POST', body: JSON.stringify(request) }, options, readJson, 'application/json', checkTimeoutMs);
      if (!isCheckResponse(body)) return invalid('jobAssess');
      return normalizeJobResponse(body as JobAssessResponse);
    },
    async health(options?: RequestOptions): Promise<HealthResponse> {
      try {
        return (await send('/health', { method: 'GET' }, options)) as HealthResponse;
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 404) throw e;
        return (await send('/healthz', { method: 'GET' }, options)) as HealthResponse;
      }
    },
  };
}
