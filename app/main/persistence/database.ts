import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DB_KEY_ENV_VAR = 'PI_DB_KEY';

function resolveEncryptionKey(explicitKey?: string | null): string {
  const key = explicitKey ?? process.env[DB_KEY_ENV_VAR];
  if (!key || key.trim().length === 0) {
    throw new Error(
      `Missing SQLCipher key. Set the ${DB_KEY_ENV_VAR} environment variable before launching the application.`
    );
  }

  return key;
}

export interface DatabaseProviderOptions {
  dbPath: string;
  encryptionKey?: string | null;
}

export class DatabaseProvider {
  private db: Database.Database;

  constructor(private readonly options: DatabaseProviderOptions) {
    fs.mkdirSync(path.dirname(options.dbPath), { recursive: true });

    this.db = new Database(options.dbPath, {
      fileMustExist: false,
      verbose: process.env.DEBUG_SQL === '1' ? console.log : undefined
    });

    const encryptionKey = resolveEncryptionKey(options.encryptionKey);

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
