import { contextBridge, ipcRenderer } from 'electron';
import type {
  AssertionRecord,
  AuditRecord,
  AttachmentResult,
  EntityRecord,
  MediaFolderNode,
  MediaLibraryItem,
  TransformExecutionResult,
  TransformRegistry,
  TransformRunRecord,
  ProjectMetadata
} from '../../shared/types';
import type { PersonalizationTheme } from '../renderer/src/features/personalization/theme';
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
    updateAssertion: (
      assertionId: string,
      updates: { value?: Record<string, unknown>; confidence?: AssertionRecord['confidence'] }
    ) => ipcRenderer.invoke('db:assertion:update', assertionId, updates),
    deleteAssertion: (assertionId: string) => ipcRenderer.invoke('db:assertion:delete', assertionId),
    updateSource: (
      sourceId: string,
      updates: { title?: string | null; locator?: string; kind?: string; mime?: string | null }
    ) => ipcRenderer.invoke('db:source:update', sourceId, updates),
    deleteSource: (sourceId: string) => ipcRenderer.invoke('db:source:delete', sourceId),
    recordAudit: (payload: Omit<AuditRecord, 'created_at' | 'id'>) =>
      ipcRenderer.invoke('db:audit:record', payload),
    listTransforms: (): Promise<TransformRegistry> => ipcRenderer.invoke('transforms:list'),
    executeRemoteTransform: (payload: {
      transformId: string;
      subjectEntityId: string;
      subjectEntityType: string;
      payload: Record<string, unknown>;
      destination: string;
    }): Promise<TransformExecutionResult> => ipcRenderer.invoke('transforms:execute-remote', payload),
    createTransformRun: (payload: Omit<TransformRunRecord, 'id' | 'started_at'>) =>
      ipcRenderer.invoke('transform:runs:create', payload),
    updateTransformRun: (payload: Pick<TransformRunRecord, 'id'> & Partial<TransformRunRecord>) =>
      ipcRenderer.invoke('transform:runs:update', payload),
    listAssertionsByEntity: (entityId: string) =>
      ipcRenderer.invoke('db:assertions:by-entity', entityId),
    listAllAssertions: () => ipcRenderer.invoke('db:assertions:list'),
    listSourcesByEntity: (entityId: string) => ipcRenderer.invoke('db:sources:by-entity', entityId),
    listAllSourcesWithUsage: () => ipcRenderer.invoke('db:sources:list-with-usage'),
    listMediaLibrary: (): Promise<{ items: MediaLibraryItem[]; folders: MediaFolderNode[] }> => ipcRenderer.invoke('media:list'),
    createMediaFolder: (folderPath: string): Promise<MediaFolderNode> => ipcRenderer.invoke('media:folder:create', folderPath),
    renameMedia: (payload: { sourceId: string; displayName: string; fileName?: string }): Promise<boolean> =>
      ipcRenderer.invoke('media:rename', payload),
    moveMedia: (payload: { sourceIds: string[]; destinationFolderPath: string }): Promise<boolean> =>
      ipcRenderer.invoke('media:move', payload),
    uploadMedia: (payload: {
      data: ArrayBuffer;
      name: string;
      mime: string;
      folderPath?: string;
      title?: string | null;
      kind?: string;
    }): Promise<MediaLibraryItem> =>
      ipcRenderer.invoke('media:upload', {
        data: Buffer.from(payload.data),
        name: payload.name,
        mime: payload.mime,
        folderPath: payload.folderPath,
        title: payload.title,
        kind: payload.kind
      }),
    replaceMedia: (payload: {
      sourceId: string;
      data: ArrayBuffer;
      name: string;
      mime: string;
    }): Promise<MediaLibraryItem> =>
      ipcRenderer.invoke('media:replace', {
        sourceId: payload.sourceId,
        data: Buffer.from(payload.data),
        name: payload.name,
        mime: payload.mime
      }),
    projectNew: (projectName?: string) => ipcRenderer.invoke('project:new', projectName),
    projectOpen: () => ipcRenderer.invoke('project:open'),
    projectOpenPath: (path: string): Promise<{ ok: boolean; message?: string }> => ipcRenderer.invoke('project:open:path', path),
    projectRecent: (): Promise<Array<{ root: string; name: string; lastOpenedAt: number }>> => ipcRenderer.invoke('project:recent'),
    projectRemoveRecent: (path: string): Promise<boolean> => ipcRenderer.invoke('project:recent:remove', path),
    projectExampleInfo: (): Promise<{ available: boolean; name: string; path?: string }> => ipcRenderer.invoke('project:example:info'),
    projectOpenExample: (): Promise<{ ok: boolean; message?: string }> => ipcRenderer.invoke('project:example:open'),
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
    getAttachmentDataBySourceId: (payload: { sourceId: string }): Promise<{
      base64: string;
      mimeType: string;
      fileName: string;
    }> => ipcRenderer.invoke('project:getAttachmentDataBySourceId', payload),
    getProjectSetting: (key: string) => ipcRenderer.invoke('project-setting:get', key),
    setProjectSetting: (key: string, value: unknown) => ipcRenderer.invoke('project-setting:set', key, value),
    getDeviceSetting: (key: string) => ipcRenderer.invoke('device-setting:get', key),
    setDeviceSetting: (key: string, value: unknown) => ipcRenderer.invoke('device-setting:set', key, value),
    personalizationPickBackgroundImage: (): Promise<{ ok: boolean; imagePath?: string; imageFileName?: string; message?: string }> =>
      ipcRenderer.invoke('personalization:background:pick'),
    personalizationExportTheme: (theme: PersonalizationTheme): Promise<{ ok: boolean; path?: string; message?: string }> =>
      ipcRenderer.invoke('personalization:theme:export', theme),
    personalizationImportTheme: (): Promise<{ ok: boolean; theme?: PersonalizationTheme; message?: string }> =>
      ipcRenderer.invoke('personalization:theme:import'),
    getProjectMetadata: (): Promise<ProjectMetadata | null> => ipcRenderer.invoke('project:metadata:get'),
    setProjectMetadata: (meta: ProjectMetadata): Promise<boolean> => ipcRenderer.invoke('project:metadata:set', meta),
    reportGenerate: (opts: { template: 'full'|'selection'|'timeline'|'person'; includeAttachments?: boolean; selectionIds?: string[]; personId?: string; useAI?: boolean; aiProvider?: 'ollama' | 'openai' }): Promise<{ outputDir: string }> =>
      ipcRenderer.invoke('report:generate', opts),
    aiStatus: (): Promise<{
      endpoint: string;
      model: string;
      ollamaInstalled: boolean;
      serverUp: boolean;
      modelAvailable: boolean;
      setupRequired: boolean;
      recommendedAction: string;
      downloadEstimateMb: number | null;
    }> => ipcRenderer.invoke('ai:ollama:status'),
    aiStart: (): Promise<{ ok: boolean; message?: string }> => ipcRenderer.invoke('ai:ollama:start'),
    aiPullModel: (): Promise<{ ok: boolean; message?: string }> => ipcRenderer.invoke('ai:ollama:pull'),
    aiSelfTest: (): Promise<{ ok: boolean; message?: string; elapsedMs?: number; firstTokenMs?: number | null; preview?: string }> =>
      ipcRenderer.invoke('ai:ollama:self-test'),
    aiSetup: (): Promise<{ ok: boolean; stage: 'ready' | 'failed' | 'awaiting_external_install'; message?: string }> => ipcRenderer.invoke('ai:ollama:setup'),
    aiInstall: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('ai:ollama:install'),
    aiInstallStart: (): Promise<{ started: boolean }> => ipcRenderer.invoke('ai:ollama:install:start'),
    aiInstallCancel: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('ai:ollama:install:cancel'),
    aiInstallRunning: (): Promise<{ running: boolean }> => ipcRenderer.invoke('ai:ollama:install:running'),
    aiDownload: (): Promise<{ ok: boolean; path?: string; message?: string }> => ipcRenderer.invoke('ai:ollama:download'),
    aiStop: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('ai:ollama:stop'),
    openAIStatus: (): Promise<{ storageAvailable: boolean; hasStoredKey: boolean; hasEnvKey: boolean; hasKey: boolean; storageMode: 'encrypted' | 'plaintext' | 'none' }> => ipcRenderer.invoke('ai:openai:status'),
    openAISetApiKey: (apiKey: string): Promise<{ ok: boolean; message?: string }> => ipcRenderer.invoke('ai:openai:key:set', apiKey),
    openAIClearApiKey: (): Promise<{ ok: boolean; message?: string }> => ipcRenderer.invoke('ai:openai:key:clear'),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
    revealPath: (targetPath: string): Promise<boolean> => ipcRenderer.invoke('app:revealPath', targetPath),
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

contextBridge.exposeInMainWorld('piAI', {
  onLocalAISetupProgress: (cb: (payload: { stage: string; message: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: { stage: string; message: string }) => cb(payload);
    ipcRenderer.on('ai:ollama:setup-progress', handler);
    return () => ipcRenderer.removeListener('ai:ollama:setup-progress', handler);
  },
  onReportGenerateProgress: (cb: (payload: { stage: string; message: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: { stage: string; message: string }) => cb(payload);
    ipcRenderer.on('report:generate:progress', handler);
    return () => ipcRenderer.removeListener('report:generate:progress', handler);
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
    piAI: {
      onLocalAISetupProgress: (cb: (payload: { stage: string; message: string }) => void) => () => void;
      onReportGenerateProgress: (cb: (payload: { stage: string; message: string }) => void) => () => void;
    };
  }
}
