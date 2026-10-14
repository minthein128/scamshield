import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createFirebaseVerifier } from './auth.js';
import { loadConfig, pipelineOptions } from './config.js';
import { createCorrelator } from './correlate.js';
import { createClient, createGeminiExtractor } from './extract.js';
import { createFeedbackFromConfig } from './feedback/factory.js';
import { createGrounder } from './ground.js';
import { createIntelFromConfig } from './intel/factory.js';
import { log } from './log.js';
import { createMockCorrelator, createMockExtractor, createMockGrounder } from './mock.js';
import { createPipeline } from './pipeline.js';
import { createGeminiSpeaker, createMockSpeaker } from './speak.js';
import { instrumentClient } from './timing.js';

const bootStart = performance.now();
const cfg = loadConfig();
const client = cfg.mock ? undefined : instrumentClient(createClient(cfg));
const intel = await createIntelFromConfig(cfg);
const feedback = createFeedbackFromConfig(cfg, intel);
const pipeline = createPipeline({
  extractor: client ? createGeminiExtractor(cfg, client) : createMockExtractor(),
  correlator: cfg.mock ? createMockCorrelator() : createCorrelator(cfg),
  grounder: client ? createGrounder(cfg, client) : createMockGrounder(),
  ...pipelineOptions(cfg),
  intel,
  feedback,
});

serve(
  {
    fetch: createApp(
      cfg,
      pipeline,
      client ? createGeminiSpeaker(cfg, client) : createMockSpeaker(cfg),
      intel,
      createFirebaseVerifier(cfg.firebaseProjectId),
      feedback,
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
