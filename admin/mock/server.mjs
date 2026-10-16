// Local mock of docs/admin-contract.md. State is in memory; any bearer token is accepted.
import http from 'node:http';
import { HOTLINES } from '../../src/data/hotlines.ts';

const PORT = Number(process.env.PORT ?? 8790);
const ROLE = process.env.MOCK_ROLE ?? 'admin';
const ME = { uid: 'mock-admin', email: 'mock@saferoute.dev', role: ROLE };
const now = () => new Date().toISOString();
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let seq = 1;
const nid = (p) => `${p}${String(seq++).padStart(4, '0')}`;

const state = {
  hotlines: {
    version: 1,
    updatedAt: now(),
    updatedBy: 'seed',
    items: HOTLINES.map(({ sourceUrl, verifiedOn, asOf, ...h }) => ({
      ...h,
      status: 'published',
      source: { url: sourceUrl, asOf: asOf ?? verifiedOn, fetchedBy: 'human' },
      sourceUrl,
      asOf: asOf ?? verifiedOn,
    })),
  },
  notices: {
    version: 1,
    items: [
      { id: 'n-scam-jobs', country: ['TH', 'KH'], language: ['en'], title: 'Fake job offers on the rise', body: 'Offers that ask you to travel for a high-paying job may be a trap. Check the employer before you go.', severity: 'warning', startsAt: '2026-10-01', enabled: true },
      { id: 'n-welcome', title: 'Welcome to Kakwe', body: 'Paste any message to check it.', severity: 'info', enabled: false },
    ],
  },
  content: {
    version: 1,
    items: {
      'redflag.advance_fee': { en: 'They ask you to pay money before you start work.', my: 'အလုပ်မစခင် ငွေပေးခိုင်းပါသည်။' },
      'redflag.passport_held': { en: 'The employer wants to keep your passport.', my: 'အလုပ်ရှင်က သင့်ပတ်စပို့ကို ထိန်းထားလိုပါသည်။', th: 'นายจ้างต้องการเก็บหนังสือเดินทางของคุณ' },
      'learn.safe_travel.title': { en: 'Travel safely for work' },
    },
  },
  drafts: [],
  audit: [],
  admins: [
    { uid: 'mock-admin', email: 'mock@saferoute.dev', role: ROLE, addedBy: 'script', addedAt: '2026-10-14T09:00:00Z' },
    { uid: 'u-editor', email: 'editor@saferoute.dev', role: 'editor', addedBy: 'mock-admin', addedAt: '2026-10-15T09:00:00Z' },
  ],
};

state.drafts.push({
  id: nid('d'), collection: 'hotlines', op: 'update', reason: 'Hours changed on the official page', createdBy: 'editor@saferoute.dev', createdAt: now(), status: 'pending',
  item: { ...state.hotlines.items[0], hours: 'Open 8am to 8pm' },
});

const find = (col, item) => {
  const key = col === 'content' ? item.key : item.id;
  if (col === 'content') return { key, cur: state.content.items[key] };
  return { key, cur: state[col].items.find((x) => x.id === key) };
};

function applyDraft(d) {
  const col = d.collection;
  const { key, cur } = find(col, d.item);
  let before = cur ? structuredClone(cur) : null;
  let after = null;
  if (col === 'content') {
    if (d.op === 'delete') delete state.content.items[key];
    else {
      after = Object.fromEntries(Object.entries(d.item).filter(([k]) => k !== 'key'));
      state.content.items[key] = after;
    }
  } else {
    const list = state[col].items;
    const i = list.findIndex((x) => x.id === key);
    if (d.op === 'delete') { if (i >= 0) list.splice(i, 1); }
    else {
      after = { ...d.item };
      if (col === 'hotlines') after.history = [...(cur?.history ?? []), { at: now(), by: d.createdBy, change: d.reason }];
      if (i >= 0) list[i] = after; else list.push(after);
    }
  }
  state[col].version += 1;
  state[col].updatedAt = now();
  return { before, after, version: state[col].version };
}

const SRC = {
  TH: [{ title: 'Royal Thai Police', url: 'https://www.royalthaipolice.go.th/', quote: 'Emergency hotline 191, available 24 hours.' }],
  MM: [{ title: 'Myanmar Police Force', url: 'https://www.myanmarpoliceforce.gov.mm/', quote: 'Report crimes to the police on 199.' }],
  KH: [{ title: 'Ministry of Interior, Cambodia', url: 'https://www.interior.gov.kh/', quote: 'Police emergency number 117.' }],
};
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function findHotline({ country, category, query }) {
  const known = state.hotlines.items.filter((h) => h.country === country && h.category === category && h.number);
  const candidates = known.slice(0, 2).map((h) => ({
    name: h.name, number: h.number, dial: h.dial ?? h.number, hours: h.hours, notes: h.notes,
    sources: [{ title: new URL(h.source.url).hostname, url: h.source.url, quote: `${h.name}: ${h.number}` }],
    confidence: 'high',
  }));
  candidates.push({
    name: `${query || 'Regional'} ${category} support line (${country})`,
    number: '1' + String(100 + (hash(country + category + (query ?? '')) % 800)),
    dial: '1' + String(100 + (hash(country + category + (query ?? '')) % 800)),
    hours: 'Hours not stated',
    notes: 'Found on a news article, not an official page.',
    sources: [{ title: 'News article', url: 'https://example.com/news/support-line', quote: 'A support line was announced for workers.' }],
    confidence: 'low',
    reason: 'No official-looking source. Treat as unverified.',
  });
  if (candidates.length < 3) candidates.unshift({ ...candidates.at(-1), name: `${country} ${category} national line`, sources: SRC[country] ?? SRC.TH, confidence: 'medium', reason: undefined });
  return { candidates, model: 'gemini-2.5-pro (mock)' };
}

