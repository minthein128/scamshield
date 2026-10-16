type Sev = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export function log(severity: Sev, message: string, fields: Record<string, unknown> = {}) {
  if (process.env.LOG_SILENT === '1') return;
  process.stdout.write(`${JSON.stringify({ severity, message, time: new Date().toISOString(), ...fields })}\n`);
}
