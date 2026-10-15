import type { MiddlewareHandler } from 'hono';
import { bearerToken, type TokenVerifier } from '../auth.js';
import { log } from '../log.js';
import { ApiError } from '../types.js';
import type { Role } from './schema.js';
import type { ConfigStore } from './store.js';

export interface AdminIdentity {
  uid: string;
  email: string;
  role: Role;
}

export const adminOf = (c: { get(key: never): unknown }): AdminIdentity => c.get('admin' as never) as AdminIdentity;

/** Verifies the Firebase ID token, then requires an admins/{uid} record. 401 without a valid token, 403 without a record. */
export function requireAdmin(verifier: TokenVerifier | undefined, store: ConfigStore): MiddlewareHandler {
  return async (c, next) => {
    const token = bearerToken(c.req.header('authorization'));
    if (!token) throw new ApiError(401, 'unauthorized', 'Sign in to use the admin console');
    const identity = verifier ? await verifier(token) : null;
    if (!identity) throw new ApiError(401, 'unauthorized', 'The sign-in token is not valid');
    let record: Awaited<ReturnType<ConfigStore['getAdmin']>>;
    try {
      record = await store.getAdmin(identity.uid);
    } catch (err) {
      log('ERROR', 'admin_lookup_failed', { error: (err as Error).message.slice(0, 160) });
      throw new ApiError(502, 'upstream', 'Admin records are unavailable');
    }
    if (!record || identity.anonymous) throw new ApiError(403, 'forbidden', 'This account is not an admin');
    c.set('admin' as never, { uid: identity.uid, email: record.email, role: record.role } as never);
    await next();
  };
}

/** Allows only the listed roles. Run after requireAdmin. */
export function requireRole(...roles: Role[]): MiddlewareHandler {
  return async (c, next) => {
    const admin = adminOf(c);
    if (!roles.includes(admin.role)) throw new ApiError(403, 'forbidden', `This action needs the ${roles.join(' or ')} role`);
    await next();
  };
}
