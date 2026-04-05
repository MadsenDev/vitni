import type {
  AssertionRecord,
  AssertionReviewState,
  EntityRecord,
  MediaFolderNode,
  MediaLibraryItem,
  SourceRecord,
  SourceWithUsage,
  TransformExecutionResult,
  TransformRunRecord
} from '@shared/types';
import type { GraphSnapshot } from '@renderer/types/graph';
import type { PersonalizationTheme } from '@renderer/features/personalization/theme';

export type ParsedAssertionRecord = Omit<AssertionRecord, 'value_json'> & {
  value: Record<string, unknown>;
};

export const piBridge = {
  loadGraph(): Promise<GraphSnapshot> {
    return window.piBridge.loadGraph();
  },
  createEntity(payload: { type: EntityRecord['type']; label: string; properties: Record<string, unknown> }): Promise<string> {
    return window.piBridge.createEntity(payload);
  },
  createSource(payload: {
    kind: string;
    locator: string;
    title?: string;
    hash?: string | null;
    mime?: string | null;
  }): Promise<string> {
    return window.piBridge.createSource(payload);
  },
  createAssertion(payload: {
    subject_kind: string;
    subject_id: string;
    path: string;
    value: Record<string, unknown>;
    source_id: string;
    confidence: AssertionRecord['confidence'];
  }): Promise<string> {
    return window.piBridge.createAssertion(payload);
  },
  updateEntity(entityId: string, updates: { label?: string; properties?: Record<string, unknown> }): Promise<boolean> {
    return window.piBridge.updateEntity(entityId, updates);
  },
  updateEntityPosition(entityId: string, pos: { x: number; y: number }): Promise<boolean> {
    return window.piBridge.updateEntityPosition(entityId, pos);
  },
  deleteEntity(entityId: string): Promise<boolean> {
    return window.piBridge.deleteEntity(entityId);
  },
  createEdge(payload: { src_id: string; dst_id: string; type: string; properties: Record<string, unknown> }): Promise<string> {
    return window.piBridge.createEdge(payload);
  },
  updateEdge(edgeId: string, updates: { type?: string; properties?: Record<string, unknown> }): Promise<boolean> {
    return window.piBridge.updateEdge(edgeId, updates);
  },
  deleteEdge(edgeId: string): Promise<boolean> {
    return window.piBridge.deleteEdge(edgeId);
  },
  listAssertionsByEntity(entityId: string): Promise<ParsedAssertionRecord[]> {
    return window.piBridge.listAssertionsByEntity(entityId);
  },
  listAllAssertions(): Promise<ParsedAssertionRecord[]> {
    return window.piBridge.listAllAssertions();
  },
  updateAssertion(
    assertionId: string,
    updates: {
      value?: Record<string, unknown>;
      confidence?: AssertionRecord['confidence'];
      review_state?: AssertionReviewState;
      review_note?: string | null;
      reviewed_by?: string | null;
      reviewed_at?: number | null;
    }
  ): Promise<boolean> {
    return window.piBridge.updateAssertion(assertionId, updates);
  },
  deleteAssertion(assertionId: string): Promise<boolean> {
    return window.piBridge.deleteAssertion(assertionId);
  },
  listSourcesByEntity(entityId: string): Promise<SourceRecord[]> {
    return window.piBridge.listSourcesByEntity(entityId);
  },
  updateSource(
    sourceId: string,
    updates: { title?: string | null; locator?: string; kind?: string; mime?: string | null }
  ): Promise<boolean> {
    return window.piBridge.updateSource(sourceId, updates);
  },
  deleteSource(sourceId: string): Promise<boolean> {
    return window.piBridge.deleteSource(sourceId);
  },
  listAllSourcesWithUsage(): Promise<SourceWithUsage[]> {
    return window.piBridge.listAllSourcesWithUsage();
  },
  listTransforms() {
    return window.piBridge.listTransforms();
  },
  executeRemoteTransform(payload: {
    transformId: string;
    subjectEntityId: string;
    subjectEntityType: string;
    payload: Record<string, unknown>;
    destination: string;
  }): Promise<TransformExecutionResult> {
    return window.piBridge.executeRemoteTransform(payload);
  },
  listMediaLibrary(): Promise<{ items: MediaLibraryItem[]; folders: MediaFolderNode[] }> {
    return window.piBridge.listMediaLibrary();
  },
  createMediaFolder(folderPath: string): Promise<MediaFolderNode> {
    return window.piBridge.createMediaFolder(folderPath);
  },
  renameMedia(payload: { sourceId: string; displayName: string; fileName?: string }): Promise<boolean> {
    return window.piBridge.renameMedia(payload);
  },
  moveMedia(payload: { sourceIds: string[]; destinationFolderPath: string }): Promise<boolean> {
    return window.piBridge.moveMedia(payload);
  },
  uploadMedia(payload: {
    data: ArrayBuffer;
    name: string;
    mime: string;
    folderPath?: string;
    title?: string | null;
    kind?: string;
  }): Promise<MediaLibraryItem> {
    return window.piBridge.uploadMedia(payload);
  },
  replaceMedia(payload: {
    sourceId: string;
    data: ArrayBuffer;
    name: string;
    mime: string;
  }): Promise<MediaLibraryItem> {
    return window.piBridge.replaceMedia(payload);
  },
  getAttachmentData(payload: { locator: string; mime?: string | null }): Promise<{ base64: string; mimeType: string; fileName: string }> {
    return window.piBridge.getAttachmentData(payload);
  },
  getAttachmentDataBySourceId(payload: { sourceId: string }): Promise<{ base64: string; mimeType: string; fileName: string }> {
    return window.piBridge.getAttachmentDataBySourceId(payload);
  },
  getProjectSetting<T = unknown>(key: string): Promise<T | null> {
    return window.piBridge.getProjectSetting<T>(key);
  },
  setProjectSetting(key: string, value: unknown): Promise<boolean> {
    return window.piBridge.setProjectSetting(key, value);
  },
  getDeviceSetting<T = unknown>(key: string): Promise<T | null> {
    return window.piBridge.getDeviceSetting<T>(key);
  },
  setDeviceSetting(key: string, value: unknown): Promise<boolean> {
    return window.piBridge.setDeviceSetting(key, value);
  },
  personalizationPickBackgroundImage(): Promise<{ ok: boolean; imagePath?: string; imageFileName?: string; message?: string }> {
    return window.piBridge.personalizationPickBackgroundImage();
  },
  personalizationExportTheme(theme: PersonalizationTheme): Promise<{ ok: boolean; path?: string; message?: string }> {
    return window.piBridge.personalizationExportTheme(theme);
  },
  personalizationImportTheme(): Promise<{ ok: boolean; theme?: PersonalizationTheme; message?: string }> {
    return window.piBridge.personalizationImportTheme();
  },
  openAIStatus(): Promise<{ storageAvailable: boolean; hasStoredKey: boolean; hasEnvKey: boolean; hasKey: boolean; storageMode: 'encrypted' | 'plaintext' | 'none' }> {
    return window.piBridge.openAIStatus();
  },
  openAISetApiKey(apiKey: string): Promise<{ ok: boolean; message?: string }> {
    return window.piBridge.openAISetApiKey(apiKey);
  },
  openAIClearApiKey(): Promise<{ ok: boolean; message?: string }> {
    return window.piBridge.openAIClearApiKey();
  },
  projectNew(projectName?: string): Promise<boolean> {
    return window.piBridge.projectNew(projectName);
  },
  projectOpen(): Promise<boolean> {
    return window.piBridge.projectOpen();
  },
  projectOpenPath(path: string): Promise<{ ok: boolean; message?: string }> {
    return window.piBridge.projectOpenPath(path);
  },
  projectRecent(): Promise<Array<{ root: string; name: string; lastOpenedAt: number }>> {
    return window.piBridge.projectRecent();
  },
  projectRemoveRecent(path: string): Promise<boolean> {
    return window.piBridge.projectRemoveRecent(path);
  },
  projectExampleInfo(): Promise<{ available: boolean; name: string; path?: string }> {
    return window.piBridge.projectExampleInfo();
  },
  projectOpenExample(): Promise<{ ok: boolean; message?: string }> {
    return window.piBridge.projectOpenExample();
  },
  projectSaveAs(): Promise<boolean> {
    return window.piBridge.projectSaveAs();
  },
  openExternal(url: string): Promise<void> {
    return window.piBridge.openExternal(url);
  },
  revealPath(targetPath: string): Promise<boolean> {
    return window.piBridge.revealPath(targetPath);
  },
  createTransformRun(payload: Omit<TransformRunRecord, 'id' | 'started_at'>): Promise<string> {
    return window.piBridge.createTransformRun(payload);
  }
};

