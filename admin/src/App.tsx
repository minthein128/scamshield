import { useEffect, useState } from 'react';
import { ApiError, api, setApiUser } from './api';
import { MOCK_AUTH, signInEmail, signInGoogle, signOut, watchAuth, type AuthUser } from './firebase';
import type { Me } from './types';
import { MeContext, ToastHost } from './ui/kit';
import Hotlines from './pages/Hotlines';
import Drafts from './pages/Drafts';
import Notices from './pages/Notices';
import Content from './pages/Content';
import Audit from './pages/Audit';
import Admins from './pages/Admins';

const PAGES = [
  { id: 'hotlines', label: 'Hotlines', el: Hotlines },
  { id: 'drafts', label: 'Drafts', el: Drafts },
  { id: 'notices', label: 'Notices', el: Notices },
  { id: 'content', label: 'Content', el: Content },
  { id: 'audit', label: 'Audit', el: Audit },
  { id: 'admins', label: 'Admins', el: Admins },
] as const;

type State =
  | { s: 'loading' }
  | { s: 'out' }
  | { s: 'denied'; email: string }
  | { s: 'error'; message: string }
  | { s: 'in'; me: Me };

export default function App() {
  const [state, setState] = useState<State>({ s: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      watchAuth(async (user: AuthUser | null) => {
        setApiUser(user);
        if (!user) return setState({ s: 'out' });
        setState({ s: 'loading' });
        try {
          setState({ s: 'in', me: await api<Me>('/me') });
        } catch (e) {
          if (e instanceof ApiError && (e.status === 403 || e.status === 401)) setState({ s: 'denied', email: user.email });
          else setState({ s: 'error', message: e instanceof Error ? e.message : String(e) });
        }
      }),
    [attempt],
  );

  if (state.s === 'loading') return <div className="center"><p className="muted">Loading...</p></div>;
  if (state.s === 'out') return <SignIn />;
  if (state.s === 'denied')
    return (
      <div className="center">
        <div className="card narrow">
          <Logo />
          <h1>Your account is not authorised</h1>
          <p>Signed in as <strong data-testid="denied-email">{state.email}</strong>. Ask an admin to add this account.</p>
          <button className="btn" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );
  if (state.s === 'error')
    return (
      <div className="center">
        <div className="card narrow">
          <Logo />
          <h1>Cannot reach the API</h1>
          <p className="err">{state.message}</p>
          <button className="btn primary" onClick={() => setAttempt((n) => n + 1)}>Retry</button>{' '}
          <button className="btn" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );
  return (
    <MeContext.Provider value={state.me}>
      <ToastHost>
        <Shell me={state.me} />
      </ToastHost>
    </MeContext.Provider>
  );
}

function Logo() {
  return (
    <div className="logo">
      <img src="/logo-mark.svg" alt="" width={36} height={36} />
      <span>SafeRoute <b>Admin</b></span>
    </div>
  );
}

function Shell({ me }: { me: Me }) {
  const fromHash = () => PAGES.find((p) => p.id === location.hash.slice(1))?.id ?? 'hotlines';
  const [page, setPage] = useState<string>(fromHash());
  useEffect(() => {
    const h = () => setPage(fromHash());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  const Page = PAGES.find((p) => p.id === page)!.el;
  return (
    <div className="shell">
      <nav className="side">
        <Logo />
        {PAGES.map((p) => (
          <a key={p.id} href={`#${p.id}`} className={p.id === page ? 'active' : ''} data-testid={`nav-${p.id}`}>
            {p.label}
          </a>
        ))}
        <div className="who">
          <span className="small">{me.email}</span>
          <span className="small muted">{me.role}{MOCK_AUTH ? ' (mock)' : ''}</span>
          <button className="btn small" onClick={signOut}>Sign out</button>
        </div>
      </nav>
      <main>
        <Page />
      </main>
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const run = async (fn: () => Promise<void>) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message.replace('Firebase: ', '') : String(e));
    }
  };
  return (
    <div className="center">
      <form
        className="card narrow"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => signInEmail(email, password));
        }}
      >
        <Logo />
        <h1>Sign in</h1>
        <p className="muted">Admin console for the SafeRoute team.</p>
        <button type="button" className="btn primary block" onClick={() => run(signInGoogle)}>Continue with Google</button>
        <div className="or">or</div>
        <label className="field"><span className="label">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label className="field"><span className="label">Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="err">{error}</p>}
        <button className="btn block" type="submit">Sign in with email</button>
      </form>
    </div>
  );
}
