import { execFileSync } from 'child_process';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function latestCommitTime(): string {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI'], { encoding: 'utf8' }).trim();
  } catch {
    return new Date().toISOString();
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __VERSION_UPDATED_AT__: JSON.stringify(latestCommitTime()),
  },
  server: { port: 3010, strictPort: true, host: true },
  build: { outDir: 'dist', sourcemap: false },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}', 'functions/**/*.test.{ts,tsx}'],
    css: true,
  },
});
