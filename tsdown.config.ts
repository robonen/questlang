import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: 'src/index.ts',
    dts: true,
  },
  {
    entry: 'src/cli.ts',
    noExternal: ['@clack/prompts'],
  },
]);