import { ApiError, codeFromStatus } from './errors';
import type { ApiErrorBody, CheckClient, CheckRequest, CheckResponse, HealthResponse, RequestOptions, SpeakRequest, SpeakResponse } from './types';
import { hasInput, isCheckResponse, normalizeResponse } from './validate';

export interface HttpClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export const DEFAULT_TIMEOUT_MS = 30000;

function isErrorBody(value: unknown): value is ApiErrorBody {
  return Boolean(value && typeof value === 'object' && 'error' in value && (value as ApiErrorBody).error?.code);
}

export function createHttpClient(config: HttpClientConfig): CheckClient {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = config.fetchImpl ?? fetch;

  async function send(path: string, init: RequestInit, options?: RequestOptions): Promise<unknown> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onAbort = () => controller.abort();
    options?.signal?.addEventListener('abort', onAbort);

    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        signal: controller.signal,
      });
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (!response.ok) {
        if (isErrorBody(body)) throw new ApiError(body.error.code, body.error.message, response.status);
        throw new ApiError(codeFromStatus(response.status), `HTTP ${response.status}`, response.status);
      }
      return body;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (timedOut) throw new ApiError('timeout', 'Request timed out');
      if (options?.signal?.aborted) throw new ApiError('cancelled', 'Request cancelled');
      throw new ApiError('network', e instanceof Error ? e.message : 'Network error');
    } finally {
      clearTimeout(timer);
      options?.signal?.removeEventListener('abort', onAbort);
    }
  }

  return {
    isMock: false,
    async check(request: CheckRequest, options?: RequestOptions): Promise<CheckResponse> {
      if (!hasInput(request)) throw new ApiError('bad_request', 'Nothing to check');
      const body = await send('/v1/check', { method: 'POST', body: JSON.stringify(request) }, options);
      if (!isCheckResponse(body)) throw new ApiError('invalid_response', 'Unexpected response shape');
      return normalizeResponse(body);
    },
    async speak(request: SpeakRequest, options?: RequestOptions): Promise<SpeakResponse> {
      const body = (await send('/v1/speak', { method: 'POST', body: JSON.stringify(request) }, options)) as SpeakResponse | null;
      if (!body || typeof body.audioBase64 !== 'string') throw new ApiError('invalid_response', 'Unexpected response shape');
      return body;
    },
    async health(options?: RequestOptions): Promise<HealthResponse> {
      return (await send('/healthz', { method: 'GET' }, options)) as HealthResponse;
    },
  };
}
