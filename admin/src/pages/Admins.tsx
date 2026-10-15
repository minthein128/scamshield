import { api } from '../api';
import { Badge, Loading, fmtDate, useLoad, useMe } from '../ui/kit';

interface AdminRow { uid: string; email: string; role: 'admin' | 'editor'; addedBy?: string; addedAt?: string }

export default function Admins() {
  const me = useMe();
  const { data, error, loading, reload } = useLoad(() => api<{ admins: AdminRow[] }>('/admins'));
  return (
    <>
      <div className="page-head"><div><h1>Admins</h1>
        <p className="muted">Admins can publish. Editors can draft. Adding or removing people is done with a script for now; there is no form here.</p></div></div>
      <Loading error={error} loading={loading && !data} retry={reload} />
      {data && (
        <table className="table">
          <thead><tr><th>Email</th><th>Role</th><th>Added by</th><th>Added</th></tr></thead>
          <tbody>
            {data.admins.map((a) => (
              <tr key={a.uid}>
                <td>{a.email}{a.uid === me.uid && <> <Badge kind="info">you</Badge></>}</td>
                <td><Badge kind={a.role === 'admin' ? 'ok' : 'muted'}>{a.role}</Badge></td>
                <td>{a.addedBy}</td><td>{fmtDate(a.addedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
