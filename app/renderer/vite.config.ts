import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function readDevServerPort() {
  const configPath = path.resolve(__dirname, '../../.vitni-dev-server.json');

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as { port?: number };

    if (typeof parsed.port === 'number' && Number.isInteger(parsed.port)) {
      return parsed.port;
    }
  } catch {
    // Fall back to the default when the resolver has not run yet.
  }

  return 5173;
}

export default defineConfig({
  root: __dirname,
  base: './',
  plugins: [react()],
  server: {
    port: readDevServerPort(),
    strictPort: true
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, '../../shared')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: path.resolve(__dirname, 'src/setupTests.ts')
  }
});
