import { Fragment, useState } from 'react';
import { api } from '../api';
import { diffItems } from '../diff';
import type { AuditEntry } from '../types';
import { Loading, fmtDate, useLoad } from '../ui/kit';

export default function Audit() {
  const { data, error, loading, reload } = useLoad(() => api<{ entries: AuditEntry[] }>('/audit?limit=200'));
  const [col, setCol] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const rows = (data?.entries ?? []).filter((e) => !col || e.collection === col).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <div className="page-head">
        <div><h1>Audit</h1><p className="muted">Newest first. The log is append-only.</p></div>
        <div className="actions">
          <select value={col} onChange={(e) => setCol(e.target.value)} aria-label="Collection">
            <option value="">All collections</option>
            <option>hotlines</option><option>notices</option><option>content</option>
          </select>
        </div>
      </div>
      <Loading error={error} loading={loading && !data} retry={reload} />
      {data && (
        <table className="table" data-testid="audit-table">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Collection</th><th>Draft</th><th /></tr></thead>
          <tbody>
            {rows.map((e) => (
              <Fragment key={e.id}>
                <tr>
                  <td>{fmtDate(e.at)}</td><td>{e.by}</td><td>{e.action}</td><td>{e.collection}</td>
                  <td className="mono small">{e.draftId ?? ''}</td>
                  <td><button className="btn small" onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? 'Hide' : 'Changes'}</button></td>
                </tr>
                {open === e.id && (
                  <tr><td colSpan={6}>
                    <table className="table diff"><tbody>
                      {diffItems(e.before as Record<string, unknown>, e.after as Record<string, unknown>).map((r) => (
                        <tr key={r.field}><td className="mono">{r.field}</td><td className="before">{r.before}</td><td className="after">{r.after}</td></tr>
                      ))}
                    </tbody></table>
                  </td></tr>
                )}
              </Fragment>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="muted">No entries.</td></tr>}
          </tbody>
        </table>
      )}
    </>
  );
}
