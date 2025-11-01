import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { app, dialog, shell, BrowserWindow } from 'electron';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import type { TransformRegistry, AttachmentResult } from '../../../shared/types';
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
import type { OllamaManager } from '../services/ollama';

let currentInstallChild: ChildProcess | null = null;

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
}

interface AttachmentRequestPayload {
  locator: string;
  mime?: string | null;
}

interface AssertionPayload {
  subject_kind: string;
  subject_id: string;
  path: string;
  value: Record<string, unknown>;
  source_id: string;
  confidence: AssertionRecord['confidence'];
}

interface CreateEdgePayload {
  src_id: string;
  dst_id: string;
  type: string;
  properties: Record<string, unknown>;
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
      const endpoint = (readProjectSettingJson(db, 'ai:ollama:endpoint') as string) || 'http://localhost:11434';
      const model = (readProjectSettingJson(db, 'ai:ollama:model') as string) || 'llama3.1:8b';
      const serverUp = await ollamaManager.isAvailable(endpoint);
      // Model check via tags
      let modelAvailable = false;
      if (serverUp) {
        try {
          const res = await fetch(`${endpoint.replace(/\/$/, '')}/api/tags` as any, { method: 'GET' } as any);
          if (res.ok) {
            const data = await res.json() as { models?: Array<{ name: string }> };
            modelAvailable = Boolean(data.models?.some(m => (m.name || '').includes(model.split(':')[0])));
          }
        } catch {}
      }
      return { endpoint, model, serverUp, modelAvailable };
    } catch {
      return { endpoint: 'http://localhost:11434', model: 'llama3.1:8b', serverUp: false, modelAvailable: false };
    }
  });

  ipcMain.handle('ai:ollama:start', async (_e) => {
    try {
      const db = projectManager.getDatabase();
      const endpoint = (readProjectSettingJson(db, 'ai:ollama:endpoint') as string) || 'http://localhost:11434';
      const bin = ollamaManager.getResolvedBinary();
      if (!bin) return { ok: false, message: 'Ollama binary not found. Try "Download bundled" first.' };
      const ok = await ollamaManager.ensure(endpoint);
      if (!ok) return { ok: false, message: 'Failed to start server or server not ready' };
      return { ok: true };
    } catch (e) {
      return { ok: false, message: String((e as Error).message || 'Start failed') };
    }
  });

  ipcMain.handle('ai:ollama:pull', async (_e) => {
    try {
      const db = projectManager.getDatabase();
      const endpoint = (readProjectSettingJson(db, 'ai:ollama:endpoint') as string) || 'http://localhost:11434';
      const model = (readProjectSettingJson(db, 'ai:ollama:model') as string) || 'llama3.1:8b';
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

  ipcMain.handle('ai:ollama:stop', async () => {
    try { ollamaManager.stop(); } catch {}
    return { ok: true };
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
        `INSERT INTO source (id, kind, locator, title, added_at, hash, mime)
         VALUES (@id, @kind, @locator, @title, @added_at, @hash, @mime)`
      ).run({
        id,
        kind: payload.kind,
        locator: payload.locator,
        title: payload.title ?? null,
        added_at: now,
        hash: payload.hash ?? null,
        mime: payload.mime ?? null
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
    withDb(projectManager, async (db, options: { template: 'full' | 'selection' | 'timeline' | 'person'; includeAttachments?: boolean; selectionIds?: string[]; personId?: string; useAI?: boolean }) => {
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
      const allEntities = db.prepare('SELECT * FROM entity').all() as EntityRecord[];
      const allEdges = db.prepare('SELECT * FROM edge').all() as EdgeRecord[];
      const allSources = db.prepare('SELECT * FROM source').all() as SourceRecord[];
      const assertions = db.prepare('SELECT * FROM assertion').all() as AssertionRecord[];

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

        // Optional Ollama call
        let narrativeHtml = '';
        if (options.useAI) {
          const endpoint = (readProjectSettingJson(db, 'ai:ollama:endpoint') as string) || 'http://localhost:11434';
          const model = (readProjectSettingJson(db, 'ai:ollama:model') as string) || 'llama3.1:8b';
          const ok = await ollamaManager.ensure(endpoint);
          if (ok) {
            const prompt = [
              'You are a professional investigator writing a concise, neutral profile.',
              `Subject: ${personName}${birthDate ? `, DOB: ${birthDate}` : ''}.`,
              'Facts:',
              heuristicNarrative,
              'Write 3-6 short paragraphs: Background, Associations, Assets/Identifiers, Activities/Communications, Notable Events. Avoid speculation; only use provided facts.'
            ].join('\n');
            try {
              const response = await ollamaGenerate(endpoint, model, prompt, 25000);
              const safe = escapeHtml(response || '').replace(/\n/g, '<br/>');
              narrativeHtml = `<p><em>AI narrative (${escapeHtml(model)})</em></p><div class="small">${safe}</div>`;
            } catch (e) {
              narrativeHtml = `<p class="muted small">AI narrative unavailable (${escapeHtml(String((e as Error).message || 'error'))}). Using heuristic summary below.</p><p>${escapeHtml(heuristicNarrative)}</p>`;
            }
          } else {
            narrativeHtml = `<p class="muted small">Local AI is not installed or not in PATH. Using heuristic summary below.</p><p>${escapeHtml(heuristicNarrative)}</p>`;
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

        await fsp.writeFile(path.join(outDir, 'report.html'), html, 'utf8');
        if (options.includeAttachments) { const src = path.join(root, manifest.paths.attachments); const dest = path.join(outDir, 'attachments'); await copyDir(src, dest); }
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

      await fsp.writeFile(path.join(outDir, 'report.html'), html, 'utf8');
      if (options.includeAttachments) {
        const src = path.join(root, manifest.paths.attachments);
        const dest = path.join(outDir, 'attachments');
        await copyDir(src, dest);
      }
      return { outputDir: outDir };
    })
  );

  ipcMain.handle('project:new', async () => {
    const res = await dialog.showSaveDialog({
      title: 'Create Investigation Project',
      defaultPath: path.join(path.dirname(projectManager.getRoot()), 'New Case'),
      filters: [{ name: 'Vitni Project', extensions: ['vitni'] }]
    });
    if (res.canceled || !res.filePath) return false;

    const projectName = path.basename(res.filePath, path.extname(res.filePath));
    await projectManager.createProject(res.filePath, projectName);
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

async function ollamaGenerate(endpoint: string, model: string, prompt: string, timeoutMs = 20000): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: controller.signal
    } as any);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { response?: string };
    return (data.response || '').trim();
  } finally {
    clearTimeout(t);
  }
}

function readProjectSettingJson(db: DbConnection, key: string): unknown | null {
  try {
    const row = db.prepare('SELECT value_json FROM project_setting WHERE key = ? LIMIT 1').get(key) as { value_json: string } | undefined;
    return row ? JSON.parse(row.value_json) : null;
  } catch {
    return null;
  }
}
