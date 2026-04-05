import crypto from 'node:crypto';
import fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import { DatabaseProvider } from './persistence/database';
import type { DatabaseProviderOptions } from './persistence/database';
import { ensureMigrations } from './persistence/migrations';
import type { AttachmentResult, MediaFolderNode, MediaLibraryItem, SourceRecord } from '../../shared/types';

/**
 * ProjectManager owns the on-disk case layout and the currently-open project.
 *
 * The rest of the main process talks to this service instead of reaching into
 * manifests, SQLite files, or attachment/media folders directly.
 */
const PROJECT_EXTENSION = '.vitni';
const SUBDIRECTORIES = [
  'db',
  'attachments',
  'media',
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
    media: string;
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

interface SourceRow extends SourceRecord {}

type MediaUploadPayload = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  folderPath?: string;
  title?: string | null;
  kind?: string;
};

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
    // Boot always leaves the app with a live project so the renderer can load
    // against a stable root without special "no project yet" branches.
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
      schema_version: 2,
      app_version: app.getVersion(),
      encryption: {
        driver: 'sqlcipher',
        kdf: 'PBKDF2',
        key_source: encryptionKey ? 'passphrase' : `env:${process.env.PI_DB_KEY ? 'PI_DB_KEY' : 'unknown'}`
      },
      paths: {
        db: path.posix.join('db', 'case.sqlite'),
        attachments: 'attachments',
        media: 'media',
        sources: 'sources',
        thumbnails: 'thumbnails',
        exports: 'exports',
        snapshots: 'snapshots',
        logs: 'transforms_logs',
        cache: 'cache',
        tmp: 'tmp'
      }
    };

    await writeJSONAtomic(path.join(root, 'manifest.json'), manifest);
    await this.ensureGitignore(root);

    return this.openProject(root, encryptionKey ?? this.encryptionKey, manifest);
  }

  async openProject(rootPath: string, encryptionKey?: string | null, manifestOverride?: ProjectManifest) {
    // Swapping the current project happens in one place so DB access,
    // attachment helpers, and recent-project bookkeeping stay consistent.
    await this.closeProject();

    const manifestPath = path.join(rootPath, 'manifest.json');
    const manifest = this.normalizeManifest(manifestOverride ?? JSON.parse(await fsp.readFile(manifestPath, 'utf8')));

    await this.ensureProjectStructure(rootPath, manifest);
    await this.acquireLock(rootPath);

    const dbPath = path.join(rootPath, manifest.paths.db);
    const providerOptions: DatabaseProviderOptions = {
      dbPath,
      encryptionKey: encryptionKey ?? this.encryptionKey ?? null
    };
    let dbProvider = new DatabaseProvider(providerOptions);
    dbProvider = await this.hydrateSeedDatabaseIfNeeded(rootPath, manifest, providerOptions, dbProvider);
    await ensureMigrations(dbProvider);

    this.current = { root: rootPath, manifest, dbProvider };
    await this.persistManifest(rootPath, manifest);
    await this.migrateLegacyMediaIfNeeded();
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

  async uploadMedia(payload: MediaUploadPayload): Promise<MediaLibraryItem> {
    if (!this.current) {
      throw new Error('No project is currently open');
    }

    const db = this.current.dbProvider.connection;
    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();
    const folderPath = normalizeFolderPath(payload.folderPath ?? '');
    const mediaRoot = path.join(this.current.root, this.current.manifest.paths.media);
    const targetDir = path.join(mediaRoot, folderPath);
    await fsp.mkdir(targetDir, { recursive: true });

    const hash = sha256(payload.buffer);
    const ext = deriveExtension(payload.fileName, payload.mimeType);
    const baseName = sanitizeFileStem(path.basename(payload.fileName, path.extname(payload.fileName)) || 'asset');
    const actualFileName = await ensureUniqueFileName(targetDir, `${baseName}${ext}`);
    const absolutePath = path.join(targetDir, actualFileName);
    await fsp.writeFile(absolutePath, payload.buffer);
    const stats = await fsp.stat(absolutePath);

    const locator = toProjectRelative(path.join(this.current.manifest.paths.media, folderPath, actualFileName));
    const title = payload.title?.trim() || null;
    const kind = payload.kind?.trim() || inferKindFromMime(payload.mimeType);

    db.prepare(
      `INSERT INTO source (
        id, kind, locator, title, added_at, hash, mime, folder_path, file_name, display_name, file_size, modified_at
      ) VALUES (
        @id, @kind, @locator, @title, @added_at, @hash, @mime, @folder_path, @file_name, @display_name, @file_size, @modified_at
      )`
    ).run({
      id,
      kind,
      locator,
      title,
      added_at: now,
      hash,
      mime: payload.mimeType || null,
      folder_path: folderPath || null,
      file_name: actualFileName,
      display_name: title ?? actualFileName,
      file_size: stats.size,
      modified_at: Math.floor(stats.mtimeMs / 1000)
    });

    const created = this.getMediaLibraryItems().find((item) => item.id === id);
    if (!created) {
      throw new Error('Uploaded media could not be loaded');
    }
    return created;
  }

  async createMediaFolder(folderPath: string): Promise<MediaFolderNode> {
    if (!this.current) {
      throw new Error('No project is currently open');
    }

    const normalized = normalizeFolderPath(folderPath);
    if (!normalized) {
      throw new Error('Folder path is required');
    }

    const absolute = path.join(this.current.root, this.current.manifest.paths.media, normalized);
    await fsp.mkdir(absolute, { recursive: true });
    return {
      path: normalized,
      name: path.posix.basename(normalized),
      parentPath: parentFolderPath(normalized)
    };
  }

  async renameMedia(sourceId: string, nextDisplayName: string, nextFileName?: string): Promise<boolean> {
    if (!this.current) {
      throw new Error('No project is currently open');
    }

    const db = this.current.dbProvider.connection;
    const source = db.prepare('SELECT * FROM source WHERE id = ?').get(sourceId) as SourceRow | undefined;
    if (!source) return false;

    const absolute = this.getAbsolutePath(source.locator);
    const folderPath = normalizeFolderPath(source.folder_path ?? inferFolderPathFromLocator(this.current.manifest.paths.media, source.locator));
    const directory = path.dirname(absolute);
    const desiredFileName = sanitizeMediaFileName(
      nextFileName?.trim() || buildRenamedFileName(nextDisplayName, source.file_name || path.basename(source.locator))
    );
    const finalFileName =
      desiredFileName === path.basename(absolute) ? desiredFileName : await ensureUniqueFileName(directory, desiredFileName);
    const nextAbsolute = path.join(directory, finalFileName);

    if (nextAbsolute !== absolute) {
      await fsp.rename(absolute, nextAbsolute);
    }

    const stats = await fsp.stat(nextAbsolute);
    const locator = toProjectRelative(path.join(this.current.manifest.paths.media, folderPath, finalFileName));
    const title = nextDisplayName.trim() || null;

    const result = db.prepare(
      `UPDATE source
       SET locator = @locator,
           title = @title,
           display_name = @display_name,
           file_name = @file_name,
           folder_path = @folder_path,
           modified_at = @modified_at,
           file_size = @file_size
       WHERE id = @id`
    ).run({
      id: sourceId,
      locator,
      title,
      display_name: title ?? finalFileName,
      file_name: finalFileName,
      folder_path: folderPath || null,
      modified_at: Math.floor(stats.mtimeMs / 1000),
      file_size: stats.size
    });

    return result.changes > 0;
  }

  async moveMedia(sourceIds: string[], destinationFolderPath: string): Promise<boolean> {
    if (!this.current) {
      throw new Error('No project is currently open');
    }
    if (sourceIds.length === 0) return true;

    const db = this.current.dbProvider.connection;
    const normalizedDestination = normalizeFolderPath(destinationFolderPath);
    const mediaRoot = path.join(this.current.root, this.current.manifest.paths.media);
    const destinationDir = path.join(mediaRoot, normalizedDestination);
    await fsp.mkdir(destinationDir, { recursive: true });

    for (const sourceId of sourceIds) {
      const source = db.prepare('SELECT * FROM source WHERE id = ?').get(sourceId) as SourceRow | undefined;
      if (!source) continue;

      const currentAbsolute = this.getAbsolutePath(source.locator);
      const desiredFileName = sanitizeMediaFileName(source.file_name || path.basename(source.locator));
      const finalFileName = await ensureUniqueFileName(destinationDir, desiredFileName);
      const nextAbsolute = path.join(destinationDir, finalFileName);
      if (currentAbsolute !== nextAbsolute) {
        await fsp.rename(currentAbsolute, nextAbsolute);
      }
      const stats = await fsp.stat(nextAbsolute);
      const locator = toProjectRelative(path.join(this.current.manifest.paths.media, normalizedDestination, finalFileName));

      db.prepare(
        `UPDATE source
         SET locator = @locator,
             folder_path = @folder_path,
             file_name = @file_name,
             modified_at = @modified_at,
             file_size = @file_size
         WHERE id = @id`
      ).run({
        id: sourceId,
        locator,
        folder_path: normalizedDestination || null,
        file_name: finalFileName,
        modified_at: Math.floor(stats.mtimeMs / 1000),
        file_size: stats.size
      });
    }

    return true;
  }

  async replaceMedia(
    sourceId: string,
    payload: { buffer: Buffer; fileName: string; mimeType: string }
  ): Promise<MediaLibraryItem> {
    if (!this.current) {
      throw new Error('No project is currently open');
    }

    const db = this.current.dbProvider.connection;
    const source = db.prepare('SELECT * FROM source WHERE id = ?').get(sourceId) as SourceRow | undefined;
    if (!source) {
      throw new Error(`Media source ${sourceId} was not found`);
    }

    const mediaRoot = path.join(this.current.root, this.current.manifest.paths.media);
    const folderPath = normalizeFolderPath(
      source.folder_path ?? inferFolderPathFromLocator(this.current.manifest.paths.media, source.locator)
    );
    const targetDir = path.join(mediaRoot, folderPath);
    await fsp.mkdir(targetDir, { recursive: true });

    const currentAbsolute = this.getAbsolutePath(source.locator);
    const currentFileName = source.file_name || path.basename(source.locator);
    const currentStem = path.basename(currentFileName, path.extname(currentFileName)) || 'asset';
    const nextExtension = deriveExtension(payload.fileName, payload.mimeType);
    const desiredFileName = sanitizeMediaFileName(`${currentStem}${nextExtension}`);
    const nextFileName =
      desiredFileName === currentFileName ? desiredFileName : await ensureUniqueFileName(targetDir, desiredFileName);
    const nextAbsolute = path.join(targetDir, nextFileName);

    await fsp.writeFile(nextAbsolute, payload.buffer);
    if (fs.existsSync(currentAbsolute) && currentAbsolute !== nextAbsolute) {
      await fsp.unlink(currentAbsolute).catch(() => undefined);
    }

    const stats = await fsp.stat(nextAbsolute);
    const locator = toProjectRelative(path.join(this.current.manifest.paths.media, folderPath, nextFileName));

    db.prepare(
      `UPDATE source
       SET locator = @locator,
           hash = @hash,
           mime = @mime,
           kind = @kind,
           folder_path = @folder_path,
           file_name = @file_name,
           modified_at = @modified_at,
           file_size = @file_size
       WHERE id = @id`
    ).run({
      id: sourceId,
      locator,
      hash: sha256(payload.buffer),
      mime: payload.mimeType || null,
      kind: inferKindFromMime(payload.mimeType),
      folder_path: folderPath || null,
      file_name: nextFileName,
      modified_at: Math.floor(stats.mtimeMs / 1000),
      file_size: stats.size
    });

    const updated = this.getMediaLibraryItems().find((item) => item.id === sourceId);
    if (!updated) {
      throw new Error('Replaced media could not be loaded');
    }
    return updated;
  }

  getMediaLibraryItems(): MediaLibraryItem[] {
    if (!this.current) {
      throw new Error('No project is currently open');
    }

    const db = this.current.dbProvider.connection;
    this.reconcileMediaIndex();

    const rows = db.prepare(
      `SELECT
         s.id,
         s.kind,
         s.locator,
         s.title,
         s.added_at,
         s.hash,
         s.mime,
         s.folder_path,
         s.file_name,
         s.display_name,
         s.file_size,
         s.modified_at,
         a.id AS assertion_id,
         a.subject_id AS assertion_subject_id,
         a.path AS assertion_path,
         e.label AS entity_label
       FROM source s
       LEFT JOIN assertion a ON a.source_id = s.id
       LEFT JOIN entity e ON e.id = a.subject_id
       WHERE s.hash IS NOT NULL AND s.locator IS NOT NULL
       ORDER BY COALESCE(s.modified_at, s.added_at) DESC, a.created_at DESC`
    ).all() as Array<SourceRow & {
      assertion_id: string | null;
      assertion_subject_id: string | null;
      assertion_path: string | null;
      entity_label: string | null;
    }>;

    const grouped = new Map<string, MediaLibraryItem>();

    for (const row of rows) {
      let entry = grouped.get(row.id);
      if (!entry) {
        const folderPath = normalizeFolderPath(row.folder_path ?? inferFolderPathFromLocator(this.current.manifest.paths.media, row.locator));
        const fileName = row.file_name || path.posix.basename(row.locator);
        const displayName = row.display_name || row.title || fileName;
        entry = {
          id: row.id,
          kind: row.kind,
          locator: row.locator,
          title: row.title,
          added_at: row.added_at,
          hash: row.hash,
          mime: row.mime,
          folder_path: folderPath || null,
          file_name: fileName,
          display_name: displayName,
          file_size: row.file_size ?? null,
          modified_at: row.modified_at ?? null,
          usage: [],
          folderPath,
          fileName,
          displayName,
          mediaType: deriveMediaType(row.mime, row.kind),
          usageCount: 0
        };
        grouped.set(row.id, entry);
      }

      if (row.assertion_id && row.assertion_subject_id && row.assertion_path) {
        entry.usage.push({
          assertion_id: row.assertion_id,
          entity_id: row.assertion_subject_id,
          entity_label: row.entity_label,
          assertion_path: row.assertion_path
        });
      }
    }

    return Array.from(grouped.values()).map((item) => ({
      ...item,
      usageCount: item.usage.length
    }));
  }

  async getMediaFolders(): Promise<MediaFolderNode[]> {
    if (!this.current) {
      throw new Error('No project is currently open');
    }

    const mediaRoot = path.join(this.current.root, this.current.manifest.paths.media);
    const folders = new Set<string>(['']);

    const walk = async (absoluteDir: string, relativeDir: string) => {
      const entries = await fsp.readdir(absoluteDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const nextRelative = relativeDir ? path.posix.join(relativeDir, entry.name) : entry.name;
        folders.add(nextRelative);
        await walk(path.join(absoluteDir, entry.name), nextRelative);
      }
    };

    await walk(mediaRoot, '');

    return Array.from(folders)
      .sort((left, right) => left.localeCompare(right))
      .map((folderPath) => ({
        path: folderPath,
        name: folderPath ? path.posix.basename(folderPath) : 'All media',
        parentPath: folderPath ? parentFolderPath(folderPath) : null
      }));
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
    const allowedRoots = [
      path.resolve(this.current.root, manifest.paths.attachments),
      path.resolve(this.current.root, manifest.paths.media)
    ];
    const absolutePath = path.resolve(this.current.root, relativePath);

    const withinAllowedRoot = allowedRoots.some((rootPath) => {
      const relativeToRoot = path.relative(rootPath, absolutePath);
      return !relativeToRoot.startsWith('..') && !path.isAbsolute(relativeToRoot);
    });

    if (!withinAllowedRoot) {
      throw new Error('Attachment path is outside of the project media directories');
    }

    return await fsp.readFile(absolutePath);
  }

  async readAttachmentBySourceId(sourceId: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    if (!this.current) {
      throw new Error('No project is currently open');
    }

    const db = this.current.dbProvider.connection;
    let source = db.prepare('SELECT * FROM source WHERE id = ?').get(sourceId) as SourceRow | undefined;
    if (!source?.locator) {
      throw new Error(`Source ${sourceId} does not have an attachment locator`);
    }

    let absolutePath = this.getAbsolutePath(source.locator);
    if (!fs.existsSync(absolutePath) && source.locator.startsWith(`${this.current.manifest.paths.media}/`)) {
      this.reconcileMediaIndex();
      source = db.prepare('SELECT * FROM source WHERE id = ?').get(sourceId) as SourceRow | undefined;
      if (!source?.locator) {
        throw new Error(`Source ${sourceId} does not have an attachment locator`);
      }
      absolutePath = this.getAbsolutePath(source.locator);
    }

    const buffer = await this.readAttachment(source.locator);
    return {
      buffer,
      fileName: source.file_name || path.basename(source.locator),
      mimeType: source.mime ?? 'application/octet-stream'
    };
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
      return entries.filter((entry) => fs.existsSync(entry.root));
    } catch (error) {
      console.warn('[ProjectManager] Failed to read recent projects', error);
      return [];
    }
  }

  async removeRecentProject(projectPath: string): Promise<boolean> {
    try {
      await this.ensureRecentProjectsFile();
      const raw = await fsp.readFile(this.recentProjectsPath, 'utf8');
      const entries = JSON.parse(raw) as RecentProjectEntry[];
      const nextEntries = entries.filter((entry) => entry.root !== projectPath);
      if (nextEntries.length === entries.length) {
        return false;
      }
      await writeJSONAtomic(this.recentProjectsPath, nextEntries);
      return true;
    } catch (error) {
      console.warn('[ProjectManager] Failed to remove recent project', error);
      return false;
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
    for (const sub of new Set([...SUBDIRECTORIES, manifest.paths.attachments, manifest.paths.media])) {
      await fsp.mkdir(path.join(root, sub), { recursive: true });
    }

    const dbDir = path.dirname(path.join(root, manifest.paths.db));
    await fsp.mkdir(dbDir, { recursive: true });
    await this.ensureGitignore(root);
  }

  private async hydrateSeedDatabaseIfNeeded(
    rootPath: string,
    manifest: ProjectManifest,
    providerOptions: DatabaseProviderOptions,
    dbProvider: DatabaseProvider
  ): Promise<DatabaseProvider> {
    const dbPath = path.join(rootPath, manifest.paths.db);
    const seedPath = `${dbPath}.sql`;
    if (!fs.existsSync(seedPath)) {
      return dbProvider;
    }

    if (!this.isCoreProjectDataEmpty(dbProvider)) {
      return dbProvider;
    }

    const seedSql = await fsp.readFile(seedPath, 'utf8');
    dbProvider.close();

    await fsp.rm(dbPath, { force: true });
    await fsp.rm(`${dbPath}-wal`, { force: true });
    await fsp.rm(`${dbPath}-shm`, { force: true });

    const hydratedProvider = new DatabaseProvider(providerOptions);
    hydratedProvider.connection.exec(seedSql);
    return hydratedProvider;
  }

  private isCoreProjectDataEmpty(dbProvider: DatabaseProvider): boolean {
    const db = dbProvider.connection;
    const hasTable = (name: string) =>
      Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1").get(name));

    const coreTables = ['entity', 'edge', 'source', 'assertion'];
    if (!coreTables.every(hasTable)) {
      return true;
    }

    return coreTables.every((table) => {
      const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
      return row.count === 0;
    });
  }

  private normalizeManifest(manifest: ProjectManifest): ProjectManifest {
    return {
      ...manifest,
      schema_version: Math.max(manifest.schema_version ?? 1, 2),
      paths: {
        ...manifest.paths,
        attachments: manifest.paths.attachments || 'attachments',
        media: manifest.paths.media || 'media'
      }
    };
  }

  private async persistManifest(root: string, manifest: ProjectManifest) {
    await writeJSONAtomic(path.join(root, 'manifest.json'), manifest);
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

  private async migrateLegacyMediaIfNeeded() {
    if (!this.current) return;

    const db = this.current.dbProvider.connection;
    const legacySources = db.prepare(
      `SELECT *
       FROM source
       WHERE locator LIKE 'attachments/%'
         AND hash IS NOT NULL
         AND (folder_path IS NULL OR file_name IS NULL OR display_name IS NULL)`
    ).all() as SourceRow[];

    if (legacySources.length === 0) return;

    const importedFolder = 'Imported';
    const importedDir = path.join(this.current.root, this.current.manifest.paths.media, importedFolder);
    await fsp.mkdir(importedDir, { recursive: true });

    for (const source of legacySources) {
      const currentAbsolute = this.getAbsolutePath(source.locator);
      if (!fs.existsSync(currentAbsolute)) continue;

      const desiredName = buildRenamedFileName(
        source.title || path.basename(source.locator, path.extname(source.locator)),
        path.basename(source.locator)
      );
      const finalFileName = await ensureUniqueFileName(importedDir, desiredName);
      const nextAbsolute = path.join(importedDir, finalFileName);
      if (!fs.existsSync(nextAbsolute)) {
        await fsp.copyFile(currentAbsolute, nextAbsolute);
      }
      const stats = await fsp.stat(nextAbsolute);
      const locator = toProjectRelative(path.join(this.current.manifest.paths.media, importedFolder, finalFileName));

      db.prepare(
        `UPDATE source
         SET locator = @locator,
             folder_path = @folder_path,
             file_name = @file_name,
             display_name = @display_name,
             file_size = @file_size,
             modified_at = @modified_at
         WHERE id = @id`
      ).run({
        id: source.id,
        locator,
        folder_path: importedFolder,
        file_name: finalFileName,
        display_name: source.title || finalFileName,
        file_size: stats.size,
        modified_at: Math.floor(stats.mtimeMs / 1000)
      });
    }
  }

  private reconcileMediaIndex() {
    if (!this.current) return;

    const db = this.current.dbProvider.connection;
    const mediaRoot = path.join(this.current.root, this.current.manifest.paths.media);
    if (!fs.existsSync(mediaRoot)) return;

    const sources = db.prepare(
      `SELECT *
       FROM source
       WHERE hash IS NOT NULL
         AND locator IS NOT NULL
         AND locator LIKE ?`
    ).all(`${this.current.manifest.paths.media}/%`) as SourceRow[];

    const missingSources = sources.filter((source) => !fs.existsSync(this.getAbsolutePath(source.locator)));
    if (missingSources.length === 0) return;

    const fileEntries = collectMediaFiles(mediaRoot);
    if (fileEntries.length === 0) return;

    const byFileName = new Map<string, Array<{ absolutePath: string; relativePath: string; size: number; modifiedAt: number }>>();
    for (const entry of fileEntries) {
      const bucket = byFileName.get(entry.fileName) ?? [];
      bucket.push(entry);
      byFileName.set(entry.fileName, bucket);
    }

    for (const source of missingSources) {
      const expectedFileName = source.file_name || path.basename(source.locator);
      const candidates = byFileName.get(expectedFileName) ?? [];
      if (candidates.length === 0) continue;

      let resolved = candidates.find((candidate) => candidate.relativePath === normalizeProjectPath(source.locator));

      if (!resolved && source.hash) {
        resolved = candidates.find((candidate) => {
          try {
            return sha256(fs.readFileSync(candidate.absolutePath)) === source.hash;
          } catch {
            return false;
          }
        });
      }

      if (!resolved && candidates.length === 1) {
        resolved = candidates[0];
      }

      if (!resolved) continue;

      const folderPath = inferFolderPathFromLocator(this.current.manifest.paths.media, resolved.relativePath);
      db.prepare(
        `UPDATE source
         SET locator = @locator,
             folder_path = @folder_path,
             file_name = @file_name,
             modified_at = @modified_at,
             file_size = @file_size
         WHERE id = @id`
      ).run({
        id: source.id,
        locator: resolved.relativePath,
        folder_path: folderPath || null,
        file_name: expectedFileName,
        modified_at: resolved.modifiedAt,
        file_size: resolved.size
      });
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
  if (mimeType.startsWith('video/')) return `.${mimeType.split('/')[1]}`;
  if (mimeType.startsWith('audio/')) return `.${mimeType.split('/')[1]}`;
  return '';
}

function inferKindFromMime(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) return 'document';
  return 'file';
}

function deriveMediaType(mimeType: string | null, kind: string): MediaLibraryItem['mediaType'] {
  if (mimeType?.startsWith('image/') || kind === 'image') return 'image';
  if (mimeType?.startsWith('video/') || kind === 'video') return 'video';
  if (mimeType?.startsWith('audio/') || kind === 'audio') return 'audio';
  if (mimeType === 'application/pdf' || mimeType?.startsWith('text/') || kind === 'document') return 'document';
  return 'other';
}

function toProjectRelative(relativePath: string) {
  return relativePath.split(path.sep).join(path.posix.sep);
}

function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '-');
}

