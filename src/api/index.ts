import { ensureApiUrl, hasInternet, recentlyReached, refreshApiUrl } from '../config/runtime';
import { getAuthToken } from '../services/token';
import { ApiError } from './errors';
import { createHttpClient } from './http';
import { createMockClient } from './mock';
import type { CheckClient } from './types';

export * from './types';
export * from './errors';
export { hasInput, hasJobInput } from './validate';
export { createHttpClient } from './http';
export { createMockClient } from './mock';

function streamFetch(): typeof fetch | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('expo/fetch') as { fetch: typeof fetch }).fetch;
  } catch {
    return undefined;
  }
}

export function createClientFromEnv(apiUrl: string | undefined, allowMock: boolean = __DEV__): CheckClient {
  const url = apiUrl?.trim();
  if (url) return createHttpClient({ baseUrl: url, getToken: getAuthToken, streamFetchImpl: streamFetch() });
  return allowMock ? createMockClient() : createUnavailableClient();
}

let singleton: CheckClient | null = null;

export function getApiClient(): CheckClient {
  singleton ??= createRuntimeClient();
  return singleton;
}

function createUnavailableClient(): CheckClient {
  const fail = async (): Promise<never> => {
    throw new ApiError('unavailable', 'No check service address in this build');
  };
  return { isMock: false, check: fail, speak: fail, health: fail, insights: fail, feedback: fail, extractJob: fail, assessJob: fail };
}

export interface RuntimeClientDeps {
  refresh?: () => Promise<string>;
  internet?: () => Promise<boolean>;
  makeClient?: (url: string, allowMock: boolean) => CheckClient;
}

export function createRuntimeClient(resolve: () => Promise<string> = ensureApiUrl, allowMock: boolean = __DEV__, deps: RuntimeClientDeps = {}): CheckClient {
  const refresh = deps.refresh ?? refreshApiUrl;
  const internet = deps.internet ?? (async () => recentlyReached() || (await hasInternet()));
  const make = deps.makeClient ?? createClientFromEnv;
  let built: { url: string; client: CheckClient } | null = null;
  const clientFor = (url: string): CheckClient => {
    if (built?.url !== url) built = { url, client: make(url, allowMock) };
    return built.client;
  };

  async function explain(e: unknown): Promise<unknown> {
    if (!(e instanceof ApiError) || e.code !== 'network') return e;
    return (await internet().catch(() => false)) ? new ApiError('server_unreachable', e.message) : e;
  }

  async function run<T>(op: (client: CheckClient) => Promise<T>): Promise<T> {
    const url = await resolve();
    try {
      return await op(clientFor(url));
    } catch (e) {
      if (!(e instanceof ApiError) || e.code !== 'network') throw e;
      const next = await refresh().catch(() => url);
      if (next && next !== url) {
        try {
          return await op(clientFor(next));
        } catch (e2) {
          throw await explain(e2);
        }
      }
      throw await explain(e);
    }
  }

  return {
    get isMock() {
      return false;
    },
    check: (r, o) => run(c => c.check(r, o)),
    speak: (r, o) => run(c => c.speak(r, o)),
    health: o => run(c => c.health(o)),
    insights: (c, o) => run(x => x.insights(c, o)),
    feedback: (r, o) => run(c => c.feedback(r, o)),
    extractJob: (r, o) => run(c => c.extractJob(r, o)),
    assessJob: (r, o) => run(c => c.assessJob(r, o)),
  };
}
