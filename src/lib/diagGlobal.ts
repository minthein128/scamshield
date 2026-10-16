import { Platform } from 'react-native';
import { diag } from './diagLog';

type Handler = (error: unknown, isFatal?: boolean) => void;
interface ErrorUtilsLike {
  getGlobalHandler: () => Handler;
  setGlobalHandler: (handler: Handler) => void;
}

/** Name of the first function in the stack. Function names carry no user content. */
export function topFrame(stack: unknown): string {
  if (typeof stack !== 'string') return 'unknown';
  const m = /at ([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?) /.exec(stack);
  return m?.[1] ?? 'unknown';
}

export function logUncaught(error: unknown, fatal: boolean): void {
  const e = error as { name?: unknown; stack?: unknown } | null;
  diag.error('app', 'js_error', { name: typeof e?.name === 'string' ? e.name : 'unknown', fn: topFrame(e?.stack), fatal });
}

let installed = false;

/** Records unhandled JS errors, then lets the previous handler run. Call once at startup. */
export function installGlobalErrorLog(): void {
  if (installed) return;
  installed = true;
  const utils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (utils) {
    const previous = utils.getGlobalHandler();
    utils.setGlobalHandler((error, isFatal) => {
      logUncaught(error, Boolean(isFatal));
      previous(error, isFatal);
    });
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('error', ev => logUncaught(ev.error, false));
    window.addEventListener('unhandledrejection', ev => logUncaught(ev.reason, false));
  }
}
