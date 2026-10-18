import type { ThinkingLevel } from '@google/genai';
import { LANGS, type Lang } from './types.js';

export interface Config {
  port: number;
  model: string;
  mock: boolean;
  useVertex: boolean;
  project?: string;
  location: string;
  geminiApiKey?: string;
  webRiskApiKey?: string;
  safeBrowsingApiKey?: string;
  publicApiUrl: string;
  allowedOrigins: string[];
  adminOrigins: string[];
  rateLimitPerMin: number;
  firebaseProjectId: string;
  anonPerHour: number;
  userPerHour: number;
  feedbackPerHour: number;
  maxBodyBytes: number;
  upstreamTimeoutMs: number;
  linkTimeoutMs: number;
  requestBudgetMs: number;
  grounding: boolean;
  debugTimings: boolean;
  cacheEnabled: boolean;
  earlyLinks: boolean;
  streamExtract: boolean;
  dangerGroundCapMs: number;
  recordAfterResponse: boolean;
  resultCacheTtlMs: number;
  linkCacheTtlMs: number;
  ttsModel: string;
  ttsVoice: string;
  liveModel: string;
  liveVoice: string;
  liveMaxMs: number;
  liveCompanionMaxMs: number;
  liveLanguages: Lang[];
  liveMaxConcurrent: number;
  liveStartSensitivity: 'low' | 'high';
  liveEndSensitivity: 'low' | 'high';
  livePrefixPaddingMs: number;
  liveSilenceMs: number;
  adminAiModel: string;
  adminAiPerHour: number;
  apkPath?: string;
  apkVersion?: string;
  apkPerHour: number;
  intelPepper?: string;
  intelProject?: string;
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
}

const bool = (v?: string) => v === '1' || v?.toLowerCase() === 'true';