function verify(item) {
  const h = hash(item.id ?? item.name ?? '') % 5;
  const sources = item.source?.url ? [{ title: new URL(item.source.url).hostname, url: item.source.url, quote: `${item.name} ${item.number ?? ''}` }] : [];
  if (h === 0) return { verdict: 'conflict', sources, note: 'The official page lists a different number than the one on file.', model: 'gemini-2.5-pro (mock)' };
  if (h === 1) return { verdict: 'unverified', sources: [], note: 'No page could be found that shows this number.', model: 'gemini-2.5-pro (mock)' };
  return { verdict: 'confirmed', sources, note: 'The number matches the official page.', model: 'gemini-2.5-pro (mock)' };
}

const TR = {
  my: (t) => `[my] ${t}`, id: (t) => `[id] ${t}`, tl: (t) => `[tl] ${t}`, th: (t) => `[th] ${t}`,
};

async function route(method, path, query, body) {
  const m = path.match(/^\/v1\/admin(\/.*)$/);
  if (!m) return [404, { error: 'not found' }];
  const p = m[1];
  if (method === 'GET' && p === '/me') return [200, ME];
  if (method === 'GET' && p === '/hotlines') return [200, { ...state.hotlines, drafts: state.drafts.filter((d) => d.collection === 'hotlines' && d.status === 'pending') }];
  if (method === 'GET' && p === '/notices') return [200, { ...state.notices, drafts: state.drafts.filter((d) => d.collection === 'notices' && d.status === 'pending') }];
  if (method === 'GET' && p === '/content') return [200, { ...state.content, drafts: state.drafts.filter((d) => d.collection === 'content' && d.status === 'pending') }];
  if (method === 'GET' && p === '/drafts') return [200, { drafts: query.get('status') ? state.drafts.filter((d) => d.status === query.get('status')) : state.drafts }];
  if (method === 'GET' && p === '/audit') return [200, { entries: [...state.audit].reverse().slice(0, Number(query.get('limit') ?? 100)) }];
  if (method === 'GET' && p === '/admins') return [200, { admins: state.admins }];
  if (method === 'POST' && p === '/drafts') {
    if (!body?.collection || !body?.op || !body?.item || !body?.reason) return [400, { error: 'collection, op, item and reason are required' }];
    const d = { id: nid('d'), collection: body.collection, op: body.op, item: body.item, reason: body.reason, aiSource: body.aiSource, createdBy: ME.email, createdAt: now(), status: 'pending' };
    state.drafts.push(d);
    return [200, d];
  }
  const act = p.match(/^\/drafts\/([^/]+)\/(approve|reject)$/);
  if (method === 'POST' && act) {
    if (ME.role !== 'admin') return [403, { error: 'admin only' }];
    const d = state.drafts.find((x) => x.id === act[1]);
    if (!d) return [404, { error: 'no such draft' }];
    if (d.status !== 'pending') return [409, { error: `draft is already ${d.status}` }];
    d.reviewedBy = ME.email; d.reviewedAt = now();
    if (act[2] === 'reject') {
      d.status = 'rejected';
      state.audit.push({ id: nid('a'), at: now(), by: ME.email, action: 'reject', collection: d.collection, before: null, after: null, draftId: d.id });
      return [200, d];
    }
    const r = applyDraft(d);
    d.status = 'approved'; d.version = r.version;
    state.audit.push({ id: nid('a'), at: now(), by: ME.email, action: `approve:${d.op}`, collection: d.collection, before: r.before, after: r.after, draftId: d.id });
    return [200, { ...d, version: r.version }];
  }
  if (method === 'POST' && p.startsWith('/ai/')) {
    await delay(500);
    if (p === '/ai/find-hotline') return [200, findHotline(body ?? {})];
    if (p === '/ai/verify-hotline') return [200, verify(body?.item ?? {})];
    if (p === '/ai/draft-content') {
      const lang = body?.language ?? 'en';
      return [200, {
        text: lang === 'en' ? `${body.instruction}. Be careful: this may be a scam, and the details can change. Check with an official source before you act.` : `[${lang}] ${body.instruction}`,
        note: 'Wording is hedged: it says "may" because scam patterns vary. A human must review it.',
        model: 'gemini-2.5-pro (mock)',
      }];
    }
    if (p === '/ai/translate') {
      const translations = Object.fromEntries((body?.to ?? []).map((l) => [l, (TR[l] ?? ((t) => t))(body.text)]));
      return [200, { translations, model: 'gemini-2.5-pro (mock)', note: 'Machine translation. Check with a native speaker.' }];
    }
  }
  return [404, { error: 'not found' }];
}

http.createServer(async (req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
  const url = new URL(req.url, 'http://x');
  if (!(req.headers.authorization ?? '').startsWith('Bearer ')) return res.writeHead(401, { ...cors, 'Content-Type': 'application/json' }).end('{"error":"missing token"}');
  let raw = '';
  for await (const c of req) raw += c;
  let body;
  try { body = raw ? JSON.parse(raw) : undefined; } catch { body = undefined; }
  const [status, json] = await route(req.method, url.pathname, url.searchParams, body);
  res.writeHead(status, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(json));
}).listen(PORT, () => console.log(`mock admin API on http://localhost:${PORT} (role ${ROLE})`));
