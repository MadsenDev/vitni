import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

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
