import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'saferoute-aibc',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 18711 },
  });
});

after(async () => {
  await env.cleanup();
});

const account = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' } }).firestore();
const anonymous = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const guest = () => env.unauthenticatedContext().firestore();

const history = { createdAt: '2026-10-14T10:00:00.000Z', language: 'en', source: 'Job offer', report: '{"verdict":"danger"}' };
const contact = { name: 'Mother', phone: '+959123456', updatedAt: '2026-10-14T10:00:00.000Z' };
const profile = { language: 'my', homeCountry: 'MM', updatedAt: '2026-10-14T10:00:00.000Z' };

describe('firestore rules', () => {
  it('lets a signed-in user read and write their own documents', async () => {
    const db = account('alice');
    await assertSucceeds(setDoc(doc(db, 'users/alice'), profile));
    await assertSucceeds(setDoc(doc(db, 'users/alice/history/chk_1'), history));
    await assertSucceeds(setDoc(doc(db, 'users/alice/contacts/c_1'), contact));
    await assertSucceeds(getDoc(doc(db, 'users/alice/history/chk_1')));
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/contacts/c_1')));
  });

  it('blocks other users and signed-out clients', async () => {
    await assertFails(getDoc(doc(account('bob'), 'users/alice/history/chk_1')));
    await assertFails(setDoc(doc(account('bob'), 'users/alice/history/chk_2'), history));
    await assertFails(getDoc(doc(guest(), 'users/alice/history/chk_1')));
    await assertFails(setDoc(doc(guest(), 'users/alice'), profile));
  });

  it('keeps anonymous installs on the device', async () => {
    await assertFails(setDoc(doc(anonymous('anon'), 'users/anon/history/chk_1'), history));
    await assertFails(getDoc(doc(anonymous('anon'), 'users/anon')));
  });

  it('rejects unknown fields, missing fields and oversize values', async () => {
    const db = account('alice');
    await assertFails(setDoc(doc(db, 'users/alice/history/x1'), { ...history, imageBase64: 'AAAA' }));
    await assertFails(setDoc(doc(db, 'users/alice/history/x2'), { createdAt: history.createdAt, language: 'en' }));
    await assertFails(setDoc(doc(db, 'users/alice/history/x3'), { ...history, report: 'x'.repeat(60001) }));
    await assertFails(setDoc(doc(db, 'users/alice/history/x4'), { ...history, source: 'x'.repeat(201) }));
    await assertFails(setDoc(doc(db, 'users/alice/contacts/x5'), { ...contact, name: 'n'.repeat(81) }));
    await assertFails(setDoc(doc(db, 'users/alice/contacts/x6'), { ...contact, role: 'admin' }));
    await assertFails(setDoc(doc(db, 'users/alice'), { ...profile, admin: true }));
  });

  it('denies every other path', async () => {
    await assertFails(setDoc(doc(account('alice'), 'public/anything'), { a: 1 }));
    await assertFails(getDoc(doc(account('alice'), 'users/alice/other/doc')));
  });
  it('denies every client access to admin config, drafts, audit and admins', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'config/hotlines'), { version: 1, items: [] });
      await setDoc(doc(db, 'config_drafts/d1'), { status: 'pending' });
      await setDoc(doc(db, 'config_audit/a1'), { action: 'seed' });
      await setDoc(doc(db, 'admins/alice'), { email: 'a@example.org', role: 'admin' });
    });
    for (const db of [account('alice'), anonymous('anon'), guest()]) {
      for (const path of ['config/hotlines', 'config/notices', 'config_drafts/d1', 'config_audit/a1', 'admins/alice']) {
        await assertFails(getDoc(doc(db, path)));
        await assertFails(setDoc(doc(db, path), { version: 99, role: 'admin' }));
        await assertFails(deleteDoc(doc(db, path)));
      }
    }
  });
});
