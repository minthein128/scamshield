import { useState } from 'react';
import { api } from '../api';
import { createDraft, type Listing } from '../drafts';
import { LANGUAGES, type AiSource, type ContentCell, type LangCode } from '../types';
import { AiBanner, Badge, Field, Loading, Panel, useLoad, useToast } from '../ui/kit';

type Items = Record<string, ContentCell>;
const OTHER = LANGUAGES.filter((l) => l.code !== 'en');

export default function Content() {
  const { data, error, loading, reload } = useLoad(() => api<Listing<Items>>('/content'));
  const [editing, setEditing] = useState<{ key: string; cell: ContentCell; isNew: boolean } | null>(null);
  const [q, setQ] = useState('');
  const keys = Object.keys(data?.items ?? {}).filter((k) => k.toLowerCase().includes(q.toLowerCase())).sort();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Content</h1>
          <p className="muted">Copy that overrides the app text at render time. {data ? `Version ${data.version}.` : ''}</p>
        </div>
        <div className="actions">
          <input placeholder="Filter keys" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter keys" />
          <button className="btn primary" onClick={() => setEditing({ key: '', cell: { en: '' }, isNew: true })}>Add key</button>
        </div>
      </div>
      <Loading error={error} loading={loading && !data} retry={reload} />
      {data && (
        <table className="table content" data-testid="content-table">
          <thead><tr><th>Key</th><th>English</th>{OTHER.map((l) => <th key={l.code}>{l.name}</th>)}</tr></thead>
          <tbody>
            {keys.map((k) => {
              const cell = data.items[k];
              return (
                <tr key={k}>
                  <td className="mono"><button className="link" onClick={() => setEditing({ key: k, cell: { ...cell }, isNew: false })}>{k}</button></td>
                  <td className="cell">{cell.en}</td>
                  {OTHER.map((l) => (
                    <td key={l.code} className="cell" onClick={() => setEditing({ key: k, cell: { ...cell }, isNew: false })}>
                      {cell[l.code as Exclude<LangCode, 'en'>] || <span className="muted">missing</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
            {keys.length === 0 && <tr><td colSpan={2 + OTHER.length} className="muted">No content overrides.</td></tr>}
          </tbody>
        </table>
      )}
      {editing && <CellForm k={editing.key} cell={editing.cell} isNew={editing.isNew} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); }} />}
    </>
  );
}

function CellForm({ k, cell: initial, isNew, onClose, onSaved }: { k: string; cell: ContentCell; isNew: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [key, setKey] = useState(k);
  const [cell, setCell] = useState<ContentCell>(initial);
  const [ai, setAi] = useState<Set<string>>(new Set());
  const [aiSource, setAiSource] = useState<AiSource | undefined>();
  const [note, setNote] = useState('');
  const [reason, setReason] = useState(isNew ? 'New copy' : '');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const errors: Record<string, string> = {};
  if (!key.trim()) errors.key = 'Key is required.';
  if (!cell.en.trim()) errors.en = 'English text is required.';
  if (!reason.trim()) errors.reason = 'Give a reason.';

  const translate = async () => {
    if (!cell.en.trim()) return toast('Write the English text first.', 'error');
    setBusy(true);
    try {
      const r = await api<{ translations: Record<string, string>; model?: string; note?: string }>('/ai/translate', {
        body: { text: cell.en, from: 'en', to: OTHER.map((l) => l.code) },
      });
      const tr = r.translations;
      setCell((c) => ({ ...c, ...Object.fromEntries(OTHER.filter((l) => tr[l.code]).map((l) => [l.code, tr[l.code]])) }));
      setAi(new Set(OTHER.filter((l) => tr[l.code]).map((l) => l.code)));
      setNote(r.note ?? '');
      setAiSource({ prompt: `translate en -> ${OTHER.map((l) => l.code).join(',')}`, model: r.model ?? 'gemini', sources: [] });
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
      const item = Object.fromEntries(Object.entries({ key: key.trim(), ...cell }).filter(([, v]) => v !== '' && v !== undefined));
      await createDraft({ collection: 'content', op: isNew ? 'add' : 'update', item, reason: reason.trim(), aiSource });
      toast('Draft created. An admin must approve it.');
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title={isNew ? 'Add content key' : 'Edit content'} onClose={onClose}>
      <Field label="Key" error={show ? errors.key : undefined}><input value={key} disabled={!isNew} onChange={(e) => setKey(e.target.value)} name="key" /></Field>
      <Field label="English" error={show ? errors.en : undefined}><textarea rows={3} value={cell.en} onChange={(e) => setCell({ ...cell, en: e.target.value })} name="en" /></Field>
      <div className="ai-box">
        <AiBanner />
        <button className="btn small" disabled={busy} onClick={translate} data-testid="translate">Translate with AI</button>
        <span className="small muted"> Fills every other language from the English text.</span>
        {note && <p className="notice-box warn"><strong>Note:</strong> {note}</p>}
      </div>
      {OTHER.map((l) => (
        <Field key={l.code} label={`${l.name} (${l.code})`}>
          <>
            {ai.has(l.code) && <Badge kind="ai">AI draft, review</Badge>}
            <textarea rows={2} value={cell[l.code as Exclude<LangCode, 'en'>] ?? ''} name={l.code}
              onChange={(e) => { setCell({ ...cell, [l.code]: e.target.value }); }} />
          </>
        </Field>
      ))}
      <Field label="Reason for this change" error={show ? errors.reason : undefined}><input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="panel-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={busy} onClick={save} data-testid="save-content">Save as draft</button>
      </div>
    </Panel>
  );
}
