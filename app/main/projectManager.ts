import crypto from 'node:crypto';
import fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import { DatabaseProvider } from './persistence/database';
import type { DatabaseProviderOptions } from './persistence/database';
import { ensureMigrations } from './persistence/migrations';
import type { AttachmentResult } from '../../shared/types';

const PROJECT_EXTENSION = '.vitni';
const SUBDIRECTORIES = [
  'db',
  'attachments',
  'sources',
  'thumbnails',
  'exports',
  'snapshots',
  'transforms_logs',
  'cache',
  'tmp'
];

const RECENT_PROJECTS_FILENAME = 'recent.json';
const DEFAULT_PROJECT_NAME = 'Scratch Investigation';

export interface RecentProjectEntry {
  root: string;
  name: string;
  lastOpenedAt: number;
}

export interface ProjectManifest {
  name: string;
  id: string;
  created_at: number;
  updated_at: number;
  schema_version: number;
  app_version: string;
  encryption: {
    driver: 'sqlcipher';
    kdf: string;
    key_source: string;
  };
  paths: {
    db: string;
    attachments: string;
    sources: string;
    thumbnails: string;
    exports: string;
    snapshots: string;
    logs: string;
    cache: string;
    tmp: string;
  };
}

interface ProjectContext {
  root: string;
  manifest: ProjectManifest;
  dbProvider: DatabaseProvider;
}

export class ProjectManager {
  private current: ProjectContext | null = null;
  private readonly baseDir: string;
  private readonly recentProjectsPath: string;
  private readonly maxRecentProjects = 10;
  private readonly encryptionKey?: string | null;

  constructor(baseDir: string, encryptionKey?: string | null) {
    this.baseDir = baseDir;
    this.encryptionKey = encryptionKey ?? null;
    this.recentProjectsPath = path.join(this.baseDir, RECENT_PROJECTS_FILENAME);
  }

  async initialize(): Promise<void> {
    await fsp.mkdir(this.baseDir, { recursive: true });
    await this.ensureRecentProjectsFile();

    if (!(await this.tryOpenMostRecentProject())) {
      const scratchDir = path.join(this.baseDir, 'scratch');
      const scratchRoot = path.join(scratchDir, `${sanitizeFileName(DEFAULT_PROJECT_NAME)}${PROJECT_EXTENSION}`);
      if (!fs.existsSync(scratchRoot)) {
        await this.createProject(scratchRoot, DEFAULT_PROJECT_NAME);
      } else {
        await this.openProject(scratchRoot);
      }
    }
  }

  getDatabase() {
    if (!this.current) {
      throw new Error('No project is currently open');
    }
    return this.current.dbProvider.connection;
  }

  getManifest(): ProjectManifest {
    if (!this.current) {
      throw new Error('No project is currently open');
    }
    return this.current.manifest;
  }

  getRoot(): string {
    if (!this.current) {
      throw new Error('No project is currently open');
    }
    return this.current.root;
  }

  async createProject(rootPath: string, projectName?: string, encryptionKey?: string | null) {
    const root = ensureProjectExtension(rootPath);
    const name = projectName ?? path.basename(root, PROJECT_EXTENSION);

    await fsp.mkdir(root, { recursive: true });
    for (const sub of SUBDIRECTORIES) {
      await fsp.mkdir(path.join(root, sub), { recursive: true });
    }

    const manifest: ProjectManifest = {
      name,
      id: crypto.randomUUID(),
      created_at: Date.now(),
      updated_at: Date.now(),
      schema_version: 1,
      app_version: app.getVersion(),
      encryption: {
        driver: 'sqlcipher',
        kdf: 'PBKDF2',
        key_source: encryptionKey ? 'passphrase' : `env:${process.env.PI_DB_KEY ? 'PI_DB_KEY' : 'unknown'}`
      },
      paths: {
        db: path.posix.join('db', 'case.sqlite'),
        attachments: 'attachments',
        sources: 'sources',
        thumbnails: 'thumbnails',
        exports: 'exports',
        snapshots: 'snapshots',
        logs: 'transforms_logs',
        cache: 'cache',
        tmp: 'tmp'
      }
    } satisfies ProjectManifest;

    await writeJSONAtomic(path.join(root, 'manifest.json'), manifest);
    await this.ensureGitignore(root);

    return this.openProject(root, encryptionKey ?? this.encryptionKey, manifest);
  }

