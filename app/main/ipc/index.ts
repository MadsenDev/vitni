import type { IpcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { dialog } from 'electron';
import fs from 'node:fs';
import type { DatabaseProvider } from '../persistence/database';
import type { TransformRegistry } from '../../../shared/types';
import type {
  AssertionRecord,
  AuditRecord,
  EntityRecord,
  EdgeRecord,
  SourceRecord,
  TransformRunRecord
} from '../../../shared/types';

// Parsed types for frontend consumption
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
    const stmt = db.prepare('SELECT * FROM entity ORDER BY created_at DESC');
    const entities = stmt.all() as EntityRecord[];
    
    // Parse JSON properties
    return entities.map(entity => ({
      ...entity,
      properties: JSON.parse(entity.properties_json || '{}')
    })) as ParsedEntityRecord[];
  });

  ipcMain.handle('db:graph:load', () => {
    const nodes = db.prepare('SELECT * FROM entity').all() as EntityRecord[];
    const edges = db.prepare('SELECT * FROM edge').all() as EdgeRecord[];
    
    // Parse JSON properties for nodes
    const parsedNodes = nodes.map(node => ({
      ...node,
      properties: JSON.parse(node.properties_json || '{}')
    })) as ParsedEntityRecord[];
    
    // Parse JSON properties for edges
    const parsedEdges = edges.map(edge => ({
      ...edge,
      properties: JSON.parse(edge.properties_json || '{}')
    })) as ParsedEdgeRecord[];
    
    return { nodes: parsedNodes, edges: parsedEdges };
  });

  ipcMain.handle('db:assertions:by-entity', (_event, entityId: string) => {
    const stmt = db.prepare(
      'SELECT * FROM assertion WHERE subject_id = ? ORDER BY created_at DESC'
    );
    const assertions = stmt.all(entityId) as AssertionRecord[];
    
    // Parse JSON values
    return assertions.map(assertion => ({
      ...assertion,
      value: JSON.parse(assertion.value_json || '{}')
    })) as ParsedAssertionRecord[];
  });

  ipcMain.handle('db:sources:by-entity', (_event, entityId: string) => {
    const stmt = db.prepare(
      `SELECT DISTINCT s.*
       FROM source s
       INNER JOIN assertion a ON a.source_id = s.id
       WHERE a.subject_id = ?
       ORDER BY s.added_at DESC`
    );
    return stmt.all(entityId) as SourceRecord[];
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

  ipcMain.handle('project:new', () => {
    const now = Math.floor(Date.now() / 1000);
    db.transaction(() => {
      db.prepare('DELETE FROM assertion').run();
      db.prepare('DELETE FROM edge').run();
      db.prepare('DELETE FROM source').run();
      db.prepare('DELETE FROM entity').run();
    })();
    return true;
  });

  ipcMain.handle('project:saveAs', async () => {
    const res = await dialog.showSaveDialog({
      title: 'Save Investigation Project',
      filters: [{ name: 'Investigation Project', extensions: ['piinv'] }]
    });
    if (res.canceled || !res.filePath) return false;

    let filePath = res.filePath;
    if (!filePath.toLowerCase().endsWith('.piinv')) {
      filePath = `${filePath}.piinv`;
    }

    const data = {
      version: 1,
      exported_at: Date.now(),
      entities: db.prepare('SELECT * FROM entity').all(),
      edges: db.prepare('SELECT * FROM edge').all(),
      sources: db.prepare('SELECT * FROM source').all(),
      assertions: db.prepare('SELECT * FROM assertion').all()
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  });

  ipcMain.handle('project:open', async () => {
    const res = await dialog.showOpenDialog({
      title: 'Open Investigation Project',
      filters: [{ name: 'Investigation Project', extensions: ['piinv'] }],
      properties: ['openFile']
    });
    if (res.canceled || !res.filePaths?.[0]) return false;

    const content = fs.readFileSync(res.filePaths[0], 'utf8');
    const parsed = JSON.parse(content);

    db.transaction(() => {
      db.prepare('DELETE FROM assertion').run();
      db.prepare('DELETE FROM edge').run();
      db.prepare('DELETE FROM source').run();
      db.prepare('DELETE FROM entity').run();

      const insertEntity = db.prepare(
        `INSERT INTO entity (id, type, label, properties_json, created_at, updated_at, pos_x, pos_y)
         VALUES (@id, @type, @label, @properties_json, @created_at, @updated_at, @pos_x, @pos_y)`
      );
      for (const e of parsed.entities || []) insertEntity.run(e);

      const insertEdge = db.prepare(
        `INSERT INTO edge (id, src_id, dst_id, type, properties_json, created_at, updated_at)
         VALUES (@id, @src_id, @dst_id, @type, @properties_json, @created_at, @updated_at)`
      );
      for (const ed of parsed.edges || []) insertEdge.run(ed);

      const insertSource = db.prepare(
        `INSERT INTO source (id, kind, locator, title, added_at)
         VALUES (@id, @kind, @locator, @title, @added_at)`
      );
      for (const s of parsed.sources || []) insertSource.run(s);

      const insertAssertion = db.prepare(
        `INSERT INTO assertion (id, subject_kind, subject_id, path, value_json, source_id, confidence, created_at)
         VALUES (@id, @subject_kind, @subject_id, @path, @value_json, @source_id, @confidence, @created_at)`
      );
      for (const a of parsed.assertions || []) insertAssertion.run(a);
    })();

    return true;
  });

  ipcMain.handle('db:entity:delete', (_event, entityId: string) => {
    // Delete related data first (cascade delete)
    db.prepare('DELETE FROM assertion WHERE subject_id = ?').run(entityId);
    db.prepare('DELETE FROM edge WHERE src_id = ? OR dst_id = ?').run(entityId, entityId);
    
    // Delete the entity
    const result = db.prepare('DELETE FROM entity WHERE id = ?').run(entityId);
    return result.changes > 0;
  });

  ipcMain.handle('db:entity:update', (_event, entityId: string, updates: { label?: string; properties?: Record<string, unknown> }) => {
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
  });

  ipcMain.handle('db:entity:update-position', (_event, entityId: string, pos: { x: number; y: number }) => {
    const stmt = db.prepare('UPDATE entity SET pos_x = @x, pos_y = @y, updated_at = @now WHERE id = @id');
    const res = stmt.run({ id: entityId, x: pos.x, y: pos.y, now: Math.floor(Date.now() / 1000) });
    return res.changes > 0;
  });

  ipcMain.handle('db:edge:delete', (_event, edgeId: string) => {
    const result = db.prepare('DELETE FROM edge WHERE id = ?').run(edgeId);
    return result.changes > 0;
  });
}
