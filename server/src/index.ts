import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createCorrelator } from './correlate.js';
import { createGeminiExtractor } from './extract.js';
import { log } from './log.js';
import { createMockCorrelator, createMockExtractor } from './mock.js';
import { createPipeline } from './pipeline.js';

const cfg = loadConfig();
const pipeline = createPipeline({
  extractor: cfg.mock ? createMockExtractor() : createGeminiExtractor(cfg),
  correlator: cfg.mock ? createMockCorrelator() : createCorrelator(cfg),
  model: cfg.model,
});

serve({ fetch: createApp(cfg, pipeline).fetch, port: cfg.port, hostname: '0.0.0.0' }, (info) => {
  log('INFO', 'listening', { port: info.port, model: cfg.model, mock: cfg.mock, vertex: cfg.useVertex });
});
