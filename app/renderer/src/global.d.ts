import type {
  AssertionRecord,
  AuditRecord,
  EntityRecord,
  SourceRecord,
  TransformRegistry,
  TransformRunRecord
} from '@shared/types';
import type { GraphNodeSnapshot, GraphEdgeSnapshot, GraphSnapshot } from './types/graph';

interface ParsedAssertionRecord extends Omit<AssertionRecord, 'value_json'> {
  value: Record<string, unknown>;
}

interface PiBridge {
  listEntities: () => Promise<GraphNodeSnapshot[]>;
  loadGraph: () => Promise<GraphSnapshot>;
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
  listAssertionsByEntity: (entityId: string) => Promise<ParsedAssertionRecord[]>;
  listSourcesByEntity: (entityId: string) => Promise<SourceRecord[]>;
  deleteEntity: (entityId: string) => Promise<boolean>;
  deleteEdge: (edgeId: string) => Promise<boolean>;
  updateEntity: (entityId: string, updates: { label?: string; properties?: Record<string, unknown> }) => Promise<boolean>;
  updateEntityPosition: (entityId: string, pos: { x: number; y: number }) => Promise<boolean>;
  projectNew: () => Promise<boolean>;
  projectOpen: () => Promise<boolean>;
  projectSaveAs: () => Promise<boolean>;
  getProjectSetting: <T = unknown>(key: string) => Promise<T | null>;
  setProjectSetting: (key: string, value: unknown) => Promise<boolean>;
  updateEdge: (edgeId: string, updates: { type?: string; properties?: Record<string, unknown> }) => Promise<boolean>;
}

declare global {
  interface Window {
    piBridge: PiBridge;
    piMenu: {
      onProjectNew: (cb: () => void) => () => void;
      onProjectOpen: (cb: () => void) => () => void;
      onProjectSaveAs: (cb: () => void) => () => void;
      onSettingsOpen: (cb: () => void) => () => void;
    };
  }
}

export {};
