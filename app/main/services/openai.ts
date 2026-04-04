import { app, safeStorage } from 'electron';
import path from 'node:path';
import * as fsp from 'node:fs/promises';

interface OpenAIResponsesGenerateOptions {
  model: string;
  instructions?: string;
  input: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface OpenAIKeyStatus {
  storageAvailable: boolean;
  hasStoredKey: boolean;
  hasEnvKey: boolean;
  hasKey: boolean;
  storageMode: 'encrypted' | 'plaintext' | 'none';
}

class OpenAIService {
  private getEncryptedKeyPath() {
    return path.join(app.getPath('userData'), 'openai-api-key.bin');
  }

  private getPlaintextKeyPath() {
    return path.join(app.getPath('userData'), 'openai-api-key.txt');
  }

  async getStatus(): Promise<OpenAIKeyStatus> {
    const storageAvailable = safeStorage.isEncryptionAvailable();
    const hasEncryptedKey = await fsp
      .access(this.getEncryptedKeyPath())
      .then(() => true)
      .catch(() => false);
    const hasPlaintextKey = await fsp
      .access(this.getPlaintextKeyPath())
      .then(() => true)
      .catch(() => false);
    const hasStoredKey = hasEncryptedKey || hasPlaintextKey;
    const hasEnvKey = typeof process.env.OPENAI_API_KEY === 'string' && process.env.OPENAI_API_KEY.trim().length > 0;
    const storageMode = hasEncryptedKey ? 'encrypted' : hasPlaintextKey ? 'plaintext' : 'none';
    return {
      storageAvailable,
      hasStoredKey,
      hasEnvKey,
      hasKey: hasStoredKey || hasEnvKey,
      storageMode
    };
  }

  async setApiKey(apiKey: string): Promise<void> {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      throw new Error('API key is required.');
    }
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(trimmed);
      await fsp.writeFile(this.getEncryptedKeyPath(), encrypted);
      await fsp.rm(this.getPlaintextKeyPath(), { force: true });
      return;
    }
    await fsp.writeFile(this.getPlaintextKeyPath(), `${trimmed}\n`, 'utf8');
    await fsp.rm(this.getEncryptedKeyPath(), { force: true });
  }

  async clearApiKey(): Promise<void> {
    await Promise.all([
      fsp.rm(this.getEncryptedKeyPath(), { force: true }),
      fsp.rm(this.getPlaintextKeyPath(), { force: true })
    ]);
  }

  private async resolveApiKey(): Promise<string | null> {
    const envKey = process.env.OPENAI_API_KEY?.trim();
    if (envKey) {
      return envKey;
    }
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const encrypted = await fsp.readFile(this.getEncryptedKeyPath());
        return safeStorage.decryptString(encrypted).trim();
      } catch {
        // fall through
      }
    }
    try {
      const plaintext = await fsp.readFile(this.getPlaintextKeyPath(), 'utf8');
      return plaintext.trim() || null;
    } catch {
      return null;
    }
  }

  async generateText({
    model,
    instructions,
    input,
    maxOutputTokens = 1400,
    timeoutMs = 45000
  }: OpenAIResponsesGenerateOptions): Promise<string> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          instructions,
          input,
          max_output_tokens: maxOutputTokens
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(body ? `HTTP ${response.status}: ${body}` : `HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        output_text?: string;
        output?: Array<{
          content?: Array<{ type?: string; text?: string }>;
        }>;
      };

      const direct = data.output_text?.trim();
      if (direct) {
        return direct;
      }

      const fragments: string[] = [];
      for (const item of data.output ?? []) {
        for (const content of item.content ?? []) {
          if (content.type === 'output_text' || content.type === 'text') {
            const text = content.text?.trim();
            if (text) {
              fragments.push(text);
            }
          }
        }
      }

      const combined = fragments.join('\n\n').trim();
      if (!combined) {
        throw new Error('OpenAI returned an empty response.');
      }
      return combined;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const openAIService = new OpenAIService();
