import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { app } from 'electron';

export class OllamaManager {
  private proc: ChildProcess | null = null;
  private readyCheckInFlight: Promise<boolean> | null = null;
  private lastStartError: string | null = null;

  async isAvailable(endpoint: string): Promise<boolean> {
    for (const candidate of this.endpointCandidates(endpoint)) {
      try {
        const res = await fetch(`${candidate.replace(/\/$/, '')}/api/tags`, { method: 'GET' });
        if (res.ok) return true;
      } catch {
        // try next candidate
      }
    }
    return false;
  }

  async listModelNames(endpoint: string): Promise<string[]> {
    for (const candidate of this.endpointCandidates(endpoint)) {
      try {
        const res = await fetch(`${candidate.replace(/\/$/, '')}/api/tags`, { method: 'GET' });
        if (!res.ok) continue;
        const data = (await res.json()) as { models?: Array<{ name: string }> };
        return (data.models || []).map((item) => item.name || '').filter(Boolean);
      } catch {
        // try next candidate
      }
    }
    return [];
  }

  async resolveReachableEndpoint(endpoint: string): Promise<string | null> {
    for (const candidate of this.endpointCandidates(endpoint)) {
      try {
        const res = await fetch(`${candidate.replace(/\/$/, '')}/api/tags`, { method: 'GET' });
        if (res.ok) return candidate;
      } catch {
        // try next candidate
      }
    }
    return null;
  }

  private getBundledPath(): string | null {
    const userData = app.getPath('userData');
    const ollamaDir = path.join(userData, 'ollama');
    if (process.platform === 'win32') {
      const exe = path.join(ollamaDir, 'ollama.exe');
      if (fs.existsSync(exe)) return exe;
    } else {
      const bin = path.join(ollamaDir, 'ollama');
      if (fs.existsSync(bin)) {
        try {
          fs.chmodSync(bin, 0o755);
          return bin;
        } catch {
          // If chmod fails we can still fall back to another resolved binary.
        }
      }
    }
    return null;
  }

  getResolvedBinary(): string | null {
    // Prefer bundled/local copy if available
    const bundled = this.getBundledPath();
    if (bundled) return bundled;
    // Fallback to system PATH
    const candidates: string[] = [];
    if (process.platform === 'win32') {
      const localApp = process.env.LOCALAPPDATA || '';
      candidates.push(path.join(localApp, 'Programs', 'Ollama', 'ollama.exe'));
      candidates.push('ollama.exe');
    } else if (process.platform === 'darwin') {
      candidates.push('/usr/local/bin/ollama');
      candidates.push('/opt/homebrew/bin/ollama');
      candidates.push('ollama');
    } else {
      candidates.push('/usr/bin/ollama');
      candidates.push('/usr/local/bin/ollama');
      candidates.push('ollama');
    }
    for (const c of candidates) {
      try {
        if (path.isAbsolute(c)) {
          if (fs.existsSync(c)) return c;
        } else {
          const resolved = this.findInPath(c);
          if (resolved) return resolved;
        }
      } catch {
        // Ignore malformed candidates and continue resolving the executable.
      }
    }
    return null;
  }

  private findInPath(binaryName: string): string | null {
    const rawPath = process.env.PATH || '';
    const segments = rawPath.split(path.delimiter).filter(Boolean);
    const executableNames =
      process.platform === 'win32'
        ? [binaryName, `${binaryName}.exe`, `${binaryName}.cmd`, `${binaryName}.bat`]
        : [binaryName];

    for (const segment of segments) {
      for (const executableName of executableNames) {
        const candidate = path.join(segment, executableName);
        try {
          fs.accessSync(candidate, fs.constants.X_OK);
          return candidate;
        } catch {
          // Ignore missing or non-executable PATH entries.
        }
      }
    }

    // Flatpak and some shells expose additional bins outside PATH inherited by Electron.
    if (process.platform !== 'win32') {
      for (const candidate of [
        path.join(os.homedir(), '.local', 'bin', binaryName),
        path.join('/var/lib/flatpak/exports/bin', binaryName)
      ]) {
        try {
          fs.accessSync(candidate, fs.constants.X_OK);
          return candidate;
        } catch {
          // Ignore optional fallback locations that are not present.
        }
      }
    }

    return null;
  }

