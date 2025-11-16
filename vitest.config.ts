import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      exclude: ['src/cli.ts', 'dist/', 'node_modules/'],
    },
  },
});
