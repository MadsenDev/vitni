import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DB_KEY_ENV_VAR = 'PI_DB_KEY';

function resolveEncryptionKey(): string {
  const key = process.env[DB_KEY_ENV_VAR];
  if (!key || key.trim().length === 0) {
    throw new Error(
      `Missing SQLCipher key. Set the ${DB_KEY_ENV_VAR} environment variable before launching the application.`
    );
  }

  return key;
}

const DB_FILE_NAME = 'investigation.db';

export class DatabaseProvider {
  private db: Database.Database;

  constructor() {
    const appDataDir = path.join(os.homedir(), '.private-investigation-graph-tool');
    fs.mkdirSync(appDataDir, { recursive: true });

    const dbPath = path.join(appDataDir, DB_FILE_NAME);
    this.db = new Database(dbPath, {
      fileMustExist: false,
      verbose: process.env.DEBUG_SQL === '1' ? console.log : undefined
    });

    const encryptionKey = resolveEncryptionKey();

    this.db.pragma(`key = ${JSON.stringify(encryptionKey)}`);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma("cipher_default_kdf_iter = 256000");
  }

  get connection(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }
}

export type DbConnection = Database.Database;