  async openProject(rootPath: string, encryptionKey?: string | null, manifestOverride?: ProjectManifest) {
    await this.closeProject();

    const manifestPath = path.join(rootPath, 'manifest.json');
    const manifest = manifestOverride ?? JSON.parse(await fsp.readFile(manifestPath, 'utf8'));

    await this.ensureProjectStructure(rootPath, manifest);
    await this.acquireLock(rootPath);

    const dbPath = path.join(rootPath, manifest.paths.db);
    const providerOptions: DatabaseProviderOptions = {
      dbPath,
      encryptionKey: encryptionKey ?? this.encryptionKey ?? null
    };
    const dbProvider = new DatabaseProvider(providerOptions);
    await ensureMigrations(dbProvider);

    this.current = { root: rootPath, manifest, dbProvider };
    await this.recordRecentProject({ root: rootPath, name: manifest.name, lastOpenedAt: Date.now() });
    return { root: rootPath, manifest };
  }

  async closeProject() {
    if (!this.current) return;

    const { root, dbProvider } = this.current;
    try {
      try {
        dbProvider.connection.pragma('wal_checkpoint(FULL)');
      } catch (error) {
        console.warn('[ProjectManager] Failed to checkpoint before closing project', error);
      }
      dbProvider.close();
    } finally {
      await this.releaseLock(root);
      this.current = null;
    }
  }

  async saveAs(targetPath: string) {
    if (!this.current) {
      throw new Error('No project is currently open');
    }

    const previousContext = this.current;
    try {
      previousContext.dbProvider.connection.pragma('wal_checkpoint(FULL)');
    } catch (error) {
      console.warn('[ProjectManager] Failed to checkpoint database before Save As', error);
    }

    const targetRoot = ensureProjectExtension(targetPath);
    await fsp.mkdir(path.dirname(targetRoot), { recursive: true });

    if (fs.existsSync(targetRoot)) {
      throw new Error(`Destination already exists: ${targetRoot}`);
    }

    await this.closeProject();

    try {
      await fsp.cp(previousContext.root, targetRoot, { recursive: true });
      await this.cleanupLock(path.join(targetRoot, '.lock'));
      await this.openProject(targetRoot);
      return targetRoot;
    } catch (error) {
      console.error('[ProjectManager] Save As failed, attempting to reopen original project', error);
      await this.openProject(previousContext.root, this.encryptionKey ?? null, previousContext.manifest);
      throw error;
    }
  }

  async attachFile(buffer: Buffer, originalName: string, mimeType: string): Promise<AttachmentResult> {
    if (!this.current) {
      throw new Error('No project is currently open');
    }

    const hash = sha256(buffer);
    const ext = deriveExtension(originalName, mimeType);
    const relativePath = path.join(
      this.current.manifest.paths.attachments,
      hash.slice(0, 2),
      hash.slice(2, 4),
      `${hash}${ext}`
    );
    const absolutePath = path.join(this.current.root, relativePath);

    await fsp.mkdir(path.dirname(absolutePath), { recursive: true });

    if (!fs.existsSync(absolutePath)) {
      await fsp.writeFile(absolutePath, buffer, { flag: 'wx' }).catch(async (error: NodeJS.ErrnoException) => {
        if (error.code !== 'EEXIST') throw error;
      });
    }

    return { hash, relativePath: toProjectRelative(relativePath), absolutePath, mimeType };
  }

  getAbsolutePath(relativePath: string): string {
    if (!this.current) {
      throw new Error('No project is currently open');
    }
    return path.join(this.current.root, relativePath);
  }

  async readAttachment(relativePath: string): Promise<Buffer> {
    if (!this.current) {
      throw new Error('No project is currently open');
    }

    const manifest = this.current.manifest;
    const attachmentsRoot = path.resolve(this.current.root, manifest.paths.attachments);
    const absolutePath = path.resolve(this.current.root, relativePath);

    const relativeToAttachments = path.relative(attachmentsRoot, absolutePath);
    if (relativeToAttachments.startsWith('..') || path.isAbsolute(relativeToAttachments)) {
      throw new Error('Attachment path is outside of the project attachments directory');
    }

    return await fsp.readFile(absolutePath);
  }

