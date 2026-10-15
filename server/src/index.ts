import { serve } from '@hono/node-server';
import { createAiAssist } from './admin/ai.js';
import { createPublishedCache } from './admin/published.js';
import { createFirestoreConfigStore, createMemoryStore } from './admin/store.js';
import { createApp, createLimits } from './app.js';
import { createFirebaseVerifier } from './auth.js';
import { loadConfig, pipelineOptions } from './config.js';
import { createCorrelator } from './correlate.js';
import { setHotlineSource } from './explain.js';
import { createClient } from './extract.js';
import { createExtractor } from './extract-stream.js';
import { createFeedbackFromConfig } from './feedback/factory.js';
import { createGrounder } from './ground.js';
import { createIntelFromConfig } from './intel/factory.js';
import { attachLive, type LiveConnect } from './live.js';
import { createMockLiveConnect } from './live-mock.js';
import { log } from './log.js';
import { createMockCorrelator, createMockExtractor, createMockGrounder } from './mock.js';
import { createPipeline } from './pipeline.js';
import { createGeminiSpeaker, createMockSpeaker } from './speak.js';
import { instrumentClient } from './timing.js';

const bootStart = performance.now();
const cfg = loadConfig();
const rawClient = cfg.mock ? undefined : createClient(cfg);
const client = rawClient ? instrumentClient(rawClient) : undefined;
const intel = await createIntelFromConfig(cfg);
const feedback = createFeedbackFromConfig(cfg, intel);
const pipeline = createPipeline({
  extractor: client ? createExtractor(cfg, client) : createMockExtractor(),
  correlator: cfg.mock ? createMockCorrelator() : createCorrelator(cfg),
  grounder: client ? createGrounder(cfg, client) : createMockGrounder(),
  ...pipelineOptions(cfg),
  intel,
  feedback,
});

const limits = createLimits(cfg);
const verifier = createFirebaseVerifier(cfg.firebaseProjectId);
const memoryConfig = (process.env.CONFIG_STORE ?? (cfg.mock ? 'memory' : 'firestore')) === 'memory';
const configStore = memoryConfig ? createMemoryStore() : createFirestoreConfigStore({ projectId: cfg.firebaseProjectId });
const published = createPublishedCache(configStore);
setHotlineSource(() => published.hotlines());
published.start();
const admin = {
  store: configStore,
  verifier,
  ai: rawClient ? createAiAssist({ cfg, client: rawClient }) : undefined,
  aiPerHour: cfg.adminAiPerHour,
  onPublished: (collection: Parameters<typeof published.invalidate>[0]) => published.invalidate(collection),
};

const server = serve(
  {
    fetch: createApp(
      cfg,
      pipeline,
      client ? createGeminiSpeaker(cfg, client) : createMockSpeaker(cfg),
      intel,
      verifier,
      feedback,
      limits,
      admin,
      published,
    ).fetch,
    port: cfg.port,
    hostname: '0.0.0.0',
  },
  (info) => {
    log('INFO', 'listening', {
      port: info.port,
      model: cfg.model,
      mock: cfg.mock,
      vertex: cfg.useVertex,
      bootMs: Math.round(performance.now() - bootStart),
      processUptimeMs: Math.round(process.uptime() * 1000),
    });
  },
);

const connect: LiveConnect = rawClient
  ? async (p) => (await rawClient.live.connect(p as Parameters<typeof rawClient.live.connect>[0])) as never
  : createMockLiveConnect();
attachLive(server as never, { cfg, pipeline, verifier, limits, connect });
