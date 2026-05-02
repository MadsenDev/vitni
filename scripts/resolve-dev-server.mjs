import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const statePath = path.join(repoRoot, '.vitni-dev-server.json');
const defaultPort = parsePort(process.env.VITNI_DEV_PORT) ?? 5173;

function parsePort(value) {
  if (!value) {
    return null;
  }

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  return port;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port);
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`Unable to find an available dev server port starting at ${startPort}.`);
}

function readState() {
  try {
    const raw = fs.readFileSync(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    const port = parsePort(parsed.port);

    if (!port) {
      return null;
    }

    return {
      port,
      url: `http://localhost:${port}`
    };
  } catch {
    return null;
  }
}

function writeState(state) {
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

async function ensureState() {
  const port = await findAvailablePort(defaultPort);
  const state = {
    port,
    url: `http://localhost:${port}`
  };

  writeState(state);
  return state;
}

const command = process.argv[2] ?? 'ensure';
const state = await ensureState();

if (command === 'port') {
  process.stdout.write(String(state.port));
} else if (command === 'url') {
  process.stdout.write(state.url);
} else {
  process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
}
