export interface DiffRow { field: string; before: string; after: string }

const show = (v: unknown): string =>
  v === undefined || v === null || v === '' ? '' : typeof v === 'string' ? v : JSON.stringify(v);

const flat = (o: Record<string, unknown> | undefined) => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) out[`${k}.${k2}`] = v2;
    else out[k] = v;
  }
  return out;
};

export function diffItems(rawBefore: Record<string, unknown> | undefined, rawAfter: Record<string, unknown> | undefined): DiffRow[] {
  const before = rawBefore && flat(rawBefore);
  const after = rawAfter && flat(rawAfter);
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const rows: DiffRow[] = [];
  for (const k of keys) {
    if (k === 'history') continue;
    const b = show(before?.[k]);
    const a = show(after?.[k]);
    if (b !== a) rows.push({ field: k, before: b, after: a });
  }
  return rows;
}