  private async ensureRecentProjectsFile() {
    try {
      await fsp.access(this.recentProjectsPath, fs.constants.F_OK);
    } catch {
      await writeJSONAtomic(this.recentProjectsPath, [] as RecentProjectEntry[]);
    }
  }

  private async tryOpenMostRecentProject(): Promise<boolean> {
    try {
      const raw = await fsp.readFile(this.recentProjectsPath, 'utf8');
      const entries = JSON.parse(raw) as RecentProjectEntry[];
      if (!entries?.length) return false;

      for (const entry of entries) {
        if (fs.existsSync(entry.root)) {
          try {
            await this.openProject(entry.root);
            return true;
          } catch (error) {
            console.warn(`[ProjectManager] Failed to open recent project ${entry.root}:`, error);
          }
        }
      }
      return false;
    } catch (error) {
      console.warn('[ProjectManager] Could not read recent projects list', error);
      return false;
    }
  }

  async getRecentProjects(): Promise<RecentProjectEntry[]> {
    try {
      await this.ensureRecentProjectsFile();
      const raw = await fsp.readFile(this.recentProjectsPath, 'utf8');
      const entries = JSON.parse(raw) as RecentProjectEntry[];
      // Filter out projects that no longer exist
      return entries.filter((entry) => fs.existsSync(entry.root));
    } catch (error) {
      console.warn('[ProjectManager] Failed to read recent projects', error);
      return [];
    }
  }

  private async recordRecentProject(entry: RecentProjectEntry) {
    await this.ensureRecentProjectsFile();
    const raw = await fsp.readFile(this.recentProjectsPath, 'utf8');
    const entries = (JSON.parse(raw) as RecentProjectEntry[]).filter((item) => item.root !== entry.root);
    entries.unshift(entry);
    await writeJSONAtomic(this.recentProjectsPath, entries.slice(0, this.maxRecentProjects));
  }

  private async ensureProjectStructure(root: string, manifest: ProjectManifest) {
    for (const sub of SUBDIRECTORIES) {
      const dir = path.join(root, sub);
      await fsp.mkdir(dir, { recursive: true });
    }

    const dbDir = path.dirname(path.join(root, manifest.paths.db));
    await fsp.mkdir(dbDir, { recursive: true });
    await this.ensureGitignore(root);
  }

  private async ensureGitignore(root: string) {
    const gitignorePath = path.join(root, '.gitignore');
    const content = `db/case.sqlite\n` +
      `db/*.wal\n` +
      `db/*.shm\n` +
      `cache/\n` +
      `tmp/\n` +
      `thumbnails/\n` +
      `sources/*.txt\n`;

    try {
      await fsp.writeFile(gitignorePath, content, { flag: 'wx' });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private async acquireLock(root: string) {
    const lockPath = path.join(root, '.lock');
    try {
      const existing = await fsp.readFile(lockPath, 'utf8');
      const parsed = JSON.parse(existing) as { pid?: number; ts?: number };
      if (parsed?.pid && isProcessAlive(parsed.pid) && parsed.pid !== process.pid) {
        throw new Error(`Project is currently locked by process ${parsed.pid}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('[ProjectManager] Unable to read existing lock file; continuing', error);
      }
    }

    await writeJSONAtomic(lockPath, { pid: process.pid, ts: Date.now() });
  }

  private async releaseLock(root: string) {
    const lockPath = path.join(root, '.lock');
    await this.cleanupLock(lockPath);
  }

  private async cleanupLock(lockPath: string) {
    try {
      await fsp.unlink(lockPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('[ProjectManager] Failed to remove lock file', error);
      }
    }
  }
}

function ensureProjectExtension(targetPath: string): string {
  if (targetPath.endsWith(PROJECT_EXTENSION)) {
    return targetPath;
  }
  return `${targetPath}${PROJECT_EXTENSION}`;
}

function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function deriveExtension(originalName: string, mimeType: string): string {
  const fromName = path.extname(originalName);
  if (fromName) return fromName.toLowerCase();

  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType.startsWith('image/')) return `.${mimeType.split('/')[1]}`;
  return '';
}

function toProjectRelative(relativePath: string) {
  return relativePath.split(path.sep).join(path.posix.sep);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-');
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH';
  }
}

async function writeJSONAtomic(file: string, data: unknown) {
  const tmp = `${file}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fsp.rename(tmp, file);
}

