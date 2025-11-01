import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export class OllamaManager {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private readyCheckInFlight: Promise<boolean> | null = null;

  async isAvailable(endpoint: string): Promise<boolean> {
    try {
      const res = await fetch(`${endpoint.replace(/\/$/, '')}/api/tags`, { method: 'GET' } as any);
      return res.ok;
    } catch {
      return false;
    }
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
        } catch {}
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
          return c;
        }
      } catch {}
    }
    return null;
  }

  async ensure(endpoint: string): Promise<boolean> {
    if (await this.isAvailable(endpoint)) return true;
    if (this.proc && !this.proc.killed) {
      return await this.waitUntilReady(endpoint, 8000);
    }
    const bin = this.getResolvedBinary();
    if (!bin) return false;
    try {
      this.proc = spawn(bin, ['serve'], { stdio: 'ignore', detached: false });
      this.proc.on('error', () => {
        try { this.proc && !this.proc.killed && this.proc.kill('SIGTERM'); } catch {}
        this.proc = null;
      });
    } catch {
      this.proc = null;
      return false;
    }
    return await this.waitUntilReady(endpoint, 12000);
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
      // ignore
    } finally {
      this.proc = null;
    }
  }
}

export const ollamaManager = new OllamaManager();
