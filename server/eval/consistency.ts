import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Sends each demo input N times to a running server and prints the spread of verdicts and scores.
 * Env: CONSISTENCY_API (default http://localhost:8090), CONSISTENCY_N (8), CONSISTENCY_ONLY=id,id,
 * CONSISTENCY_IMAGE (JPEG for the bubble case), CONSISTENCY_JSON (write raw rows), CONSISTENCY_PAR (2).
 */
const API = (process.env.CONSISTENCY_API ?? 'http://localhost:8090').replace(/\/+$/, '');
const N = Number(process.env.CONSISTENCY_N ?? 8);
const PAR = Number(process.env.CONSISTENCY_PAR ?? 2);
const only = process.env.CONSISTENCY_ONLY?.split(',');

const A =
  'Hello sister! Factory job in Mae Sot, Thailand. Salary 18,000 baht per month, free food and room. No experience needed. We take care of the passport and visa. Send a photo of your passport today to book your seat. A car leaves Myawaddy on Friday night. Only 3 places left. Do not tell other people about this job.';
const C =
  'Sister, the deposit is 300 USD. Pay today or your seat goes to someone else. Send your passport photo too. Please keep this between us.';
const FLOW1 = `URGENT HIRING - Customer Service Staff, Thailand
Company: Golden Harbor Digital Co., Ltd (Mae Sot branch)
Salary: USD 1,800 per month + bonus + free housing
No experience. No English needed. Ages 18-35.
We pay your flight and handle the visa. Do not worry about permits.
Send a photo of your passport and a selfie to book your seat today.
Only 5 places left. A driver will pick you up at the border and take you to the office.
Contact Mr. Kyaw Lin Htet on Telegram: @goldenharbor_hr_88`;
const FLOW3 =
  'Agent Siti: Work in Thailand! Big salary, free flight and visa. No experience needed. Leave this week. Send a photo of your passport to book your seat. Our driver picks you up at Bangkok airport and takes you to the office. Only 5 places left. Message me on Telegram now!';
const CAREFUL =
  'Banyan Bridge Placement Agency. Licensed overseas placement. Jobs in factory, caregiver and restaurant. Departure guaranteed in 2 weeks. Pay a deposit to reserve a place.';
const SAFE =
  'Hi Rina, this is Dewi from the Hartwell Language School front desk. Your class on Thursday moved to room 4. No payment needed. Call the office at the number on the school website if you have questions.';
const PARCEL =
  '[PostBox] Your parcel is held at the warehouse. Pay the small delivery fee today or it will be returned: hxxp://postbox-fee-pay.example/r/8231';
const B_AD =
  'Kinnari Thread Works Co., Ltd. is hiring sewing machine operators in Mae Sot, Thailand. Salary 12,000 THB per month. No agency fees. Official contract and work permit provided. Apply at our office.';
const B_CHAT =
  'Hi sister, to keep your place please pay a 300 USD deposit today to this account. Also send a clear photo of your passport. We sign the contract after you arrive.';

const ctx = { home: 'MM', destination: 'TH' };
type Case = { id: string; job?: false; body: Record<string, unknown> } | { id: string; job: true; body: Record<string, unknown> };

const image = process.env.CONSISTENCY_IMAGE;
const CASES: Case[] = [
  { id: 'A-my', body: { kind: 'message', language: 'my', text: A, context: ctx } },
  { id: 'A-en', body: { kind: 'message', language: 'en', text: A, context: ctx } },
  { id: 'C-my', body: { kind: 'message', language: 'my', text: C, context: ctx } },
  { id: 'C-en', body: { kind: 'message', language: 'en', text: C, context: ctx } },
  { id: 'F1-my', body: { kind: 'job', language: 'my', text: FLOW1, context: ctx } },
  { id: 'F3-en', body: { kind: 'message', language: 'en', text: FLOW3, context: ctx } },
  { id: 'careful-en', body: { kind: 'agency', language: 'en', text: CAREFUL, context: ctx } },
  { id: 'safe-en', body: { kind: 'message', language: 'en', text: SAFE, context: ctx } },
  { id: 'parcel-en', body: { kind: 'message', language: 'en', text: PARCEL, context: ctx } },
  { id: 'B-job-my', job: true, body: { language: 'my', ad: { text: B_AD }, chat: { text: B_CHAT }, context: ctx } },
  { id: 'B-job-en', job: true, body: { language: 'en', ad: { text: B_AD }, chat: { text: B_CHAT }, context: ctx } },
  ...(image
    ? (['my', 'en'] as const).map((language) => ({
        id: `C-bubble-${language}`,
        body: { kind: 'screen', language, imageBase64: readFileSync(image).toString('base64'), imageMimeType: 'image/jpeg' },
      }))
    : []),
].filter((c) => !only || only.includes(c.id));

interface Row {
  id: string;
  run: number;
  verdict: string;
  score: number;
  families: string;
  extra: string;
  ms: number;
  error?: string;
}

async function post(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json).slice(0, 200)}`);
  return json;
}

type FlagLike = { family: string; severity: string };
const famKey = (flags: FlagLike[]) => [...new Set(flags.map((f) => `${f.family}:${f.severity}`))].sort().join(',');

const factKey = (facts: Record<string, { value: unknown } | null> | null) =>
  facts
    ? Object.entries(facts)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${typeof v?.value === 'object' ? JSON.stringify(v?.value) : String(v?.value)}`)
        .sort()
        .join(';')
    : 'null';

