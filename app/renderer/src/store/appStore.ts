import { create } from 'zustand';
import type { EntityRecord, SourceRecord } from '@shared/types';
import { DEFAULT_INVESTIGATION_PROFILE, type InvestigationProfile } from '@renderer/features/profiles/investigationProfiles';
import { nodeTypes } from '@renderer/lib/nodeTypes';
import {
  DEFAULT_PERSONALIZATION_THEME,
  normalizePersonalizationTheme,
  type PersonalizationTheme
} from '@renderer/features/personalization/theme';
import {
  ACTIVE_SAVED_VIEW_ID_SETTING_KEY,
  ASSERTION_FIELD_AUTOMATION_SETTING_KEY,
  AUTO_HIDE_INSPECTOR_WHEN_IDLE_SETTING_KEY,
  AUTO_LAYOUT_ON_CREATE_SETTING_KEY,
  AUTO_LAYOUT_PRESET_SETTING_KEY,
  DEFAULT_AUTO_HIDE_INSPECTOR_WHEN_IDLE,
  DEFAULT_ASSERTION_FIELD_AUTOMATION,
  DEFAULT_MEDIA_LIBRARY_SHOW_FOLDERS,
  DEFAULT_MEDIA_LIBRARY_SORT,
  DEFAULT_MEDIA_LIBRARY_VIEW,
  DEFAULT_MOTION_PREFERENCE,
  DEFAULT_RELATIONSHIP_CONFIDENCE_SETTING_KEY,
  DEFAULT_REPORT_AI_PROVIDER,
  DEFAULT_REPORT_AI_PROVIDER_SETTING_KEY,
  DEFAULT_REPORT_INCLUDE_ATTACHMENTS,
  DEFAULT_REPORT_INCLUDE_ATTACHMENTS_SETTING_KEY,
  DEFAULT_REPORT_TEMPLATE,
  DEFAULT_REPORT_TEMPLATE_SETTING_KEY,
  DEFAULT_REPORT_USE_AI,
  DEFAULT_REPORT_USE_AI_SETTING_KEY,
  DEFAULT_SHOW_EXAMPLE_CASE_ON_WELCOME,
  DEFAULT_SIDEBAR_TAB,
  DEFAULT_SIDEBAR_TAB_SETTING_KEY,
  DEFAULT_UI_DENSITY,
  DEFAULT_WORKSPACE_VIEW,
  DEFAULT_WORKSPACE_VIEW_SETTING_KEY,
  DEVICE_MOTION_PREFERENCE_SETTING_KEY,
  DEVICE_PERSONALIZATION_THEME_SETTING_KEY,
  DEVICE_SHOW_EXAMPLE_CASE_SETTING_KEY,
  DEVICE_UI_DENSITY_SETTING_KEY,
  INVESTIGATION_PROFILE_SETTING_KEY,
  LOCAL_AI_SETTING_KEY,
  MEDIA_LIBRARY_DEFAULT_SORT_SETTING_KEY,
  MEDIA_LIBRARY_DEFAULT_VIEW_SETTING_KEY,
  MEDIA_LIBRARY_SHOW_FOLDERS_SETTING_KEY,
  RESTORE_SAVED_VIEW_ON_OPEN_SETTING_KEY,
  SAVED_VIEWS_SETTING_KEY,
  SHOW_NODE_IMAGES_SETTING_KEY,
  SHOW_NODE_LABELS_SETTING_KEY
} from '@renderer/lib/settings';
import type {
  AssertionFieldAutomationMode,
  MediaLibrarySortPreference,
  MediaLibraryViewPreference,
  MotionPreference,
  ReportAIProviderPreference,
  ReportTemplatePreference,
  SidebarTabPreference,
  UIDensityPreference,
  WorkspaceDefaultView
} from '@renderer/lib/settings';
import type { GraphLayoutPresetId } from '@renderer/features/graph/layoutPresets';
import { inferEntityLabel } from '@renderer/features/graph/labeling';
import { normalizeAutoLayoutPresetSetting } from '@renderer/features/graph/layoutPresets';
import { createSavedView, normalizeSavedViews, sanitizeSavedViewForGraph } from '@renderer/features/views/savedViews';
import { piBridge } from '@renderer/services/piBridge';
import type {
  AppStateSnapshot,
  AssertionView,
  ConsentState,
  DeletionModalState,
  EdgeDeletionModalState,
  MediaLibraryState,
  NodeCreationModalState,
  RelationshipModalState,
  RelationshipToolState,
  SavedViewSnapshot
} from '@renderer/types/app';
import type { GraphSnapshot } from '@renderer/types/graph';

/**
 * Zustand store for renderer session state plus persistence helpers.
 *
 * The store intentionally owns both volatile workspace state (selection,
 * modals, current graph snapshot) and the actions that persist project/device
 * settings so components can call one place for "read + mutate + persist"
 * behavior.
 */
const EMPTY_GRAPH: GraphSnapshot = { nodes: [], edges: [] };
const INITIAL_ACTIVE_TYPE_IDS = new Set(nodeTypes.map((nodeType) => nodeType.id));

type GraphPositionMap = Record<string, { x: number; y: number }>;