function thinking(v?: string): Config['thinkingLevel'] {
  const u = (v ?? 'LOW').toUpperCase();
  return u === 'MINIMAL' || u === 'LOW' || u === 'MEDIUM' || u === 'HIGH' ? u : undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const useVertex = bool(env.GOOGLE_GENAI_USE_VERTEXAI);
  const geminiApiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || undefined;
  const project = env.GOOGLE_CLOUD_PROJECT || undefined;
  const hasCreds = useVertex ? Boolean(project) : Boolean(geminiApiKey);
  return {
    port: Number(env.PORT ?? 8080),
    publicApiUrl: (env.PUBLIC_API_URL?.trim() || 'https://sg-dev-808112092414.asia-southeast1.run.app').replace(/\/+$/, ''),
    model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    mock: bool(env.MOCK) || !hasCreds,
    useVertex,
    project,
    location: env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    geminiApiKey,
    webRiskApiKey: env.WEB_RISK_API_KEY || undefined,
    safeBrowsingApiKey: env.SAFE_BROWSING_API_KEY || undefined,
    allowedOrigins: (env.CORS_ORIGINS ?? '*')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    adminOrigins: (env.ADMIN_ORIGINS ?? 'https://saferoute-admin.web.app,http://localhost:5173,http://localhost:5174')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    rateLimitPerMin: Number(env.RATE_LIMIT_PER_MIN ?? 30),
    firebaseProjectId: env.FIREBASE_PROJECT_ID || 'saferoute-aibc',
    anonPerHour: Number(env.ANON_LIMIT_PER_HOUR ?? 20),
    userPerHour: Number(env.USER_LIMIT_PER_HOUR ?? 60),
    feedbackPerHour: Number(env.FEEDBACK_LIMIT_PER_HOUR ?? 30),
    maxBodyBytes: Number(env.MAX_BODY_BYTES ?? 6 * 1024 * 1024),
    upstreamTimeoutMs: Number(env.UPSTREAM_TIMEOUT_MS ?? 12000),
    linkTimeoutMs: Number(env.LINK_TIMEOUT_MS ?? 4000),
    requestBudgetMs: Number(env.REQUEST_BUDGET_MS ?? 15000),
    grounding: env.GROUNDING !== '0',
    debugTimings: bool(env.DEBUG_TIMINGS),
    cacheEnabled: env.CACHE !== '0',
    earlyLinks: env.EARLY_LINKS !== '0',
    streamExtract: env.STREAM_EXTRACT !== '0',
    dangerGroundCapMs: Number(env.GROUND_DANGER_CAP_MS ?? 1500),
    recordAfterResponse: bool(env.RECORD_AFTER_RESPONSE),
    resultCacheTtlMs: Number(env.RESULT_CACHE_TTL_MS ?? 600_000),
    linkCacheTtlMs: Number(env.LINK_CACHE_TTL_MS ?? 3_600_000),
    ttsModel: env.TTS_MODEL || 'gemini-3.8-flash-tts',
    ttsVoice: env.TTS_VOICE || 'Kore',
    liveModel: env.LIVE_MODEL || 'gemini-3.8-live',
    liveVoice: env.LIVE_VOICE || 'Sulafat',
    liveMaxMs: Number(env.LIVE_MAX_MS ?? 120_000),
    liveCompanionMaxMs: Number(env.LIVE_COMPANION_MAX_MS ?? 300_000),
    liveLanguages: liveLanguages(env.LIVE_LANGUAGES),
    liveMaxConcurrent: Number(env.LIVE_MAX_CONCURRENT ?? 20),
    liveStartSensitivity: sensitivity(env.LIVE_VAD_START, 'low'),
    liveEndSensitivity: sensitivity(env.LIVE_VAD_END, 'low'),
    livePrefixPaddingMs: clampMs(env.LIVE_VAD_PREFIX_MS, 400, 0, 2000),
    liveSilenceMs: clampMs(env.LIVE_VAD_SILENCE_MS, 700, 100, 5000),
    adminAiModel: env.ADMIN_AI_MODEL || 'gemini-3.8-flash',
    adminAiPerHour: Number(env.ADMIN_AI_LIMIT_PER_HOUR ?? 30),
    apkPath: env.APK_PATH?.trim() || undefined,
    apkVersion: env.APK_VERSION?.trim() || undefined,
    apkPerHour: Number(env.APK_LIMIT_PER_HOUR ?? 20),
    intelPepper: env.INTEL_PEPPER || undefined,
    intelProject: env.INTEL_PROJECT || project || 'saferoute-aibc',
    thinkingLevel: thinking(env.THINKING_LEVEL),
  };
}

export function thinkingOf(cfg: Config) {
  return cfg.thinkingLevel ? { thinkingConfig: { thinkingLevel: cfg.thinkingLevel as ThinkingLevel } } : {};
}

export function pipelineOptions(cfg: Config) {
  return {
    budgetMs: cfg.requestBudgetMs,
    model: cfg.model,
    earlyLinks: cfg.earlyLinks,
    earlyGrounding: cfg.streamExtract,
    dangerGroundCapMs: cfg.dangerGroundCapMs,
    recordAfterResponse: cfg.recordAfterResponse,
    resultCacheTtlMs: cfg.cacheEnabled ? cfg.resultCacheTtlMs : 0,
  };
}

/** LIVE_LANGUAGES: comma list of languages Live may use. Unknown codes are ignored; empty means all. */
export function liveLanguages(raw: string | undefined): Lang[] {
  const picked = (raw ?? 'en,my,th,id,tl')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter((x): x is Lang => (LANGS as readonly string[]).includes(x));
  return picked.length ? [...new Set(picked)] : [...LANGS];
}

export function sensitivity(raw: string | undefined, fallback: 'low' | 'high'): 'low' | 'high' {
  const v = raw?.trim().toLowerCase();
  return v === 'low' || v === 'high' ? v : fallback;
}

export function clampMs(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = raw === undefined || raw.trim() === '' ? Number.NaN : Number(raw);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}
