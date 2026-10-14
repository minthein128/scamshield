import type { TallyDoc } from './types.js';

export interface TallyRow {
  key: string;
  n: number;
  right: number;
  wrong: number;
  falseAlarm: number;
  missed: number;
  wrongType: number;
  accuracy: number | null;
}

const num = (c: Record<string, number>, k: string) => c[k] ?? 0;

/** Rows for one dimension (`type` or `lang`), busiest first. */
export function tallyRows(tallies: TallyDoc[], dim: 'type' | 'lang'): TallyRow[] {
  return tallies
    .filter((t) => t.id.startsWith(`${dim}:`))
    .map((t) => {
      const n = num(t.counts, 'n');
      return {
        key: t.id.slice(dim.length + 1),
        n,
        right: num(t.counts, 'right'),
        wrong: num(t.counts, 'wrong'),
        falseAlarm: num(t.counts, 'falseAlarm'),
        missed: num(t.counts, 'missed'),
        wrongType: num(t.counts, 'wrongType'),
        accuracy: n > 0 ? num(t.counts, 'right') / n : null,
      };
    })
    .sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
}

export interface ReportRow {
  key: string;
  reports: number;
  lostMoneyYes: number;
  lostMoneyNo: number;
}

export function reportRows(tallies: TallyDoc[], dim: 'type' | 'lang'): ReportRow[] {
  const prefix = dim === 'type' ? 'reported:' : 'reported:lang:';
  return tallies
    .filter((t) => t.id.startsWith(prefix) && (dim === 'lang' || !t.id.startsWith('reported:lang:')))
    .map((t) => ({
      key: t.id.slice(prefix.length),
      reports: num(t.counts, 'reports'),
      lostMoneyYes: num(t.counts, 'lostMoneyYes'),
      lostMoneyNo: num(t.counts, 'lostMoneyNo'),
    }))
    .sort((a, b) => b.reports - a.reports || a.key.localeCompare(b.key));
}

const pad = (v: string | number, w: number) => String(v).padEnd(w);

export function formatTallies(tallies: TallyDoc[]): string {
  const lines: string[] = [];
  for (const [dim, title] of [
    ['type', 'Verdict feedback by model scam type'],
    ['lang', 'Verdict feedback by input language'],
  ] as const) {
    lines.push(
      title,
      `${pad('key', 26)}${pad('n', 6)}${pad('right', 7)}${pad('acc', 7)}${pad('falseAlarm', 12)}${pad('missed', 8)}wrongType`,
    );
    const rows = tallyRows(tallies, dim);
    if (rows.length === 0) lines.push('  (no feedback yet)');
    for (const r of rows) {
      const acc = r.accuracy === null ? '-' : `${Math.round(r.accuracy * 100)}%`;
      lines.push(
        `${pad(r.key, 26)}${pad(r.n, 6)}${pad(r.right, 7)}${pad(acc, 7)}${pad(r.falseAlarm, 12)}${pad(r.missed, 8)}${r.wrongType}`,
      );
    }
    lines.push('');
  }
  for (const [dim, title] of [
    ['type', 'Scam reports by type'],
    ['lang', 'Scam reports by language'],
  ] as const) {
    lines.push(title, `${pad('key', 26)}${pad('reports', 10)}${pad('lostMoney:yes', 15)}lostMoney:no`);
    const rows = reportRows(tallies, dim);
    if (rows.length === 0) lines.push('  (no reports yet)');
    for (const r of rows) lines.push(`${pad(r.key, 26)}${pad(r.reports, 10)}${pad(r.lostMoneyYes, 15)}${r.lostMoneyNo}`);
    lines.push('');
  }
  return lines.join('\n');
}
