type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
export type JsonSchema = { [k: string]: unknown };

const typeOf = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

/** Validates the JSON Schema subset used by case.schema.json. Returns "path: problem" strings. */
export function validateSchema(value: unknown, schema: JsonSchema, root: JsonSchema = schema, path = ''): string[] {
  const at = path || '(root)';
  if (typeof schema.$ref === 'string') {
    const target = schema.$ref
      .replace(/^#\//, '')
      .split('/')
      .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], root);
    return validateSchema(value, target as JsonSchema, root, path);
  }
  if (Array.isArray(schema.anyOf)) {
    const results = (schema.anyOf as JsonSchema[]).map((s) => validateSchema(value, s, root, path));
    return results.some((r) => r.length === 0) ? [] : [`${at}: does not match any allowed form (${results.map((r) => r[0]).join(' | ')})`];
  }
  const errs: string[] = [];
  if (Array.isArray(schema.enum) && !schema.enum.includes(value as Json)) {
    return [`${at}: must be one of ${(schema.enum as Json[]).join(', ')} (got ${JSON.stringify(value)})`];
  }
  const t = schema.type as string | undefined;
  const actual = typeOf(value);
  if (t) {
    const ok = t === 'integer' ? Number.isInteger(value) : t === actual;
    if (!ok) return [`${at}: expected ${t}, got ${actual}`];
  }
  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) errs.push(`${at}: must not be empty`);
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern).test(value)) errs.push(`${at}: must match ${schema.pattern}`);
  }
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) errs.push(`${at}: must be >= ${schema.minimum}`);
    if (typeof schema.maximum === 'number' && value > schema.maximum) errs.push(`${at}: must be <= ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) errs.push(`${at}: needs at least ${schema.minItems} items`);
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) errs.push(`${at}: allows at most ${schema.maxItems} items`);
    if (schema.items) {
      for (const [i, v] of value.entries()) errs.push(...validateSchema(v, schema.items as JsonSchema, root, `${path}[${i}]`));
    }
  }
  if (actual === 'object' && value) {
    const obj = value as Record<string, unknown>;
    const props = (schema.properties ?? {}) as Record<string, JsonSchema>;
    for (const r of (schema.required ?? []) as string[]) if (!(r in obj)) errs.push(`${path ? `${path}.` : ''}${r}: is required`);
    for (const [k, v] of Object.entries(obj)) {
      const p = path ? `${path}.${k}` : k;
      if (props[k]) errs.push(...validateSchema(v, props[k], root, p));
      else if (schema.additionalProperties === false) errs.push(`${p}: unknown field`);
    }
  }
  return errs;
}
