import type {
  AssertionRecord,
  AuditRecord,
  EntityRecord,
  EdgeRecord,
  SourceRecord,
  TransformRegistry,
  TransformRunRecord
} from '@shared/types';

interface PiBridge {
  listEntities: () => Promise<EntityRecord[]>;
  loadGraph: () => Promise<{ nodes: EntityRecord[]; edges: EdgeRecord[] }>;
  createEntity: (payload: {
    type: EntityRecord['type'];
    label: string;
    properties: Record<string, unknown>;
  }) => Promise<string>;
  createEdge: (payload: { src_id: string; dst_id: string; type: string; properties: Record<string, unknown> }) => Promise<string>;
  createSource: (payload: { kind: string; locator: string; title?: string }) => Promise<string>;
  createAssertion: (payload: {
    subject_kind: string;
    subject_id: string;
    path: string;
    value: Record<string, unknown>;
    source_id: string;
    confidence: AssertionRecord['confidence'];
  }) => Promise<string>;
  recordAudit: (payload: Omit<AuditRecord, 'created_at' | 'id'>) => Promise<string>;
  listTransforms: () => Promise<TransformRegistry>;
  createTransformRun: (payload: Omit<TransformRunRecord, 'id' | 'started_at'>) => Promise<string>;
  updateTransformRun: (
    payload: Pick<TransformRunRecord, 'id'> & Partial<TransformRunRecord>
  ) => Promise<string>;
  listAssertionsByEntity: (entityId: string) => Promise<AssertionRecord[]>;
  listSourcesByEntity: (entityId: string) => Promise<SourceRecord[]>;
}

declare global {
  interface Window {
    piBridge: PiBridge;
  }
}

export {};
