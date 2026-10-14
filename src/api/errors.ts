import { t } from '../i18n';
import type { ApiErrorCode } from './types';

export type ClientErrorCode = ApiErrorCode | 'network' | 'timeout' | 'cancelled' | 'invalid_response' | 'unavailable' | 'unknown';

export class ApiError extends Error {
  readonly code: ClientErrorCode;
  readonly status?: number;
  readonly retryAfterSec?: number;

  constructor(code: ClientErrorCode, message: string, status?: number, retryAfterSec?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.retryAfterSec = retryAfterSec;
  }
}

export interface ErrorCopy {
  title: string;
  message: string;
}

export function waitText(seconds?: number): string {
  if (!seconds) return t('errors:wait.unknown');
  if (seconds < 90) return t('errors:wait.minute');
  if (seconds < 3600) return t('errors:wait.minutes', { count: Math.ceil(seconds / 60) });
  return t('errors:wait.hours', { count: Math.ceil(seconds / 3600) });
}

export function errorCopy(error: unknown): ErrorCopy {
  const code: ClientErrorCode = error instanceof ApiError ? error.code : 'unknown';
  const title = t(`errors:api.${code}.title`);
  if (code === 'rate_limited') {
    return { title, message: t('errors:rateLimitedWait', { wait: waitText((error as ApiError).retryAfterSec) }) };
  }
  return { title, message: t(`errors:api.${code}.message`) };
}

export function userMessage(error: unknown): string {
  return errorCopy(error).message;
}

export function codeFromStatus(status: number): ClientErrorCode {
  if (status === 413) return 'too_large';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'upstream';
  if (status >= 400) return 'bad_request';
  return 'unknown';
}
