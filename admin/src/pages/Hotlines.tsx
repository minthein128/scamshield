import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { createDraft, type Listing } from '../drafts';
import {
  CATEGORIES,
  COUNTRIES,
  countryName,
  type AiSource,
  type Candidate,
  type HotlineItem,
  type Verification,
} from '../types';
import { AiBanner, Badge, Field, Loading, Panel, Sources, today, useLoad, useMe, useToast } from '../ui/kit';

type Editing = { item: Partial<HotlineItem>; isNew: boolean; aiSource?: AiSource; reason?: string };

const blank = (): Partial<HotlineItem> => ({
  country: 'TH',
  category: 'police',
  name: '',
  number: '',
  dial: '',
  status: 'published',
  source: { url: '', asOf: today(), fetchedBy: 'human' },
});

export default function Hotlines() {
  const { data, error, loading, reload } = useLoad(() => api<Listing<HotlineItem[]>>('/hotlines'));
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [finding, setFinding] = useState(false);
  const [verifying, setVerifying] = useState<HotlineItem | null>(null);
  const [retiring, setRetiring] = useState<HotlineItem | null>(null);

  const pendingIds = useMemo(
    () => new Set((data?.drafts ?? []).filter((d) => d.status === 'pending').map((d) => String(d.item.id))),
    [data],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.items ?? [])
      .filter((h) => !country || h.country === country)
      .filter((h) => !category || h.category === category)
      .filter((h) => !status || (status === 'pending' ? pendingIds.has(h.id) : h.status === status))
      .filter((h) => !needle || [h.name, h.number, h.dial, h.notes, h.id].some((v) => v?.toLowerCase().includes(needle)))
      .sort((a, b) => a.country.localeCompare(b.country) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }, [data, country, category, status, q, pendingIds]);

  const groups = useMemo(() => {
    const m = new Map<string, HotlineItem[]>();
    rows.forEach((r) => m.set(r.country, [...(m.get(r.country) ?? []), r]));
    return [...m.entries()];
  }, [rows]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hotlines</h1>
          <p className="muted">
            {data ? `Published version ${data.version}. ` : ''}Every save creates a draft for an admin to approve.
          </p>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setFinding(true)}>Find with AI</button>
          <button className="btn primary" onClick={() => setEditing({ item: blank(), isNew: true })}>Add hotline</button>
        </div>
      </div>
      <div className="filters">
        <input placeholder="Search name, number, notes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country">
          <option value="">All countries</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          <option value="published">Published</option>
          <option value="retired">Retired</option>
          <option value="pending">Has pending draft</option>
        </select>
        <span className="muted small">{rows.length} shown</span>
      </div>
      <Loading error={error} loading={loading && !data} retry={reload} />
      {data && (
        <table className="table" data-testid="hotlines-table">
          <thead>
            <tr><th>Name</th><th>Category</th><th>Number</th><th>Source</th><th>As of</th><th>Status</th><th /></tr>
          </thead>
          {groups.map(([code, list]) => (
            <tbody key={code}>
              <tr className="group"><th colSpan={7}>{countryName(code)} <span className="muted">({list.length})</span></th></tr>
              {list.map((h) => (
                <tr key={h.id} className={h.status === 'retired' ? 'retired' : ''} data-testid="hotline-row">
                  <td><button className="link" onClick={() => setEditing({ item: structuredClone(h), isNew: false })}>{h.name}</button></td>
                  <td>{h.category}</td>
                  <td className="mono">{h.number ?? <span className="muted">none</span>}</td>
                  <td>{(h.source?.url ?? h.sourceUrl) ? <a href={h.source?.url ?? h.sourceUrl} target="_blank" rel="noreferrer">link</a> : <Badge kind="bad">missing</Badge>}</td>
                  <td>{h.source?.asOf ?? h.asOf ?? ''}{h.verifiedBy && <> <Badge kind="ok">verified</Badge></>}</td>
                  <td>
                    {h.status === 'retired' ? <Badge kind="muted">retired</Badge> : <Badge kind="info">published</Badge>}
                    {pendingIds.has(h.id) && <> <Badge kind="warn">draft pending</Badge></>}
                  </td>
                  <td className="row-actions">
                    <button className="btn small" onClick={() => setVerifying(h)}>Verify with AI</button>
                    {h.status !== 'retired' && <button className="btn small" onClick={() => setRetiring(h)}>Retire</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      )}
      {editing && <EditPanel editing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); }} />}
      {finding && (
        <FindModal
          onClose={() => setFinding(false)}
          onUse={(e) => { setFinding(false); setEditing(e); }}
        />
      )}
      {verifying && <VerifyPanel item={verifying} onClose={() => setVerifying(null)} onSaved={() => { setVerifying(null); void reload(); }} />}
      {retiring && <RetirePanel item={retiring} onClose={() => setRetiring(null)} onSaved={() => { setRetiring(null); void reload(); }} />}
    </>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const isUrl = (s: string) => /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(s);

export function validate(h: Partial<HotlineItem>, reason: string): Record<string, string> {
  const e: Record<string, string> = {};
  if (!h.name?.trim()) e.name = 'Name is required.';
  if (!h.country) e.country = 'Pick a country.';
  if (!h.category) e.category = 'Pick a category.';
  const hasNumber = !!h.number?.trim();
  if (hasNumber && !/^[+\d][\d\s\-().]{1,24}$/.test(h.number!.trim())) e.number = 'Use digits, spaces, + - ( ) only.';
  if (hasNumber && !h.dial?.trim()) e.dial = 'Dial string is required with a number.';
  if (h.dial?.trim() && !/^\+?[\d*#,]+$/.test(h.dial.trim())) e.dial = 'Digits only, no spaces. A leading + is allowed.';
  const url = h.source?.url?.trim() ?? '';
  if (hasNumber && !url) e.sourceUrl = 'A source URL is required when a number is present.';
  else if (url && !isUrl(url)) e.sourceUrl = 'Enter a full http(s) URL.';
  if (h.reportUrl?.trim() && !isUrl(h.reportUrl.trim())) e.reportUrl = 'Enter a full http(s) URL.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(h.source?.asOf ?? '') || Number.isNaN(Date.parse(h.source!.asOf))) e.asOf = 'Use a date as YYYY-MM-DD.';
  if (!reason.trim()) e.reason = 'Give a short reason for the change.';
  return e;
}

function EditPanel({ editing, onClose, onSaved }: { editing: Editing; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [h, setH] = useState<Partial<HotlineItem>>(editing.item);
  const [reason, setReason] = useState(editing.reason ?? (editing.isNew ? 'New hotline' : ''));
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const errors = validate(h, reason);
  const set = (p: Partial<HotlineItem>) => setH((x) => ({ ...x, ...p }));
  const setSrc = (p: Partial<HotlineItem['source']>) => setH((x) => ({ ...x, source: { ...x.source!, ...p } }));
  const ai = editing.aiSource;

  const save = async () => {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      const item: Partial<HotlineItem> = {
        ...h,
        id: h.id || `${h.country!.toLowerCase()}-${slug(h.name!)}${h.number ? '-' + slug(h.number) : ''}`,
        name: h.name!.trim(),
        number: h.number?.trim() || undefined,
        dial: h.dial?.trim() || undefined,
        source: { ...h.source!, url: h.source!.url.trim(), fetchedBy: ai ? 'ai' : h.source!.fetchedBy },
      };
      item.sourceUrl = item.source!.url;
      item.asOf = item.source!.asOf;
      await createDraft({
        collection: 'hotlines',
        op: editing.isNew ? 'add' : 'update',
        item: item as Record<string, unknown>,
        reason: reason.trim(),
        aiSource: ai,
      });
      toast('Draft created. An admin must approve it before it is published.');
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const E = (k: string) => (showErrors ? errors[k] : undefined);

  return (
    <Panel title={editing.isNew ? 'Add hotline' : 'Edit hotline'} onClose={onClose}>
      {ai && (
        <div className="notice-box info" data-testid="ai-attached">
          <Badge kind="ai">AI suggestion</Badge> from {ai.model}. {ai.sources.length} source(s) will be attached to the draft. Check every field before saving.
          <Sources sources={ai.sources} />
        </div>
      )}
      <Field label="Name" error={E('name')}><input value={h.name ?? ''} onChange={(e) => set({ name: e.target.value })} name="name" /></Field>
      <div className="two">
        <Field label="Country" error={E('country')}>
          <select value={h.country} onChange={(e) => set({ country: e.target.value })} name="country">
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Category" error={E('category')}>
          <select value={h.category} onChange={(e) => set({ category: e.target.value as HotlineItem['category'] })} name="category">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <div className="two">
        <Field label="Number (as shown)" error={E('number')}><input value={h.number ?? ''} onChange={(e) => set({ number: e.target.value })} name="number" /></Field>
        <Field label="Dial string" error={E('dial')} hint="Digits only, for the dial button."><input value={h.dial ?? ''} onChange={(e) => set({ dial: e.target.value })} name="dial" /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={!!h.domesticOnly} onChange={(e) => set({ domesticOnly: e.target.checked })} /> Domestic only (cannot be dialled from abroad)</label>
      <Field label="Hours"><input value={h.hours ?? ''} onChange={(e) => set({ hours: e.target.value })} /></Field>
      <Field label="Notes"><textarea rows={2} value={h.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
      <Field label="Report URL" error={E('reportUrl')}><input value={h.reportUrl ?? ''} onChange={(e) => set({ reportUrl: e.target.value })} /></Field>
      <Field label="Source URL" error={E('sourceUrl')} hint="Official page that shows this number."><input value={h.source?.url ?? ''} onChange={(e) => setSrc({ url: e.target.value })} name="sourceUrl" /></Field>
      <div className="two">
        <Field label="As of" error={E('asOf')}><input type="date" value={h.source?.asOf ?? ''} onChange={(e) => setSrc({ asOf: e.target.value })} name="asOf" /></Field>
        <Field label="Status">
          <select value={h.status} onChange={(e) => set({ status: e.target.value as HotlineItem['status'] })}>
            <option value="published">published</option>
            <option value="retired">retired</option>
          </select>
        </Field>
      </div>
      <Field label="Reason for this change" error={E('reason')}><input value={reason} onChange={(e) => setReason(e.target.value)} name="reason" /></Field>
      <div className="panel-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={busy} onClick={save} data-testid="save-draft">{busy ? 'Saving...' : 'Save as draft'}</button>
      </div>
    </Panel>
  );
}

function RetirePanel({ item, onClose, onSaved }: { item: HotlineItem; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await createDraft({ collection: 'hotlines', op: 'update', item: { ...item, status: 'retired' }, reason: reason.trim() });
      toast('Retire draft created.');
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title="Retire hotline" onClose={onClose}>
      <p><strong>{item.name}</strong> ({countryName(item.country)}) will be marked retired and hidden from the app once an admin approves.</p>
      <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Number is disconnected" /></Field>
      <div className="panel-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn danger" disabled={busy || !reason.trim()} onClick={go}>Create retire draft</button>
      </div>
    </Panel>
  );
}

function FindModal({ onClose, onUse }: { onClose: () => void; onUse: (e: Editing) => void }) {
  const toast = useToast();
  const [country, setCountry] = useState('TH');
  const [category, setCategory] = useState('police');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ candidates: Candidate[]; model?: string } | null>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      setResult(await api('/ai/find-hotline', { body: { country, category, ...(query.trim() ? { query: query.trim() } : {}) } }));
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const use = (c: Candidate) => {
    const model = result?.model ?? 'gemini';
    const aiSource: AiSource = {
      prompt: `find-hotline: ${country} / ${category}${query.trim() ? ' / ' + query.trim() : ''}`,
      model,
      sources: c.sources.map(({ title, url, quote }) => ({ title, url, quote })),
    };
    onUse({
      isNew: true,
      aiSource,
      reason: `AI candidate (${c.confidence} confidence)`,
      item: {
        ...blank(),
        country,
        category: category as HotlineItem['category'],
        name: c.name,
        number: c.number,
        dial: c.dial,
        hours: c.hours,
        notes: c.notes,
        source: { url: c.sources[0]?.url ?? '', asOf: today(), fetchedBy: 'ai' },
      },
    });
  };
  return (
    <Panel title="Find a hotline with AI" onClose={onClose} wide>
      <AiBanner />
      <div className="three">
        <Field label="Country"><select value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></Field>
        <Field label="Category"><select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Query (optional)"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. 24-hour line" /></Field>
      </div>
      <button className="btn primary" disabled={busy} onClick={run} data-testid="find-run">{busy ? 'Searching...' : 'Search'}</button>
      {result && result.candidates.length === 0 && <p className="muted">No candidates found.</p>}
      <div data-testid="candidates">
        {result?.candidates.map((c, i) => (
          <div className="candidate" key={i}>
            <div className="cand-head">
              <div>
                <strong>{c.name}</strong>
                <div className="mono">{c.number} <span className="muted">dial {c.dial}</span></div>
                {c.hours && <div className="small muted">{c.hours}</div>}
              </div>
              <Badge kind={c.confidence === 'high' ? 'ok' : c.confidence === 'medium' ? 'warn' : 'bad'}>{c.confidence} confidence</Badge>
            </div>
            {c.reason && <p className="small err">{c.reason}</p>}
            {c.notes && <p className="small">{c.notes}</p>}
            <Sources sources={c.sources} />
            <button className="btn small primary" onClick={() => use(c)}>Use as draft</button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function VerifyPanel({ item, onClose, onSaved }: { item: HotlineItem; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const me = useMe();
  const [busy, setBusy] = useState(true);
  const [res, setRes] = useState<Verification | null>(null);
  useEffect(() => {
    let live = true;
    api<Verification>('/ai/verify-hotline', { body: { item } })
      .then((r) => live && setRes(r))
      .catch((e) => live && toast(e instanceof Error ? e.message : String(e), 'error'))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [item, toast]);
  const record = async () => {
    if (!res) return;
    setBusy(true);
    try {
      const at = new Date().toISOString();
      await createDraft({
        collection: 'hotlines',
        op: 'update',
        item: { ...item, verifiedBy: { uid: me.uid, at }, source: { ...item.source, asOf: today() } },
        reason: 'Verification recorded after AI check',
        aiSource: { prompt: `verify-hotline: ${item.id}`, model: res.model ?? 'gemini', sources: res.sources },
      });
      toast('Verification draft created.');
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
      setBusy(false);
    }
  };
  const kind = res?.verdict === 'confirmed' ? 'ok' : res?.verdict === 'conflict' ? 'bad' : 'warn';
  return (
    <Panel title="Verify with AI" onClose={onClose}>
      <p><strong>{item.name}</strong><br /><span className="mono">{item.number ?? 'no number'}</span></p>
      <AiBanner />
      {busy && !res && <p className="muted">Checking the web...</p>}
      {res && (
        <div data-testid="verdict">
          <p><Badge kind={kind}>{res.verdict}</Badge></p>
          <p>{res.note}</p>
          <Sources sources={res.sources} />
          {res.verdict !== 'confirmed' && <p className="small muted">Only a confirmed result can be recorded. Edit the row to correct the entry.</p>}
        </div>
      )}
      <div className="panel-foot">
        <button className="btn" onClick={onClose}>Close</button>
        <button className="btn primary" disabled={busy || res?.verdict !== 'confirmed'} onClick={record}>Record verification</button>
      </div>
    </Panel>
  );
}
