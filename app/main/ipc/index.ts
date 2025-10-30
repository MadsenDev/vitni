import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { dialog } from 'electron';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { TransformRegistry, AttachmentResult } from '../../../shared/types';
import type {
  AssertionRecord,
  AuditRecord,
  EntityRecord,
  EdgeRecord,
  SourceRecord,
  TransformRunRecord,
  ProjectSettingRecord
} from '../../../shared/types';
import type { ProjectManager } from '../projectManager';
import type { DbConnection } from '../persistence/database';

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
  transformRegistry: TransformRegistry
) {
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