type AppStore = AppStateSnapshot & {
  setShowWelcome: (value: boolean) => void;
  setGraph: (graph: GraphSnapshot) => void;
  setGraphLoaded: (value: boolean) => void;
  setSelectedNodeId: (value: string | null) => void;
  setSelectedNodeIds: (value: string[]) => void;
  setSelectedEdgeId: (value: string | null) => void;
  setAssertions: (value: AssertionView[]) => void;
  setSources: (value: SourceRecord[]) => void;
  setConsentData: (value: ConsentState) => void;
  setNodeCreationModal: (value: NodeCreationModalState) => void;
  setRelationshipTool: (value: RelationshipToolState | ((prev: RelationshipToolState) => RelationshipToolState)) => void;
  setRelationshipModal: (value: RelationshipModalState) => void;
  setDeletionModal: (value: DeletionModalState) => void;
  setEdgeDeletionModal: (value: EdgeDeletionModalState) => void;
  setLoadingStage: (value: AppStateSnapshot['loadingStage']) => void;
  setSplashReadyToHide: (value: boolean) => void;
  setSettingsModalOpen: (value: boolean) => void;
  setInvestigationProfile: (value: InvestigationProfile) => void;
  setDefaultWorkspaceView: (value: AppStateSnapshot['defaultWorkspaceView']) => void;
  setAssertionFieldAutomation: (value: AppStateSnapshot['assertionFieldAutomation']) => void;
  setRestoreSavedViewOnOpen: (value: boolean) => void;
  setDefaultSidebarTab: (value: AppStateSnapshot['defaultSidebarTab']) => void;
  setAutoHideInspectorWhenIdle: (value: boolean) => void;
  setDefaultReportTemplate: (value: AppStateSnapshot['defaultReportTemplate']) => void;
  setDefaultReportIncludeAttachments: (value: boolean) => void;
  setDefaultReportUseAI: (value: boolean) => void;
  setDefaultReportAIProvider: (value: AppStateSnapshot['defaultReportAIProvider']) => void;
  setMediaLibraryDefaultView: (value: AppStateSnapshot['mediaLibraryDefaultView']) => void;
  setMediaLibraryDefaultSort: (value: AppStateSnapshot['mediaLibraryDefaultSort']) => void;
  setMediaLibraryShowFolders: (value: boolean) => void;
  setUiDensity: (value: AppStateSnapshot['uiDensity']) => void;
  setMotionPreference: (value: AppStateSnapshot['motionPreference']) => void;
  setShowExampleCaseOnWelcome: (value: boolean) => void;
  setPersonalizationTheme: (value: PersonalizationTheme) => void;
  setSearchOpen: (value: boolean) => void;
  setCommandPaletteOpen: (value: boolean) => void;
  setBoxSelectEnabled: (value: boolean) => void;
  setSidebarTab: (value: AppStateSnapshot['sidebarTab']) => void;
  setActiveTypeIds: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setHasSourcesOnly: (value: boolean) => void;
  setNodeIdsWithSources: (value: Set<string>) => void;
  setFiltersOpen: (value: boolean) => void;
  setFilterAnchor: (value: DOMRect | null) => void;
  setAssertionModalOpen: (value: boolean) => void;
  setSourceModalOpen: (value: boolean) => void;
  setTerminologyOpen: (value: boolean) => void;
  setMediaLibraryState: (value: MediaLibraryState | ((prev: MediaLibraryState) => MediaLibraryState)) => void;
  setView: (value: AppStateSnapshot['view']) => void;
  setProjectInfoOpen: (value: boolean) => void;
  setExportReportOpen: (value: boolean) => void;
  setPendingSavedViewRestore: (value: AppStateSnapshot['pendingSavedViewRestore']) => void;
  loadSettings: () => Promise<void>;
  boot: () => Promise<void>;
  refreshGraph: () => Promise<void>;
  normalizeLabels: () => Promise<void>;
  refreshEntityDetails: (entityId: string) => Promise<void>;
  refreshNodesWithSources: () => Promise<void>;
  createProject: (projectName?: string) => Promise<void>;
  openProject: () => Promise<void>;
  handleProjectLoaded: () => Promise<void>;
  closeProject: () => void;
  persistShowNodeLabels: (value: boolean) => Promise<void>;
  persistShowNodeImages: (value: boolean) => Promise<void>;
  persistAutoLayoutPreset: (value: 'off' | GraphLayoutPresetId) => Promise<void>;
  persistDefaultRelationshipConfidence: (value: 'unverified' | 'asserted' | 'verified') => Promise<void>;
  persistAssertionFieldAutomation: (value: AssertionFieldAutomationMode) => Promise<void>;
  persistInvestigationProfile: (value: InvestigationProfile) => Promise<void>;
  persistDefaultWorkspaceView: (value: AppStateSnapshot['defaultWorkspaceView']) => Promise<void>;
  persistRestoreSavedViewOnOpen: (value: boolean) => Promise<void>;
  persistDefaultSidebarTab: (value: AppStateSnapshot['defaultSidebarTab']) => Promise<void>;
  persistAutoHideInspectorWhenIdle: (value: boolean) => Promise<void>;
  persistDefaultReportTemplate: (value: AppStateSnapshot['defaultReportTemplate']) => Promise<void>;
  persistDefaultReportIncludeAttachments: (value: boolean) => Promise<void>;
  persistDefaultReportUseAI: (value: boolean) => Promise<void>;
  persistDefaultReportAIProvider: (value: AppStateSnapshot['defaultReportAIProvider']) => Promise<void>;
  persistMediaLibraryDefaultView: (value: AppStateSnapshot['mediaLibraryDefaultView']) => Promise<void>;
  persistMediaLibraryDefaultSort: (value: AppStateSnapshot['mediaLibraryDefaultSort']) => Promise<void>;
  persistMediaLibraryShowFolders: (value: boolean) => Promise<void>;
  persistUiDensity: (value: AppStateSnapshot['uiDensity']) => Promise<void>;
  persistMotionPreference: (value: AppStateSnapshot['motionPreference']) => Promise<void>;
  persistShowExampleCaseOnWelcome: (value: boolean) => Promise<void>;
  persistPersonalizationTheme: (value: PersonalizationTheme) => Promise<void>;
  toggleLocalAI: () => Promise<void>;
  createNode: (payload: {
    type: string;
    label: string;
    properties: Record<string, unknown>;
    position: { x: number; y: number } | null;
  }) => Promise<void>;
  createRelationship: (payload: {
    relationshipType: string;
    sourceId: string;
    targetId: string;
    properties: Record<string, unknown>;
    beforePositions: GraphPositionMap;
  }) => Promise<void>;
  updateEdgeProperty: (edgeId: string, key: string, value: unknown) => Promise<void>;
  confirmDeleteNode: () => Promise<void>;
  confirmDeleteEdge: () => Promise<void>;
  updateNodeProperty: (nodeId: string, propertyKey: string, value: unknown) => Promise<void>;
  updateNodeLabel: (nodeId: string, newLabel: string) => Promise<void>;
  deleteNodes: (ids: string[]) => Promise<void>;
  handleNodeDragFree: (id: string, x: number, y: number) => Promise<void>;
  saveNamedView: (name: string, snapshot: SavedViewSnapshot) => Promise<void>;
  saveActiveView: (snapshot: SavedViewSnapshot) => Promise<boolean>;
  applySavedView: (viewId: string) => void;
  deleteSavedView: (viewId: string) => Promise<void>;
};

