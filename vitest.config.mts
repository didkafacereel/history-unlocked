import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Tests run in plain Node, not in a React Native environment.
 *
 * Everything under test here is pure: date arithmetic, the headline cutter,
 * the article matcher, the choice shuffler. None of it imports `react-native`
 * or an `expo-*` module, so none of it needs `jest-expo` and the suite starts
 * in well under a second. Component tests, if they are ever wanted, would need
 * that preset and belong in a separate project.
 *
 * `.mts` rather than `.ts`: the package is CommonJS, so Vite's native config
 * loader refuses ESM syntax in a plain `.ts` config.
 */
const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(here, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
