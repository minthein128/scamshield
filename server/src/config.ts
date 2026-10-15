import type { ThinkingLevel } from '@google/genai';

export interface Config {
  port: number;
  model: string;
  mock: boolean;
  useVertex: boolean;
  project?: string;
  location: string;
  geminiApiKey?: string;
  webRiskApiKey?: string;
  allowedOrigins: string[];
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
  ttsModel: string;
  ttsVoice: string;
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
    model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    mock: bool(env.MOCK) || !hasCreds,
    useVertex,
    project,
    location: env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    geminiApiKey,
    webRiskApiKey: env.WEB_RISK_API_KEY || undefined,
    allowedOrigins: (env.CORS_ORIGINS ?? '*')
      .split(',')
      .map((s) => s.trim())
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
    ttsModel: env.TTS_MODEL || 'gemini-3.8-flash-tts',
    ttsVoice: env.TTS_VOICE || 'Kore',
    intelPepper: env.INTEL_PEPPER || undefined,
    intelProject: env.INTEL_PROJECT || project || 'saferoute-aibc',
    thinkingLevel: thinking(env.THINKING_LEVEL),
  };
}

export function thinkingOf(cfg: Config) {
  return cfg.thinkingLevel ? { thinkingConfig: { thinkingLevel: cfg.thinkingLevel as ThinkingLevel } } : {};
}