// This snapshot is the renderer's "safe empty project" baseline before boot
// hydrates settings, graph content, and recent project state from the bridge.
const initialState: AppStateSnapshot = {
  showWelcome: true,
  graph: EMPTY_GRAPH,
  graphLoaded: false,
  selectedNodeId: null,
  selectedNodeIds: [],
  selectedEdgeId: null,
  assertions: [],
  sources: [],
  consentData: null,
  nodeCreationModal: { isOpen: false, nodeTypeId: null, position: null },
  relationshipTool: { isActive: false, selectedType: null, sourceNode: null, targetNode: null },
  relationshipModal: { isOpen: false },
  deletionModal: { isOpen: false, node: null },
  edgeDeletionModal: { isOpen: false, relationship: null },
  localAIEnabled: false,
  isLocalAILoading: true,
  loadingStage: 'settings',
  splashReadyToHide: false,
  settingsModalOpen: false,
  investigationProfile: DEFAULT_INVESTIGATION_PROFILE,
  showNodeLabels: true,
  showNodeImages: false,
  autoLayoutPreset: 'off',
  defaultRelationshipConfidence: 'unverified',
  assertionFieldAutomation: DEFAULT_ASSERTION_FIELD_AUTOMATION,
  defaultWorkspaceView: DEFAULT_WORKSPACE_VIEW,
  restoreSavedViewOnOpen: true,
  defaultSidebarTab: DEFAULT_SIDEBAR_TAB,
  autoHideInspectorWhenIdle: DEFAULT_AUTO_HIDE_INSPECTOR_WHEN_IDLE,
  defaultReportTemplate: DEFAULT_REPORT_TEMPLATE,
  defaultReportIncludeAttachments: DEFAULT_REPORT_INCLUDE_ATTACHMENTS,
  defaultReportUseAI: DEFAULT_REPORT_USE_AI,
  defaultReportAIProvider: DEFAULT_REPORT_AI_PROVIDER,
  mediaLibraryDefaultView: DEFAULT_MEDIA_LIBRARY_VIEW,
  mediaLibraryDefaultSort: DEFAULT_MEDIA_LIBRARY_SORT,
  mediaLibraryShowFolders: DEFAULT_MEDIA_LIBRARY_SHOW_FOLDERS,
  uiDensity: DEFAULT_UI_DENSITY,
  motionPreference: DEFAULT_MOTION_PREFERENCE,
  showExampleCaseOnWelcome: DEFAULT_SHOW_EXAMPLE_CASE_ON_WELCOME,
  personalizationTheme: DEFAULT_PERSONALIZATION_THEME,
  searchOpen: false,
  commandPaletteOpen: false,
  boxSelectEnabled: false,
  sidebarTab: 'nodes',
  activeTypeIds: INITIAL_ACTIVE_TYPE_IDS,
  hasSourcesOnly: false,
  nodeIdsWithSources: new Set<string>(),
  filtersOpen: false,
  filterAnchor: null,
  assertionModalOpen: false,
  sourceModalOpen: false,
  terminologyOpen: false,
  mediaLibraryState: { isOpen: false, mode: 'manage', onSelect: null },
  view: 'graph',
  projectInfoOpen: false,
  exportReportOpen: false,
  savedViews: [],
  activeSavedViewId: null,
  pendingSavedViewRestore: null
};

async function loadGraphIntoStore(set: (fn: (state: AppStore) => Partial<AppStore>) => void): Promise<GraphSnapshot> {
  const graph = await piBridge.loadGraph();
  set(() => ({ graph: { nodes: graph.nodes, edges: graph.edges } }));
  return graph;
}