function sanitizeFileStem(name: string) {
  const sanitized = sanitizeFileName(name).trim().replace(/\s+/g, ' ');
  return sanitized.length > 0 ? sanitized : 'asset';
}

function sanitizeMediaFileName(fileName: string) {
  const ext = path.extname(fileName);
  const stem = sanitizeFileStem(path.basename(fileName, ext));
  const safeExt = sanitizeFileName(ext).replace(/\s+/g, '');
  return `${stem}${safeExt}`;
}

function buildRenamedFileName(displayName: string, previousFileName: string) {
  const ext = path.extname(previousFileName);
  return sanitizeMediaFileName(`${displayName || path.basename(previousFileName, ext)}${ext}`);
}

async function ensureUniqueFileName(directory: string, desiredFileName: string): Promise<string> {
  const ext = path.extname(desiredFileName);
  const stem = path.basename(desiredFileName, ext);
  let attempt = 0;

  for (;;) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
    const candidate = `${stem}${suffix}${ext}`;
    try {
      await fsp.access(path.join(directory, candidate), fs.constants.F_OK);
      attempt += 1;
    } catch {
      return candidate;
    }
  }
}

function normalizeFolderPath(folderPath: string): string {
  const normalized = folderPath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (normalized.some((segment) => segment === '.' || segment === '..')) {
    throw new Error('Invalid folder path');
  }
  return normalized.map((segment) => sanitizeFileStem(segment)).join('/');
}

