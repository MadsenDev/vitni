import { contextBridge, ipcRenderer } from 'electron';
import type {
  AssertionRecord,
  AuditRecord,
  EntityRecord,
  EdgeRecord,
  TransformRegistry,
  TransformRunRecord
} from '../../shared/types';

function createBridge() {
  return {
    listEntities: (): Promise<EntityRecord[]> => ipcRenderer.invoke('db:entities:list'),
    loadGraph: (): Promise<{ nodes: EntityRecord[]; edges: EdgeRecord[] }> =>
      ipcRenderer.invoke('db:graph:load'),
    createEntity: (payload: {
      type: EntityRecord['type'];
      label: string;
      properties: Record<string, unknown>;
    }) => ipcRenderer.invoke('db:entity:create', payload),
    createEdge: (payload: { src_id: string; dst_id: string; type: string; properties: Record<string, unknown> }) =>
      ipcRenderer.invoke('db:edge:create', payload),
    createSource: (payload: { kind: string; locator: string; title?: string }) =>
      ipcRenderer.invoke('db:source:create', payload),
    createAssertion: (payload: {
      subject_kind: string;
      subject_id: string;
      path: string;
      value: Record<string, unknown>;
      source_id: string;
      confidence: AssertionRecord['confidence'];
    }) => ipcRenderer.invoke('db:assertion:create', payload),
    recordAudit: (payload: Omit<AuditRecord, 'created_at' | 'id'>) =>
      ipcRenderer.invoke('db:audit:record', payload),
    listTransforms: (): Promise<TransformRegistry> => ipcRenderer.invoke('transforms:list'),
    createTransformRun: (payload: Omit<TransformRunRecord, 'id' | 'started_at'>) =>
      ipcRenderer.invoke('transform:runs:create', payload),
    updateTransformRun: (payload: Pick<TransformRunRecord, 'id'> & Partial<TransformRunRecord>) =>
      ipcRenderer.invoke('transform:runs:update', payload),
    listAssertionsByEntity: (entityId: string) =>
      ipcRenderer.invoke('db:assertions:by-entity', entityId),
    listSourcesByEntity: (entityId: string) => ipcRenderer.invoke('db:sources:by-entity', entityId)
  };
}

const bridge = createBridge();

contextBridge.exposeInMainWorld('piBridge', bridge);

declare global {
  interface Window {
    piBridge: typeof bridge;
  }
}
