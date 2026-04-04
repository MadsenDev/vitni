import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { app, dialog, shell, BrowserWindow } from 'electron';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import type {
  TransformRegistry,
  TransformManifest,
  TransformExecutionResult,
  AttachmentResult,
  MediaFolderNode,
  MediaLibraryItem
} from '../../../shared/types';
import type {
  AssertionRecord,
  AuditRecord,
  EntityRecord,
  EdgeRecord,
  SourceRecord,
  SourceUsageRecord,
  SourceWithUsage,
  TransformRunRecord,
  ProjectSettingRecord
} from '../../../shared/types';
import type { ProjectManager } from '../projectManager';
import type { DbConnection } from '../persistence/database';
import { deviceSettingsService } from '../services/deviceSettings';
import type { OllamaManager } from '../services/ollama';
import { openAIService } from '../services/openai';
import { normalizePersonalizationTheme, type PersonalizationTheme } from '../../renderer/src/features/personalization/theme';

let currentInstallChild: ChildProcess | null = null;

type LocalAISetupStage =
  | 'detecting'
  | 'installing_ollama'
  | 'awaiting_external_install'
  | 'starting_service'
  | 'downloading_model'
  | 'verifying'
  | 'ready'
  | 'failed';

interface ParsedEntityRecord extends Omit<EntityRecord, 'properties_json'> {
  properties: Record<string, unknown>;
}

interface ParsedEdgeRecord extends Omit<EdgeRecord, 'properties_json'> {
  properties: Record<string, unknown>;
}

interface ParsedAssertionRecord extends Omit<AssertionRecord, 'value_json'> {
  value: Record<string, unknown>;
}

interface CreateEntityPayload {
  type: EntityRecord['type'];
  label: string;
  properties: Record<string, unknown>;
}

interface CreateSourcePayload {
  kind: string;
  locator: string;
  title?: string;
  hash?: string | null;
  mime?: string | null;
  folder_path?: string | null;
  file_name?: string | null;
  display_name?: string | null;
  file_size?: number | null;
  modified_at?: number | null;
}

interface AttachmentRequestPayload {
  locator: string;
  mime?: string | null;
}

interface AttachmentBySourceRequestPayload {
  sourceId: string;
}

interface UploadMediaPayload {
  data: Buffer | Uint8Array;
  name: string;
  mime: string;
  folderPath?: string;
  title?: string | null;
  kind?: string;
}

interface ReplaceMediaPayload {
  sourceId: string;
  data: Buffer | Uint8Array;
  name: string;
  mime: string;
}

interface ExecuteRemoteTransformPayload {
  transformId: string;
  subjectEntityId: string;
  subjectEntityType: string;
  payload: Record<string, unknown>;
  destination: string;
}

interface AssertionPayload {
  subject_kind: string;
  subject_id: string;
  path: string;
  value: Record<string, unknown>;
  source_id: string;
  confidence: AssertionRecord['confidence'];
}

interface UpdateAssertionPayload {
  value?: Record<string, unknown>;
  confidence?: AssertionRecord['confidence'];
}

interface UpdateSourcePayload {
  title?: string | null;
  locator?: string;
  kind?: string;
  mime?: string | null;
  folder_path?: string | null;
  file_name?: string | null;
  display_name?: string | null;
  file_size?: number | null;
  modified_at?: number | null;
}

interface CreateEdgePayload {
  src_id: string;
  dst_id: string;
  type: string;
  properties: Record<string, unknown>;
}

interface StoredEntityRow {
  id: string;
  type: EntityRecord['type'];
  label: string | null;
  properties_json: string;
}

function normalizeComparableValue(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function parseEntityRow(row: StoredEntityRow | undefined): { id: string; type: EntityRecord['type']; label: string | null; properties: Record<string, unknown> } | null {
  if (!row) return null;
  try {
    return {
      id: row.id,
      type: row.type,
      label: row.label,
      properties: JSON.parse(row.properties_json || '{}') as Record<string, unknown>
    };
  } catch {
    return {
      id: row.id,
      type: row.type,
      label: row.label,
      properties: {}
    };
  }
}

function extractDomain(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const hostname = new URL(normalized).hostname.replace(/^www\./i, '').toLowerCase();
    return hostname || null;
  } catch {
    const match = trimmed.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}/i);
    return match ? match[0].replace(/^https?:\/\//i, '').replace(/^www\./i, '').toLowerCase() : null;
  }
}

function getTransformManifest(registry: TransformRegistry, transformId: string): TransformManifest | null {
  return registry.remote.find((manifest) => manifest.id === transformId) ?? registry.local.find((manifest) => manifest.id === transformId) ?? null;
}

function createSourceRecord(db: DbConnection, payload: CreateSourcePayload): string {
  const now = Math.floor(Date.now() / 1000);
  const id = randomUUID();
  db.prepare(
    `INSERT INTO source (
      id, kind, locator, title, added_at, hash, mime, folder_path, file_name, display_name, file_size, modified_at
    ) VALUES (
      @id, @kind, @locator, @title, @added_at, @hash, @mime, @folder_path, @file_name, @display_name, @file_size, @modified_at
    )`
  ).run({
    id,
    kind: payload.kind,
    locator: payload.locator,
    title: payload.title ?? null,
    added_at: now,
    hash: payload.hash ?? null,
    mime: payload.mime ?? null,
    folder_path: payload.folder_path ?? null,
    file_name: payload.file_name ?? null,
    display_name: payload.display_name ?? payload.title ?? null,
    file_size: payload.file_size ?? null,
    modified_at: payload.modified_at ?? null
  });
  return id;
}

function createAssertionRecord(db: DbConnection, payload: AssertionPayload): string {
  const now = Math.floor(Date.now() / 1000);
  const id = randomUUID();
  db.prepare(
    `INSERT INTO assertion (id, subject_kind, subject_id, path, value_json, source_id, confidence, created_at)
     VALUES (@id, @subject_kind, @subject_id, @path, @value_json, @source_id, @confidence, @created_at)`
  ).run({
    id,
    subject_kind: payload.subject_kind,
    subject_id: payload.subject_id,
    path: payload.path,
    value_json: JSON.stringify(payload.value ?? {}),
    source_id: payload.source_id,
    confidence: payload.confidence,
    created_at: now
  });
  return id;
}

