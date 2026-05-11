import type {
  AssertionRecord,
  AssertionReviewState,
  AuditRecord,
  AttachmentResult,
  EntityRecord,
  MediaFolderNode,
  MediaLibraryItem,
  ProjectMetadata,
  SourceRecord,
  SourceWithUsage,
  TransformExecutionResult,
  TransformRegistry,
  TransformRunRecord
} from '@shared/types';
import type { GraphNodeSnapshot, GraphSnapshot } from './types/graph';
import type { PersonalizationTheme } from './features/personalization/theme';

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
  createSource: (payload: {
    kind: string;
    locator: string;
    title?: string;
    hash?: string | null;
    mime?: string | null;
  }) => Promise<string>;
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
  executeRemoteTransform: (payload: {
    transformId: string;
    subjectEntityId: string;
    subjectEntityType: string;
    payload: Record<string, unknown>;
    destination: string;
  }) => Promise<TransformExecutionResult>;
  createTransformRun: (payload: Omit<TransformRunRecord, 'id' | 'started_at'>) => Promise<string>;
  updateTransformRun: (
    payload: Pick<TransformRunRecord, 'id'> & Partial<TransformRunRecord>
  ) => Promise<string>;
  listAssertionsByEntity: (entityId: string) => Promise<ParsedAssertionRecord[]>;
  listAllAssertions: () => Promise<ParsedAssertionRecord[]>;
  listSourcesByEntity: (entityId: string) => Promise<SourceRecord[]>;
  listAllSourcesWithUsage: () => Promise<SourceWithUsage[]>;
  listMediaLibrary: () => Promise<{ items: MediaLibraryItem[]; folders: MediaFolderNode[] }>;
  createMediaFolder: (folderPath: string) => Promise<MediaFolderNode>;
  renameMedia: (payload: { sourceId: string; displayName: string; fileName?: string }) => Promise<boolean>;
  moveMedia: (payload: { sourceIds: string[]; destinationFolderPath: string }) => Promise<boolean>;
  uploadMedia: (payload: {
    data: ArrayBuffer;
    name: string;
    mime: string;
    folderPath?: string;
    title?: string | null;
    kind?: string;
  }) => Promise<MediaLibraryItem>;
  replaceMedia: (payload: {
    sourceId: string;
    data: ArrayBuffer;
    name: string;
    mime: string;
  }) => Promise<MediaLibraryItem>;
  deleteEntity: (entityId: string) => Promise<boolean>;
  deleteEdge: (edgeId: string) => Promise<boolean>;
  updateEntity: (entityId: string, updates: { label?: string; properties?: Record<string, unknown> }) => Promise<boolean>;
  updateEntityPosition: (entityId: string, pos: { x: number; y: number }) => Promise<boolean>;
  projectNew: (projectName?: string) => Promise<boolean>;
  projectNewTutorial: (projectName?: string) => Promise<boolean>;
  projectOpen: () => Promise<boolean>;
  projectOpenPath: (path: string) => Promise<{ ok: boolean; message?: string }>;
  projectRecent: () => Promise<Array<{ root: string; name: string; lastOpenedAt: number }>>;
  projectRemoveRecent: (path: string) => Promise<boolean>;
  projectExampleInfo: () => Promise<{ available: boolean; name: string; path?: string }>;
  projectOpenExample: () => Promise<{ ok: boolean; message?: string }>;
  projectSaveAs: () => Promise<boolean>;
  attachFile: (payload: { data: ArrayBuffer; name: string; mime: string }) => Promise<AttachmentResult>;
  getAttachmentData: (
    payload: { locator: string; mime?: string | null }
  ) => Promise<{ base64: string; mimeType: string; fileName: string }>;
  getAttachmentDataBySourceId: (
    payload: { sourceId: string }
  ) => Promise<{ base64: string; mimeType: string; fileName: string }>;
  getProjectSetting: <T = unknown>(key: string) => Promise<T | null>;
  setProjectSetting: (key: string, value: unknown) => Promise<boolean>;
  getDeviceSetting: <T = unknown>(key: string) => Promise<T | null>;
  setDeviceSetting: (key: string, value: unknown) => Promise<boolean>;
  personalizationPickBackgroundImage: () => Promise<{ ok: boolean; imagePath?: string; imageFileName?: string; message?: string }>;
  personalizationExportTheme: (theme: PersonalizationTheme) => Promise<{ ok: boolean; path?: string; message?: string }>;
  personalizationImportTheme: () => Promise<{ ok: boolean; theme?: PersonalizationTheme; message?: string }>;
  updateEdge: (edgeId: string, updates: { type?: string; properties?: Record<string, unknown> }) => Promise<boolean>;
  getProjectMetadata: () => Promise<ProjectMetadata | null>;
  setProjectMetadata: (metadata: ProjectMetadata) => Promise<boolean>;
  aiStatus: () => Promise<{
    endpoint: string;
    model: string;
    ollamaInstalled: boolean;
    serverUp: boolean;
    modelAvailable: boolean;
    setupRequired: boolean;
    recommendedAction: string;
    downloadEstimateMb: number | null;
  }>;
  aiStart: () => Promise<{ ok: boolean; message?: string }>;
  aiStop: () => Promise<{ ok: boolean }>;
  aiPullModel: () => Promise<{ ok: boolean; message?: string }>;
  aiSelfTest: () => Promise<{ ok: boolean; message?: string; elapsedMs?: number; firstTokenMs?: number | null; preview?: string }>;
  aiSetup: () => Promise<{ ok: boolean; stage: 'ready' | 'failed' | 'awaiting_external_install'; message?: string }>;
  aiDownload: () => Promise<{ ok: boolean; path?: string; message?: string }>;
  aiInstall: () => Promise<{ ok: boolean }>;
  aiInstallStart: () => Promise<{ started: boolean }>;
  aiInstallRunning: () => Promise<{ running: boolean }>;
  aiInstallCancel: () => Promise<{ ok: boolean }>;
  openAIStatus: () => Promise<{ storageAvailable: boolean; hasStoredKey: boolean; hasEnvKey: boolean; hasKey: boolean; storageMode: 'encrypted' | 'plaintext' | 'none' }>;
  openAISetApiKey: (apiKey: string) => Promise<{ ok: boolean; message?: string }>;
  openAIClearApiKey: () => Promise<{ ok: boolean; message?: string }>;
  reportGenerate: (payload: {
    template: 'full' | 'selection' | 'timeline' | 'person';
    includeAttachments?: boolean;
    selectionIds?: string[];
    personId?: string;
    useAI?: boolean;
    aiProvider?: 'ollama' | 'openai';
  }) => Promise<{ outputDir: string }>;
  openExternal: (url: string) => Promise<void>;
  revealPath: (targetPath: string) => Promise<boolean>;
  updateAssertion: (
    assertionId: string,
    updates: {
      value?: Record<string, unknown>;
      confidence?: AssertionRecord['confidence'];
      review_state?: AssertionReviewState;
      review_note?: string | null;
      reviewed_by?: string | null;
      reviewed_at?: number | null;
    }
  ) => Promise<boolean>;
  deleteAssertion: (assertionId: string) => Promise<boolean>;
  updateSource: (
    sourceId: string,
    updates: { title?: string | null; locator?: string; kind?: string; mime?: string | null }
  ) => Promise<boolean>;
  deleteSource: (sourceId: string) => Promise<boolean>;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
}

declare global {
  interface Window {
    piBridge: PiBridge;
    piMenu: {
      onProjectNew: (cb: () => void) => () => void;
      onProjectOpen: (cb: () => void) => () => void;
      onProjectSaveAs: (cb: () => void) => () => void;
      onSettingsOpen: (cb: () => void) => () => void;
      onMediaGalleryOpen: (cb: () => void) => () => void;
      onTerminologyOpen?: (cb: () => void) => () => void;
      onProjectInfoOpen?: (cb: () => void) => () => void;
      onExportReportOpen?: (cb: () => void) => () => void;
      onViewZoomSelection?: (cb: () => void) => () => void;
      onViewFit?: (cb: () => void) => () => void;
      onViewCenterSelection?: (cb: () => void) => () => void;
    };
    piAI: {
      onLocalAISetupProgress: (cb: (payload: { stage: string; message: string }) => void) => () => void;
      onReportGenerateProgress: (cb: (payload: { stage: string; message: string }) => void) => () => void;
    };
  }
}

export {};
