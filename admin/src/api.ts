import type { AuthUser } from './firebase';

const CONFIG_URL = import.meta.env.VITE_CONFIG_URL || 'https://saferoute-aibc.web.app/config.json';
let basePromise: Promise<string> | null = null;
let currentUser: AuthUser | null = null;

export const setApiUser = (u: AuthUser | null) => {
  currentUser = u;
};

function resolveBase(): Promise<string> {
  const override = import.meta.env.VITE_API_URL as string | undefined;
  if (override) return Promise.resolve(override.replace(/\/+$/, ''));
  basePromise ??= fetch(CONFIG_URL, { cache: 'no-store' })
    .then((r) => r.json())
    .then((j: { apiUrl?: string }) => {
      if (!j.apiUrl) throw new Error('config.json has no apiUrl');
      return j.apiUrl.replace(/\/+$/, '');
    })
    .catch((e) => {
      basePromise = null;
      throw e;
    });
  return basePromise;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!currentUser) throw new ApiError(401, 'Not signed in');
  const [base, token] = await Promise.all([resolveBase(), currentUser.getIdToken()]);
  const res = await fetch(`${base}/v1/admin${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j.error ?? j.message ?? msg;
    } catch {
      /* body is not JSON */
    }
    if (res.status === 429) msg = 'AI rate limit reached. Try again later.';
    throw new ApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}