function getOrCreateEntity(
  db: DbConnection,
  type: EntityRecord['type'],
  label: string,
  properties: Record<string, unknown>,
  identityKeys: string[]
): string {
  const rows = db.prepare('SELECT id, type, label, properties_json FROM entity WHERE type = ?').all(type) as StoredEntityRow[];
  const targetValues = identityKeys.map((key) => normalizeComparableValue(properties[key]));
  for (const row of rows) {
    const parsed = parseEntityRow(row);
    if (!parsed) continue;
    const matched = identityKeys.some((key, index) => {
      const current = normalizeComparableValue(parsed.properties[key]);
      return current && current === targetValues[index];
    });
    if (matched) {
      return parsed.id;
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const id = randomUUID();
  db.prepare(
    `INSERT INTO entity (id, type, label, properties_json, created_at, updated_at)
     VALUES (@id, @type, @label, @properties_json, @created_at, @updated_at)`
  ).run({
    id,
    type,
    label,
    properties_json: JSON.stringify(properties),
    created_at: now,
    updated_at: now
  });
  return id;
}

function getOrCreateEdge(
  db: DbConnection,
  payload: CreateEdgePayload,
  matchSubtype?: string
): string {
  const rows = db.prepare('SELECT id, properties_json FROM edge WHERE src_id = ? AND dst_id = ? AND type = ?').all(
    payload.src_id,
    payload.dst_id,
    payload.type
  ) as Array<{ id: string; properties_json: string }>;

  for (const row of rows) {
    try {
      const properties = JSON.parse(row.properties_json || '{}') as Record<string, unknown>;
      if (!matchSubtype || normalizeComparableValue(properties.subtype) === normalizeComparableValue(matchSubtype)) {
        return row.id;
      }
    } catch {
      if (!matchSubtype) {
        return row.id;
      }
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const id = randomUUID();
  db.prepare(
    `INSERT INTO edge (id, src_id, dst_id, type, properties_json, created_at, updated_at)
     VALUES (@id, @src_id, @dst_id, @type, @properties_json, @created_at, @updated_at)`
  ).run({
    id,
    src_id: payload.src_id,
    dst_id: payload.dst_id,
    type: payload.type,
    properties_json: JSON.stringify(payload.properties ?? {}),
    created_at: now,
    updated_at: now
  });
  return id;
}

function withDb<Args extends unknown[], ReturnType>(
  projectManager: ProjectManager,
  handler: (db: DbConnection, ...args: Args) => ReturnType
) {
  return (_event: IpcMainInvokeEvent, ...args: Args) => {
    const db = projectManager.getDatabase();
    return handler(db, ...args);
  };
}

function getPersonalizationDirectory() {
  return path.join(app.getPath('userData'), 'personalization');
}

async function ensurePersonalizationDirectory() {
  const directory = getPersonalizationDirectory();
  await fsp.mkdir(directory, { recursive: true });
  return directory;
}

function sanitizeFileStem(name: string) {
  return name.replace(/[^a-z0-9._-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'asset';
}

export function registerIpcHandlers(
  ipcMain: IpcMain,
  projectManager: ProjectManager,
  transformRegistry: TransformRegistry,
  ollamaManager: OllamaManager,
  mainWindow: BrowserWindow | null
) {
  ipcMain.handle('app:openExternal', async (_e, url: string) => {
    await shell.openExternal(url);
    return true;
  });

  ipcMain.handle('app:revealPath', async (_e, targetPath: string) => {
    try {
      shell.showItemInFolder(targetPath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('window:minimize', () => {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.handle('window:close', () => {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    if (win) win.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    return win ? win.isMaximized() : false;
  });

  ipcMain.handle('ai:ollama:download', async () => {
    try {
      const userData = app.getPath('userData');
      const ollamaDir = path.join(userData, 'ollama');
      await fsp.mkdir(ollamaDir, { recursive: true });
      
      // Fetch latest release info from GitHub API to get correct asset URLs
      const apiRes = await fetch('https://api.github.com/repos/ollama/ollama/releases/latest');
      if (!apiRes.ok) return { ok: false, message: `GitHub API error: ${apiRes.status}` };
      const release = await apiRes.json() as { assets?: Array<{ name: string; browser_download_url: string }> };
      
      let url = '';
      const filename = process.platform === 'win32' ? 'OllamaSetup.exe' : process.platform === 'darwin' ? 'ollama-darwin' : 'ollama-linux-amd64';
      const asset = release.assets?.find(a => a.name.includes(filename) || (process.platform === 'win32' && a.name.endsWith('.exe') && !a.name.includes('zip')));
      
      if (asset) {
        url = asset.browser_download_url;
      } else {
        // Fallback to known patterns
        url = process.platform === 'win32'
          ? 'https://github.com/ollama/ollama/releases/latest/download/OllamaSetup.exe'
          : process.platform === 'darwin'
          ? 'https://github.com/ollama/ollama/releases/latest/download/ollama-darwin'
          : 'https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64';
      }
      
      const dest = process.platform === 'win32' ? path.join(ollamaDir, 'ollama.exe') : path.join(ollamaDir, 'ollama');
      const res = await fetch(url);
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}: ${url}` };
      const buf = Buffer.from(await res.arrayBuffer());
      await fsp.writeFile(dest, buf as Uint8Array);
      if (process.platform !== 'win32') {
        await fsp.chmod(dest, 0o755);
      }
      return { ok: true, path: dest };
    } catch (e) {
      return { ok: false, message: String((e as Error).message) };
    }
  });

  ipcMain.handle('ai:ollama:install:start', async () => {
    if (currentInstallChild) return { started: false };
    let cmd = '';
    let args: string[] = [];
    if (process.platform === 'win32') {
      cmd = 'winget';
      args = ['install', 'Ollama.Ollama', '-e', '--silent'];
    } else {
      cmd = 'sh';
      args = ['-c', 'curl -fsSL https://ollama.com/install.sh | sh'];
    }
    try {
      currentInstallChild = spawn(cmd, args, { stdio: 'ignore' });
      currentInstallChild.on('exit', () => { currentInstallChild = null; });
      currentInstallChild.on('error', () => { currentInstallChild = null; });
      return { started: true };
    } catch {
      currentInstallChild = null;
      return { started: false };
    }
  });

  ipcMain.handle('ai:ollama:install:cancel', async () => {
    try {
      if (currentInstallChild && currentInstallChild.kill) {
        currentInstallChild.kill('SIGTERM');
      }
    } catch {
      // ignore
    } finally {
      currentInstallChild = null;
    }
    return { ok: true };
  });

  ipcMain.handle('ai:ollama:install:running', async () => {
    return { running: Boolean(currentInstallChild) };
  });

  ipcMain.handle('ai:ollama:install', async () => {
    return new Promise<{ ok: boolean }>((resolve) => {
      let cmd = '';
      let args: string[] = [];
      if (process.platform === 'win32') {
        cmd = 'winget';
        args = ['install', 'Ollama.Ollama', '-e', '--silent'];
      } else {
        cmd = 'sh';
        args = ['-c', 'curl -fsSL https://ollama.com/install.sh | sh'];
      }
      try {
        const child = spawn(cmd, args, { stdio: 'ignore' });
        child.on('error', () => resolve({ ok: false }));
        child.on('exit', (code) => resolve({ ok: code === 0 }));
      } catch {
        resolve({ ok: false });
      }
    });
  });

  ipcMain.handle('ai:ollama:status', async (_e) => {
    try {
      const db = projectManager.getDatabase();
      return await buildOllamaStatus(db, ollamaManager);
    } catch {
      return {
        endpoint: 'http://localhost:11434',
        model: getDefaultOllamaModel(),
        ollamaInstalled: false,
        serverUp: false,
        modelAvailable: false,
        setupRequired: true,
        recommendedAction: 'install',
        downloadEstimateMb: 2200
      };
    }
  });

  ipcMain.handle('ai:ollama:start', async (_e) => {
    try {
      const db = projectManager.getDatabase();
      const { endpoint } = await readOllamaConfig(db);
      const bin = ollamaManager.getResolvedBinary();
      if (!bin) return { ok: false, message: 'Ollama binary not found. Try "Download bundled" first.' };
      const ok = await ollamaManager.ensure(endpoint);
      if (!ok) {
        if (await ollamaManager.isAvailable(endpoint)) {
          return { ok: true };
        }
        return {
          ok: false,
          message: ollamaManager.getLastStartError() || 'Failed to start server or server not ready'
        };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, message: String((e as Error).message || 'Start failed') };
    }
  });

  ipcMain.handle('ai:ollama:pull', async (_e) => {
    try {
      const db = projectManager.getDatabase();
      const { endpoint, model } = await readOllamaConfig(db);
      const ok = await ollamaManager.ensure(endpoint);
      if (!ok) return { ok: false, message: 'Server not available. Start the server first.' };
      
      // Try HTTP API first
      try {
        const res = await fetch(`${endpoint.replace(/\/$/, '')}/api/pull`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: model, stream: false }) } as any);
        if (res.ok) {
          // Wait a bit for pull to start, then return
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { ok: true };
        }
      } catch (e) {
        console.warn('[AI] HTTP pull failed, falling back to CLI:', e);
      }
      
      // Fallback to CLI
      const bin = ollamaManager.getResolvedBinary();
      if (!bin) return { ok: false, message: 'Ollama binary not found' };
      try {
        const child = spawn(bin, ['pull', model], { stdio: 'pipe' });
        let stderr = '';
        child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
        const exitCode: number = await new Promise((resolve) => child.on('exit', (code) => resolve(code ?? 1)));
        if (exitCode === 0) return { ok: true };
        return { ok: false, message: `Pull failed: ${stderr.slice(0, 100) || 'exit code ' + exitCode}` };
      } catch (e) {
        return { ok: false, message: `CLI spawn failed: ${String((e as Error).message)}` };
      }
    } catch (e) {
      return { ok: false, message: String((e as Error).message || 'Pull failed') };
    }
  });

  ipcMain.handle('ai:ollama:self-test', async (_e) => {
    try {
      const db = projectManager.getDatabase();
      const { endpoint, model } = await readOllamaConfig(db);
      const ok = await ollamaManager.ensure(endpoint);
      if (!ok) {
        return { ok: false, message: 'Local AI is not installed or not running.' };
      }
      const reachableEndpoint = await ollamaManager.resolveReachableEndpoint(endpoint);
      if (!reachableEndpoint) {
        return { ok: false, message: 'Local AI is not reachable at the configured endpoint.' };
      }
      const result = await runOllamaSelfTest(reachableEndpoint, model);
      return result.ok
        ? {
            ok: true,
            message: `Self-test succeeded in ${formatMs(result.elapsedMs)}. First token: ${formatMs(result.firstTokenMs)}.`,
            elapsedMs: result.elapsedMs,
            firstTokenMs: result.firstTokenMs,
            preview: result.preview
          }
        : {
            ok: false,
            message: result.message || 'Self-test failed.',
            elapsedMs: result.elapsedMs,
            firstTokenMs: result.firstTokenMs,
            preview: result.preview
          };
    } catch (error) {
      return { ok: false, message: String((error as Error).message || 'Self-test failed.') };
    }
  });

  ipcMain.handle('ai:ollama:stop', async () => {
    try { ollamaManager.stop(); } catch {}
    return { ok: true };
  });

  ipcMain.handle('ai:ollama:setup', async (event) => {
    try {
      const db = projectManager.getDatabase();
      const sendProgress = (stage: LocalAISetupStage, message: string) => {
        event.sender.send('ai:ollama:setup-progress', { stage, message });
      };

      sendProgress('detecting', 'Checking local AI runtime…');
      let status = await buildOllamaStatus(db, ollamaManager);

      if (!status.ollamaInstalled) {
        sendProgress('installing_ollama', 'Installing Ollama…');
        const installResult = await installOllamaForSetup((message) => {
          sendProgress('installing_ollama', message);
        });
        if (!installResult.ok) {
          const stage = installResult.awaitingExternalInstall ? 'awaiting_external_install' : 'failed';
          const message = installResult.message || 'Failed to install Ollama.';
          sendProgress(stage, message);
          return { ok: false, stage, message };
        }
        status = await buildOllamaStatus(db, ollamaManager);
      }

      if (!status.serverUp) {
        sendProgress('starting_service', 'Starting local AI service…');
        const ok = await ollamaManager.ensure(status.endpoint);
        if (!ok) {
          status = await buildOllamaStatus(db, ollamaManager);
          if (status.serverUp) {
            sendProgress('starting_service', 'Found an existing Ollama service on the configured port.');
          } else {
          const message = formatLocalAIStartFailure(status.endpoint, ollamaManager.getLastStartError());
          sendProgress('failed', message);
          return { ok: false, stage: 'failed' as const, message };
          }
        }
        status = await buildOllamaStatus(db, ollamaManager);
      }

      if (!status.modelAvailable) {
        sendProgress('downloading_model', `Downloading ${status.model}…`);
        const pullResult = await pullOllamaModel(status.endpoint, status.model, ollamaManager);
        if (!pullResult.ok) {
          sendProgress('failed', pullResult.message || 'The local AI model could not be downloaded.');
          return { ok: false, stage: 'failed' as const, message: pullResult.message || 'The local AI model could not be downloaded.' };
        }
      }

      sendProgress('verifying', 'Verifying local AI readiness…');
      status = await buildOllamaStatus(db, ollamaManager);
      if (!status.serverUp || !status.modelAvailable) {
        sendProgress('failed', 'Local AI setup completed incompletely. Please try again.');
        return { ok: false, stage: 'failed' as const, message: 'Local AI setup completed incompletely. Please try again.' };
      }

      sendProgress('ready', 'Local AI is ready.');
      return { ok: true, stage: 'ready' as const };
    } catch (error) {
      const message = String((error as Error).message || 'Local AI setup failed.');
      event.sender.send('ai:ollama:setup-progress', { stage: 'failed', message });
      return { ok: false, stage: 'failed' as const, message };
    }
  });

  ipcMain.handle('ai:openai:status', async () => {
    return await openAIService.getStatus();
  });

  ipcMain.handle('ai:openai:key:set', async (_e, apiKey: string) => {
    try {
      await openAIService.setApiKey(apiKey);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: String((error as Error).message || 'Failed to save API key.') };
    }
  });

  ipcMain.handle('ai:openai:key:clear', async () => {
    try {
      await openAIService.clearApiKey();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: String((error as Error).message || 'Failed to clear API key.') };
    }
  });

  ipcMain.handle(
    'db:entities:list',
    withDb(projectManager, (db) => {
      const stmt = db.prepare('SELECT * FROM entity ORDER BY created_at DESC');
      const entities = stmt.all() as EntityRecord[];
      return entities.map(entity => ({
        ...entity,
        properties: JSON.parse(entity.properties_json || '{}')
      })) as ParsedEntityRecord[];
    })
  );

  ipcMain.handle(
    'db:graph:load',
    withDb(projectManager, (db) => {
      const nodes = db.prepare('SELECT * FROM entity').all() as EntityRecord[];
      const edges = db.prepare('SELECT * FROM edge').all() as EdgeRecord[];

      const parsedNodes = nodes.map(node => ({
        ...node,
        properties: JSON.parse(node.properties_json || '{}')
      })) as ParsedEntityRecord[];

      const parsedEdges = edges.map(edge => ({
        ...edge,
        properties: JSON.parse(edge.properties_json || '{}')
      })) as ParsedEdgeRecord[];

      return { nodes: parsedNodes, edges: parsedEdges };
    })
  );

  ipcMain.handle(
    'db:assertions:by-entity',
    withDb(projectManager, (db, entityId: string) => {
      const stmt = db.prepare(
        'SELECT * FROM assertion WHERE subject_id = ? ORDER BY created_at DESC'
      );
      const assertions = stmt.all(entityId) as AssertionRecord[];
      return assertions.map(assertion => ({
        ...assertion,
        value: JSON.parse(assertion.value_json || '{}')
      })) as ParsedAssertionRecord[];
    })
  );

  ipcMain.handle(
    'db:assertions:list',
    withDb(projectManager, (db) => {
      const assertions = db
        .prepare('SELECT * FROM assertion ORDER BY created_at DESC')
        .all() as AssertionRecord[];
      return assertions.map((assertion) => ({
        ...assertion,
        value: JSON.parse(assertion.value_json || '{}')
      })) as ParsedAssertionRecord[];
    })
  );

  ipcMain.handle(
    'db:sources:by-entity',
    withDb(projectManager, (db, entityId: string) => {
      const stmt = db.prepare(
        `SELECT DISTINCT s.*
         FROM source s
         INNER JOIN assertion a ON a.source_id = s.id
         WHERE a.subject_id = ?
         ORDER BY s.added_at DESC`
      );
      return stmt.all(entityId) as SourceRecord[];
    })
  );

  ipcMain.handle(
    'db:sources:list-with-usage',
    withDb(projectManager, (db) => {
      const rows = db
        .prepare(
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
           ORDER BY s.added_at DESC, a.created_at DESC`
        )
        .all() as Array<
        SourceRecord & {
          assertion_id: string | null;
          assertion_subject_id: string | null;
          assertion_path: string | null;
          entity_label: string | null;
        }
      >;

      const grouped = new Map<string, SourceWithUsage>();

      for (const row of rows) {
        let entry = grouped.get(row.id);
        if (!entry) {
          entry = {
            id: row.id,
            kind: row.kind,
            locator: row.locator,
          title: row.title,
          added_at: row.added_at,
          hash: row.hash,
          mime: row.mime,
          folder_path: row.folder_path,
          file_name: row.file_name,
          display_name: row.display_name,
          file_size: row.file_size,
          modified_at: row.modified_at,
          usage: []
          } satisfies SourceWithUsage;
          grouped.set(row.id, entry);
        }

        if (row.assertion_id && row.assertion_subject_id && row.assertion_path) {
          const usageEntry: SourceUsageRecord = {
            assertion_id: row.assertion_id,
            entity_id: row.assertion_subject_id,
            entity_label: row.entity_label ?? null,
            assertion_path: row.assertion_path
          };
          entry.usage.push(usageEntry);
        }
      }

      return Array.from(grouped.values());
    })
  );

  ipcMain.handle(
    'db:entity:create',
    withDb(projectManager, (db, payload: CreateEntityPayload) => {
      const now = Math.floor(Date.now() / 1000);
      const id = randomUUID();
      const stmt = db.prepare(
        `INSERT INTO entity (id, type, label, properties_json, created_at, updated_at)
         VALUES (@id, @type, @label, @properties_json, @created_at, @updated_at)`
      );
      stmt.run({
        id,
        type: payload.type,
        label: payload.label,
        properties_json: JSON.stringify(payload.properties ?? {}),
        created_at: now,
        updated_at: now
      });
      return id;
    })
  );

  ipcMain.handle(
    'db:edge:create',
    withDb(projectManager, (db, payload: CreateEdgePayload) => {
      const now = Math.floor(Date.now() / 1000);
      const id = randomUUID();
      db.prepare(
        `INSERT INTO edge (id, src_id, dst_id, type, properties_json, created_at, updated_at)
         VALUES (@id, @src_id, @dst_id, @type, @properties_json, @created_at, @updated_at)`
      ).run({
        id,
        src_id: payload.src_id,
        dst_id: payload.dst_id,
        type: payload.type,
        properties_json: JSON.stringify(payload.properties ?? {}),
        created_at: now,
        updated_at: now
      });
      return id;
    })
  );

  ipcMain.handle(
    'db:source:create',
    withDb(projectManager, (db, payload: CreateSourcePayload) => {
      const now = Math.floor(Date.now() / 1000);
      const id = randomUUID();
      db.prepare(
        `INSERT INTO source (
          id, kind, locator, title, added_at, hash, mime, folder_path, file_name, display_name, file_size, modified_at
        ) VALUES (
          @id, @kind, @locator, @title, @added_at, @hash, @mime, @folder_path, @file_name, @display_name, @file_size, @modified_at
        )`
      ).run({
        id,
        kind: payload.kind,
        locator: payload.locator,
        title: payload.title ?? null,
        added_at: now,
        hash: payload.hash ?? null,
        mime: payload.mime ?? null,
        folder_path: payload.folder_path ?? null,
        file_name: payload.file_name ?? null,
        display_name: payload.display_name ?? payload.title ?? null,
        file_size: payload.file_size ?? null,
        modified_at: payload.modified_at ?? null
      });
      return id;
    })
  );

  ipcMain.handle(
    'db:assertion:create',
    withDb(projectManager, (db, payload: AssertionPayload) => {
      const now = Math.floor(Date.now() / 1000);
      const id = randomUUID();
      db.prepare(
        `INSERT INTO assertion (id, subject_kind, subject_id, path, value_json, source_id, confidence, created_at)
         VALUES (@id, @subject_kind, @subject_id, @path, @value_json, @source_id, @confidence, @created_at)`
      ).run({
        id,
        subject_kind: payload.subject_kind,
        subject_id: payload.subject_id,
        path: payload.path,
        value_json: JSON.stringify(payload.value ?? {}),
        source_id: payload.source_id,
        confidence: payload.confidence,
        created_at: now
      });
      return id;
    })
  );

  ipcMain.handle(
    'db:assertion:update',
    withDb(projectManager, (db, assertionId: string, updates: UpdateAssertionPayload) => {
      const updatesList: string[] = [];
      const params: Record<string, unknown> = { id: assertionId };

      if (updates.value !== undefined) {
        updatesList.push('value_json = @value_json');
        params.value_json = JSON.stringify(updates.value ?? {});
      }

      if (updates.confidence !== undefined) {
        updatesList.push('confidence = @confidence');
        params.confidence = updates.confidence;
      }

      if (updatesList.length === 0) {
        return false;
      }

      const result = db.prepare(`UPDATE assertion SET ${updatesList.join(', ')} WHERE id = @id`).run(params);
      return result.changes > 0;
    })
  );

  ipcMain.handle(
    'db:assertion:delete',
    withDb(projectManager, (db, assertionId: string) => {
      const result = db.prepare('DELETE FROM assertion WHERE id = ?').run(assertionId);
      return result.changes > 0;
    })
  );

  ipcMain.handle(
    'db:source:update',
    withDb(projectManager, (db, sourceId: string, updates: UpdateSourcePayload) => {
      const updatesList: string[] = [];
      const params: Record<string, unknown> = { id: sourceId };

      if (updates.title !== undefined) {
        updatesList.push('title = @title');
        params.title = updates.title;
      }

      if (updates.locator !== undefined) {
        updatesList.push('locator = @locator');
        params.locator = updates.locator;
      }

      if (updates.kind !== undefined) {
        updatesList.push('kind = @kind');
        params.kind = updates.kind;
      }

      if (updates.mime !== undefined) {
        updatesList.push('mime = @mime');
        params.mime = updates.mime;
      }

      if ((updates as CreateSourcePayload).folder_path !== undefined) {
        updatesList.push('folder_path = @folder_path');
        params.folder_path = (updates as CreateSourcePayload).folder_path;
      }

      if ((updates as CreateSourcePayload).file_name !== undefined) {
        updatesList.push('file_name = @file_name');
        params.file_name = (updates as CreateSourcePayload).file_name;
      }

      if ((updates as CreateSourcePayload).display_name !== undefined) {
        updatesList.push('display_name = @display_name');
        params.display_name = (updates as CreateSourcePayload).display_name;
      }

      if ((updates as CreateSourcePayload).file_size !== undefined) {
        updatesList.push('file_size = @file_size');
        params.file_size = (updates as CreateSourcePayload).file_size;
      }

      if ((updates as CreateSourcePayload).modified_at !== undefined) {
        updatesList.push('modified_at = @modified_at');
        params.modified_at = (updates as CreateSourcePayload).modified_at;
      }

      if (updatesList.length === 0) {
        return false;
      }

      const result = db.prepare(`UPDATE source SET ${updatesList.join(', ')} WHERE id = @id`).run(params);
      return result.changes > 0;
    })
  );

  ipcMain.handle(
    'db:source:delete',
    withDb(projectManager, (db, sourceId: string) => {
      const result = db.prepare('DELETE FROM source WHERE id = ?').run(sourceId);
      return result.changes > 0;
    })
  );

  ipcMain.handle(
    'db:audit:record',
    withDb(projectManager, (db, payload: Omit<AuditRecord, 'created_at' | 'id'>) => {
      const now = Math.floor(Date.now() / 1000);
      const id = randomUUID();
      db.prepare(
        `INSERT INTO audit (id, action, subject_kind, subject_id, actor, reason, transform_run_id, created_at)
         VALUES (@id, @action, @subject_kind, @subject_id, @actor, @reason, @transform_run_id, @created_at)`
      ).run({
        id,
        ...payload,
        created_at: now
      });
      return id;
    })
  );

  ipcMain.handle('transforms:list', () => transformRegistry);

  ipcMain.handle(
    'transforms:execute-remote',
    withDb(projectManager, async (db, request: ExecuteRemoteTransformPayload): Promise<TransformExecutionResult> => {
      const manifest = getTransformManifest(transformRegistry, request.transformId);
      if (!manifest?.network) {
        throw new Error(`Transform ${request.transformId} is not available for remote execution.`);
      }

      const subject = parseEntityRow(
        db.prepare('SELECT id, type, label, properties_json FROM entity WHERE id = ? LIMIT 1').get(request.subjectEntityId) as
          | StoredEntityRow
          | undefined
      );
      if (!subject) {
        throw new Error('The selected entity could not be found.');
      }

      const transformRunId = randomUUID();
      const startedAt = Math.floor(Date.now() / 1000);
      db.prepare(
        `INSERT INTO transform_run (id, transform_id, input_json, output_summary, consent_snapshot_json, started_at, finished_at)
         VALUES (@id, @transform_id, @input_json, @output_summary, @consent_snapshot_json, @started_at, @finished_at)`
      ).run({
        id: transformRunId,
        transform_id: request.transformId,
        input_json: JSON.stringify(request.payload ?? {}),
        output_summary: null,
        consent_snapshot_json: JSON.stringify({
          destination: request.destination,
          payload: request.payload,
          transformName: request.transformId
        }),
        started_at: startedAt,
        finished_at: null
      });

      const createdEntityIds: string[] = [];
      const createdEdgeIds: string[] = [];
      let assertionsAdded = 0;
      let sourceId: string | null = null;

      const finishTransform = (outputSummary: string) => {
        db.prepare(
          `UPDATE transform_run
           SET output_summary = @output_summary, finished_at = @finished_at
           WHERE id = @id`
        ).run({
          id: transformRunId,
          output_summary: outputSummary,
          finished_at: Math.floor(Date.now() / 1000)
        });
      };

      const addAssertion = (path: string, value: Record<string, unknown>) => {
        if (!sourceId) return;
        createAssertionRecord(db, {
          subject_kind: 'entity',
          subject_id: subject.id,
          path,
          value,
          source_id: sourceId,
          confidence: 'asserted'
        });
        assertionsAdded += 1;
      };

      const ensureDomainPivot = (domain: string) => {
        if (subject.type !== 'website') {
          return {
            pivotEntityId: subject.id,
            pivotLabel: subject.label || domain
          };
        }

        const domainId = getOrCreateEntity(
          db,
          'domain',
          domain,
          { domain },
          ['domain']
        );
        if (!createdEntityIds.includes(domainId)) {
          createdEntityIds.push(domainId);
        }
        const edgeId = getOrCreateEdge(
          db,
          {
            src_id: subject.id,
            dst_id: domainId,
            type: 'associated_with',
            properties: {
              subtype: 'linked_to',
              notes: 'Derived domain from website URL'
            }
          },
          'linked_to'
        );
        if (!createdEdgeIds.includes(edgeId)) {
          createdEdgeIds.push(edgeId);
        }
        return {
          pivotEntityId: domainId,
          pivotLabel: domain
        };
      };

      try {
        if (request.transformId === 'whois.lookup') {
          const domainCandidate =
            typeof request.payload.domain === 'string'
              ? request.payload.domain
              : subject.type === 'domain'
                ? String(subject.properties.domain || subject.label || '')
                : subject.type === 'website'
                  ? extractDomain(String(subject.properties.url || subject.label || ''))
                  : null;

          const domain = domainCandidate ? extractDomain(String(domainCandidate)) : null;
          if (!domain) {
            throw new Error('No valid domain was available for WHOIS lookup.');
          }

          const requestUrl = `https://${manifest.network.host}${manifest.network.path.replace('${domain}', encodeURIComponent(domain))}`;
          const response = await fetch(requestUrl, {
            method: manifest.network.method || 'GET',
            headers: { Accept: 'application/json' }
          });
          if (!response.ok) {
            throw new Error(`WHOIS lookup failed with HTTP ${response.status}.`);
          }
          const data = await response.json() as Record<string, unknown>;
          sourceId = createSourceRecord(db, {
            kind: 'remote_lookup',
            locator: requestUrl,
            title: `WHOIS Lookup: ${domain}`,
            mime: 'application/json'
          });

          const events = Array.isArray(data.events) ? data.events as Array<Record<string, unknown>> : [];
          const eventDateFor = (action: string) =>
            events.find((event) => normalizeComparableValue(event.eventAction) === normalizeComparableValue(action))?.eventDate;
          const entities = Array.isArray(data.entities) ? data.entities as Array<Record<string, unknown>> : [];
          const entityNameForRole = (role: string): string | null => {
            const match = entities.find((entry) => {
              const roles = Array.isArray(entry.roles) ? entry.roles : [];
              return roles.some((candidate) => normalizeComparableValue(candidate) === normalizeComparableValue(role));
            });
            if (!match) return null;
            const vcardArray = Array.isArray(match.vcardArray) ? match.vcardArray : [];
            const cardFields = Array.isArray(vcardArray[1]) ? vcardArray[1] as Array<unknown[]> : [];
            for (const field of cardFields) {
              if (!Array.isArray(field)) continue;
              const [name, , , value] = field;
              if (normalizeComparableValue(name) === 'fn' || normalizeComparableValue(name) === 'org') {
                const candidate = String(value || '').trim();
                if (candidate) return candidate;
              }
            }
            return typeof match.handle === 'string' ? match.handle : null;
          };

          const registrar = entityNameForRole('registrar');
          const registrantName = entityNameForRole('registrant');
          const nameservers = Array.isArray(data.nameservers)
            ? (data.nameservers as Array<Record<string, unknown>>)
                .map((entry) => String(entry.ldhName || entry.name || '').replace(/\.$/, ''))
                .filter(Boolean)
            : [];
          const statuses = Array.isArray(data.status) ? data.status.map((value) => String(value)) : [];

          addAssertion('whois.domain', { domain });
          if (registrar) addAssertion('whois.registrar', { registrar });
          const registrationDate = eventDateFor('registration');
          if (registrationDate) addAssertion('whois.registrationDate', { registrationDate: String(registrationDate) });
          const expirationDate = eventDateFor('expiration');
          if (expirationDate) addAssertion('whois.expirationDate', { expirationDate: String(expirationDate) });
          if (registrantName) addAssertion('whois.registrantName', { registrantName });
          const registrantCountry =
            typeof data.country === 'string'
              ? data.country
              : typeof (data as { port43?: unknown }).port43 === 'string'
                ? null
                : null;
          if (registrantCountry) addAssertion('whois.registrantCountry', { registrantCountry });
          if (nameservers.length > 0) addAssertion('whois.nameServers', { nameServers: nameservers });
          if (statuses.length > 0) addAssertion('whois.status', { status: statuses });
          addAssertion('whois.raw', { response: data });

          const pivot = ensureDomainPivot(domain);
          if (registrantName) {
            const registrantId = getOrCreateEntity(
              db,
              'organization',
              registrantName,
              { name: registrantName, organizationType: 'Registrant' },
              ['name']
            );
            if (!createdEntityIds.includes(registrantId)) {
              createdEntityIds.push(registrantId);
            }
            const edgeId = getOrCreateEdge(
              db,
              {
                src_id: registrantId,
                dst_id: pivot.pivotEntityId,
                type: 'ownership_or_control',
                properties: {
                  subtype: 'registered_to',
                  notes: 'Derived from WHOIS / RDAP lookup'
                }
              },
              'registered_to'
            );
            if (!createdEdgeIds.includes(edgeId)) {
              createdEdgeIds.push(edgeId);
            }
          }

          const summary = `WHOIS lookup completed for ${domain}. Added ${assertionsAdded} assertions.`;
          finishTransform(summary);
          return {
            transformRunId,
            outputSummary: summary,
            sourceId,
            createdEntityIds,
            createdEdgeIds,
            assertionsAdded
          };
        }

        if (request.transformId === 'dns.lookup') {
          const dnsHost = manifest.network?.host || 'dns.google';
          const domainCandidate =
            typeof request.payload.domain === 'string'
              ? request.payload.domain
              : subject.type === 'domain'
                ? String(subject.properties.domain || subject.label || '')
                : subject.type === 'website'
                  ? extractDomain(String(subject.properties.url || subject.label || ''))
                  : null;
          const domain = domainCandidate ? extractDomain(String(domainCandidate)) : null;
          if (!domain) {
            throw new Error('No valid domain was available for DNS lookup.');
          }

          const recordTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME'] as const;
          const responses = await Promise.all(
            recordTypes.map(async (recordType) => {
              const url = `https://${dnsHost}/resolve?name=${encodeURIComponent(domain)}&type=${recordType}`;
              const response = await fetch(url, { headers: { Accept: 'application/json' } });
              if (!response.ok) {
                throw new Error(`DNS lookup failed for ${recordType} with HTTP ${response.status}.`);
              }
              return {
                recordType,
                url,
                body: await response.json() as Record<string, unknown>
              };
            })
          );

          sourceId = createSourceRecord(db, {
            kind: 'remote_lookup',
            locator: `https://${dnsHost}/resolve?name=${encodeURIComponent(domain)}`,
            title: `DNS Lookup: ${domain}`,
            mime: 'application/json'
          });

          const answerData = new Map<string, string[]>();
          for (const response of responses) {
            const answers = Array.isArray(response.body.Answer) ? response.body.Answer as Array<Record<string, unknown>> : [];
            answerData.set(
              response.recordType,
              answers
                .map((answer) => String(answer.data || '').trim())
                .filter(Boolean)
            );
          }

          const aRecords = answerData.get('A') ?? [];
          const aaaaRecords = answerData.get('AAAA') ?? [];
          const mxRecords = (answerData.get('MX') ?? []).map((value) => value.replace(/^\d+\s+/, '').replace(/\.$/, ''));
          const nsRecords = (answerData.get('NS') ?? []).map((value) => value.replace(/\.$/, ''));
          const txtRecords = answerData.get('TXT') ?? [];
          const cnameRecords = (answerData.get('CNAME') ?? []).map((value) => value.replace(/\.$/, ''));

          if (aRecords.length > 0) addAssertion('dns.aRecords', { records: aRecords });
          if (aaaaRecords.length > 0) addAssertion('dns.aaaaRecords', { records: aaaaRecords });
          if (mxRecords.length > 0) addAssertion('dns.mxRecords', { records: mxRecords });
          if (nsRecords.length > 0) addAssertion('dns.nsRecords', { records: nsRecords });
          if (txtRecords.length > 0) addAssertion('dns.txtRecords', { records: txtRecords });
          if (cnameRecords.length > 0) addAssertion('dns.cnameRecords', { records: cnameRecords });
          addAssertion('dns.raw', {
            responses: responses.reduce<Record<string, unknown>>((acc, response) => {
              acc[response.recordType] = response.body;
              return acc;
            }, {})
          });

          const pivot = ensureDomainPivot(domain);
          for (const ipAddress of [...aRecords, ...aaaaRecords]) {
            const ipId = getOrCreateEntity(
              db,
              'ip_address',
              ipAddress,
              {
                ipAddress,
                ipVersion: ipAddress.includes(':') ? 'IPv6' : 'IPv4'
              },
              ['ipAddress']
            );
            if (!createdEntityIds.includes(ipId)) {
              createdEntityIds.push(ipId);
            }
            const edgeId = getOrCreateEdge(
              db,
              {
                src_id: pivot.pivotEntityId,
                dst_id: ipId,
                type: 'associated_with',
                properties: {
                  subtype: 'linked_to',
                  notes: 'Observed in DNS lookup'
                }
              },
              'linked_to'
            );
            if (!createdEdgeIds.includes(edgeId)) {
              createdEdgeIds.push(edgeId);
            }
          }

          for (const hostname of [...mxRecords, ...nsRecords, ...cnameRecords]) {
            const infrastructureId = getOrCreateEntity(
              db,
              'infrastructure',
              hostname,
              {
                hostname,
                infrastructureType: nsRecords.includes(hostname)
                  ? 'DNS'
                  : mxRecords.includes(hostname)
                    ? 'Mail Server'
                    : 'Server'
              },
              ['hostname']
            );
            if (!createdEntityIds.includes(infrastructureId)) {
              createdEntityIds.push(infrastructureId);
            }
            const edgeId = getOrCreateEdge(
              db,
              {
                src_id: pivot.pivotEntityId,
                dst_id: infrastructureId,
                type: 'associated_with',
                properties: {
                  subtype: 'linked_to',
                  notes: 'Observed in DNS lookup'
                }
              },
              'linked_to'
            );
            if (!createdEdgeIds.includes(edgeId)) {
              createdEdgeIds.push(edgeId);
            }
          }

          const summary = `DNS lookup completed for ${domain}. Added ${assertionsAdded} assertions and ${createdEntityIds.length} pivots.`;
          finishTransform(summary);
          return {
            transformRunId,
            outputSummary: summary,
            sourceId,
            createdEntityIds,
            createdEdgeIds,
            assertionsAdded
          };
        }

        if (request.transformId === 'ip.lookup') {
          const ipAddress =
            typeof request.payload.ipAddress === 'string'
              ? request.payload.ipAddress.trim()
              : String(subject.properties.ipAddress || subject.label || '').trim();
          if (!ipAddress) {
            throw new Error('No IP address was available for IP lookup.');
          }

          const ipHost = manifest.network?.host || 'ipwhois.app';
          const ipPathTemplate = manifest.network?.path || '/json/${ipAddress}';
          const requestUrl = `https://${ipHost}${ipPathTemplate.replace('${ipAddress}', encodeURIComponent(ipAddress))}`;
          const response = await fetch(requestUrl, {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'Vitni/0.1'
            }
          });
          if (!response.ok) {
            throw new Error(`IP lookup failed with HTTP ${response.status}.`);
          }
          const data = await response.json() as Record<string, unknown>;
          if (data.success === false) {
            throw new Error(typeof data.message === 'string' ? data.message : 'IP lookup did not succeed.');
          }

          sourceId = createSourceRecord(db, {
            kind: 'remote_lookup',
            locator: requestUrl,
            title: `IP Lookup: ${ipAddress}`,
            mime: 'application/json'
          });

          const connection =
            typeof data.connection === 'object' && data.connection
              ? data.connection as Record<string, unknown>
              : null;
          const provider = connection?.org || data.org || data.isp;
          const asn = connection?.asn || data.asn;
          const reverseDns = connection?.domain || data.reverse || data.reverseDns;

          if (provider) addAssertion('ip.provider', { provider: String(provider) });
          if (asn) addAssertion('ip.asn', { asn: String(asn) });
          if (reverseDns) addAssertion('ip.reverseDns', { reverseDns: String(reverseDns) });
          if (data.country) addAssertion('ip.country', { country: String(data.country) });
          if (data.city) addAssertion('ip.city', { city: String(data.city) });
          if (data.type) addAssertion('ip.connectionType', { connectionType: String(data.type) });
          addAssertion('ip.raw', { response: data });

          if (provider) {
            const providerName = String(provider);
            const providerId = getOrCreateEntity(
              db,
              'organization',
              providerName,
              { name: providerName, organizationType: 'Provider' },
              ['name']
            );
            if (!createdEntityIds.includes(providerId)) {
              createdEntityIds.push(providerId);
            }
            const edgeId = getOrCreateEdge(
              db,
              {
                src_id: providerId,
                dst_id: subject.id,
                type: 'associated_with',
                properties: {
                  subtype: 'linked_to',
                  notes: 'Observed as provider in IP lookup'
                }
              },
              'linked_to'
            );
            if (!createdEdgeIds.includes(edgeId)) {
              createdEdgeIds.push(edgeId);
            }
          }

          const summary = `IP lookup completed for ${ipAddress}. Added ${assertionsAdded} assertions.`;
          finishTransform(summary);
          return {
            transformRunId,
            outputSummary: summary,
            sourceId,
            createdEntityIds,
            createdEdgeIds,
            assertionsAdded
          };
        }

        throw new Error(`Transform ${request.transformId} is not implemented yet.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected transform execution error.';
        finishTransform(message);
        throw error;
      }
    })
  );

  ipcMain.handle(
    'transform:runs:create',
    withDb(projectManager, (db, payload: Omit<TransformRunRecord, 'id' | 'started_at'>) => {
      const id = randomUUID();
      const now = Math.floor(Date.now() / 1000);
      db.prepare(
        `INSERT INTO transform_run (id, transform_id, input_json, output_summary, consent_snapshot_json, started_at, finished_at)
         VALUES (@id, @transform_id, @input_json, @output_summary, @consent_snapshot_json, @started_at, @finished_at)`
      ).run({
        id,
        transform_id: payload.transform_id,
        input_json: payload.input_json,
        output_summary: payload.output_summary ?? null,
        consent_snapshot_json: payload.consent_snapshot_json,
        started_at: now,
        finished_at: payload.finished_at ?? null
      });
      return id;
    })
  );

  ipcMain.handle(
    'transform:runs:update',
    withDb(projectManager, (db, payload: Pick<TransformRunRecord, 'id'> & Partial<TransformRunRecord>) => {
      const now = Math.floor(Date.now() / 1000);
      db.prepare(
        `UPDATE transform_run SET output_summary = COALESCE(@output_summary, output_summary), finished_at = COALESCE(@finished_at, finished_at)
         WHERE id = @id`
      ).run({
        id: payload.id,
        output_summary: payload.output_summary ?? null,
        finished_at: payload.finished_at ?? now
      });
      return payload.id;
    })
  );

  ipcMain.handle(
    'project-setting:get',
    withDb(projectManager, (db, key: string) => {
      const row = db.prepare('SELECT value_json FROM project_setting WHERE key = ? LIMIT 1').get(key) as
        | { value_json: string }
        | undefined;
      if (!row) {
        return null;
      }
      try {
        return JSON.parse(row.value_json);
      } catch (error) {
        console.warn(`[ipc] Failed to parse project setting ${key}`, error);
        return null;
      }
    })
  );

  ipcMain.handle(
    'project-setting:set',
    withDb(projectManager, (db, key: string, value: unknown) => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        key,
        value_json: JSON.stringify(value ?? null),
        updated_at: now
      } satisfies ProjectSettingRecord;
      db.prepare(
        `INSERT INTO project_setting (key, value_json, updated_at)
         VALUES (@key, @value_json, @updated_at)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
      ).run(payload);
      return true;
    })
  );

  ipcMain.handle('device-setting:get', async (_event, key: string) => {
    return await deviceSettingsService.get(key);
  });

  ipcMain.handle('device-setting:set', async (_event, key: string, value: unknown) => {
    await deviceSettingsService.set(key, value);
    return true;
  });

  ipcMain.handle('personalization:background:pick', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choose canvas background image',
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, message: 'No image selected.' };
    }

    const sourcePath = result.filePaths[0];
    const ext = path.extname(sourcePath) || '.png';
    const fileName = `${sanitizeFileStem(path.basename(sourcePath, ext))}-${randomUUID().slice(0, 8)}${ext}`;
    const backgroundsDir = path.join(await ensurePersonalizationDirectory(), 'backgrounds');
    await fsp.mkdir(backgroundsDir, { recursive: true });
    const targetPath = path.join(backgroundsDir, fileName);
    await fsp.copyFile(sourcePath, targetPath);

    return {
      ok: true,
      imagePath: targetPath,
      imageFileName: path.basename(sourcePath)
    };
  });

  ipcMain.handle('personalization:theme:export', async (_event, theme: PersonalizationTheme) => {
    const normalized = normalizePersonalizationTheme(theme);
    const result = await dialog.showSaveDialog({
      title: 'Export personalization theme',
      defaultPath: path.join(app.getPath('documents'), 'vitni-theme.json'),
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) {
      return { ok: false, message: 'Export canceled.' };
    }
    await fsp.writeFile(result.filePath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
    return { ok: true, path: result.filePath };
  });

  ipcMain.handle('personalization:theme:import', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import personalization theme',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, message: 'Import canceled.' };
    }

    try {
      const raw = await fsp.readFile(result.filePaths[0], 'utf8');
      const parsed = JSON.parse(raw) as PersonalizationTheme;
      const normalized = normalizePersonalizationTheme(parsed);
      return { ok: true, theme: normalized };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Could not import the selected theme.'
      };
    }
  });

  // Project metadata convenience wrappers
  ipcMain.handle(
    'project:metadata:get',
    withDb(projectManager, (db) => {
      const row = db.prepare('SELECT value_json FROM project_setting WHERE key = ? LIMIT 1').get('project:metadata') as
        | { value_json: string }
        | undefined;
      if (!row) return null;
      try {
        return JSON.parse(row.value_json);
      } catch {
        return null;
      }
    })
  );

  ipcMain.handle(
    'project:metadata:set',
    withDb(projectManager, (db, meta: Record<string, unknown>) => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        key: 'project:metadata',
        value_json: JSON.stringify(meta ?? {}),
        updated_at: now
      } satisfies ProjectSettingRecord;
      db.prepare(
        `INSERT INTO project_setting (key, value_json, updated_at)
         VALUES (@key, @value_json, @updated_at)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
      ).run(payload);
      return true;
    })
  );

  ipcMain.handle(
    'report:generate',
    async (
      event,
      options: { template: 'full' | 'selection' | 'timeline' | 'person'; includeAttachments?: boolean; selectionIds?: string[]; personId?: string; useAI?: boolean; aiProvider?: 'ollama' | 'openai' }
    ) => {
      const db = projectManager.getDatabase();
      const sendReportProgress = (stage: string, message: string) => {
        event.sender.send('report:generate:progress', { stage, message });
      };
      sendReportProgress('preparing', 'Preparing report export…');
      const root = projectManager.getRoot();
      const manifest = projectManager.getManifest();
      const exportsRoot = path.join(root, manifest.paths.exports);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outDir = path.join(exportsRoot, `report-${options.template}-${stamp}`);
      await fsp.mkdir(outDir, { recursive: true });

      // Load metadata
      let metadata: Record<string, unknown> | null = null;
      try {
        const row = db.prepare('SELECT value_json FROM project_setting WHERE key = ? LIMIT 1').get('project:metadata') as { value_json: string } | undefined;
        metadata = row ? JSON.parse(row.value_json) : null;
      } catch {
        metadata = null;
      }

      // Load data
      sendReportProgress('loading_data', 'Loading case data…');
      const allEntities = db.prepare('SELECT * FROM entity').all() as EntityRecord[];
      const allEdges = db.prepare('SELECT * FROM edge').all() as EdgeRecord[];
      const allSources = db.prepare('SELECT * FROM source').all() as SourceRecord[];
      const assertions = db.prepare('SELECT * FROM assertion').all() as AssertionRecord[];
      const aiProvider = options.aiProvider ?? 'ollama';
      const openAIModel = (readProjectSettingJson(db, 'ai:openai:model') as string) || 'gpt-4o-mini';

      if (options.template === 'person') {
        const personId = options.personId?.trim();
        const person = personId ? allEntities.find(e => e.id === personId) : undefined;
        if (!person) {
          await fsp.writeFile(path.join(outDir, 'report.html'), '<p>Person not found.</p>', 'utf8');
          return { outputDir: outDir };
        }
        const neighborsEdges = allEdges.filter(e => e.src_id === person.id || e.dst_id === person.id);
        const neighborIds = new Set<string>();
        for (const ed of neighborsEdges) { neighborIds.add(ed.src_id); neighborIds.add(ed.dst_id); }
        neighborIds.delete(person.id);
        const neighbors = allEntities.filter(e => neighborIds.has(e.id));
        const personAssertions = assertions.filter(a => a.subject_id === person.id);
        const personSources = new Map<string, SourceRecord>();
        for (const a of personAssertions) { const s = allSources.find(s => s.id === a.source_id); if (s) personSources.set(s.id, s); }

        const birth = personAssertions.find(a => a.path.toLowerCase().includes('birth') || a.path.toLowerCase() === 'dob');
        let birthDate = '';
        try { const val = birth ? JSON.parse(birth.value_json || '{}') : null; birthDate = typeof val?.date === 'string' ? val.date : (typeof val === 'string' ? val : ''); } catch {}

        // Heuristic narrative base
        const narrativeLines: string[] = [];
        const personName = (person.label || person.id).toString();
        if (birthDate) narrativeLines.push(`${personName} was born on ${birthDate}.`);
        const edgesByType = new Map<string, EdgeRecord[]>();
        for (const ed of neighborsEdges) { const list = edgesByType.get(ed.type) || []; list.push(ed); edgesByType.set(ed.type, list); }
        const dateOf = (ed: EdgeRecord) => { try { const p = JSON.parse(ed.properties_json || '{}') as Record<string, unknown>; const d = typeof p.date === 'string' ? p.date : ''; return d; } catch { return ''; } };
        const otherLabel = (ed: EdgeRecord) => { const otherId = ed.src_id === person.id ? ed.dst_id : ed.src_id; const n = neighbors.find(nn => nn.id === otherId); return (n?.label || otherId).toString(); };
        const parental = (edgesByType.get('parent_of') || []).concat(edgesByType.get('child_of') || []);
        for (const ed of parental) { const d = dateOf(ed); const other = otherLabel(ed); const isParent = ed.type === 'parent_of' ? (ed.src_id === person.id) : (ed.dst_id === person.id); if (isParent) narrativeLines.push(`${personName} is a parent of ${other}${d ? ` (since ${d})` : ''}.`); else narrativeLines.push(`${personName} is a child of ${other}${d ? ` (since ${d})` : ''}.`); }
        const ownershipLike = (edgesByType.get('ownership') || []).concat(edgesByType.get('owns') || []);
        for (const ed of ownershipLike) { const d = dateOf(ed); const other = otherLabel(ed); let subtype = ''; try { const p = JSON.parse(ed.properties_json || '{}') as Record<string, unknown>; subtype = (p.subtype as string) || ''; } catch {} const verb = subtype === 'leases' ? 'leases' : subtype === 'borrowed' ? 'borrowed' : subtype === 'assigned_to' ? 'is assigned' : 'owns'; narrativeLines.push(`${personName} ${verb} ${other}${d ? ` (as of ${d})` : ''}.`); }
        for (const ed of edgesByType.get('employed_by') || []) { const d = dateOf(ed); const other = otherLabel(ed); narrativeLines.push(`${personName} is employed by ${other}${d ? ` (since ${d})` : ''}.`); }
        const comms = (edgesByType.get('communicated_with') || []).slice(0, 10);
        if (comms.length > 0) { const who = Array.from(new Set(comms.map(otherLabel))).join(', '); narrativeLines.push(`${personName} has communicated with ${who}.`); }
        for (const [t, list] of edgesByType.entries()) { if (['parent_of','child_of','ownership','owns','employed_by','communicated_with'].includes(t)) continue; const sample = list.slice(0, 5).map(ed => `${otherLabel(ed)}${dateOf(ed) ? ` (${dateOf(ed)})` : ''}`).join(', '); if (sample) narrativeLines.push(`${personName} has relationship "${t}" with ${sample}.`); }
        const heuristicNarrative = narrativeLines.join(' ');

        // Optional AI call
        let narrativeHtml = '';
        if (options.useAI) {
          sendReportProgress(
            'writing_narrative',
            aiProvider === 'ollama'
              ? 'Writing the person narrative with local AI… This can take a while on CPU.'
              : 'Writing the person narrative with cloud AI…'
          );
          const prompt = [
            `Subject: ${personName}${birthDate ? `, DOB: ${birthDate}` : ''}.`,
            '',
            'Facts:',
            heuristicNarrative || `${personName} is present in the case graph.`,
            '',
            'Connected entities:',
            neighbors.map((n) => `- ${n.label || n.id} [${n.type}]`).join('\n') || '- None recorded',
            '',
            'Assertions:',
            personAssertions.map((a) => `- ${a.path}: ${safeJsonForPrompt(a.value_json)}`).join('\n') || '- None recorded'
          ].join('\n');

          const instructions = [
            'You are a professional investigator writing a concise, neutral person profile.',
            'Use only the supplied facts.',
            'Write 3 to 6 short paragraphs covering background, associations, identifiers or assets, activities, and notable dated events when available.',
            'Do not speculate or introduce new facts.'
          ].join(' ');
          try {
            const response = await generateReportText({
              provider: aiProvider,
              db,
              ollamaManager,
              openAIModel,
              instructions,
              input: prompt,
              timeoutMs: getReportNarrativeTimeoutMs(aiProvider),
              onProgress: (preview) => {
                sendReportProgress('writing_narrative_preview', preview);
              }
            });
            const safe = escapeHtml(response || '').replace(/\n/g, '<br/>');
            const providerLabel = aiProvider === 'openai'
              ? openAIModel
              : (await readOllamaConfig(db)).model;
            narrativeHtml = `<p><em>AI narrative (${escapeHtml(providerLabel)})</em></p><div class="small">${safe}</div>`;
          } catch (e) {
            narrativeHtml = `<p class="muted small">AI narrative unavailable: ${escapeHtml(formatReportAIError(e))}. Using heuristic summary below.</p><p>${escapeHtml(heuristicNarrative)}</p>`;
          }
        } else {
          narrativeHtml = `<p>${escapeHtml(heuristicNarrative || 'No narrative available.')}</p>`;
        }

        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Person Profile - ${escapeHtml(person.label || person.id)}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif; background:#0b1220; color:#e2e8f0; padding:32px; }
    h1,h2,h3 { color:#fff; margin: 0.4em 0; }
    .muted { color:#94a3b8; }
    .section { margin-top:28px; padding-top:12px; border-top:1px solid #1f2a44; }
    table { width:100%; border-collapse: collapse; margin-top:8px; }
    td,th { border:1px solid #1f2a44; padding:6px 8px; font-size:13px; vertical-align: top; }
    th { background:#111827; text-align:left; }
    code { background:#111827; padding:2px 4px; border-radius:4px; }
    .small { font-size: 12px; }
  </style>
</head>
<body>
  <h1>Person Profile</h1>
  <div class="muted small">Generated ${new Date().toISOString()}</div>

  <div class="section">
    <h2>Subject</h2>
    <table><tbody>
      <tr><th style="width:200px">ID</th><td class="small"><code>${person.id}</code></td></tr>
      <tr><th>Name</th><td>${escapeHtml(person.label || '')}</td></tr>
      <tr><th>Date of Birth</th><td>${escapeHtml(birthDate)}</td></tr>
      <tr><th>Type</th><td>${escapeHtml(person.type)}</td></tr>
    </tbody></table>
  </div>

  <div class="section">
    <h2>Narrative</h2>
    ${narrativeHtml}
  </div>

  <div class="section">
    <h2>Connected Entities (${neighbors.length})</h2>
    <table>
      <thead><tr><th>ID</th><th>Type</th><th>Label</th></tr></thead>
      <tbody>
        ${neighbors.map(n => `<tr><td class="small"><code>${n.id}</code></td><td>${escapeHtml(n.type)}</td><td>${escapeHtml(n.label || '')}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Relationships (${neighborsEdges.length})</h2>
    <table>
      <thead><tr><th>ID</th><th>Type</th><th>Other Party</th><th>Properties</th></tr></thead>
      <tbody>
        ${neighborsEdges.map(ed => { const otherId = ed.src_id === person.id ? ed.dst_id : ed.src_id; const other = neighbors.find(n => n.id === otherId); let props: unknown; try { props = JSON.parse(ed.properties_json || '{}'); } catch { props = {}; } return `<tr><td class="small"><code>${ed.id}</code></td><td>${escapeHtml(ed.type)}</td><td>${other ? `${escapeHtml(other.label || other.id)}` : `<code>${otherId}</code>`}</td><td class="small"><pre>${escapeHtml(JSON.stringify(props, null, 2))}</pre></td></tr>`; }).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Assertions (${personAssertions.length})</h2>
    <table>
      <thead><tr><th>Path</th><th>Value</th><th>Source</th></tr></thead>
      <tbody>
        ${personAssertions.map(a => { let v: unknown; try { v = JSON.parse(a.value_json || '{}'); } catch { v = {}; } const s = personSources.get(a.source_id); return `<tr><td>${escapeHtml(a.path)}</td><td class=\"small\"><pre>${escapeHtml(typeof v === 'string' ? v : JSON.stringify(v, null, 2))}</pre></td><td class=\"small\">${s ? `${escapeHtml(s.title || s.locator)}${s.hash ? `<br/><code>${s.hash}</code>` : ''}` : ''}</td></tr>`; }).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

        sendReportProgress('writing_files', 'Writing report files…');
        await fsp.writeFile(path.join(outDir, 'report.html'), html, 'utf8');
        if (options.includeAttachments) {
          sendReportProgress('copying_attachments', 'Copying media and attachments…');
          const mediaSrc = path.join(root, manifest.paths.media);
          const mediaDest = path.join(outDir, 'media');
          await copyDir(mediaSrc, mediaDest);
        }
        sendReportProgress('done', 'Report export complete.');
        return { outputDir: outDir };
      }

      // Load data for general templates
      const allEntities2 = allEntities; const allEdges2 = allEdges; const allSources2 = allSources; const assertions2 = assertions;
      const selectedIds = new Set(options.selectionIds ?? []);
      const entities = options.template === 'selection' && selectedIds.size > 0
        ? allEntities2.filter(e => selectedIds.has(e.id))
        : allEntities2;
      const edges = options.template === 'selection' && selectedIds.size > 0
        ? allEdges2.filter(ed => selectedIds.has(ed.src_id) || selectedIds.has(ed.dst_id))
        : allEdges2;

      // Build timeline events
      type TimelineEvent = { date: string; label: string };
      const events: TimelineEvent[] = [];
      for (const ed of edges) {
        try {
          const props = JSON.parse(ed.properties_json || '{}') as Record<string, unknown>;
          const date = typeof props.date === 'string' ? props.date : '';
          if (date && /^\d{4}-\d{2}-\d{2}/.test(date)) {
            events.push({ date, label: `${ed.type} between ${ed.src_id} → ${ed.dst_id}` });
          }
        } catch {}
      }
      for (const asrt of assertions2) {
        if (asrt.path.toLowerCase().includes('birth') || asrt.path.toLowerCase() === 'dob') {
          try {
            const v = JSON.parse(asrt.value_json || '{}');
            const date = typeof v?.date === 'string' ? v.date : (typeof v === 'string' ? v : '');
            if (date && /^\d{4}-\d{2}-\d{2}/.test(date)) {
              events.push({ date, label: `Birth of ${asrt.subject_id}` });
            }
          } catch {}
        }
      }
      events.sort((a,b) => a.date.localeCompare(b.date));

      const bySourceId = new Map<string, { source: SourceRecord; usedIn: Array<{ entityId: string; path: string }> }>();
      for (const s of allSources2) bySourceId.set(s.id, { source: s, usedIn: [] });
      for (const a of assertions2) {
        const entry = bySourceId.get(a.source_id);
        if (entry) entry.usedIn.push({ entityId: a.subject_id, path: a.path });
      }

      const getLabel = (e: EntityRecord) => (e.label || '').toString();
      const caseTitle = escapeHtml((metadata?.['caseId'] ? `[${metadata['caseId']}] ` : '') + manifest.name);
      const authoredBy = escapeHtml((metadata?.['author'] as string) || '');
      const agency = escapeHtml((metadata?.['agency'] as string) || '');
      const description = escapeHtml((metadata?.['description'] as string) || '');
      const entityTypeCounts = countBy(entities, (entity) => entity.type);
      sendReportProgress(
        'writing_narrative',
        options.useAI
          ? aiProvider === 'ollama'
            ? 'Writing the executive summary with local AI… This can take a while on CPU.'
            : 'Writing the executive summary with cloud AI…'
          : 'Building heuristic executive summary…'
      );
      const aiReportHtml = await buildCaseReportNarrativeHtml({
        options,
        db,
        entities,
        edges,
        allSources: allSources2,
        assertions: assertions2,
        events,
        metadata,
        manifestName: manifest.name,
        entityTypeCounts,
        aiProvider,
        openAIModel,
        ollamaManager,
        onNarrativeProgress: (preview) => {
          sendReportProgress('writing_narrative_preview', preview);
        }
      });

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Investigation Report - ${caseTitle}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif; background:#0b1220; color:#e2e8f0; padding:32px; }
    h1,h2,h3 { color:#fff; margin: 0.4em 0; }
    .muted { color:#94a3b8; }
    .section { margin-top:28px; padding-top:12px; border-top:1px solid #1f2a44; }
    table { width:100%; border-collapse: collapse; margin-top:8px; }
    td,th { border:1px solid #1f2a44; padding:6px 8px; font-size:13px; vertical-align: top; }
    th { background:#111827; text-align:left; }
    code { background:#111827; padding:2px 4px; border-radius:4px; }
    .meta { display:grid; grid-template-columns: 1fr 1fr; gap:8px 16px; }
    .box { background:#0b1327; border:1px solid #1f2a44; border-radius:8px; padding:12px; }
    .small { font-size: 12px; }
  </style>
</head>
<body>
  <h1>Investigation Report</h1>
  <div class="muted small">Generated ${new Date().toISOString()}</div>
  <div class="section box">
    <div class="meta">
      <div><strong>Case</strong><br/>${caseTitle}</div>
      <div><strong>Author</strong><br/>${authoredBy}</div>
      <div><strong>Agency</strong><br/>${agency}</div>
      <div><strong>Project Created</strong><br/>${new Date(manifest.created_at).toISOString()}</div>
    </div>
    ${description ? `<div style="margin-top:12px"><strong>Summary</strong><br/>${description}</div>` : ''}
  </div>
  <div class="section">
    <h2>Methodology</h2>
    <p class="muted">This report was generated from the Vitni case database...</p>
  </div>
  ${aiReportHtml}
  <div class="section">
    <h2>Findings: Entities (${entities.length})</h2>
    <table>
      <thead><tr><th>ID</th><th>Type</th><th>Label</th><th>Properties</th></tr></thead>
      <tbody>
        ${entities.map(e => { let p:unknown; try{p=JSON.parse(e.properties_json||'{}')}catch{p={}}; return `<tr><td class="small"><code>${e.id}</code></td><td>${escapeHtml(e.type)}</td><td>${escapeHtml(getLabel(e))}</td><td class="small"><pre>${escapeHtml(JSON.stringify(p,null,2))}</pre></td></tr>`; }).join('')}
      </tbody>
    </table>
  </div>
  <div class="section">
    <h2>Findings: Relationships (${edges.length})</h2>
    <table>
      <thead><tr><th>ID</th><th>Type</th><th>Source → Target</th><th>Properties</th></tr></thead>
      <tbody>
        ${edges.map(ed => { let p:unknown; try{p=JSON.parse(ed.properties_json||'{}')}catch{p={}}; return `<tr><td class="small"><code>${ed.id}</code></td><td>${escapeHtml(ed.type)}</td><td class="small"><code>${ed.src_id}</code> → <code>${ed.dst_id}</code></td><td class="small"><pre>${escapeHtml(JSON.stringify(p,null,2))}</pre></td></tr>`; }).join('')}
      </tbody>
    </table>
  </div>
  <div class="section">
    <h2>Timeline (${events.length})</h2>
    ${events.length === 0 ? '<p class="muted">No dated events found.</p>' : `<table><thead><tr><th>Date</th><th>Event</th></tr></thead><tbody>${events.map(ev => `<tr><td>${ev.date}</td><td>${escapeHtml(ev.label)}</td></tr>`).join('')}</tbody></table>`}
  </div>
  <div class="section">
    <h2>Evidence Appendix (${allSources2.length})</h2>
    <table>
      <thead><tr><th>ID</th><th>Kind</th><th>Locator/Title</th><th>Hash</th><th>Used In</th></tr></thead>
      <tbody>
        ${Array.from(bySourceId.values()).map(entry => { const usage = entry.usedIn.map(u => `${u.entityId}:${u.path}`).join('<br/>'); return `<tr><td class="small"><code>${entry.source.id}</code></td><td>${escapeHtml(entry.source.kind)}</td><td class="small">${escapeHtml(entry.source.title || entry.source.locator)}</td><td class="small"><code>${entry.source.hash || ''}</code></td><td class="small">${usage || ''}</td></tr>`; }).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

      sendReportProgress('writing_files', 'Writing report files…');
      await fsp.writeFile(path.join(outDir, 'report.html'), html, 'utf8');
      if (options.includeAttachments) {
        sendReportProgress('copying_attachments', 'Copying media and attachments…');
        const src = path.join(root, manifest.paths.media);
        const dest = path.join(outDir, 'media');
        await copyDir(src, dest);
      }
      sendReportProgress('done', 'Report export complete.');
      return { outputDir: outDir };
    }
  );

  ipcMain.handle('project:new', async (_event, projectName?: string) => {
    const baseName = sanitizeProjectName(projectName || 'New Case');
    const res = await dialog.showSaveDialog({
      title: 'Create Investigation Project',
      defaultPath: path.join(path.dirname(projectManager.getRoot()), baseName),
      filters: [{ name: 'Vitni Project', extensions: ['vitni'] }]
    });
    if (res.canceled || !res.filePath) return false;

    const finalProjectName = path.basename(res.filePath, path.extname(res.filePath));
    await projectManager.createProject(res.filePath, finalProjectName);
    return true;
  });

  ipcMain.handle('project:saveAs', async () => {
    const currentRoot = projectManager.getRoot();
    const currentName = projectManager.getManifest().name;
    const res = await dialog.showSaveDialog({
      title: 'Save Investigation Project As',
      defaultPath: path.join(path.dirname(currentRoot), `${currentName} Copy`),
      filters: [{ name: 'Vitni Project', extensions: ['vitni'] }]
    });
    if (res.canceled || !res.filePath) return false;

    await projectManager.saveAs(res.filePath);
    return true;
  });

  ipcMain.handle('project:open', async () => {
    const res = await dialog.showOpenDialog({
      title: 'Open Investigation Project',
      properties: ['openDirectory']
    });
    if (res.canceled || !res.filePaths?.[0]) return false;

    await projectManager.openProject(res.filePaths[0]);
    return true;
  });

  ipcMain.handle('project:open:path', async (_e, projectPath: string) => {
    try {
      await projectManager.openProject(projectPath);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: String((error as Error).message) };
    }
  });

  ipcMain.handle('project:recent', async () => {
    return await projectManager.getRecentProjects();
  });

  ipcMain.handle('project:recent:remove', async (_e, projectPath: string) => {
    return await projectManager.removeRecentProject(projectPath);
  });

  ipcMain.handle('project:example:info', async () => {
    const projectPath = resolveExampleProjectPath();
    if (!projectPath) {
      return { available: false, name: 'Example Case' };
    }
    return {
      available: true,
      name: 'Operation Circuit Ledger',
      path: projectPath
    };
  });

  ipcMain.handle('project:example:open', async () => {
    const projectPath = resolveExampleProjectPath();
    if (!projectPath) {
      return { ok: false, message: 'Example project is not available in this build.' };
    }

    try {
      await projectManager.openProject(projectPath);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: String((error as Error).message) };
    }
  });

  ipcMain.handle('media:list', async (): Promise<{ items: MediaLibraryItem[]; folders: MediaFolderNode[] }> => {
    return {
      items: projectManager.getMediaLibraryItems(),
      folders: await projectManager.getMediaFolders()
    };
  });

  ipcMain.handle('media:folder:create', async (_event, folderPath: string): Promise<MediaFolderNode> => {
    return await projectManager.createMediaFolder(folderPath);
  });

  ipcMain.handle('media:rename', async (_event, payload: { sourceId: string; displayName: string; fileName?: string }) => {
    return await projectManager.renameMedia(payload.sourceId, payload.displayName, payload.fileName);
  });

  ipcMain.handle('media:move', async (_event, payload: { sourceIds: string[]; destinationFolderPath: string }) => {
    return await projectManager.moveMedia(payload.sourceIds, payload.destinationFolderPath);
  });

  ipcMain.handle('media:upload', async (_event, payload: UploadMediaPayload): Promise<MediaLibraryItem> => {
    const buffer = Buffer.isBuffer(payload.data) ? payload.data : Buffer.from(payload.data);
    return await projectManager.uploadMedia({
      buffer,
      fileName: payload.name,
      mimeType: payload.mime,
      folderPath: payload.folderPath,
      title: payload.title,
      kind: payload.kind
    });
  });

  ipcMain.handle('media:replace', async (_event, payload: ReplaceMediaPayload): Promise<MediaLibraryItem> => {
    const buffer = Buffer.isBuffer(payload.data) ? payload.data : Buffer.from(payload.data);
    return await projectManager.replaceMedia(payload.sourceId, {
      buffer,
      fileName: payload.name,
      mimeType: payload.mime
    });
  });

  ipcMain.handle(
    'project:attachFile',
    async (
      _event,
      payload: { data: Buffer | Uint8Array; name: string; mime: string }
    ): Promise<AttachmentResult> => {
      const buffer = Buffer.isBuffer(payload.data) ? payload.data : Buffer.from(payload.data);
      return projectManager.attachFile(buffer, payload.name, payload.mime);
    }
  );

  ipcMain.handle(
    'project:getAttachmentData',
    async (_event, payload: AttachmentRequestPayload) => {
      const buffer = await projectManager.readAttachment(payload.locator);
      return {
        base64: buffer.toString('base64'),
        mimeType: payload.mime ?? 'application/octet-stream',
        fileName: path.basename(payload.locator)
      };
    }
  );

  ipcMain.handle(
    'project:getAttachmentDataBySourceId',
    async (_event, payload: AttachmentBySourceRequestPayload) => {
      const attachment = await projectManager.readAttachmentBySourceId(payload.sourceId);
      return {
        base64: attachment.buffer.toString('base64'),
        mimeType: attachment.mimeType,
        fileName: attachment.fileName
      };
    }
  );

  ipcMain.handle(
    'db:entity:delete',
    withDb(projectManager, (db, entityId: string) => {
      db.prepare('DELETE FROM assertion WHERE subject_id = ?').run(entityId);
      db.prepare('DELETE FROM edge WHERE src_id = ? OR dst_id = ?').run(entityId, entityId);
      const result = db.prepare('DELETE FROM entity WHERE id = ?').run(entityId);
      return result.changes > 0;
    })
  );

  ipcMain.handle(
    'db:entity:update',
    withDb(projectManager, (db, entityId: string, updates: { label?: string; properties?: Record<string, unknown> }) => {
      const updatesList: string[] = [];
      const params: Record<string, unknown> = { id: entityId };

      if (updates.label !== undefined) {
        updatesList.push('label = @label');
        params.label = updates.label;
      }

      if (updates.properties !== undefined) {
        updatesList.push('properties_json = @properties');
        params.properties = JSON.stringify(updates.properties);
      }

      if (updatesList.length === 0) {
        return false;
      }

      const query = `UPDATE entity SET ${updatesList.join(', ')} WHERE id = @id`;
      const result = db.prepare(query).run(params);
      return result.changes > 0;
    })
  );

  ipcMain.handle(
    'db:entity:update-position',
    withDb(projectManager, (db, entityId: string, pos: { x: number; y: number }) => {
      const stmt = db.prepare('UPDATE entity SET pos_x = @x, pos_y = @y, updated_at = @now WHERE id = @id');
      const res = stmt.run({ id: entityId, x: pos.x, y: pos.y, now: Math.floor(Date.now() / 1000) });
      return res.changes > 0;
    })
  );

  ipcMain.handle(
    'db:edge:delete',
    withDb(projectManager, (db, edgeId: string) => {
      const result = db.prepare('DELETE FROM edge WHERE id = ?').run(edgeId);
      return result.changes > 0;
    })
  );

  ipcMain.handle(
    'db:edge:update',
    withDb(projectManager, (db, edgeId: string, updates: { type?: string; properties?: Record<string, unknown> }) => {
      const updatesList: string[] = [];
      const params: Record<string, unknown> = { id: edgeId };

      if (updates.type !== undefined) {
        updatesList.push('type = @type');
        params.type = updates.type;
      }

      if (updates.properties !== undefined) {
        updatesList.push('properties_json = @properties');
        params.properties = JSON.stringify(updates.properties);
      }

      if (updatesList.length === 0) {
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      updatesList.push('updated_at = @updated_at');
      params.updated_at = now;

      const query = `UPDATE edge SET ${updatesList.join(', ')} WHERE id = @id`;
      const result = db.prepare(query).run(params);
      return result.changes > 0;
    })
  );
}

async function buildCaseReportNarrativeHtml({
  options,
  db,
  entities,
  edges,
  allSources,
  assertions,
  events,
  metadata,
  manifestName,
  entityTypeCounts,
  aiProvider,
  openAIModel,
  ollamaManager,
  onNarrativeProgress
}: {
  options: { template: 'full' | 'selection' | 'timeline' | 'person'; useAI?: boolean };
  db: DbConnection;
  entities: EntityRecord[];
  edges: EdgeRecord[];
  allSources: SourceRecord[];
  assertions: AssertionRecord[];
  events: Array<{ date: string; label: string }>;
  metadata: Record<string, unknown> | null;
  manifestName: string;
  entityTypeCounts: Record<string, number>;
  aiProvider: 'ollama' | 'openai';
  openAIModel: string;
  ollamaManager: OllamaManager;
  onNarrativeProgress?: (preview: string) => void;
}): Promise<string> {
  const heuristic = buildHeuristicCaseSummary({
    template: options.template,
    manifestName,
    metadata,
    entityTypeCounts,
    edges,
    assertions,
    allSources,
    events
  });

  if (!options.useAI) {
    return `<div class="section"><h2>Executive Summary</h2><p>${escapeHtml(heuristic)}</p></div>`;
  }

  const instructions = aiProvider === 'ollama'
    ? [
        'You are writing a grounded investigation summary from a case database.',
        'Use only the provided facts from the input.',
        'Never invent people, companies, incidents, industries, agencies, or evidence sources.',
        'If a fact is not in the input, omit it.',
        'Write exactly 6 bullet points.',
        'Each bullet must be one or two short sentences.',
        'Prefer wording copied closely from the provided entity labels, relationship types, dates, and evidence source titles.',
        'Do not use generic examples or outside knowledge.'
      ].join(' ')
    : [
        'You are an investigator writing a neutral case report.',
        'Use only the provided facts from the case database.',
        'Write 4 to 8 short paragraphs.',
        'Cover case overview, key actors, infrastructure or identifiers, communications or relationships, financial activity if present, timeline highlights, and evidence posture.',
        'Do not speculate, accuse, or add facts that are not in the input.'
      ].join(' ');
  const input = [
    `Report template: ${options.template}`,
    `Case name: ${manifestName}`,
    metadata?.['caseId'] ? `Case ID: ${String(metadata.caseId)}` : '',
    metadata?.['author'] ? `Author: ${String(metadata.author)}` : '',
    metadata?.['agency'] ? `Agency: ${String(metadata.agency)}` : '',
    metadata?.['description'] ? `Project description: ${String(metadata.description)}` : '',
    '',
    `Entity count: ${entities.length}`,
    `Relationship count: ${edges.length}`,
    `Assertion count: ${assertions.length}`,
    `Source count: ${allSources.length}`,
    `Dated events: ${events.length}`,
    '',
    'Entity types:',
    Object.entries(entityTypeCounts).map(([type, count]) => `- ${type}: ${count}`).join('\n') || '- None',
    '',
    'Key entities:',
    entities.slice(0, 30).map((entity) => {
      const props = safeJsonForPrompt(entity.properties_json);
      return `- ${entity.label || entity.id} [${entity.type}] :: ${props}`;
    }).join('\n') || '- None',
    '',
    'Key relationships:',
    edges.slice(0, 40).map((edge) => {
      const props = safeJsonForPrompt(edge.properties_json);
      return `- ${edge.type}: ${edge.src_id} -> ${edge.dst_id}${props ? ` :: ${props}` : ''}`;
    }).join('\n') || '- None',
    '',
    'Timeline highlights:',
    events.slice(0, 25).map((event) => `- ${event.date}: ${event.label}`).join('\n') || '- None',
    '',
    'Evidence sources:',
    allSources.slice(0, 20).map((source) => `- ${source.kind}: ${source.title || source.locator}`).join('\n') || '- None'
  ].filter(Boolean).join('\n');

  const groundingContext = buildNarrativeGroundingContext({
    manifestName,
    metadata,
    entities,
    allSources
  });

  try {
    const reportTimeoutMs = getReportNarrativeTimeoutMs(aiProvider);
    const generated = await generateReportText({
      provider: aiProvider,
      db,
      ollamaManager,
      openAIModel,
      instructions,
      input,
      timeoutMs: reportTimeoutMs,
      onProgress: onNarrativeProgress
    });
    if (aiProvider === 'ollama') {
      const validation = validateNarrativeGrounding(generated, groundingContext);
      if (!validation.ok) {
        throw new Error(`Grounding check failed: ${validation.reason}`);
      }
    }
    const providerLabel = aiProvider === 'openai'
      ? openAIModel
      : (await readOllamaConfig(db)).model;
    return `<div class="section"><h2>Executive Summary</h2><p class="muted small">Written with AI (${escapeHtml(providerLabel)}).</p><div>${escapeHtml(generated).replace(/\n/g, '<br/>')}</div></div>`;
  } catch (error) {
    return `<div class="section"><h2>Executive Summary</h2><p class="muted small">AI summary unavailable: ${escapeHtml(formatReportAIError(error))}.</p><p>${escapeHtml(heuristic)}</p></div>`;
  }
}

async function generateReportText({
  provider,
  db,
  ollamaManager,
  openAIModel,
  instructions,
  input,
  timeoutMs,
  onProgress
}: {
  provider: 'ollama' | 'openai';
  db: DbConnection;
  ollamaManager: OllamaManager;
  openAIModel: string;
  instructions: string;
  input: string;
  timeoutMs: number;
  onProgress?: (preview: string) => void;
}) {
  if (provider === 'openai') {
    return await openAIService.generateText({
      model: openAIModel,
      instructions,
      input,
      timeoutMs
    });
  }

  const { endpoint, model } = await readOllamaConfig(db);
  const ok = await ollamaManager.ensure(endpoint);
  if (!ok) {
    throw new Error('Local AI is not installed or not running.');
  }
  const reachableEndpoint = await ollamaManager.resolveReachableEndpoint(endpoint);
  if (!reachableEndpoint) {
    throw new Error('Local AI is not reachable at the configured endpoint.');
  }
  const modelReady = await ensureOllamaModelAvailable(reachableEndpoint, endpoint, model, ollamaManager);
  if (!modelReady.ok) {
    throw new Error(modelReady.message || 'The selected local AI model is not available.');
  }
  const fullPrompt = `${instructions}\n\n${input}`;
  try {
    return await ollamaGenerate(reachableEndpoint, model, fullPrompt, timeoutMs, onProgress);
  } catch (error) {
    const message = String((error as Error)?.message || '');
    if (!message.toLowerCase().includes('timeout')) {
      throw error;
    }
    const reducedInput = shrinkPromptForLocalReport(input);
    const reducedPrompt = `${instructions}\n\n${reducedInput}`;
    onProgress?.('First local AI attempt timed out. Retrying with a shorter prompt…');
    return await ollamaGenerate(reachableEndpoint, model, reducedPrompt, Math.max(120000, Math.floor(timeoutMs * 0.75)), onProgress);
  }
}

async function ensureOllamaModelAvailable(
  reachableEndpoint: string,
  configuredEndpoint: string,
  model: string,
  ollamaManager: OllamaManager
): Promise<{ ok: boolean; message?: string }> {
  try {
    const modelNames = await ollamaManager.listModelNames(reachableEndpoint);
    if (modelNames.some((name) => ollamaModelNameMatches(name, model))) {
      return { ok: true };
    }
  } catch {
    // fall through to pull attempt
  }

  return await pullOllamaModel(configuredEndpoint, model, ollamaManager);
}

function getDefaultOllamaModel() {
  return 'llama3.2:1b';
}

function getReportNarrativeTimeoutMs(provider: 'ollama' | 'openai') {
  return provider === 'ollama' ? 240000 : 45000;
}

function ollamaModelNameMatches(availableName: string, requestedModel: string) {
  const available = availableName.trim().toLowerCase();
  const requested = requestedModel.trim().toLowerCase();
  if (!available || !requested) return false;
  if (available === requested) return true;
  if (available.startsWith(`${requested} `)) return true;
  if (available.startsWith(`${requested}\t`)) return true;
  return false;
}

function shrinkPromptForLocalReport(input: string) {
  const lines = input.split('\n');
  const sectionsToTrim = new Set(['Key entities:', 'Key relationships:', 'Timeline highlights:', 'Evidence sources:', 'Connected entities:', 'Assertions:']);
  const result: string[] = [];
  let activeSection = '';
  let keptInSection = 0;

  for (const line of lines) {
    if (sectionsToTrim.has(line.trim())) {
      activeSection = line.trim();
      keptInSection = 0;
      result.push(line);
      continue;
    }
    if (!line.trim()) {
      activeSection = '';
      keptInSection = 0;
      result.push(line);
      continue;
    }
    if (activeSection) {
      if (keptInSection < 8) {
        result.push(line);
      } else if (keptInSection === 8) {
        result.push('- Additional items omitted for local AI retry');
      }
      keptInSection += 1;
      continue;
    }
    result.push(line);
  }

  return result.join('\n');
}

function buildNarrativeGroundingContext({
  manifestName,
  metadata,
  entities,
  allSources
}: {
  manifestName: string;
  metadata: Record<string, unknown> | null;
  entities: EntityRecord[];
  allSources: SourceRecord[];
}) {
  const allowedPhrases = new Set<string>();
  const addPhrase = (value: unknown) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (trimmed.length < 3) return;
    allowedPhrases.add(trimmed.toLowerCase());
  };

  addPhrase(manifestName);
  addPhrase(metadata?.caseId);
  addPhrase(metadata?.author);
  addPhrase(metadata?.agency);
  addPhrase(metadata?.description);

  for (const entity of entities) {
    addPhrase(entity.label);
    addPhrase(entity.type);
  }
  for (const source of allSources) {
    addPhrase(source.title);
    addPhrase(source.kind);
  }

  const allowedWords = new Set<string>();
  for (const phrase of allowedPhrases) {
    for (const token of phrase.split(/[^a-z0-9]+/i)) {
      if (token.length >= 4) {
        allowedWords.add(token.toLowerCase());
      }
    }
  }

  return {
    allowedPhrases,
    allowedWords
  };
}

function validateNarrativeGrounding(
  narrative: string,
  context: {
    allowedPhrases: Set<string>;
    allowedWords: Set<string>;
  }
) {
  const normalized = narrative.trim();
  if (!normalized) {
    return { ok: false, reason: 'the model returned no text' };
  }

  const capitalizedPhrases = normalized.match(/\b[A-Z][a-z]+(?:\s+[A-Z][A-Za-z0-9.&-]+){0,3}\b/g) || [];
  const suspiciousPhrases = capitalizedPhrases.filter((phrase) => {
    const lower = phrase.toLowerCase();
    if (context.allowedPhrases.has(lower)) return false;
    if (COMMON_REPORT_PHRASES.has(lower)) return false;
    return phrase.split(/\s+/).length >= 2;
  });

  if (suspiciousPhrases.length >= 2) {
    return {
      ok: false,
      reason: `the local model introduced outside names (${suspiciousPhrases.slice(0, 3).join(', ')})`
    };
  }

  const tokens = normalized
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
  const overlaps = tokens.filter((token) => context.allowedWords.has(token)).length;
  const overlapRatio = tokens.length > 0 ? overlaps / tokens.length : 0;

  if (tokens.length >= 20 && overlapRatio < 0.08) {
    return {
      ok: false,
      reason: 'the local model output does not overlap enough with the case vocabulary'
    };
  }

  return { ok: true as const };
}

async function buildOllamaStatus(db: DbConnection, ollamaManager: OllamaManager) {
  const { endpoint, model } = await readOllamaConfig(db);
  const ollamaInstalled = Boolean(ollamaManager.getResolvedBinary());
  const serverUp = await ollamaManager.isAvailable(endpoint);
  let modelAvailable = false;
  if (serverUp) {
    try {
      const modelNames = await ollamaManager.listModelNames(endpoint);
      modelAvailable = modelNames.some((name) => ollamaModelNameMatches(name, model));
    } catch {
      modelAvailable = false;
    }
  }

  const recommendedAction = !ollamaInstalled
    ? 'install'
    : !serverUp
      ? 'start'
      : !modelAvailable
        ? 'download_model'
        : 'ready';

  return {
    endpoint,
    model,
    ollamaInstalled,
    serverUp,
    modelAvailable,
    setupRequired: recommendedAction !== 'ready',
    recommendedAction,
    downloadEstimateMb: getOllamaModelDownloadEstimateMb(model)
  };
}

function getOllamaModelDownloadEstimateMb(model: string) {
  const normalized = model.toLowerCase();
  if (normalized.includes('tinyllama')) return 700;
  if (normalized.includes('llama3.2:1b')) return 1300;
  if (normalized.includes('llama3.2:3b')) return 2200;
  if (normalized.includes('qwen2.5:7b') || normalized.includes('llama3.1:8b')) return 4800;
  return 2200;
}

async function installOllamaForSetup(
  onProgress?: (message: string) => void
): Promise<{ ok: boolean; message?: string; awaitingExternalInstall?: boolean }> {
  if (process.platform === 'linux') {
    const pkexecResult = await tryPkexecOllamaInstall(onProgress);
    if (pkexecResult.handled) {
      return {
        ok: pkexecResult.ok,
        message: pkexecResult.message,
        awaitingExternalInstall: pkexecResult.awaitingExternalInstall
      };
    }

    const terminalResult = await tryTerminalOllamaInstall(onProgress);
    if (terminalResult.handled) {
      return {
        ok: terminalResult.ok,
        message: terminalResult.message,
        awaitingExternalInstall: terminalResult.awaitingExternalInstall
      };
    }
  }

  return new Promise((resolve) => {
    let cmd = '';
    let args: string[] = [];
    if (process.platform === 'win32') {
      cmd = 'winget';
      args = ['install', 'Ollama.Ollama', '-e', '--silent'];
    } else {
      cmd = 'sh';
      args = ['-c', 'curl -fsSL https://ollama.com/install.sh | sh'];
    }
    try {
      onProgress?.(getInitialOllamaInstallMessage());
      const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      let stdout = '';
      let latestLine = '';
      const startedAt = Date.now();
      const emitProgress = () => {
        onProgress?.(formatOllamaInstallProgress({ elapsedMs: Date.now() - startedAt, latestLine }));
      };
      child.stdout?.on('data', (chunk) => {
        stdout = `${stdout}\n${chunk.toString()}`.trim().slice(-2000);
        latestLine = extractLastOutputLine(stdout) || latestLine;
        emitProgress();
      });
      child.stderr?.on('data', (chunk) => {
        stderr = `${stderr}\n${chunk.toString()}`.trim().slice(-2000);
        latestLine = extractLastOutputLine(stderr) || latestLine;
        emitProgress();
      });

      const heartbeat = setInterval(() => {
        emitProgress();
      }, 15000);
      const timeout = setTimeout(() => {
        try {
          child.kill('SIGTERM');
        } catch {
          // ignore
        }
        clearInterval(heartbeat);
        resolve({
          ok: false,
          message: 'Automatic Ollama install timed out. This usually means the system installer is waiting on permissions or network access.'
        });
      }, 180000);

      child.on('error', () => {
        clearInterval(heartbeat);
        clearTimeout(timeout);
        resolve({ ok: false, message: 'Automatic Ollama install could not be started.' });
      });
      child.on('exit', (code) => {
        clearInterval(heartbeat);
        clearTimeout(timeout);
        if (code === 0) {
          resolve({ ok: true });
          return;
        }
        resolve({ ok: false, message: formatOllamaInstallFailure(stderr || stdout) });
      });
    } catch {
      resolve({ ok: false, message: 'Automatic Ollama install failed.' });
    }
  });
}

async function tryPkexecOllamaInstall(
  onProgress?: (message: string) => void
): Promise<{ handled: boolean; ok: boolean; message?: string; awaitingExternalInstall?: boolean }> {
  const pkexec = resolveCommandBinary('pkexec');
  if (!pkexec) {
    return { handled: false, ok: false };
  }

  return new Promise((resolve) => {
    try {
      onProgress?.(
        'Requesting system permission to install Ollama…\nA native authentication prompt should appear.'
      );
      const child = spawn(pkexec, ['sh', '-lc', 'curl -fsSL https://ollama.com/install.sh | sh'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      let stdout = '';
      let stderr = '';
      let latestLine = '';
      const startedAt = Date.now();
      const emitProgress = () => {
        onProgress?.(formatPkexecInstallProgress({ elapsedMs: Date.now() - startedAt, latestLine }));
      };
      child.stdout?.on('data', (chunk) => {
        stdout = `${stdout}\n${chunk.toString()}`.trim().slice(-2000);
        latestLine = extractLastOutputLine(stdout) || latestLine;
        emitProgress();
      });
      child.stderr?.on('data', (chunk) => {
        stderr = `${stderr}\n${chunk.toString()}`.trim().slice(-2000);
        latestLine = extractLastOutputLine(stderr) || latestLine;
        emitProgress();
      });

      const heartbeat = setInterval(() => {
        emitProgress();
      }, 10000);
      const timeout = setTimeout(() => {
        try {
          child.kill('SIGTERM');
        } catch {
          // ignore
        }
        clearInterval(heartbeat);
        resolve({
          handled: true,
          ok: false,
          message:
            'The system permission prompt did not complete. If you do not see it, Vitni can open the installer in a terminal instead.'
        });
      }, 120000);

      child.on('error', () => {
        clearInterval(heartbeat);
        clearTimeout(timeout);
        resolve({ handled: false, ok: false });
      });
      child.on('exit', (code) => {
        clearInterval(heartbeat);
        clearTimeout(timeout);
        if (code === 0) {
          resolve({ handled: true, ok: true });
          return;
        }
        const detail = stderr || stdout;
        const normalized = detail.toLowerCase();
        if (
          normalized.includes('not authorized') ||
          normalized.includes('authentication failed') ||
          normalized.includes('dismissed') ||
          normalized.includes('canceled')
        ) {
          resolve({
            handled: true,
            ok: false,
            message:
              'The system permission prompt was cancelled. You can try again or use the terminal installer below.'
          });
          return;
        }
        resolve({ handled: false, ok: false });
      });
    } catch {
      resolve({ handled: false, ok: false });
    }
  });
}

async function tryTerminalOllamaInstall(
  onProgress?: (message: string) => void
): Promise<{ handled: boolean; ok: boolean; message?: string; awaitingExternalInstall?: boolean }> {
  const terminal = resolveTerminalBinary();
  if (!terminal) {
    return { handled: false, ok: false };
  }

  const installScript = [
    'echo "Vitni is opening the Ollama installer in this terminal."',
    'echo "You may be asked for your system password."',
    'echo',
    'curl -fsSL https://ollama.com/install.sh | sh',
    'status=$?',
    'echo',
    'if [ "$status" -eq 0 ]; then',
    '  echo "Ollama install completed. You can return to Vitni and click Repair / re-check."',
    'else',
    '  echo "Ollama install failed with exit code $status."',
    'fi',
    'echo',
    'echo "Press Enter to close this terminal."',
    'read _'
  ].join('; ');

  const launch = spawnTerminalCommand(terminal, installScript);
  if (!launch) {
    return { handled: false, ok: false };
  }

  onProgress?.(
    `Opened the Ollama installer in ${path.basename(terminal)}.\nComplete the install there, then come back and click Repair / re-check.`
  );
  return {
    handled: true,
    ok: false,
    awaitingExternalInstall: true,
    message: `Opened the Ollama installer in ${path.basename(terminal)}. Complete the install there, then click Repair / re-check.`
  };
}

function resolveCommandBinary(command: string) {
  const pathValue = process.env.PATH || '';
  for (const entry of pathValue.split(path.delimiter).filter(Boolean)) {
    const candidate = path.join(entry, command);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // continue
    }
  }
  return null;
}

function resolveTerminalBinary() {
  const candidates = [
    'x-terminal-emulator',
    'gnome-terminal',
    'konsole',
    'xfce4-terminal',
    'kitty',
    'alacritty',
    'xterm'
  ];
  for (const candidate of candidates) {
    const resolved = resolveCommandBinary(candidate);
    if (resolved) return resolved;
  }
  return null;
}

function spawnTerminalCommand(terminal: string, shellScript: string) {
  const terminalName = path.basename(terminal);
  let args: string[];
  if (terminalName === 'gnome-terminal' || terminalName === 'xfce4-terminal' || terminalName === 'x-terminal-emulator') {
    args = ['--', 'bash', '-lc', shellScript];
  } else if (terminalName === 'konsole') {
    args = ['-e', 'bash', '-lc', shellScript];
  } else if (terminalName === 'kitty' || terminalName === 'alacritty' || terminalName === 'xterm') {
    args = ['-e', 'bash', '-lc', shellScript];
  } else {
    return false;
  }

  try {
    const child = spawn(terminal, args, {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function getInitialOllamaInstallMessage() {
  if (process.platform === 'win32') {
    return 'Starting Ollama install via winget.\nThis can take a few minutes and may require Windows package manager access.';
  }
  return 'Preparing Ollama install.\nVitni will first ask the operating system for permission, then fall back to a visible terminal installer if needed.';
}

function formatOllamaInstallProgress({
  elapsedMs,
  latestLine
}: {
  elapsedMs: number;
  latestLine: string;
}) {
  const seconds = Math.max(1, Math.round(elapsedMs / 1000));
  const base = `Installing Ollama… ${seconds}s elapsed.`;
  const normalized = latestLine.toLowerCase();

  if (!latestLine) {
    if (process.platform === 'win32') {
      return `${base}\nWaiting for winget to start the install.`;
    }
    if (seconds >= 30) {
      return `${base}\nNo installer output yet. On Linux this often means the installer is waiting on package permissions or network access.`;
    }
    return `${base}\nPreparing the installer.`;
  }

  if (normalized.includes('password') || normalized.includes('sudo')) {
    return `${base}\nInstaller output: ${latestLine}\nThe installer may be waiting for elevated system permissions.`;
  }
  if (normalized.includes('download') || normalized.includes('%') || normalized.includes('fetch')) {
    return `${base}\nInstaller output: ${latestLine}\nDownloading the Ollama runtime.`;
  }
  if (normalized.includes('rpm') || normalized.includes('deb') || normalized.includes('apt') || normalized.includes('dnf') || normalized.includes('yum')) {
    return `${base}\nInstaller output: ${latestLine}\nUsing the system package manager.`;
  }
  if (normalized.includes('winget')) {
    return `${base}\nInstaller output: ${latestLine}\nUsing Windows package manager.`;
  }

  return `${base}\nInstaller output: ${latestLine}`;
}

function formatPkexecInstallProgress({
  elapsedMs,
  latestLine
}: {
  elapsedMs: number;
  latestLine: string;
}) {
  const seconds = Math.max(1, Math.round(elapsedMs / 1000));
  const base = `Requesting system permission to install Ollama… ${seconds}s elapsed.`;
  if (!latestLine) {
    if (seconds < 15) {
      return `${base}\nA native authentication prompt should appear outside Vitni.`;
    }
    return `${base}\nStill waiting for the system permission prompt or for permission to be confirmed.`;
  }
  return `${base}\nInstaller output: ${latestLine}`;
}

function extractLastOutputLine(output: string) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines[lines.length - 1] : '';
}

async function pullOllamaModel(endpoint: string, model: string, ollamaManager: OllamaManager): Promise<{ ok: boolean; message?: string }> {
  const ok = await ollamaManager.ensure(endpoint);
  if (!ok) {
    return { ok: false, message: 'The local AI service is not available.' };
  }

  const reachableEndpoint = await ollamaManager.resolveReachableEndpoint(endpoint);
  if (!reachableEndpoint) {
    return { ok: false, message: 'The local AI service is not reachable.' };
  }

  try {
    const res = await fetch(`${reachableEndpoint.replace(/\/$/, '')}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: false })
    } as any);
    if (res.ok) {
      return { ok: true };
    }
  } catch {
    // fall through to CLI
  }

  const bin = ollamaManager.getResolvedBinary();
  if (!bin) {
    return { ok: false, message: 'Ollama binary not found after setup.' };
  }

  try {
    const child = spawn(bin, ['pull', model], { stdio: 'pipe' });
    let stderr = '';
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    const exitCode: number = await new Promise((resolve) => child.on('exit', (code) => resolve(code ?? 1)));
    if (exitCode === 0) {
      return { ok: true };
    }
    return { ok: false, message: stderr.slice(0, 160) || 'Model download failed.' };
  } catch {
    return { ok: false, message: 'Model download failed.' };
  }
}

function buildHeuristicCaseSummary({
  template,
  manifestName,
  metadata,
  entityTypeCounts,
  edges,
  assertions,
  allSources,
  events
}: {
  template: 'full' | 'selection' | 'timeline' | 'person';
  manifestName: string;
  metadata: Record<string, unknown> | null;
  entityTypeCounts: Record<string, number>;
  edges: EdgeRecord[];
  assertions: AssertionRecord[];
  allSources: SourceRecord[];
  events: Array<{ date: string; label: string }>;
}) {
  const topTypes = Object.entries(entityTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');
  const datedRelationships = edges.filter((edge) => {
    try {
      const props = JSON.parse(edge.properties_json || '{}') as Record<string, unknown>;
      return typeof props.date === 'string' && props.date.length > 0;
    } catch {
      return false;
    }
  }).length;
  return [
    `${metadata?.['caseId'] ? `[${String(metadata.caseId)}] ` : ''}${manifestName} was exported as a ${template} report.`,
    topTypes ? `The graph is centered on ${topTypes}.` : 'The graph contains investigative entities and relationships.',
    `${edges.length} relationships, ${assertions.length} assertions, and ${allSources.length} evidence sources are represented.`,
    events.length > 0
      ? `${events.length} dated events were identified, with ${datedRelationships} relationship records carrying explicit dates.`
      : 'No dated events were extracted into the timeline section.'
  ].join(' ');
}

function countBy<T>(items: T[], keyFn: (item: T) => string) {
  const result: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function safeJsonForPrompt(value: string) {
  try {
    const parsed = JSON.parse(value || '{}');
    return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
  } catch {
    return value || '';
  }
}

function formatReportAIError(error: unknown) {
  const message = String((error as Error)?.message || 'Unknown error');
  const normalized = message.toLowerCase();

  if (normalized.includes('insufficient_quota') || normalized.includes('exceeded your current quota')) {
    return 'your OpenAI account has no remaining API quota';
  }
  if (normalized.includes('http 429') || normalized.includes('rate limit')) {
    return 'the AI provider rate-limited the request';
  }
  if (normalized.includes('http 401') || normalized.includes('invalid api key') || normalized.includes('incorrect api key')) {
    return 'the OpenAI API key was rejected';
  }
  if (normalized.includes('http 403')) {
    return 'the AI request was not permitted by the provider';
  }
  if (normalized.includes('http 404') || normalized.includes('model') && normalized.includes('not found')) {
    return 'the selected local AI model is not downloaded on this device';
  }
  if (normalized.includes('abort') || normalized.includes('timeout')) {
    return 'the AI request timed out';
  }
  if (normalized.includes('not configured')) {
    return 'cloud AI is not configured on this device';
  }
  if (normalized.includes('not installed or not running')) {
    return 'local AI is not available';
  }
  if (normalized.includes('grounding check failed')) {
    return 'the local AI output did not stay grounded in the case data and was discarded';
  }

  return 'the AI provider could not generate a narrative for this export';
}

function formatLocalAIStartFailure(endpoint: string, detail?: string | null) {
  const normalized = (detail || '').toLowerCase();
  if (normalized.includes('address already in use')) {
    return `Local AI could not bind to ${endpoint} because the port is already in use.`;
  }
  if (normalized.includes('permission denied')) {
    return 'Local AI could not be started because the Ollama binary is not executable or lacks permissions.';
  }
  if (normalized.includes('not become ready')) {
    return `Local AI was launched but did not become ready at ${endpoint}.`;
  }
  if (normalized.includes('failed to launch ollama') || normalized.includes('failed to spawn ollama')) {
    return 'Local AI could not launch the Ollama runtime.';
  }
  if (detail && detail.trim().length > 0) {
    return `Local AI could not be started: ${detail.trim()}`;
  }
  return 'Local AI could not be started.';
}

function formatOllamaInstallFailure(detail: string) {
  const normalized = detail.toLowerCase();
  if (normalized.includes('sudo') || normalized.includes('permission denied') || normalized.includes('not permitted')) {
    return 'Automatic Ollama install failed because the system installer needs elevated permissions.';
  }
  if (normalized.includes('curl:') || normalized.includes('could not resolve') || normalized.includes('failed to connect')) {
    return 'Automatic Ollama install failed because the runtime could not be downloaded.';
  }
  if (normalized.includes('winget')) {
    return 'Automatic Ollama install failed through winget. Open Advanced controls to install it manually.';
  }
  return 'Automatic Ollama install failed. Open Advanced controls for manual installation.';
}

const COMMON_REPORT_PHRASES = new Set([
  'executive summary',
  'investigation report',
  'case database',
  'evidence sources',
  'key actors',
  'key entities',
  'timeline highlights',
  'financial activity',
  'workplace safety'
]);

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

async function copyDir(src: string, dest: string) {
  try { await fsp.mkdir(dest, { recursive: true }); } catch {}
  const entries = await fsp.readdir(src, { withFileTypes: true }).catch(() => [] as fs.Dirent[]);
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await fsp.copyFile(s, d).catch(() => {});
  }
}

async function ollamaGenerate(
  endpoint: string,
  model: string,
  prompt: string,
  timeoutMs = 20000,
  onProgress?: (preview: string) => void
): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: true }),
      signal: controller.signal
    } as any);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) {
      throw new Error('No response body from local AI.');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let responseText = '';
    let lastPreviewAt = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const data = JSON.parse(trimmed) as { response?: string; done?: boolean };
        if (data.response) {
          responseText += data.response;
          const now = Date.now();
          if (onProgress && now - lastPreviewAt > 300) {
            onProgress(extractNarrativePreview(responseText));
            lastPreviewAt = now;
          }
        }
        if (data.done) {
          if (onProgress && responseText.trim()) {
            onProgress(extractNarrativePreview(responseText));
          }
          return responseText.trim();
        }
      }
    }

    if (buffer.trim()) {
      const data = JSON.parse(buffer.trim()) as { response?: string };
      if (data.response) {
        responseText += data.response;
      }
    }
    return responseText.trim();
  } finally {
    clearTimeout(t);
  }
}

function extractNarrativePreview(text: string) {
  const normalized = text.replace(/\r/g, '').trim();
  if (!normalized) return 'Local AI is thinking…';
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    return lines.slice(-2).join('\n');
  }
  return normalized.slice(-280);
}

async function runOllamaSelfTest(endpoint: string, model: string, timeoutMs = 90000) {
  const controller = new AbortController();
  const startedAt = Date.now();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  let firstTokenMs: number | null = null;
  let preview = '';
  try {
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: 'Write one short factual sentence about an investigation report.',
        stream: true
      }),
      signal: controller.signal
    } as any);
    if (!res.ok) {
      return { ok: false, message: `Local AI self-test failed with HTTP ${res.status}.`, elapsedMs: Date.now() - startedAt, firstTokenMs, preview };
    }
    if (!res.body) {
      return { ok: false, message: 'Local AI self-test returned no response body.', elapsedMs: Date.now() - startedAt, firstTokenMs, preview };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let responseText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const data = JSON.parse(trimmed) as { response?: string; done?: boolean };
        if (data.response) {
          responseText += data.response;
          preview = extractNarrativePreview(responseText);
          if (firstTokenMs === null) {
            firstTokenMs = Date.now() - startedAt;
          }
        }
        if (data.done) {
          return {
            ok: Boolean(responseText.trim()),
            message: responseText.trim() ? undefined : 'Local AI self-test completed without returning text.',
            elapsedMs: Date.now() - startedAt,
            firstTokenMs,
            preview
          };
        }
      }
    }

    return {
      ok: Boolean(responseText.trim()),
      message: responseText.trim() ? undefined : 'Local AI self-test completed without returning text.',
      elapsedMs: Date.now() - startedAt,
      firstTokenMs,
      preview
    };
  } catch (error) {
    const message = String((error as Error)?.message || 'Local AI self-test failed.');
    if (message.toLowerCase().includes('abort')) {
      return {
        ok: false,
        message: `Local AI self-test timed out after ${formatMs(timeoutMs)}. This model may be too heavy for this machine.`,
        elapsedMs: Date.now() - startedAt,
        firstTokenMs,
        preview
      };
    }
    return { ok: false, message, elapsedMs: Date.now() - startedAt, firstTokenMs, preview };
  } finally {
    clearTimeout(t);
  }
}

function formatMs(ms: number | null | undefined) {
  if (!ms || ms <= 0) return 'n/a';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function readProjectSettingJson(db: DbConnection, key: string): unknown | null {
  try {
    const row = db.prepare('SELECT value_json FROM project_setting WHERE key = ? LIMIT 1').get(key) as { value_json: string } | undefined;
    return row ? JSON.parse(row.value_json) : null;
  } catch {
    return null;
  }
}

async function readDeviceSetting<T = unknown>(key: string): Promise<T | null> {
  try {
    return await deviceSettingsService.get<T>(key);
  } catch {
    return null;
  }
}

async function readOllamaConfig(db: DbConnection) {
  const endpoint =
    (await readDeviceSetting<string>('ai:ollama:endpoint')) ||
    (readProjectSettingJson(db, 'ai:ollama:endpoint') as string) ||
    'http://localhost:11434';
  const model =
    (await readDeviceSetting<string>('ai:ollama:model')) ||
    (readProjectSettingJson(db, 'ai:ollama:model') as string) ||
    getDefaultOllamaModel();
  const keepAlive =
    (await readDeviceSetting<boolean>('ai:ollama:keepAlive')) ??
    ((readProjectSettingJson(db, 'ai:ollama:keepAlive') as boolean | null) ?? false);

  return { endpoint, model, keepAlive };
}

function sanitizeProjectName(name: string) {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : 'New Case';
}

function resolveExampleProjectPath() {
  const candidates = [
    path.join(app.getAppPath(), 'samples', 'operation-glass-harbor.vitni'),
    path.join(process.cwd(), 'samples', 'operation-glass-harbor.vitni')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'manifest.json'))) {
      return candidate;
    }
  }

  return null;
}
