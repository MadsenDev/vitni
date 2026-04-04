import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { DbConnection, DatabaseProvider } from './database';

interface Migration {
  id: number;
  name: string;
  sql: string;
}

function resolveMigrationsDir(): string {
  const candidates = [
    path.resolve(__dirname, '../../../../../db/migrations'),
    path.resolve(app.getAppPath(), 'db/migrations'),
    path.resolve(process.cwd(), 'db/migrations')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1];
}

const MIGRATIONS_DIR = resolveMigrationsDir();

function readMigrations(): Migration[] {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  return files.map((file, index) => ({
    id: index + 1,
    name: file,
    sql: fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
  }));
}

function ensureMigrationTable(db: DbConnection) {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS migration (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )`
  ).run();
}

function wasApplied(db: DbConnection, migration: Migration): boolean {
  const row = db
    .prepare('SELECT 1 FROM migration WHERE id = ? AND name = ? LIMIT 1')
    .get(migration.id, migration.name);
  return Boolean(row);
}

export async function ensureMigrations(provider: DatabaseProvider): Promise<void> {
  const db = provider.connection;
  ensureMigrationTable(db);
  const migrations = readMigrations();

  const now = Math.floor(Date.now() / 1000);

  const apply = db.transaction((migration: Migration) => {
    db.exec(migration.sql);
    db.prepare('INSERT INTO migration (id, name, applied_at) VALUES (?, ?, ?)').run(
      migration.id,
      migration.name,
      now
    );
  });

  for (const migration of migrations) {
    if (!wasApplied(db, migration)) {
      apply(migration);
    }
  }
}
