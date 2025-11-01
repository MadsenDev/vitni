import { contextBridge, ipcRenderer } from 'electron';
import type {
  AssertionRecord,
  AuditRecord,
  AttachmentResult,
  EntityRecord,
  TransformRegistry,
  TransformRunRecord,
  ProjectMetadata
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
    createSource: (payload: { kind: string; locator: string; title?: string; hash?: string | null; mime?: string | null }) =>
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
    listAllSourcesWithUsage: () => ipcRenderer.invoke('db:sources:list-with-usage'),
    projectNew: () => ipcRenderer.invoke('project:new'),
    projectOpen: () => ipcRenderer.invoke('project:open'),
    projectOpenPath: (path: string): Promise<{ ok: boolean; message?: string }> => ipcRenderer.invoke('project:open:path', path),
    projectRecent: (): Promise<Array<{ root: string; name: string; lastOpenedAt: number }>> => ipcRenderer.invoke('project:recent'),
    projectSaveAs: () => ipcRenderer.invoke('project:saveAs'),
    attachFile: (payload: { data: ArrayBuffer; name: string; mime: string }): Promise<AttachmentResult> =>
      ipcRenderer.invoke('project:attachFile', {
        data: Buffer.from(payload.data),
        name: payload.name,
        mime: payload.mime
      }),
    getAttachmentData: (payload: { locator: string; mime?: string | null }): Promise<{
      base64: string;
      mimeType: string;
      fileName: string;
    }> => ipcRenderer.invoke('project:getAttachmentData', payload),
    getProjectSetting: (key: string) => ipcRenderer.invoke('project-setting:get', key),
    setProjectSetting: (key: string, value: unknown) => ipcRenderer.invoke('project-setting:set', key, value),
    getProjectMetadata: (): Promise<ProjectMetadata | null> => ipcRenderer.invoke('project:metadata:get'),
    setProjectMetadata: (meta: ProjectMetadata): Promise<boolean> => ipcRenderer.invoke('project:metadata:set', meta),
    reportGenerate: (opts: { template: 'full'|'selection'|'timeline'|'person'; includeAttachments?: boolean; selectionIds?: string[]; personId?: string; useAI?: boolean }): Promise<{ outputDir: string }> =>
      ipcRenderer.invoke('report:generate', opts),
    aiStatus: (): Promise<{ endpoint: string; model: string; serverUp: boolean; modelAvailable: boolean }> => ipcRenderer.invoke('ai:ollama:status'),
    aiStart: (): Promise<{ ok: boolean; message?: string }> => ipcRenderer.invoke('ai:ollama:start'),
    aiPullModel: (): Promise<{ ok: boolean; message?: string }> => ipcRenderer.invoke('ai:ollama:pull'),
    aiInstall: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('ai:ollama:install'),
    aiInstallStart: (): Promise<{ started: boolean }> => ipcRenderer.invoke('ai:ollama:install:start'),
    aiInstallCancel: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('ai:ollama:install:cancel'),
    aiInstallRunning: (): Promise<{ running: boolean }> => ipcRenderer.invoke('ai:ollama:install:running'),
    aiDownload: (): Promise<{ ok: boolean; path?: string; message?: string }> => ipcRenderer.invoke('ai:ollama:download'),
    aiStop: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('ai:ollama:stop'),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
    windowMinimize: () => ipcRenderer.invoke('window:minimize'),
    windowMaximize: () => ipcRenderer.invoke('window:maximize'),
    windowClose: () => ipcRenderer.invoke('window:close'),
    windowIsMaximized: () => ipcRenderer.invoke('window:isMaximized') as Promise<boolean>
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
  },
  onMediaGalleryOpen: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('menu:media:openGallery', handler);
    return () => ipcRenderer.removeListener('menu:media:openGallery', handler);
  },
  onTerminologyOpen: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('menu:settings:terminology', handler);
    return () => ipcRenderer.removeListener('menu:settings:terminology', handler);
  },
  onProjectInfoOpen: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('menu:project:info', handler);
    return () => ipcRenderer.removeListener('menu:project:info', handler);
  },
  onExportReportOpen: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('menu:report:export', handler);
    return () => ipcRenderer.removeListener('menu:report:export', handler);
  }
});

declare global {
  interface Window {
    piBridge: typeof bridge;
    piMenu: {
      onProjectNew: (cb: () => void) => () => void;
      onProjectOpen: (cb: () => void) => () => void;
      onProjectSaveAs: (cb: () => void) => () => void;
      onSettingsOpen: (cb: () => void) => () => void;
      onMediaGalleryOpen: (cb: () => void) => () => void;
      onTerminologyOpen: (cb: () => void) => () => void;
      onProjectInfoOpen: (cb: () => void) => () => void;
      onExportReportOpen: (cb: () => void) => () => void;
    };
  }
}