async function runOne(c: Case, run: number): Promise<Row> {
  const t0 = Date.now();
  try {
    if (c.job) {
      const ex = (await post('/v1/job/extract', c.body)) as { jobId: string; ad: never; chat: never };
      const res = await post('/v1/job/assess', {
        language: c.body.language,
        jobId: ex.jobId,
        facts: { ad: ex.ad, chat: ex.chat },
        context: c.body.context,
      });
      const conflicts = (res.conflicts as Array<{ code: string }>).map((x) => x.code).sort();
      const findings = (res.findings as Array<{ code: string }>).map((x) => x.code).sort();
      return {
        id: c.id,
        run,
        verdict: String(res.attention),
        score: Number(res.score),
        families: famKey(res.flags as FlagLike[]),
        extra: `conf=${conflicts.join('+')} find=${findings.join('+')} adFacts#${hash(factKey(ex.ad))} chatFacts#${hash(factKey(ex.chat))}`,
        ms: Date.now() - t0,
      };
    }
    const res = await post('/v1/check?debug=1', c.body);
    const t = res.timings as { meta: Record<string, unknown>; spans: Record<string, { ms: number }> } | undefined;
    const meta = t?.meta ?? {};
    return {
      id: c.id,
      run,
      verdict: String(res.verdict),
      score: Number(res.score),
      families: famKey(res.flags as FlagLike[]),
      extra: `type=${res.scamType} src=${(res.sources as unknown[]).length} ground=${t?.spans.ground?.ms ?? '-'}ms cache=${meta.cache ?? '-'} reask=${meta.reasked ?? '-'}`,
      ms: Date.now() - t0,
    };
  } catch (err) {
    return { id: c.id, run, verdict: 'error', score: -1, families: '', extra: '', ms: Date.now() - t0, error: (err as Error).message };
  }
}

function hash(s: string): string {
  let h = 0;
  for (const ch of s) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0;
  return (h >>> 0).toString(16).slice(0, 6);
}

const tasks = CASES.flatMap((c) => Array.from({ length: N }, (_, i) => () => runOne(c, i + 1)));
const rows: Row[] = [];
let next = 0;
await Promise.all(
  Array.from({ length: PAR }, async () => {
    while (next < tasks.length) {
      const task = tasks[next++];
      if (!task) break;
      const r = await task();
      rows.push(r);
      process.stderr.write(`${r.id} #${r.run} ${r.verdict} ${r.score} ${r.ms}ms ${r.error ?? ''}\n`);
    }
  }),
);

const tally = (xs: string[]) => {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} x${n}`);
};

console.log('| case | verdicts | score min-max | distinct flag sets | distinct extra |');
console.log('| --- | --- | --- | --- | --- |');
for (const c of CASES) {
  const rs = rows.filter((r) => r.id === c.id);
  const scores = rs.filter((r) => r.score >= 0).map((r) => r.score);
  const fam = tally(rs.map((r) => r.families));
  const extra = new Set(rs.map((r) => r.extra.replace(/ground=\d+ms /, ''))).size;
  console.log(
    `| ${c.id} | ${tally(rs.map((r) => r.verdict)).join(', ')} | ${Math.min(...scores)}-${Math.max(...scores)} | ${fam.length} | ${extra} |`,
  );
}
console.log('\nFlag sets per case:');
for (const c of CASES) {
  console.log(`- ${c.id}`);
  for (const f of tally(rows.filter((r) => r.id === c.id).map((r) => `[${r.verdict} ${r.score}] ${r.families}`))) console.log(`    ${f}`);
}
if (process.env.CONSISTENCY_JSON) writeFileSync(process.env.CONSISTENCY_JSON, JSON.stringify(rows, null, 2));
