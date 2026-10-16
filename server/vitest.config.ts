import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { env: { LOG_SILENT: '1' }, include: ['test/**/*.test.ts', '../bench/**/*.vtest.ts'] } });