export const piMenu = {
  onProjectNew(cb: () => void): (() => void) | undefined {
    return window.piMenu?.onProjectNew(cb);
  },
  onProjectOpen(cb: () => void): (() => void) | undefined {
    return window.piMenu?.onProjectOpen(cb);
  },
  onProjectSaveAs(cb: () => void): (() => void) | undefined {
    return window.piMenu?.onProjectSaveAs(cb);
  },
  onSettingsOpen(cb: () => void): (() => void) | undefined {
    return window.piMenu?.onSettingsOpen(cb);
  },
  onMediaGalleryOpen(cb: () => void): (() => void) | undefined {
    return window.piMenu?.onMediaGalleryOpen(cb);
  },
  onTerminologyOpen(cb: () => void): (() => void) | undefined {
    return window.piMenu?.onTerminologyOpen?.(cb);
  },
  onProjectInfoOpen(cb: () => void): (() => void) | undefined {
    return window.piMenu?.onProjectInfoOpen?.(cb);
  },
  onExportReportOpen(cb: () => void): (() => void) | undefined {
    return window.piMenu?.onExportReportOpen?.(cb);
  },
  onViewZoomSelection(cb: () => void): (() => void) | undefined {
    return window.piMenu?.onViewZoomSelection?.(cb);
  },
  onViewFit(cb: () => void): (() => void) | undefined {
    return window.piMenu?.onViewFit?.(cb);
  },
  onViewCenterSelection(cb: () => void): (() => void) | undefined {
    return window.piMenu?.onViewCenterSelection?.(cb);
  }
};
