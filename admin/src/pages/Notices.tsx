import { useState } from 'react';
import { api } from '../api';
import { createDraft, type Listing } from '../drafts';
import { COUNTRIES, LANGUAGES, type AiSource, type Notice } from '../types';
import { AiBanner, Badge, Field, Loading, Panel, useLoad, useToast } from '../ui/kit';

const blank = (): Notice => ({ id: '', title: '', body: '', severity: 'info', enabled: true, country: [], language: [] });

export default function Notices() {
  const { data, error, loading, reload } = useLoad(() => api<Listing<Notice[]>>('/notices'));
  const toast = useToast();
  const [editing, setEditing] = useState<{ n: Notice; isNew: boolean } | null>(null);

  const toggle = async (n: Notice) => {
    try {
      await createDraft({ collection: 'notices', op: 'update', item: { ...n, enabled: !n.enabled }, reason: n.enabled ? 'Disable notice' : 'Enable notice' });
      toast('Draft created. An admin must approve it.');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };
  const targets = (v?: string[]) => (v?.length ? v.join(', ') : 'all');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Notices</h1>
          <p className="muted">Shown as a dismissible card on the app Home screen. {data ? `Version ${data.version}.` : ''}</p>
        </div>
        <div className="actions"><button className="btn primary" onClick={() => setEditing({ n: blank(), isNew: true })}>Add notice</button></div>
      </div>
      <Loading error={error} loading={loading && !data} retry={reload} />
      {data && (
        <table className="table" data-testid="notices-table">
          <thead><tr><th>Title</th><th>Severity</th><th>Countries</th><th>Languages</th><th>Dates</th><th>State</th><th /></tr></thead>
          <tbody>
            {data.items.map((n) => (
              <tr key={n.id}>
                <td><button className="link" onClick={() => setEditing({ n: structuredClone(n), isNew: false })}>{n.title}</button></td>
                <td><Badge kind={n.severity === 'warning' ? 'warn' : 'info'}>{n.severity}</Badge></td>
                <td>{targets(n.country)}</td>
                <td>{targets(n.language)}</td>
                <td className="small">{n.startsAt || 'now'} to {n.endsAt || 'open'}</td>
                <td>{n.enabled ? <Badge kind="ok">enabled</Badge> : <Badge kind="muted">disabled</Badge>}</td>
                <td className="row-actions"><button className="btn small" onClick={() => toggle(n)}>{n.enabled ? 'Disable' : 'Enable'}</button></td>
              </tr>
            ))}
            {data.items.length === 0 && <tr><td colSpan={7} className="muted">No notices yet.</td></tr>}
          </tbody>
        </table>
      )}
      {editing && <NoticePanel {...editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); }} />}
    </>
  );
}

function Multi({ options, value, onChange }: { options: { code: string; name: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <label key={o.code} className={`chip ${value.includes(o.code) ? 'on' : ''}`}>
          <input type="checkbox" checked={value.includes(o.code)} onChange={() => onChange(value.includes(o.code) ? value.filter((x) => x !== o.code) : [...value, o.code])} />
          {o.name}
        </label>
      ))}
    </div>
  );
}

function NoticePanel({ n: initial, isNew, onClose, onSaved }: { n: Notice; isNew: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [n, setN] = useState<Notice>(initial);
  const [reason, setReason] = useState(isNew ? 'New notice' : '');
  const [lang, setLang] = useState('en');
  const [instruction, setInstruction] = useState('');
  const [aiNote, setAiNote] = useState('');
  const [aiSource, setAiSource] = useState<AiSource | undefined>();
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const set = (p: Partial<Notice>) => setN((x) => ({ ...x, ...p }));

  const errors: Record<string, string> = {};
  if (!n.title.trim()) errors.title = 'Title is required.';
  if (!n.body.trim()) errors.body = 'Body is required.';
  if (!reason.trim()) errors.reason = 'Give a reason.';
  if (n.startsAt && n.endsAt && n.endsAt < n.startsAt) errors.endsAt = 'End must be after start.';
  const E = (k: string) => (show ? errors[k] : undefined);

  const draftAi = async () => {
    if (!instruction.trim()) return toast('Describe what the notice should say.', 'error');
    setBusy(true);
    try {
      const r = await api<{ text: string; note: string; model?: string }>('/ai/draft-content', {
        body: { key: `notice.${n.id || 'new'}`, instruction: instruction.trim(), language: lang },
      });
      set({ body: r.text, language: n.language?.length ? n.language : [lang] });
      setAiNote(r.note);
      setAiSource({ prompt: `draft-content (${lang}): ${instruction.trim()}`, model: r.model ?? 'gemini', sources: [] });
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setShow(true);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      const id = n.id || `notice-${Date.now().toString(36)}`;
      await createDraft({ collection: 'notices', op: isNew ? 'add' : 'update', item: { ...n, id }, reason: reason.trim(), aiSource });
      toast('Draft created. An admin must approve it.');
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title={isNew ? 'Add notice' : 'Edit notice'} onClose={onClose}>
      <Field label="Title" error={E('title')}><input value={n.title} onChange={(e) => set({ title: e.target.value })} name="title" /></Field>
      <div className="ai-box">
        <strong>Draft with AI</strong>
        <AiBanner />
        <div className="two">
          <Field label="Language"><select value={lang} onChange={(e) => setLang(e.target.value)}>{LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select></Field>
          <Field label="What should it say?"><input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Warn about fake job offers in Bangkok" name="instruction" /></Field>
        </div>
        <button className="btn small" disabled={busy} onClick={draftAi} data-testid="draft-ai">Draft with AI</button>
        {aiNote && <p className="notice-box warn" data-testid="ai-note"><strong>Hedging note:</strong> {aiNote}</p>}
      </div>
      <Field label="Body" error={E('body')}><textarea rows={5} value={n.body} onChange={(e) => set({ body: e.target.value })} name="body" /></Field>
      <Field label="Severity">
        <select value={n.severity} onChange={(e) => set({ severity: e.target.value as Notice['severity'] })}>
          <option value="info">info</option><option value="warning">warning</option>
        </select>
      </Field>
      <div className="field"><span className="label">Countries (none selected = all)</span>
        <Multi options={COUNTRIES.map((c) => ({ code: c.code, name: c.name }))} value={n.country ?? []} onChange={(v) => set({ country: v })} /></div>
      <div className="field"><span className="label">Languages (none selected = all)</span>
        <Multi options={LANGUAGES.map((l) => ({ code: l.code, name: l.name }))} value={n.language ?? []} onChange={(v) => set({ language: v })} /></div>
      <div className="two">
        <Field label="Starts"><input type="date" value={n.startsAt ?? ''} onChange={(e) => set({ startsAt: e.target.value || undefined })} /></Field>
        <Field label="Ends" error={E('endsAt')}><input type="date" value={n.endsAt ?? ''} onChange={(e) => set({ endsAt: e.target.value || undefined })} /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={n.enabled} onChange={(e) => set({ enabled: e.target.checked })} /> Enabled</label>
      <Field label="Reason for this change" error={E('reason')}><input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="panel-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={busy} onClick={save} data-testid="save-notice">Save as draft</button>
      </div>
    </Panel>
  );
}
