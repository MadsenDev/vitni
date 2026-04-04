import { app } from 'electron';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import * as fsp from 'node:fs/promises';

type DeviceSettingsRecord = Record<string, unknown>;
const DEVICE_DB_ENCRYPTION_KEY_SETTING = 'security.db_encryption_key';

class DeviceSettingsService {
  private getSettingsPath() {
    return path.join(app.getPath('userData'), 'device-settings.json');
  }

  private async readAll(): Promise<DeviceSettingsRecord> {
    try {
      const raw = await fsp.readFile(this.getSettingsPath(), 'utf8');
      const parsed = JSON.parse(raw) as DeviceSettingsRecord;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private async writeAll(settings: DeviceSettingsRecord): Promise<void> {
    await fsp.mkdir(path.dirname(this.getSettingsPath()), { recursive: true });
    await fsp.writeFile(this.getSettingsPath(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const settings = await this.readAll();
    return (settings[key] as T | undefined) ?? null;
  }

  async set(key: string, value: unknown): Promise<void> {
    const settings = await this.readAll();
    settings[key] = value ?? null;
    await this.writeAll(settings);
  }

  async getOrCreateDatabaseEncryptionKey(): Promise<string> {
    const existing = await this.get<string>(DEVICE_DB_ENCRYPTION_KEY_SETTING);
    if (typeof existing === 'string' && existing.trim().length > 0) {
      return existing;
    }

    const created = randomBytes(32).toString('hex');
    await this.set(DEVICE_DB_ENCRYPTION_KEY_SETTING, created);
    return created;
  }
}

export const deviceSettingsService = new DeviceSettingsService();
