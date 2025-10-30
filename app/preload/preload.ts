import { contextBridge, ipcRenderer } from 'electron';
import type {
  AssertionRecord,
  AuditRecord,
  AttachmentResult,
  EntityRecord,
  TransformRegistry,
  TransformRunRecord
} from '../../shared/types';
import type { GraphSnapshot, GraphNodeSnapshot } from '../renderer/src/types/graph';

function createBridge() {
  return {
    listEntities: (): Promise<GraphNodeSnapshot[]> => ipcRenderer.invoke('db:entities:list'),
    loadGraph: (): Promise<GraphSnapshot> => ipcRenderer.invoke('db:graph:load'),
    createEntity: (payload: {
      type: EntityRecord['type'];
      label: string;
      properties: Record<string, unknown>;
    }) => ipcRenderer.invoke('db:entity:create', payload),
    deleteEntity: (entityId: string) => ipcRenderer.invoke('db:entity:delete', entityId),
    updateEntity: (entityId: string, updates: { label?: string; properties?: Record<string, unknown> }) =>
      ipcRenderer.invoke('db:entity:update', entityId, updates),
    updateEntityPosition: (entityId: string, pos: { x: number; y: number }) =>
      ipcRenderer.invoke('db:entity:update-position', entityId, pos),
    createEdge: (payload: { src_id: string; dst_id: string; type: string; properties: Record<string, unknown> }) =>
      ipcRenderer.invoke('db:edge:create', payload),
    deleteEdge: (edgeId: string) => ipcRenderer.invoke('db:edge:delete', edgeId),
    updateEdge: (edgeId: string, updates: { type?: string; properties?: Record<string, unknown> }) =>
      ipcRenderer.invoke('db:edge:update', edgeId, updates),
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
    listSourcesByEntity: (entityId: string) => ipcRenderer.invoke('db:sources:by-entity', entityId),
    projectNew: () => ipcRenderer.invoke('project:new'),
    projectOpen: () => ipcRenderer.invoke('project:open'),
    projectSaveAs: () => ipcRenderer.invoke('project:saveAs'),
    attachFile: (payload: { data: ArrayBuffer; name: string; mime: string }): Promise<AttachmentResult> =>
      ipcRenderer.invoke('project:attachFile', {
        data: Buffer.from(payload.data),
        name: payload.name,
        mime: payload.mime
      }),
    getProjectSetting: (key: string) => ipcRenderer.invoke('project-setting:get', key),
    setProjectSetting: (key: string, value: unknown) => ipcRenderer.invoke('project-setting:set', key, value)
  };
}

const bridge = createBridge();

contextBridge.exposeInMainWorld('piBridge', bridge);

contextBridge.exposeInMainWorld('piMenu', {
  onProjectNew: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('menu:project:new', handler);
    return () => ipcRenderer.removeListener('menu:project:new', handler);
  },
  onProjectOpen: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('menu:project:open', handler);
    return () => ipcRenderer.removeListener('menu:project:open', handler);
  },
  onProjectSaveAs: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('menu:project:saveAs', handler);
    return () => ipcRenderer.removeListener('menu:project:saveAs', handler);
  },
  onSettingsOpen: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('menu:settings:open', handler);
    return () => ipcRenderer.removeListener('menu:settings:open', handler);
  }
});

declare global {
  interface Window {
    piBridge: typeof bridge;
    piMenu: {
      onProjectNew: (cb: () => void) => () => void;
      onProjectOpen: (cb: () => void) => () => void;
      onProjectSaveAs: (cb: () => void) => () => void;
    };
  }
}
