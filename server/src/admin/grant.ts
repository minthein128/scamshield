import { getAuth } from 'firebase-admin/auth';
import { getDb } from '../intel/firestore.js';
import { ROLES, type Role } from './schema.js';
import { createFirestoreConfigStore } from './store.js';

const [email, role] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!email || !role || !ROLES.includes(role as Role)) {
  console.error('Usage: npm run admin:grant -- <email> <admin|editor>');
  process.exit(2);
}

const projectId = process.env.FIREBASE_PROJECT_ID || 'saferoute-aibc';
getDb(projectId);
const user = await getAuth()
  .getUserByEmail(email)
  .catch((err: { code?: string }) => {
    if (err.code === 'auth/user-not-found') {
      console.error(`No Firebase Auth user has the email ${email}. Ask them to sign in to the app or console once, then run this again.`);
      process.exit(1);
    }
    throw err;
  });
if (!user.emailVerified) {
  console.error(
    `The Auth account for ${email} has an unverified email (password sign-up does not prove ownership). Sign in with Google once, then run this again.`,
  );
  process.exit(1);
}
const store = createFirestoreConfigStore({ projectId });
await store.setAdmin({ uid: user.uid, email: user.email ?? email, role: role as Role, addedBy: 'cli', addedAt: new Date().toISOString() });
console.log(`granted ${role} to ${user.email} (uid ${user.uid})`);