function parentFolderPath(folderPath: string): string | null {
  if (!folderPath) return null;
  const parts = folderPath.split('/').filter(Boolean);
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('/');
}

function inferFolderPathFromLocator(mediaRoot: string, locator: string): string {
  const normalizedLocator = locator.replace(/\\/g, '/');
  const normalizedRoot = mediaRoot.replace(/\\/g, '/').replace(/\/$/, '');
  if (!normalizedLocator.startsWith(`${normalizedRoot}/`)) return '';
  const relativePath = normalizedLocator.slice(normalizedRoot.length + 1);
  const folder = relativePath.split('/').slice(0, -1).join('/');
  return normalizeFolderPath(folder);
}

function normalizeProjectPath(relativePath: string): string {
  return relativePath.replace(/\\/g, '/');
}

function collectMediaFiles(root: string, relativeDir = ''): Array<{
  absolutePath: string;
  relativePath: string;
  fileName: string;
  size: number;
  modifiedAt: number;
}> {
  const results: Array<{
    absolutePath: string;
    relativePath: string;
    fileName: string;
    size: number;
    modifiedAt: number;
  }> = [];

  const absoluteDir = path.join(root, relativeDir);
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  for (const entry of entries) {
    const nextRelative = relativeDir ? path.posix.join(relativeDir, entry.name) : entry.name;
    const nextAbsolute = path.join(root, nextRelative);
    if (entry.isDirectory()) {
      results.push(...collectMediaFiles(root, nextRelative));
      continue;
    }
    const stats = fs.statSync(nextAbsolute);
    results.push({
      absolutePath: nextAbsolute,
      relativePath: toProjectRelative(path.posix.join('media', nextRelative)),
      fileName: entry.name,
      size: stats.size,
      modifiedAt: Math.floor(stats.mtimeMs / 1000)
    });
  }

  return results;
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
