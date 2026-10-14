import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createCorrelator } from './correlate.js';
import { createClient, createGeminiExtractor } from './extract.js';
import { createGrounder } from './ground.js';
import { log } from './log.js';
import { createMockCorrelator, createMockExtractor, createMockGrounder } from './mock.js';
import { createPipeline } from './pipeline.js';
import { createGeminiSpeaker, createMockSpeaker } from './speak.js';

const cfg = loadConfig();
const client = cfg.mock ? undefined : createClient(cfg);
const pipeline = createPipeline({
  extractor: client ? createGeminiExtractor(cfg, client) : createMockExtractor(),
  correlator: cfg.mock ? createMockCorrelator() : createCorrelator(cfg),
  grounder: client ? createGrounder(cfg, client) : createMockGrounder(),
  budgetMs: cfg.requestBudgetMs,
  model: cfg.model,
});

serve(
  {
    fetch: createApp(cfg, pipeline, client ? createGeminiSpeaker(cfg, client) : createMockSpeaker(cfg)).fetch,
    port: cfg.port,
    hostname: '0.0.0.0',
  },
  (info) => {
    log('INFO', 'listening', { port: info.port, model: cfg.model, mock: cfg.mock, vertex: cfg.useVertex });
  },
);
