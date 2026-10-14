import { AsyncLocalStorage } from 'node:async_hooks';
import type { GoogleGenAI } from '@google/genai';

export interface Span {
  startMs: number;
  endMs: number;
  ms: number;
}

export interface CallStat {
  ms: number;
  inputTokens?: number;
  outputTokens?: number;
  thoughtTokens?: number;
  cachedTokens?: number;
}

export interface TimingsJson {
  totalMs: number;
  spans: Record<string, Span>;
  calls: Record<string, CallStat>;
  meta: Record<string, number | string | boolean>;
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Per-request stage timer. Offsets are relative to construction. */
export class Timings {
  private readonly t0 = performance.now();
  private readonly spans: Record<string, Span> = {};
  private readonly calls: Record<string, CallStat> = {};
  readonly meta: Record<string, number | string | boolean> = {};

  now(): number {
    return performance.now() - this.t0;
  }

  async span<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    const startMs = this.now();
    try {
      return await fn();
    } finally {
      const endMs = this.now();
      this.spans[name] = { startMs: round(startMs), endMs: round(endMs), ms: round(endMs - startMs) };
    }
  }

  call(label: string, stat: CallStat) {
    this.calls[label] = stat;
  }

  toJSON(): TimingsJson {
    return { totalMs: round(this.now()), spans: this.spans, calls: this.calls, meta: this.meta };
  }
}

export const timingStore = new AsyncLocalStorage<Timings>();

type GenerateParams = { config?: { tools?: unknown[]; responseModalities?: string[] } };

function labelOf(p: GenerateParams): string {
  if (p.config?.responseModalities?.includes('AUDIO')) return 'speak';
  if (p.config?.tools?.length) return 'ground';
  return 'extract';
}

/** Wraps generateContent to record latency and token usage into the request Timings. */
export function instrumentClient<C extends Pick<GoogleGenAI, 'models'>>(client: C): C {
  const models = new Proxy(client.models, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop !== 'generateContent' || typeof value !== 'function') return typeof value === 'function' ? value.bind(target) : value;
      return async (params: GenerateParams) => {
        const t = performance.now();
        const res = await (value as (p: unknown) => Promise<{ usageMetadata?: Record<string, number | undefined> }>).call(target, params);
        const u = res.usageMetadata;
        timingStore.getStore()?.call(labelOf(params), {
          ms: round(performance.now() - t),
          inputTokens: u?.promptTokenCount,
          outputTokens: u?.candidatesTokenCount,
          thoughtTokens: u?.thoughtsTokenCount,
          cachedTokens: u?.cachedContentTokenCount,
        });
        return res;
      };
    },
  });
  return new Proxy(client, { get: (t, p, r) => (p === 'models' ? models : Reflect.get(t, p, r)) });
}
