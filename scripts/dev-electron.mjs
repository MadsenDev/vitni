import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const statePath = path.join(repoRoot, '.vitni-dev-server.json');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readRendererUrl() {
  const raw = fs.readFileSync(statePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!parsed.url || typeof parsed.url !== 'string') {
    throw new Error(`Missing dev server URL in ${statePath}.`);
  }

  return parsed.url;
}

async function waitForFile(filePath, timeoutMs) {
  const start = Date.now();

  while (!fs.existsSync(filePath)) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for ${filePath}.`);
    }
    await sleep(250);
  }
}

async function waitForHttp(url, timeoutMs) {
  const start = Date.now();
  const client = url.startsWith('https:') ? https : http;

  while (true) {
    try {
      await new Promise((resolve, reject) => {
        const request = client.get(url, (response) => {
          response.resume();
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 500) {
            resolve(undefined);
            return;
          }
          reject(new Error(`Unexpected status code ${response.statusCode ?? 'unknown'}.`));
        });

        request.on('error', reject);
        request.setTimeout(1000, () => {
          request.destroy(new Error('Timed out waiting for dev server response.'));
        });
      });
      return;
    } catch {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timed out waiting for ${url}.`);
      }
      await sleep(500);
    }
  }
}

const rendererUrl = readRendererUrl();
const timeoutMs = 60_000;

await Promise.all([
  waitForFile(path.join(repoRoot, 'dist/main/app/main/main.js'), timeoutMs),
  waitForFile(path.join(repoRoot, 'dist/preload/app/preload/preload.js'), timeoutMs),
  waitForHttp(rendererUrl, timeoutMs)
]);

const electronBinary =
  process.platform === 'win32'
    ? path.join(repoRoot, 'node_modules', '.bin', 'electron.cmd')
    : path.join(repoRoot, 'node_modules', '.bin', 'electron');

const child = spawn(electronBinary, ['.'], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PI_DB_KEY: 'dev-key-123',
    VITNI_DEV_SERVER_URL: rendererUrl
  }
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