async function withSplashDelay(callback: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  await callback();
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, 2000 - elapsed);
  await new Promise((resolve) => setTimeout(resolve, remaining));
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,
  setShowWelcome: (showWelcome) => set(() => ({ showWelcome })),
  setGraph: (graph) => set(() => ({ graph })),
  setGraphLoaded: (graphLoaded) => set(() => ({ graphLoaded })),
  setSelectedNodeId: (selectedNodeId) => set(() => ({ selectedNodeId })),
  setSelectedNodeIds: (selectedNodeIds) => set(() => ({ selectedNodeIds })),
  setSelectedEdgeId: (selectedEdgeId) => set(() => ({ selectedEdgeId })),
  setAssertions: (assertions) => set(() => ({ assertions })),
  setSources: (sources) => set(() => ({ sources })),
  setConsentData: (consentData) => set(() => ({ consentData })),
  setNodeCreationModal: (nodeCreationModal) => set(() => ({ nodeCreationModal })),
  setRelationshipTool: (value) => set((state) => ({ relationshipTool: typeof value === 'function' ? value(state.relationshipTool) : value })),
  setRelationshipModal: (relationshipModal) => set(() => ({ relationshipModal })),
  setDeletionModal: (deletionModal) => set(() => ({ deletionModal })),
  setEdgeDeletionModal: (edgeDeletionModal) => set(() => ({ edgeDeletionModal })),
  setLoadingStage: (loadingStage) => set(() => ({ loadingStage })),
  setSplashReadyToHide: (splashReadyToHide) => set(() => ({ splashReadyToHide })),
  setSettingsModalOpen: (settingsModalOpen) => set(() => ({ settingsModalOpen })),
  setInvestigationProfile: (investigationProfile) => set(() => ({ investigationProfile })),
  setDefaultWorkspaceView: (defaultWorkspaceView) => set(() => ({ defaultWorkspaceView })),
  setAssertionFieldAutomation: (assertionFieldAutomation) => set(() => ({ assertionFieldAutomation })),
  setRestoreSavedViewOnOpen: (restoreSavedViewOnOpen) => set(() => ({ restoreSavedViewOnOpen })),
  setDefaultSidebarTab: (defaultSidebarTab) => set(() => ({ defaultSidebarTab })),
  setAutoHideInspectorWhenIdle: (autoHideInspectorWhenIdle) => set(() => ({ autoHideInspectorWhenIdle })),
  setDefaultReportTemplate: (defaultReportTemplate) => set(() => ({ defaultReportTemplate })),
  setDefaultReportIncludeAttachments: (defaultReportIncludeAttachments) => set(() => ({ defaultReportIncludeAttachments })),
  setDefaultReportUseAI: (defaultReportUseAI) => set(() => ({ defaultReportUseAI })),
  setDefaultReportAIProvider: (defaultReportAIProvider) => set(() => ({ defaultReportAIProvider })),
  setMediaLibraryDefaultView: (mediaLibraryDefaultView) => set(() => ({ mediaLibraryDefaultView })),
  setMediaLibraryDefaultSort: (mediaLibraryDefaultSort) => set(() => ({ mediaLibraryDefaultSort })),
  setMediaLibraryShowFolders: (mediaLibraryShowFolders) => set(() => ({ mediaLibraryShowFolders })),
  setUiDensity: (uiDensity) => set(() => ({ uiDensity })),
  setMotionPreference: (motionPreference) => set(() => ({ motionPreference })),
  setShowExampleCaseOnWelcome: (showExampleCaseOnWelcome) => set(() => ({ showExampleCaseOnWelcome })),
  setPersonalizationTheme: (personalizationTheme) => set(() => ({ personalizationTheme })),
  setSearchOpen: (searchOpen) => set(() => ({ searchOpen })),
  setCommandPaletteOpen: (commandPaletteOpen) => set(() => ({ commandPaletteOpen })),
  setBoxSelectEnabled: (boxSelectEnabled) => set(() => ({ boxSelectEnabled })),
  setSidebarTab: (sidebarTab) => set(() => ({ sidebarTab })),
  setActiveTypeIds: (value) => set((state) => ({ activeTypeIds: typeof value === 'function' ? value(state.activeTypeIds) : value })),
  setHasSourcesOnly: (hasSourcesOnly) => set(() => ({ hasSourcesOnly })),
  setNodeIdsWithSources: (nodeIdsWithSources) => set(() => ({ nodeIdsWithSources })),
  setFiltersOpen: (filtersOpen) => set(() => ({ filtersOpen })),
  setFilterAnchor: (filterAnchor) => set(() => ({ filterAnchor })),
  setAssertionModalOpen: (assertionModalOpen) => set(() => ({ assertionModalOpen })),
  setSourceModalOpen: (sourceModalOpen) => set(() => ({ sourceModalOpen })),
  setTerminologyOpen: (terminologyOpen) => set(() => ({ terminologyOpen })),
  setMediaLibraryState: (value) =>
    set((state) => ({ mediaLibraryState: typeof value === 'function' ? value(state.mediaLibraryState) : value })),
  setView: (view) => set(() => ({ view })),
  setProjectInfoOpen: (projectInfoOpen) => set(() => ({ projectInfoOpen })),
  setExportReportOpen: (exportReportOpen) => set(() => ({ exportReportOpen })),
  setPendingSavedViewRestore: (pendingSavedViewRestore) => set(() => ({ pendingSavedViewRestore })),
    // Settings hydration pulls from both project-scoped keys and device-local
    // preferences, then normalizes them into one renderer snapshot.
    loadSettings: async () => {
    set(() => ({ isLocalAILoading: true, loadingStage: 'settings' }));
    try {
      const [
        localAI,
        investigationProfileValue,
        showLabels,
        showImages,
        autoLayoutPresetValue,
        autoLayoutLegacyValue,
        defaultConfidence,
        assertionFieldAutomationValue,
        savedViewsValue,
        activeSavedViewIdValue,
        defaultWorkspaceViewValue,
        restoreSavedViewOnOpenValue,
        defaultSidebarTabValue,
        autoHideInspectorWhenIdleValue,
        defaultReportTemplateValue,
        defaultReportIncludeAttachmentsValue,
        defaultReportUseAIValue,
        defaultReportAIProviderValue,
        mediaLibraryDefaultViewValue,
        mediaLibraryDefaultSortValue,
        mediaLibraryShowFoldersValue,
        uiDensityValue,
        motionPreferenceValue,
        showExampleCaseOnWelcomeValue,
        personalizationThemeValue
      ] = await Promise.all([
        piBridge.getProjectSetting(LOCAL_AI_SETTING_KEY),
        piBridge.getProjectSetting<InvestigationProfile>(INVESTIGATION_PROFILE_SETTING_KEY),
        piBridge.getProjectSetting(SHOW_NODE_LABELS_SETTING_KEY),
        piBridge.getProjectSetting(SHOW_NODE_IMAGES_SETTING_KEY),
        piBridge.getProjectSetting<'off' | GraphLayoutPresetId>(AUTO_LAYOUT_PRESET_SETTING_KEY),
        piBridge.getProjectSetting<boolean>(AUTO_LAYOUT_ON_CREATE_SETTING_KEY),
        piBridge.getProjectSetting(DEFAULT_RELATIONSHIP_CONFIDENCE_SETTING_KEY),
        piBridge.getProjectSetting<AssertionFieldAutomationMode>(ASSERTION_FIELD_AUTOMATION_SETTING_KEY),
        piBridge.getProjectSetting(SAVED_VIEWS_SETTING_KEY),
        piBridge.getProjectSetting<string>(ACTIVE_SAVED_VIEW_ID_SETTING_KEY),
        piBridge.getProjectSetting<WorkspaceDefaultView>(DEFAULT_WORKSPACE_VIEW_SETTING_KEY),
        piBridge.getProjectSetting<boolean>(RESTORE_SAVED_VIEW_ON_OPEN_SETTING_KEY),
        piBridge.getProjectSetting<SidebarTabPreference>(DEFAULT_SIDEBAR_TAB_SETTING_KEY),
        piBridge.getProjectSetting<boolean>(AUTO_HIDE_INSPECTOR_WHEN_IDLE_SETTING_KEY),
        piBridge.getProjectSetting<ReportTemplatePreference>(DEFAULT_REPORT_TEMPLATE_SETTING_KEY),
        piBridge.getProjectSetting<boolean>(DEFAULT_REPORT_INCLUDE_ATTACHMENTS_SETTING_KEY),
        piBridge.getProjectSetting<boolean>(DEFAULT_REPORT_USE_AI_SETTING_KEY),
        piBridge.getProjectSetting<ReportAIProviderPreference>(DEFAULT_REPORT_AI_PROVIDER_SETTING_KEY),
        piBridge.getProjectSetting<MediaLibraryViewPreference>(MEDIA_LIBRARY_DEFAULT_VIEW_SETTING_KEY),
        piBridge.getProjectSetting<MediaLibrarySortPreference>(MEDIA_LIBRARY_DEFAULT_SORT_SETTING_KEY),
        piBridge.getProjectSetting<boolean>(MEDIA_LIBRARY_SHOW_FOLDERS_SETTING_KEY),
        piBridge.getDeviceSetting<UIDensityPreference>(DEVICE_UI_DENSITY_SETTING_KEY),
        piBridge.getDeviceSetting<MotionPreference>(DEVICE_MOTION_PREFERENCE_SETTING_KEY),
        piBridge.getDeviceSetting<boolean>(DEVICE_SHOW_EXAMPLE_CASE_SETTING_KEY),
        piBridge.getDeviceSetting<PersonalizationTheme>(DEVICE_PERSONALIZATION_THEME_SETTING_KEY)
      ]);
      const autoLayoutPreset = normalizeAutoLayoutPresetSetting(autoLayoutPresetValue, autoLayoutLegacyValue);
      const savedViews = normalizeSavedViews(savedViewsValue);
      const activeSavedViewId =
        typeof activeSavedViewIdValue === 'string' && savedViews.some((savedView) => savedView.id === activeSavedViewIdValue)
          ? activeSavedViewIdValue
          : null;
      const activeSavedView = activeSavedViewId ? savedViews.find((savedView) => savedView.id === activeSavedViewId) ?? null : null;
      const restoreSavedViewOnOpen = typeof restoreSavedViewOnOpenValue === 'boolean' ? restoreSavedViewOnOpenValue : true;
      const defaultWorkspaceView =
        defaultWorkspaceViewValue === 'timeline' || defaultWorkspaceViewValue === 'review'
          ? defaultWorkspaceViewValue
          : DEFAULT_WORKSPACE_VIEW;
      const defaultSidebarTab = defaultSidebarTabValue === 'ai' ? 'ai' : DEFAULT_SIDEBAR_TAB;
      set((state) => ({
        localAIEnabled: Boolean(localAI),
        investigationProfile:
          investigationProfileValue === 'cyber_osint' || investigationProfileValue === 'casework' || investigationProfileValue === 'general'
            ? investigationProfileValue
            : DEFAULT_INVESTIGATION_PROFILE,
        showNodeLabels: showLabels === null ? true : Boolean(showLabels),
        showNodeImages: showImages === null ? false : Boolean(showImages),
        autoLayoutPreset,
        defaultRelationshipConfidence: (defaultConfidence as AppStateSnapshot['defaultRelationshipConfidence']) || 'unverified',
        assertionFieldAutomation:
          assertionFieldAutomationValue === 'prompt' || assertionFieldAutomationValue === 'manual'
            ? assertionFieldAutomationValue
            : DEFAULT_ASSERTION_FIELD_AUTOMATION,
        defaultWorkspaceView,
        restoreSavedViewOnOpen,
        defaultSidebarTab,
        autoHideInspectorWhenIdle:
          typeof autoHideInspectorWhenIdleValue === 'boolean'
            ? autoHideInspectorWhenIdleValue
            : DEFAULT_AUTO_HIDE_INSPECTOR_WHEN_IDLE,
        defaultReportTemplate:
          defaultReportTemplateValue === 'selection' ||
          defaultReportTemplateValue === 'timeline' ||
          defaultReportTemplateValue === 'person'
            ? defaultReportTemplateValue
            : DEFAULT_REPORT_TEMPLATE,
        defaultReportIncludeAttachments:
          typeof defaultReportIncludeAttachmentsValue === 'boolean'
            ? defaultReportIncludeAttachmentsValue
            : DEFAULT_REPORT_INCLUDE_ATTACHMENTS,
        defaultReportUseAI: typeof defaultReportUseAIValue === 'boolean' ? defaultReportUseAIValue : DEFAULT_REPORT_USE_AI,
        defaultReportAIProvider: defaultReportAIProviderValue === 'openai' ? 'openai' : DEFAULT_REPORT_AI_PROVIDER,
        mediaLibraryDefaultView: mediaLibraryDefaultViewValue === 'list' ? 'list' : DEFAULT_MEDIA_LIBRARY_VIEW,
        mediaLibraryDefaultSort:
          mediaLibraryDefaultSortValue === 'oldest' ||
          mediaLibraryDefaultSortValue === 'name' ||
          mediaLibraryDefaultSortValue === 'usage'
            ? mediaLibraryDefaultSortValue
            : DEFAULT_MEDIA_LIBRARY_SORT,
        mediaLibraryShowFolders:
          typeof mediaLibraryShowFoldersValue === 'boolean' ? mediaLibraryShowFoldersValue : DEFAULT_MEDIA_LIBRARY_SHOW_FOLDERS,
        uiDensity: uiDensityValue === 'compact' ? 'compact' : DEFAULT_UI_DENSITY,
        motionPreference:
          motionPreferenceValue === 'reduced' || motionPreferenceValue === 'enhanced'
            ? motionPreferenceValue
            : DEFAULT_MOTION_PREFERENCE,
        showExampleCaseOnWelcome:
          typeof showExampleCaseOnWelcomeValue === 'boolean'
            ? showExampleCaseOnWelcomeValue
            : DEFAULT_SHOW_EXAMPLE_CASE_ON_WELCOME,
        personalizationTheme: normalizePersonalizationTheme(personalizationThemeValue),
        savedViews,
        activeSavedViewId,
        pendingSavedViewRestore: restoreSavedViewOnOpen ? activeSavedView : null,
        view: restoreSavedViewOnOpen ? activeSavedView?.view ?? defaultWorkspaceView : defaultWorkspaceView,
        sidebarTab: restoreSavedViewOnOpen ? activeSavedView?.sidebarTab ?? defaultSidebarTab : defaultSidebarTab,
        activeTypeIds: restoreSavedViewOnOpen && activeSavedView ? new Set(activeSavedView.activeTypeIds) : state.activeTypeIds,
        hasSourcesOnly: restoreSavedViewOnOpen ? activeSavedView?.hasSourcesOnly ?? state.hasSourcesOnly : state.hasSourcesOnly,
        selectedNodeIds: restoreSavedViewOnOpen ? activeSavedView?.selectedNodeIds ?? [] : [],
        selectedNodeId: restoreSavedViewOnOpen && activeSavedView && activeSavedView.selectedNodeIds.length === 1 ? activeSavedView.selectedNodeIds[0] : null,
        selectedEdgeId:
          restoreSavedViewOnOpen && activeSavedView && activeSavedView.selectedNodeIds.length === 0 && activeSavedView.selectedEdgeIds.length === 1
            ? activeSavedView.selectedEdgeIds[0]
            : null,
        loadingStage: state.graphLoaded ? state.loadingStage : 'graph'
      }));
    } catch (error) {
      console.error('[AppStore] Failed to load settings', error);
      set((state) => ({
        loadingStage: state.graphLoaded ? state.loadingStage : 'graph'
      }));
    } finally {
      set(() => ({ isLocalAILoading: false }));
    }
  },
    // Boot intentionally serializes the initial app load so the welcome screen,
    // splash state, graph snapshot, and persisted settings all agree on the
    // same current project before the main workspace renders.
    boot: async () => {
    set(() => ({ loadingStage: 'graph' }));
    await Promise.all([get().loadSettings(), loadGraphIntoStore(set)]);
    set(() => ({ loadingStage: 'complete' }));
    await withSplashDelay(async () => undefined);
    set(() => ({ graphLoaded: true }));
    await new Promise((resolve) => setTimeout(resolve, 300));
    set(() => ({ splashReadyToHide: true }));
    await get().normalizeLabels();
  },
  refreshGraph: async () => {
    await loadGraphIntoStore(set);
  },
  normalizeLabels: async () => {
    const graph = get().graph;
    try {
      await Promise.allSettled(
        graph.nodes.map(async (node) => {
          const candidate = inferEntityLabel(node.type, (node.properties || {}) as Record<string, unknown>);
          if (!candidate) return;
          const currentLabel = (node.label || '').trim().toLowerCase();
          const typeWord = (node.type || '').replace(/_/g, ' ').trim().toLowerCase();
          const isGeneric = currentLabel === '' || currentLabel === typeWord;
          if (isGeneric || currentLabel !== candidate.toLowerCase()) {
            await piBridge.updateEntity(node.id, { label: candidate });
          }
        })
      );
    } catch {
      // ignore non-blocking normalization failures
    }
  },
  refreshEntityDetails: async (entityId) => {
    const [assertions, sources] = await Promise.all([
      piBridge.listAssertionsByEntity(entityId),
      piBridge.listSourcesByEntity(entityId)
    ]);
    set(() => ({ assertions, sources }));
  },
  refreshNodesWithSources: async () => {
    const graph = get().graph;
    const pairs = await Promise.all(
      graph.nodes.map(async (node) => {
        try {
          const sources = await piBridge.listSourcesByEntity(node.id);
          return [node.id, (sources?.length ?? 0) > 0] as const;
        } catch {
          return [node.id, false] as const;
        }
      })
    );
    const next = new Set<string>();
    for (const [id, hasSources] of pairs) {
      if (hasSources) next.add(id);
    }
    set(() => ({ nodeIdsWithSources: next }));
  },
  createProject: async (projectName?: string) => {
    try {
      const ok = await piBridge.projectNew(projectName);
      if (!ok) return;
      set(() => ({ graphLoaded: false, splashReadyToHide: false, loadingStage: 'settings', isLocalAILoading: true }));
      await withSplashDelay(async () => {
        await loadGraphIntoStore(set);
        set(() => ({ loadingStage: 'complete' }));
      });
      set(() => ({ graphLoaded: true, showWelcome: false }));
      await new Promise((resolve) => setTimeout(resolve, 300));
      set(() => ({ splashReadyToHide: true }));
      await get().loadSettings();
    } catch (error) {
      console.error('project:new failed', error);
      set(() => ({ showWelcome: false }));
      await get().loadSettings();
    }
  },
  openProject: async () => {
    try {
      const ok = await piBridge.projectOpen();
      if (!ok) return;
      set(() => ({ graphLoaded: false, splashReadyToHide: false, loadingStage: 'settings', isLocalAILoading: true }));
      await withSplashDelay(async () => {
        await loadGraphIntoStore(set);
        set(() => ({ loadingStage: 'complete' }));
      });
      set(() => ({ graphLoaded: true, showWelcome: false }));
      await new Promise((resolve) => setTimeout(resolve, 300));
      set(() => ({ splashReadyToHide: true }));
      await get().loadSettings();
    } catch (error) {
      console.error('project:open failed', error);
    }
  },
  handleProjectLoaded: async () => {
    try {
      set(() => ({ graphLoaded: false, splashReadyToHide: false, loadingStage: 'settings', isLocalAILoading: true }));
      await withSplashDelay(async () => {
        await loadGraphIntoStore(set);
        set(() => ({ loadingStage: 'complete' }));
      });
      set(() => ({ graphLoaded: true, showWelcome: false }));
      await new Promise((resolve) => setTimeout(resolve, 300));
      set(() => ({ splashReadyToHide: true }));
      await get().loadSettings();
    } catch (error) {
      console.error('project:loaded event handler failed', error);
    }
  },
  closeProject: () => {
    set(() => ({
      showWelcome: true,
      graph: EMPTY_GRAPH,
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeId: null,
      assertions: [],
      sources: [],
      savedViews: [],
      activeSavedViewId: null,
      pendingSavedViewRestore: null
    }));
  },
  persistShowNodeLabels: async (value) => {
    try {
      await piBridge.setProjectSetting(SHOW_NODE_LABELS_SETTING_KEY, value);
      set(() => ({ showNodeLabels: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist show node labels setting', error);
    }
  },
  persistShowNodeImages: async (value) => {
    try {
      await piBridge.setProjectSetting(SHOW_NODE_IMAGES_SETTING_KEY, value);
      set(() => ({ showNodeImages: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist show node images setting', error);
    }
  },
  persistAutoLayoutPreset: async (value) => {
    try {
      await Promise.all([
        piBridge.setProjectSetting(AUTO_LAYOUT_PRESET_SETTING_KEY, value),
        piBridge.setProjectSetting(AUTO_LAYOUT_ON_CREATE_SETTING_KEY, value !== 'off')
      ]);
      set(() => ({ autoLayoutPreset: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist auto layout setting', error);
    }
  },
  persistDefaultRelationshipConfidence: async (value) => {
    try {
      await piBridge.setProjectSetting(DEFAULT_RELATIONSHIP_CONFIDENCE_SETTING_KEY, value);
      set(() => ({ defaultRelationshipConfidence: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist default relationship confidence', error);
    }
  },
  persistAssertionFieldAutomation: async (value) => {
    set(() => ({ assertionFieldAutomation: value }));
    try {
      await piBridge.setProjectSetting(ASSERTION_FIELD_AUTOMATION_SETTING_KEY, value);
    } catch (error) {
      console.error('[AppStore] Failed to persist assertion field automation', error);
    }
  },
  persistInvestigationProfile: async (value) => {
    try {
      await piBridge.setProjectSetting(INVESTIGATION_PROFILE_SETTING_KEY, value);
      set(() => ({ investigationProfile: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist investigation profile', error);
    }
  },
  persistDefaultWorkspaceView: async (value) => {
    try {
      await piBridge.setProjectSetting(DEFAULT_WORKSPACE_VIEW_SETTING_KEY, value);
      set(() => ({ defaultWorkspaceView: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist default workspace view', error);
    }
  },
  persistRestoreSavedViewOnOpen: async (value) => {
    try {
      await piBridge.setProjectSetting(RESTORE_SAVED_VIEW_ON_OPEN_SETTING_KEY, value);
      set(() => ({ restoreSavedViewOnOpen: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist restore-saved-view setting', error);
    }
  },
  persistDefaultSidebarTab: async (value) => {
    try {
      await piBridge.setProjectSetting(DEFAULT_SIDEBAR_TAB_SETTING_KEY, value);
      set(() => ({ defaultSidebarTab: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist default sidebar tab', error);
    }
  },
  persistAutoHideInspectorWhenIdle: async (value) => {
    try {
      await piBridge.setProjectSetting(AUTO_HIDE_INSPECTOR_WHEN_IDLE_SETTING_KEY, value);
      set(() => ({ autoHideInspectorWhenIdle: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist inspector auto-hide setting', error);
    }
  },
  persistDefaultReportTemplate: async (value) => {
    try {
      await piBridge.setProjectSetting(DEFAULT_REPORT_TEMPLATE_SETTING_KEY, value);
      set(() => ({ defaultReportTemplate: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist default report template', error);
    }
  },
  persistDefaultReportIncludeAttachments: async (value) => {
    try {
      await piBridge.setProjectSetting(DEFAULT_REPORT_INCLUDE_ATTACHMENTS_SETTING_KEY, value);
      set(() => ({ defaultReportIncludeAttachments: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist default report attachment setting', error);
    }
  },
  persistDefaultReportUseAI: async (value) => {
    try {
      await piBridge.setProjectSetting(DEFAULT_REPORT_USE_AI_SETTING_KEY, value);
      set(() => ({ defaultReportUseAI: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist default report AI toggle', error);
    }
  },
  persistDefaultReportAIProvider: async (value) => {
    try {
      await piBridge.setProjectSetting(DEFAULT_REPORT_AI_PROVIDER_SETTING_KEY, value);
      set(() => ({ defaultReportAIProvider: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist default report AI provider', error);
    }
  },
  persistMediaLibraryDefaultView: async (value) => {
    try {
      await piBridge.setProjectSetting(MEDIA_LIBRARY_DEFAULT_VIEW_SETTING_KEY, value);
      set(() => ({ mediaLibraryDefaultView: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist media library view setting', error);
    }
  },
  persistMediaLibraryDefaultSort: async (value) => {
    try {
      await piBridge.setProjectSetting(MEDIA_LIBRARY_DEFAULT_SORT_SETTING_KEY, value);
      set(() => ({ mediaLibraryDefaultSort: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist media library sort setting', error);
    }
  },
  persistMediaLibraryShowFolders: async (value) => {
    try {
      await piBridge.setProjectSetting(MEDIA_LIBRARY_SHOW_FOLDERS_SETTING_KEY, value);
      set(() => ({ mediaLibraryShowFolders: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist media library folder-visibility setting', error);
    }
  },
  persistUiDensity: async (value) => {
    try {
      await piBridge.setDeviceSetting(DEVICE_UI_DENSITY_SETTING_KEY, value);
      set(() => ({ uiDensity: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist UI density setting', error);
    }
  },
  persistMotionPreference: async (value) => {
    try {
      await piBridge.setDeviceSetting(DEVICE_MOTION_PREFERENCE_SETTING_KEY, value);
      set(() => ({ motionPreference: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist motion preference', error);
    }
  },
  persistShowExampleCaseOnWelcome: async (value) => {
    try {
      await piBridge.setDeviceSetting(DEVICE_SHOW_EXAMPLE_CASE_SETTING_KEY, value);
      set(() => ({ showExampleCaseOnWelcome: value }));
    } catch (error) {
      console.error('[AppStore] Failed to persist example-case visibility setting', error);
    }
  },
  persistPersonalizationTheme: async (value) => {
    try {
      const normalized = normalizePersonalizationTheme(value);
      await piBridge.setDeviceSetting(DEVICE_PERSONALIZATION_THEME_SETTING_KEY, normalized);
      set(() => ({ personalizationTheme: normalized }));
    } catch (error) {
      console.error('[AppStore] Failed to persist personalization theme', error);
    }
  },
  toggleLocalAI: async () => {
    const next = !get().localAIEnabled;
    try {
      set(() => ({ isLocalAILoading: true }));
      await piBridge.setProjectSetting(LOCAL_AI_SETTING_KEY, next);
      set(() => ({ localAIEnabled: next }));
    } catch (error) {
      console.error('[AppStore] Failed to persist local AI preference', error);
    } finally {
      set(() => ({ isLocalAILoading: false }));
    }
  },
  createNode: async ({ type, label, properties, position }) => {
    try {
      const entityId = await piBridge.createEntity({
        type: type as EntityRecord['type'],
        label,
        properties
      });
      if (entityId && position) {
        void piBridge.updateEntityPosition(entityId, position);
      }
      await get().refreshGraph();
    } catch (error) {
      console.error('[AppStore] Error creating entity', error);
    }
  },
  createRelationship: async ({ relationshipType, sourceId, targetId, properties, beforePositions }) => {
    try {
      await piBridge.createEdge({
        src_id: sourceId,
        dst_id: targetId,
        type: relationshipType,
        properties
      });
      const updatedGraph = await piBridge.loadGraph();
      const nodesWithPositions = updatedGraph.nodes.map((node) => {
        if (node.pos_x != null && node.pos_y != null) return node;
        const existing = beforePositions[node.id];
        return existing ? { ...node, pos_x: existing.x, pos_y: existing.y } : node;
      });
      set(() => ({
        graph: { nodes: nodesWithPositions, edges: updatedGraph.edges },
        relationshipTool: { isActive: false, selectedType: null, sourceNode: null, targetNode: null }
      }));
      void Promise.allSettled(
        nodesWithPositions
          .filter((node) => beforePositions[node.id] && (node.pos_x == null || node.pos_y == null))
          .map((node) => piBridge.updateEntityPosition(node.id, beforePositions[node.id]))
      );
    } catch (error) {
      console.error('Error creating relationship:', error);
    }
  },
  updateEdgeProperty: async (edgeId, key, value) => {
    const edge = get().graph.edges.find((item) => item.id === edgeId);
    if (!edge) return;
    const nextProps = { ...(edge.properties || {}), [key]: value } as Record<string, unknown>;
    try {
      await piBridge.updateEdge(edgeId, { properties: nextProps });
      await get().refreshGraph();
    } catch (error) {
      console.error('Failed to update edge property', error);
    }
  },
  confirmDeleteNode: async () => {
    const modal = get().deletionModal;
    if (!modal.node) return;
    try {
      await piBridge.deleteEntity(modal.node.id);
      await get().refreshGraph();
      set(() => ({
        selectedNodeId: null,
        deletionModal: { isOpen: false, node: null }
      }));
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  },
  confirmDeleteEdge: async () => {
    const modal = get().edgeDeletionModal;
    if (!modal.relationship) return;
    try {
      await piBridge.deleteEdge(modal.relationship.id);
      await get().refreshGraph();
      set(() => ({
        selectedEdgeId: null,
        edgeDeletionModal: { isOpen: false, relationship: null }
      }));
    } catch (error) {
      console.error('Error deleting edge:', error);
    }
  },
  updateNodeProperty: async (nodeId, propertyKey, value) => {
    const node = get().graph.nodes.find((item) => item.id === nodeId);
    if (!node) return;

    const currentProperties = node.properties || {};
    const nextProperties = { ...currentProperties };
    if (value === '' || value === null || value === undefined) {
      delete nextProperties[propertyKey];
    } else {
      nextProperties[propertyKey] = value;
    }

    const nextLabel = inferEntityLabel(node.type, nextProperties);
    try {
      await piBridge.updateEntity(nodeId, nextLabel ? { label: nextLabel, properties: nextProperties } : { properties: nextProperties });
      set((state) => ({
        graph: {
          ...state.graph,
          nodes: state.graph.nodes.map((item) =>
            item.id === nodeId ? { ...item, properties: nextProperties, label: nextLabel ?? item.label } : item
          )
        }
      }));
    } catch (error) {
      console.error('Error updating property:', error);
    }
  },
  updateNodeLabel: async (nodeId, newLabel) => {
    try {
      await piBridge.updateEntity(nodeId, { label: newLabel });
      set((state) => ({
        graph: {
          ...state.graph,
          nodes: state.graph.nodes.map((item) => (item.id === nodeId ? { ...item, label: newLabel } : item))
        }
      }));
    } catch (error) {
      console.error('Error updating label:', error);
    }
  },
  deleteNodes: async (ids) => {
    for (const id of ids) {
      await piBridge.deleteEntity(id);
    }
    await get().refreshGraph();
  },
  handleNodeDragFree: async (id, x, y) => {
    void piBridge.updateEntityPosition(id, { x, y });
    set((state) => ({
      graph: {
        ...state.graph,
        nodes: state.graph.nodes.map((node) => (node.id === id ? { ...node, pos_x: x, pos_y: y } : node))
      }
    }));
  },
  saveNamedView: async (name, snapshot) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const existing = get().savedViews.find((savedView) => savedView.name.toLowerCase() === trimmedName.toLowerCase());
    const nextView = createSavedView(trimmedName, snapshot, existing);
    const nextSavedViews = [
      ...get().savedViews.filter((savedView) => savedView.id !== nextView.id),
      nextView
    ].sort((a, b) => a.name.localeCompare(b.name));

    set(() => ({
      savedViews: nextSavedViews,
      activeSavedViewId: nextView.id,
      pendingSavedViewRestore: nextView
    }));

    try {
      await piBridge.setProjectSetting(SAVED_VIEWS_SETTING_KEY, nextSavedViews);
      await piBridge.setProjectSetting(ACTIVE_SAVED_VIEW_ID_SETTING_KEY, nextView.id);
    } catch (error) {
      console.error('[AppStore] Failed to persist saved view', error);
    }
  },
  saveActiveView: async (snapshot) => {
    const activeSavedViewId = get().activeSavedViewId;
    if (!activeSavedViewId) return false;

    const existing = get().savedViews.find((savedView) => savedView.id === activeSavedViewId);
    if (!existing) return false;

    const nextView = createSavedView(existing.name, snapshot, existing);
    const nextSavedViews = get().savedViews
      .map((savedView) => (savedView.id === nextView.id ? nextView : savedView))
      .sort((a, b) => a.name.localeCompare(b.name));

    set(() => ({
      savedViews: nextSavedViews,
      pendingSavedViewRestore: nextView
    }));

    try {
      await piBridge.setProjectSetting(SAVED_VIEWS_SETTING_KEY, nextSavedViews);
      await piBridge.setProjectSetting(ACTIVE_SAVED_VIEW_ID_SETTING_KEY, nextView.id);
      return true;
    } catch (error) {
      console.error('[AppStore] Failed to update active saved view', error);
      return false;
    }
  },
  applySavedView: (viewId) => {
    const savedView = get().savedViews.find((item) => item.id === viewId);
    if (!savedView) return;
    const nextView = sanitizeSavedViewForGraph(savedView, get().graph);

    set(() => ({
      activeSavedViewId: nextView.id,
      pendingSavedViewRestore: nextView,
      view: nextView.view,
      sidebarTab: nextView.sidebarTab,
      activeTypeIds: new Set(nextView.activeTypeIds),
      hasSourcesOnly: nextView.hasSourcesOnly,
      selectedNodeIds: nextView.selectedNodeIds,
      selectedNodeId: nextView.selectedNodeIds.length === 1 ? nextView.selectedNodeIds[0] : null,
      selectedEdgeId: nextView.selectedNodeIds.length === 0 && nextView.selectedEdgeIds.length === 1 ? nextView.selectedEdgeIds[0] : null
    }));

    void piBridge.setProjectSetting(ACTIVE_SAVED_VIEW_ID_SETTING_KEY, nextView.id).catch((error) => {
      console.error('[AppStore] Failed to persist active saved view', error);
    });
  },
  deleteSavedView: async (viewId) => {
    const nextSavedViews = get().savedViews.filter((savedView) => savedView.id !== viewId);
    const nextActiveSavedViewId = get().activeSavedViewId === viewId ? null : get().activeSavedViewId;

    set(() => ({
      savedViews: nextSavedViews,
      activeSavedViewId: nextActiveSavedViewId,
      pendingSavedViewRestore: get().pendingSavedViewRestore?.id === viewId ? null : get().pendingSavedViewRestore
    }));

    try {
      await piBridge.setProjectSetting(SAVED_VIEWS_SETTING_KEY, nextSavedViews);
      await piBridge.setProjectSetting(ACTIVE_SAVED_VIEW_ID_SETTING_KEY, nextActiveSavedViewId);
    } catch (error) {
      console.error('[AppStore] Failed to delete saved view', error);
    }
  }
}));
