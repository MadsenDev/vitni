import type { SourceRecord } from '@shared/types';
import type { InvestigationProfile } from '@renderer/features/profiles/investigationProfiles';
import type { RelationshipType } from '@renderer/lib/relationshipTypes';
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
import type { PersonalizationTheme } from '@renderer/features/personalization/theme';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';

export type AssertionView = ParsedAssertionRecord;

export type RelationshipToolState = {
  isActive: boolean;
  selectedType: RelationshipType | null;
  sourceNode: { id: string; label: string; type: string } | null;
  targetNode: { id: string; label: string; type: string } | null;
};

export type NodeCreationModalState = {
  isOpen: boolean;
  nodeTypeId: string | null;
  position: { x: number; y: number } | null;
};

export type RelationshipModalState = {
  isOpen: boolean;
};

export type DeletionModalState = {
  isOpen: boolean;
  node: { id: string; label: string; type: string } | null;
};

export type EdgeDeletionModalState = {
  isOpen: boolean;
  relationship: {
    id: string;
    type: string;
    sourceLabel: string;
    targetLabel: string;
  } | null;
};

export type ConsentState = {
  transformId: string;
  transformName: string;
  subjectEntityId: string;
  subjectEntityType: string;
  payload: Record<string, unknown>;
  destination: string;
} | null;

export type MediaLibraryState = {
  isOpen: boolean;
  mode: 'manage' | 'select';
  onSelect?: ((source: SourceRecord) => void) | null;
};

export type LoadingStage = 'settings' | 'graph' | 'complete';

export type SidebarTab = 'nodes' | 'ai';

export type WorkspaceView = 'graph' | 'timeline' | 'review';

export type SearchResultKind = 'node' | 'relationship' | 'assertion' | 'source';

export type SearchResult = {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  metadata?: string;
  relatedNodeIds: string[];
  nodeId?: string;
  edgeId?: string;
  assertionId?: string;
  sourceId?: string;
  searchText: string;
  primaryText: string;
  secondaryText?: string;
};

export type SearchFocusState = {
  assertionId?: string | null;
  sourceId?: string | null;
  edgeId?: string | null;
} | null;

export type GraphViewport = {
  zoom: number;
  pan: { x: number; y: number };
};

export type SavedViewSnapshot = {
  view: WorkspaceView;
  sidebarTab: SidebarTab;
  activeTypeIds: string[];
  hasSourcesOnly: boolean;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  viewport: GraphViewport | null;
};

export type SavedView = SavedViewSnapshot & {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export type AppStateSnapshot = {
  showWelcome: boolean;
  graph: GraphSnapshot;
  graphLoaded: boolean;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  assertions: AssertionView[];
  sources: SourceRecord[];
  consentData: ConsentState;
  nodeCreationModal: NodeCreationModalState;
  relationshipTool: RelationshipToolState;
  relationshipModal: RelationshipModalState;
  deletionModal: DeletionModalState;
  edgeDeletionModal: EdgeDeletionModalState;
  localAIEnabled: boolean;
  isLocalAILoading: boolean;
  loadingStage: LoadingStage;
  splashReadyToHide: boolean;
  settingsModalOpen: boolean;
  investigationProfile: InvestigationProfile;
  showNodeLabels: boolean;
  showNodeImages: boolean;
  autoLayoutPreset: 'off' | GraphLayoutPresetId;
  defaultRelationshipConfidence: 'unverified' | 'asserted' | 'verified';
  assertionFieldAutomation: AssertionFieldAutomationMode;
  defaultWorkspaceView: WorkspaceDefaultView;
  restoreSavedViewOnOpen: boolean;
  defaultSidebarTab: SidebarTabPreference;
  autoHideInspectorWhenIdle: boolean;
  defaultReportTemplate: ReportTemplatePreference;
  defaultReportIncludeAttachments: boolean;
  defaultReportUseAI: boolean;
  defaultReportAIProvider: ReportAIProviderPreference;
  mediaLibraryDefaultView: MediaLibraryViewPreference;
  mediaLibraryDefaultSort: MediaLibrarySortPreference;
  mediaLibraryShowFolders: boolean;
  uiDensity: UIDensityPreference;
  motionPreference: MotionPreference;
  showExampleCaseOnWelcome: boolean;
  personalizationTheme: PersonalizationTheme;
  searchOpen: boolean;
  boxSelectEnabled: boolean;
  sidebarTab: SidebarTab;
  activeTypeIds: Set<string>;
  hasSourcesOnly: boolean;
  nodeIdsWithSources: Set<string>;
  filtersOpen: boolean;
  filterAnchor: DOMRect | null;
  assertionModalOpen: boolean;
  sourceModalOpen: boolean;
  terminologyOpen: boolean;
  mediaLibraryState: MediaLibraryState;
  view: WorkspaceView;
  projectInfoOpen: boolean;
  exportReportOpen: boolean;
  savedViews: SavedView[];
  activeSavedViewId: string | null;
  pendingSavedViewRestore: SavedView | null;
};
