import type { IpcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import type { DatabaseProvider } from '../persistence/database';
import type { TransformRegistry } from '../transforms/registry';
import type {
  AssertionRecord,
  AuditRecord,
  EntityRecord,
  EdgeRecord,
  SourceRecord,
  TransformRunRecord
} from '../../../shared/types';

interface CreateEntityPayload {
  type: EntityRecord['type'];
  label: string;
  properties: Record<string, unknown>;
}

interface CreateSourcePayload {
  kind: string;
  locator: string;
  title?: string;
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

export function registerIpcHandlers(
  ipcMain: IpcMain,
  dbProvider: DatabaseProvider,
  transformRegistry: TransformRegistry
) {
  const db = dbProvider.connection;

  ipcMain.handle('db:entities:list', () => {
    const stmt = db.prepare<EntityRecord>('SELECT * FROM entity ORDER BY created_at DESC');
    return stmt.all();
  });

  ipcMain.handle('db:graph:load', () => {
    const nodes = db.prepare<EntityRecord>('SELECT * FROM entity').all();
    const edges = db.prepare<EdgeRecord>('SELECT * FROM edge').all();
    return { nodes, edges };
  });

  ipcMain.handle('db:assertions:by-entity', (_event, entityId: string) => {
    const stmt = db.prepare<AssertionRecord>(
      'SELECT * FROM assertion WHERE subject_id = ? ORDER BY created_at DESC'
    );
    return stmt.all(entityId);
  });

  ipcMain.handle('db:sources:by-entity', (_event, entityId: string) => {
    const stmt = db.prepare<SourceRecord>(
      `SELECT DISTINCT s.*
       FROM source s
       INNER JOIN assertion a ON a.source_id = s.id
       WHERE a.subject_id = ?
       ORDER BY s.added_at DESC`
    );
    return stmt.all(entityId);
  });

  ipcMain.handle('db:entity:create', (_event, payload: CreateEntityPayload) => {
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
  });

  ipcMain.handle('db:edge:create', (_event, payload: CreateEdgePayload) => {
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
  });

  ipcMain.handle('db:source:create', (_event, payload: CreateSourcePayload) => {
    const now = Math.floor(Date.now() / 1000);
    const id = randomUUID();
    db.prepare(
      `INSERT INTO source (id, kind, locator, title, added_at)
       VALUES (@id, @kind, @locator, @title, @added_at)`
    ).run({
      id,
      kind: payload.kind,
      locator: payload.locator,
      title: payload.title ?? null,
      added_at: now
    });
    return id;
  });

  ipcMain.handle('db:assertion:create', (_event, payload: AssertionPayload) => {
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
  });

  ipcMain.handle('db:audit:record', (_event, payload: Omit<AuditRecord, 'created_at' | 'id'>) => {
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
  });

  ipcMain.handle('transforms:list', () => transformRegistry);

  ipcMain.handle('transform:runs:create', (_event, payload: Omit<TransformRunRecord, 'id' | 'started_at'>) => {
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
  });

  ipcMain.handle('transform:runs:update', (_event, payload: Pick<TransformRunRecord, 'id'> & Partial<TransformRunRecord>) => {
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
  });
}
