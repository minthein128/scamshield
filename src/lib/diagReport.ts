import { appName } from '../config/brand';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { connectionReport } from '../config/runtime';
import { readLog, type DiagEntry } from './diagLog';

export const REPORT_ENTRIES = 100;

const pad = (n: number) => String(n).padStart(2, '0');

export function formatStamp(t: number): string {
  const d = new Date(t);
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatDetails(d: DiagEntry['d']): string {
  return Object.entries(d)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');
}

export function formatEntry(e: DiagEntry): string {
  return `${formatStamp(e.t)} ${e.level.toUpperCase()} ${e.area}.${e.event} ${formatDetails(e.d)}`.trim();
}

function deviceLine(): string {
  const model = (Platform.constants as { Model?: string } | undefined)?.Model;
  return [model, `${Platform.OS} ${Platform.Version}`].filter(Boolean).join(', ');
}

export function buildLogLines(entries: DiagEntry[]): string[] {
  return entries.slice(-REPORT_ENTRIES).reverse().map(formatEntry);
}

/** One plain-text report: device, language, connection check and the last log entries, newest first. */
export async function buildDiagnosticsReport(language: string, connection?: () => Promise<string>): Promise<string> {
  const version = Constants.expoConfig?.version ?? '';
  const [entries, conn] = await Promise.all([
    readLog(),
    (connection ?? (() => connectionReport({ version, os: Platform.OS })))().catch(() => 'connection report unavailable'),
  ]);
  const lines = buildLogLines(entries);
  return [
    `${appName('en')} diagnostics report`,
    `app ${version}`,
    `device ${deviceLine()}`,
    `language ${language}`,
    '',
    'connection',
    conn,
    '',
    `log (${lines.length} newest first)`,
    ...(lines.length ? lines : ['empty']),
  ].join('\n');
}
