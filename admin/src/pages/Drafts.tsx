import { useState } from 'react';
import { api } from '../api';
import { diffItems } from '../diff';
import type { Listing } from '../drafts';
import type { ContentItem, Draft, HotlineItem, Notice } from '../types';
import { Badge, Loading, Sources, fmtDate, useLoad, useMe, useToast } from '../ui/kit';

interface Published {
  hotlines: Record<string, unknown>;
  notices: Record<string, unknown>;
  content: Record<string, unknown>;
}

async function loadAll() {
  const [drafts, h, n, c] = await Promise.all([
    api<{ drafts: Draft[] }>('/drafts'),
    api<Listing<HotlineItem[]>>('/hotlines'),
    api<Listing<Notice[]>>('/notices'),
    api<Listing<Record<string, Omit<ContentItem, 'key'>>>>('/content'),
  ]);
  const pub: Published = {
    hotlines: Object.fromEntries(h.items.map((x) => [x.id, x])),
    notices: Object.fromEntries(n.items.map((x) => [x.id, x])),
    content: Object.fromEntries(Object.entries(c.items).map(([k, v]) => [k, { key: k, ...v }])),
  };
  return { drafts: drafts.drafts, pub };
}

const itemKey = (d: Draft) => String(d.collection === 'content' ? d.item.key : d.item.id);
const title = (d: Draft) => String(d.item.name ?? d.item.title ?? d.item.key ?? d.item.id);

export default function Drafts() {
  const me = useMe();
  const { data, error, loading, reload } = useLoad(loadAll);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const list = (data?.drafts ?? [])
    .filter((d) => filter === 'all' || d.status === 'pending')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Drafts</h1>
          <p className="muted">
            {me.role === 'admin' ? 'Review each change, then approve or reject.' : 'You are an editor. This queue is read-only for you; an admin publishes.'}
          </p>
        </div>
        <div className="actions">
          <select value={filter} onChange={(e) => setFilter(e.target.value as 'pending' | 'all')} aria-label="Filter">
            <option value="pending">Pending</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>
      <Loading error={error} loading={loading && !data} retry={reload} />
      {data && list.length === 0 && <p className="muted">No drafts.</p>}
      {data && list.map((d) => <DraftCard key={d.id} d={d} before={data.pub[d.collection][itemKey(d)] as Record<string, unknown> | undefined} onDone={reload} />)}
    </>
  );
}

function DraftCard({ d, before, onDone }: { d: Draft; before?: Record<string, unknown>; onDone: () => void }) {
  const me = useMe();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const rows = diffItems(d.op === 'add' ? undefined : before, d.op === 'delete' ? undefined : d.item);

  const act = async (verb: 'approve' | 'reject') => {
    setBusy(true);
    try {
      const r = await api<{ version?: number }>(`/drafts/${d.id}/${verb}`, { method: 'POST', body: {} });
      if (verb === 'approve') {
        setNote(r.version ? `Approved. Published as version ${r.version}.` : 'Approved.');
        toast(r.version ? `Approved. ${d.collection} is now version ${r.version}.` : 'Approved.');
      } else toast('Rejected.');
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card draft" data-testid="draft">
      <header>
        <div>
          <h3>{title(d)}</h3>
          <span className="muted small">{d.collection} / {d.op} / {fmtDate(d.createdAt)}</span>
        </div>
        <Badge kind={d.status === 'pending' ? 'warn' : d.status === 'approved' ? 'ok' : 'muted'}>{d.status}</Badge>
      </header>
      <p className="author">
        {d.aiSource ? <><Badge kind="ai">AI</Badge> {d.aiSource.model}, requested by {d.createdBy}</> : <><Badge kind="info">Human</Badge> {d.createdBy}</>}
      </p>
      <p><strong>Reason:</strong> {d.reason}</p>
      {d.aiSource && (
        <details>
          <summary>AI sources ({d.aiSource.sources.length})</summary>
          <p className="small muted">Prompt: {d.aiSource.prompt}</p>
          <Sources sources={d.aiSource.sources} />
        </details>
      )}
      <table className="table diff">
        <thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.field}>
              <td className="mono">{r.field}</td>
              <td className="before">{r.before || <span className="muted">empty</span>}</td>
              <td className="after">{r.after || <span className="muted">empty</span>}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={3} className="muted">No field changes.</td></tr>}
        </tbody>
      </table>
      {d.status === 'pending' && me.role === 'admin' && (
        <div className="actions">
          <button className="btn danger" disabled={busy} onClick={() => act('reject')}>Reject</button>
          <button className="btn primary" disabled={busy} onClick={() => act('approve')} data-testid="approve">Approve</button>
        </div>
      )}
      {d.status === 'approved' && (d.version || note) && <p className="ok-text">{note || `Published as version ${d.version}.`}</p>}
      {d.status !== 'pending' && d.reviewedBy && <p className="small muted">Reviewed by {d.reviewedBy} {fmtDate(d.reviewedAt)}</p>}
    </section>
  );
}
