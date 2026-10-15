export interface DiffRow { field: string; before: string; after: string }

const show = (v: unknown): string =>
  v === undefined || v === null || v === '' ? '' : typeof v === 'string' ? v : JSON.stringify(v);

export function diffItems(before: Record<string, unknown> | undefined, after: Record<string, unknown> | undefined): DiffRow[] {
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
