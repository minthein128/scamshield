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

const COPY: Record<ClientErrorCode, ErrorCopy> = {
  bad_request: { title: 'We could not read that', message: 'Add some text, a link or a screenshot and try again.' },
  not_found: { title: 'That check has expired', message: 'Feedback is accepted for a few days after a check.' },
  too_large: { title: 'That file is too large', message: 'Pick a smaller screenshot and try again.' },
  upstream: { title: 'The check service is down', message: 'This is a problem on our side. Try again in a few minutes.' },
  rate_limited: { title: 'You reached the check limit', message: 'Wait a little and try again. A free account gets a higher limit.' },
  network: { title: 'You are offline', message: 'Check your internet connection and try again.' },
  timeout: { title: 'The check took too long', message: 'Your connection may be slow. Try again.' },
  cancelled: { title: 'Check cancelled', message: 'The check was cancelled.' },
  invalid_response: { title: 'Unexpected answer', message: 'The check service sent an answer we could not read. Try again.' },
  unavailable: { title: 'Checks are not available', message: 'This build is not connected to the check service. Update the app and try again.' },
  unknown: { title: 'Something went wrong', message: 'Please try again.' },
};

export function waitText(seconds?: number): string {
  if (!seconds) return 'a little while';
  if (seconds < 90) return 'a minute';
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`;
  return `${Math.ceil(seconds / 3600)} hour${seconds > 5400 ? 's' : ''}`;
}

export function errorCopy(error: unknown): ErrorCopy {
  if (!(error instanceof ApiError)) return COPY.unknown;
  if (error.code === 'rate_limited') {
    return { ...COPY.rate_limited, message: `Try again in about ${waitText(error.retryAfterSec)}. A free account gets a higher limit.` };
  }
  return COPY[error.code];
}

export function userMessage(error: unknown): string {
  return errorCopy(error).message;
}

export function codeFromStatus(status: number): ClientErrorCode {
  if (status === 404) return 'not_found';
  if (status === 413) return 'too_large';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'upstream';
  if (status >= 400) return 'bad_request';
  return 'unknown';
}
