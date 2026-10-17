/** @jest-environment node */
import { readFileSync } from 'fs';
import { join } from 'path';

describe('metro config', () => {
  it('keeps class names so Expo web modules do not collide after minification', () => {
    const source = readFileSync(join(__dirname, '../../metro.config.js'), 'utf8');
    expect(source).toMatch(/minifierConfig[^;]*keep_classnames:\s*true/);
  });
});
