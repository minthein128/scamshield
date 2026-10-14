import { createHttpClient } from './http';
import { createMockClient } from './mock';
import type { CheckClient } from './types';

export * from './types';
export * from './errors';
export { hasInput } from './validate';
export { createHttpClient } from './http';
export { createMockClient } from './mock';

export function createClientFromEnv(apiUrl: string | undefined): CheckClient {
  const url = apiUrl?.trim();
  return url ? createHttpClient({ baseUrl: url }) : createMockClient();
}

let singleton: CheckClient | null = null;

export function getApiClient(): CheckClient {
  singleton ??= createClientFromEnv(process.env.EXPO_PUBLIC_API_URL);
  return singleton;
}
