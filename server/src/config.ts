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
  maxBodyBytes: number;
  upstreamTimeoutMs: number;
  linkTimeoutMs: number;
}

const bool = (v?: string) => v === '1' || v?.toLowerCase() === 'true';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const useVertex = bool(env.GOOGLE_GENAI_USE_VERTEXAI);
  const geminiApiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || undefined;
  const project = env.GOOGLE_CLOUD_PROJECT || undefined;
  const hasCreds = useVertex ? Boolean(project) : Boolean(geminiApiKey);
  return {
    port: Number(env.PORT ?? 8080),
    model: env.GEMINI_MODEL || 'gemini-2.5-flash',
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
    maxBodyBytes: Number(env.MAX_BODY_BYTES ?? 6 * 1024 * 1024),
    upstreamTimeoutMs: Number(env.UPSTREAM_TIMEOUT_MS ?? 25000),
    linkTimeoutMs: Number(env.LINK_TIMEOUT_MS ?? 4000),
  };
}
