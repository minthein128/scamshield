import type { ApiErrorCode } from './types';

export type ClientErrorCode = ApiErrorCode | 'network' | 'timeout' | 'cancelled' | 'invalid_response' | 'unknown';

export class ApiError extends Error {
  readonly code: ClientErrorCode;
  readonly status?: number;

  constructor(code: ClientErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const USER_MESSAGES: Record<ClientErrorCode, string> = {
  bad_request: 'We could not read that. Add some text, a link or a screenshot and try again.',
  too_large: 'That screenshot is too large. Pick a smaller one and try again.',
  upstream: 'The check service is busy. Please try again in a moment.',
  rate_limited: 'Too many checks in a short time. Wait a minute and try again.',
  network: 'No connection. Check your internet and try again.',
  timeout: 'The check took too long. Please try again.',
  cancelled: 'The check was cancelled.',
  invalid_response: 'The check service sent an unexpected answer. Please try again.',
  unknown: 'Something went wrong. Please try again.',
};

export function userMessage(error: unknown): string {
  if (error instanceof ApiError) return USER_MESSAGES[error.code];
  return USER_MESSAGES.unknown;
}

export function codeFromStatus(status: number): ClientErrorCode {
  if (status === 413) return 'too_large';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'upstream';
  if (status >= 400) return 'bad_request';
  return 'unknown';
}