  getLastStartError() {
    return this.lastStartError;
  }

  async ensure(endpoint: string): Promise<boolean> {
    if (await this.isAvailable(endpoint)) return true;
    if (this.proc && !this.proc.killed) {
      return await this.waitUntilReady(endpoint, 8000);
    }
    const bin = this.getResolvedBinary();
    if (!bin) return false;
    try {
      this.lastStartError = null;
      const host = this.endpointToHost(endpoint);
      this.proc = spawn(bin, ['serve'], {
        stdio: ['ignore', 'ignore', 'pipe'],
        detached: false,
        env: {
          ...process.env,
          OLLAMA_HOST: host
        }
      });
      let stderr = '';
      this.proc.stderr?.on('data', (chunk) => {
        stderr = `${stderr}\n${chunk.toString()}`.trim().slice(-2000);
      });
      this.proc.on('error', () => {
        this.lastStartError = stderr || `Failed to launch Ollama from ${bin}`;
        try {
          this.proc && !this.proc.killed && this.proc.kill('SIGTERM');
        } catch {
          // Ignore cleanup failures while surfacing the launch error.
        }
        this.proc = null;
      });
      this.proc.on('exit', (code) => {
        if (code !== 0 && !this.lastStartError) {
          this.lastStartError = stderr || `Ollama exited with code ${code ?? 1}`;
        }
        this.proc = null;
      });
    } catch {
      this.lastStartError = `Failed to spawn Ollama from ${bin}`;
      this.proc = null;
      return false;
    }
    const ready = await this.waitUntilReady(endpoint, 12000);
    if (!ready && this.lastStartError && String(this.lastStartError).toLowerCase().includes('address already in use')) {
      const existingReady = await this.waitUntilReady(endpoint, 12000);
      if (existingReady) {
        this.lastStartError = null;
        return true;
      }
    }
    if (!ready && !this.lastStartError) {
      this.lastStartError = `Ollama did not become ready at ${endpoint}`;
    }
    return ready || false;
  }

  private endpointToHost(endpoint: string) {
    try {
      const url = new URL(endpoint);
      if (url.hostname === 'localhost') {
        return `127.0.0.1:${url.port || '11434'}`;
      }
      return url.host;
    } catch {
      return '127.0.0.1:11434';
    }
  }

  private endpointCandidates(endpoint: string) {
    const candidates = new Set<string>([endpoint]);
    try {
      const url = new URL(endpoint);
      if (url.hostname === 'localhost') {
        const ipv4 = new URL(endpoint);
        ipv4.hostname = '127.0.0.1';
        candidates.add(ipv4.toString());
      } else if (url.hostname === '127.0.0.1') {
        const localhost = new URL(endpoint);
        localhost.hostname = 'localhost';
        candidates.add(localhost.toString());
      }
    } catch {
      // ignore
    }
    return Array.from(candidates);
  }

  private async waitUntilReady(endpoint: string, timeoutMs: number): Promise<boolean> {
    if (this.readyCheckInFlight) return this.readyCheckInFlight;
    this.readyCheckInFlight = new Promise<boolean>((resolve) => {
      const started = Date.now();
      const tick = async () => {
        const ok = await this.isAvailable(endpoint);
        if (ok) return resolve(true);
        if (Date.now() - started > timeoutMs) return resolve(false);
        setTimeout(tick, 400);
      };
      tick();
    }).finally(() => { this.readyCheckInFlight = null; });
    return this.readyCheckInFlight;
  }

  stop() {
    try {
      if (this.proc && !this.proc.killed) {
        this.proc.kill('SIGTERM');
      }
    } catch {
      // Ignore stop failures during shutdown cleanup.
    } finally {
      this.proc = null;
    }
  }
}

export const ollamaManager = new OllamaManager();
