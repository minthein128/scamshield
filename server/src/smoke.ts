import { loadConfig } from './config.js';
import { createCorrelator } from './correlate.js';
import { createGeminiExtractor } from './extract.js';
import { createPipeline } from './pipeline.js';

const cfg = loadConfig({ ...process.env, MOCK: '0' });
if (!cfg.geminiApiKey && !(cfg.useVertex && cfg.project)) {
  console.error('smoke: set GEMINI_API_KEY (or GOOGLE_GENAI_USE_VERTEXAI=true with GOOGLE_CLOUD_PROJECT)');
  process.exit(2);
}
const pipeline = createPipeline({
  extractor: createGeminiExtractor(cfg),
  correlator: createCorrelator(cfg),
  model: cfg.model,
});
const res = await pipeline.run({
  kind: 'job',
  language: 'en',
  text: 'Hiring! Customer service in Thailand, USD 1800/month, no experience. Send passport copy today, pickup by car at the border. Do not tell anyone. https://jobs-thai.vip/apply',
});
console.log(JSON.stringify(res, null, 2));
if (res.verdict !== 'danger') {
  console.error(`smoke: expected danger, got ${res.verdict}`);
  process.exit(1);
}
