import { ensureApiUrl } from '../config/runtime';
import { getAuthToken } from '../services/token';
import { ApiError } from './errors';
import { createHttpClient } from './http';
import { createMockClient } from './mock';
import type { CheckClient } from './types';

export * from './types';
export * from './errors';
export { hasInput } from './validate';
export { createHttpClient } from './http';
export { createMockClient } from './mock';

export function createClientFromEnv(apiUrl: string | undefined, allowMock: boolean = __DEV__): CheckClient {
  const url = apiUrl?.trim();
  if (url) return createHttpClient({ baseUrl: url, getToken: getAuthToken });
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
  return { isMock: false, check: fail, speak: fail, health: fail };
}

export function createRuntimeClient(resolve: () => Promise<string> = ensureApiUrl, allowMock: boolean = __DEV__): CheckClient {
  let inner: Promise<CheckClient> | null = null;
  const client = () => (inner ??= resolve().then(url => createClientFromEnv(url, allowMock)));
  return {
    get isMock() {
      return false;
    },
    check: async (r, o) => (await client()).check(r, o),
    speak: async (r, o) => (await client()).speak(r, o),
    health: async o => (await client()).health(o),
  };
}
