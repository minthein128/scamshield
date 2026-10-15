import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Me } from '../types';

export const MeContext = createContext<Me | null>(null);
export const useMe = () => useContext(MeContext)!;

type Notify = (msg: string, kind?: 'ok' | 'error') => void;
export const ToastContext = createContext<Notify>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastHost({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'error' } | null>(null);
  const timer = useRef<number>(0);
  const notify = useCallback<Notify>((msg, kind = 'ok') => {
    setToast({ msg, kind });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 6000);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && (
        <div className={`toast ${toast.kind}`} role="status" data-testid="toast">
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useLoad<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fnRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload };
}

export function Loading({ error, loading, retry }: { error: string | null; loading: boolean; retry: () => void }) {
  if (error)
    return (
      <div className="notice-box error">
        {error} <button className="btn small" onClick={retry}>Retry</button>
      </div>
    );
  return loading ? <p className="muted">Loading...</p> : null;
}

export function Panel({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className={`panel ${wide ? 'wide' : ''}`} role="dialog" aria-label={title} data-testid="panel">
        <header>
          <h2>{title}</h2>
          <button className="btn ghost" onClick={onClose} aria-label="Close">Close</button>
        </header>
        <div className="panel-body">{children}</div>
      </aside>
    </div>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="err">{error}</span>}
    </label>
  );
}

export const Badge = ({ kind, children }: { kind: 'ok' | 'warn' | 'bad' | 'info' | 'ai' | 'muted'; children: ReactNode }) => (
  <span className={`badge ${kind}`}>{children}</span>
);

export function Sources({ sources }: { sources: { title: string; url: string; quote?: string }[] }) {
  if (!sources.length) return <p className="muted small">No sources.</p>;
  return (
    <ul className="sources">
      {sources.map((s, i) => (
        <li key={i}>
          <a href={s.url} target="_blank" rel="noreferrer">{s.title || s.url}</a>
          {s.quote && <blockquote>{s.quote}</blockquote>}
        </li>
      ))}
    </ul>
  );
}

export const AiBanner = () => (
  <p className="ai-banner">AI output is a suggestion. Check the sources. Nothing is published until an admin approves a draft.</p>
);

export const fmtDate = (s?: string) => (s ? new Date(s).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');
export const today = () => new Date().toISOString().slice(0, 10);
