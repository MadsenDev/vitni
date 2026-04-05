import { Suspense, lazy } from 'react';
import type { GraphLayoutPresetId } from '@renderer/features/graph/layoutPresets';
import type { PersonalizationTheme } from '@renderer/features/personalization/theme';
import type { InvestigationProfile } from '@renderer/features/profiles/investigationProfiles';
import type { NodeType } from '@renderer/lib/nodeTypes';
import type { SourceRecord } from '@shared/types';
import type { GraphSnapshot } from '@renderer/types/graph';
import type { ConsentState, DeletionModalState, EdgeDeletionModalState, MediaLibraryState, RelationshipToolState } from '@renderer/types/app';
import { ConsentModal } from './ConsentModal';
import { NodeCreationModal } from './NodeCreationModal';
import { NodeDeletionModal } from './NodeDeletionModal';
import { RelationshipCreationModal } from './RelationshipCreationModal';
import { RelationshipDeletionModal } from './RelationshipDeletionModal';

const AssertionCreationModal = lazy(() => import('./AssertionCreationModal').then((module) => ({ default: module.AssertionCreationModal })));
const ExportReportModal = lazy(() => import('./ExportReportModal').then((module) => ({ default: module.ExportReportModal })));
const MediaLibraryModal = lazy(() => import('./MediaLibraryModal').then((module) => ({ default: module.MediaLibraryModal })));
const ProjectSettingsModal = lazy(() => import('./ProjectSettingsModal').then((module) => ({ default: module.ProjectSettingsModal })));
const SettingsModal = lazy(() => import('./SettingsModal').then((module) => ({ default: module.SettingsModal })));
const SourceCreationModal = lazy(() => import('./SourceCreationModal').then((module) => ({ default: module.SourceCreationModal })));
const TerminologyModal = lazy(() => import('./TerminologyModal').then((module) => ({ default: module.TerminologyModal })));

interface AppModalLayerProps {
  consentData: ConsentState;
  nodeCreationOpen: boolean;
  nodeType: NodeType | null;
  nodePosition: { x: number; y: number } | null;
  relationshipModalOpen: boolean;
  relationshipTool: RelationshipToolState;
  defaultRelationshipConfidence: 'unverified' | 'asserted' | 'verified';
  assertionFieldAutomation: 'auto' | 'prompt' | 'manual';
  settingsModalOpen: boolean;
  localAIEnabled: boolean;
  investigationProfile: InvestigationProfile;
  defaultWorkspaceView: 'graph' | 'timeline' | 'review';
  restoreSavedViewOnOpen: boolean;
  defaultSidebarTab: 'nodes' | 'ai';
  autoHideInspectorWhenIdle: boolean;
  showNodeLabels: boolean;
  showNodeImages: boolean;
  autoLayoutPreset: 'off' | GraphLayoutPresetId;
  defaultReportTemplate: 'full' | 'selection' | 'timeline' | 'person';
  defaultReportIncludeAttachments: boolean;
  defaultReportUseAI: boolean;
  defaultReportAIProvider: 'ollama' | 'openai';
  mediaLibraryDefaultView: 'grid' | 'list';
  mediaLibraryDefaultSort: 'newest' | 'oldest' | 'name' | 'usage';
  mediaLibraryShowFolders: boolean;
  uiDensity: 'comfortable' | 'compact';
  motionPreference: 'reduced' | 'standard' | 'enhanced';
  showExampleCaseOnWelcome: boolean;
  personalizationTheme: PersonalizationTheme;
  deletionModal: DeletionModalState;
  edgeDeletionModal: EdgeDeletionModalState;
  assertionModalOpen: boolean;
  sourceModalOpen: boolean;
  mediaLibraryState: MediaLibraryState;
  terminologyOpen: boolean;
  projectInfoOpen: boolean;
  exportReportOpen: boolean;
  selectedNode: GraphSnapshot['nodes'][number] | null;
  onConfirmConsent: () => Promise<void>;
  onDismissConsent: () => void;
  onCloseNodeCreation: () => void;
  onCreateNode: (data: { label: string; properties: Record<string, unknown> }) => void;
  onCloseRelationshipModal: () => void;
  onCreateRelationship: (data: {
    relationshipType: string;
    sourceId: string;
    targetId: string;
    properties: Record<string, unknown>;
  }) => void;
  onCloseSettings: () => void;
  onToggleLocalAI: () => Promise<void>;
  onInvestigationProfileChange: (value: InvestigationProfile) => Promise<void>;
  onDefaultWorkspaceViewChange: (value: 'graph' | 'timeline' | 'review') => Promise<void>;
  onRestoreSavedViewOnOpenChange: (value: boolean) => Promise<void>;
  onDefaultSidebarTabChange: (value: 'nodes' | 'ai') => Promise<void>;
  onAutoHideInspectorWhenIdleChange: (value: boolean) => Promise<void>;
  onShowNodeLabelsChange: (value: boolean) => Promise<void>;
  onShowNodeImagesChange: (value: boolean) => Promise<void>;
  onAutoLayoutPresetChange: (value: 'off' | GraphLayoutPresetId) => Promise<void>;
  onDefaultRelationshipConfidenceChange: (value: 'unverified' | 'asserted' | 'verified') => Promise<void>;
  onAssertionFieldAutomationChange: (value: 'auto' | 'prompt' | 'manual') => Promise<void>;
  onDefaultReportTemplateChange: (value: 'full' | 'selection' | 'timeline' | 'person') => Promise<void>;
  onDefaultReportIncludeAttachmentsChange: (value: boolean) => Promise<void>;
  onDefaultReportUseAIChange: (value: boolean) => Promise<void>;
  onDefaultReportAIProviderChange: (value: 'ollama' | 'openai') => Promise<void>;
  onMediaLibraryDefaultViewChange: (value: 'grid' | 'list') => Promise<void>;
  onMediaLibraryDefaultSortChange: (value: 'newest' | 'oldest' | 'name' | 'usage') => Promise<void>;
  onMediaLibraryShowFoldersChange: (value: boolean) => Promise<void>;
  onUiDensityChange: (value: 'comfortable' | 'compact') => Promise<void>;
  onMotionPreferenceChange: (value: 'reduced' | 'standard' | 'enhanced') => Promise<void>;
  onShowExampleCaseOnWelcomeChange: (value: boolean) => Promise<void>;
  onPersonalizationThemeChange: (value: PersonalizationTheme) => Promise<void>;
  onCloseNodeDeletion: () => void;
  onConfirmNodeDeletion: () => Promise<void>;
  onCloseEdgeDeletion: () => void;
  onConfirmEdgeDeletion: () => Promise<void>;
  onCloseAssertionModal: () => void;
  onAssertionCreated: () => void;
  onCloseSourceModal: () => void;
  onSourceCreated: () => void;
  onOpenMediaLibrary: (onSelect: (source: SourceRecord) => void) => void;
  onCloseMediaLibrary: () => void;
  onCloseTerminology: () => void;
  onCloseProjectInfo: () => void;
  onCloseExportReport: () => void;
}

export function AppModalLayer({
  consentData,
  nodeCreationOpen,
  nodeType,
  nodePosition,
  relationshipModalOpen,
  relationshipTool,
  defaultRelationshipConfidence,
  assertionFieldAutomation,
  settingsModalOpen,
  localAIEnabled,
  investigationProfile,
  defaultWorkspaceView,
  restoreSavedViewOnOpen,
  defaultSidebarTab,
  autoHideInspectorWhenIdle,
  showNodeLabels,
  showNodeImages,
  autoLayoutPreset,
  defaultReportTemplate,
  defaultReportIncludeAttachments,
  defaultReportUseAI,
  defaultReportAIProvider,
  mediaLibraryDefaultView,
  mediaLibraryDefaultSort,
  mediaLibraryShowFolders,
  uiDensity,
  motionPreference,
  showExampleCaseOnWelcome,
  personalizationTheme,
  deletionModal,
  edgeDeletionModal,
  assertionModalOpen,
  sourceModalOpen,
  mediaLibraryState,
  terminologyOpen,
  projectInfoOpen,
  exportReportOpen,
  selectedNode,
  onConfirmConsent,
  onDismissConsent,
  onCloseNodeCreation,
  onCreateNode,
  onCloseRelationshipModal,
  onCreateRelationship,
  onCloseSettings,
  onToggleLocalAI,
  onInvestigationProfileChange,
  onDefaultWorkspaceViewChange,
  onRestoreSavedViewOnOpenChange,
  onDefaultSidebarTabChange,
  onAutoHideInspectorWhenIdleChange,
  onShowNodeLabelsChange,
  onShowNodeImagesChange,
  onAutoLayoutPresetChange,
  onDefaultRelationshipConfidenceChange,
  onAssertionFieldAutomationChange,
  onDefaultReportTemplateChange,
  onDefaultReportIncludeAttachmentsChange,
  onDefaultReportUseAIChange,
  onDefaultReportAIProviderChange,
  onMediaLibraryDefaultViewChange,
  onMediaLibraryDefaultSortChange,
  onMediaLibraryShowFoldersChange,
  onUiDensityChange,
  onMotionPreferenceChange,
  onShowExampleCaseOnWelcomeChange,
  onPersonalizationThemeChange,
  onCloseNodeDeletion,
  onConfirmNodeDeletion,
  onCloseEdgeDeletion,
  onConfirmEdgeDeletion,
  onCloseAssertionModal,
  onAssertionCreated,
  onCloseSourceModal,
  onSourceCreated,
  onOpenMediaLibrary,
  onCloseMediaLibrary,
  onCloseTerminology,
  onCloseProjectInfo,
  onCloseExportReport
}: AppModalLayerProps) {
  const fallback = <div className="fixed inset-0 z-50 bg-black/20" />;

  return (
    <>
      {consentData && (
        <ConsentModal
          consent={consentData}
          onCancel={onDismissConsent}
          onConfirm={() => {
            void onConfirmConsent();
          }}
        />
      )}
      <NodeCreationModal
        isOpen={nodeCreationOpen}
        nodeType={nodeType}
        iconPack={personalizationTheme.iconPack}
        position={nodePosition}
        onClose={onCloseNodeCreation}
        onCreate={onCreateNode}
      />
      <RelationshipCreationModal
        isOpen={relationshipModalOpen}
        relationshipType={relationshipTool.selectedType}
        sourceNode={relationshipTool.sourceNode}
        targetNode={relationshipTool.targetNode}
        defaultConfidence={defaultRelationshipConfidence}
        onClose={onCloseRelationshipModal}
        onCreate={onCreateRelationship}
      />
      {settingsModalOpen && (
        <Suspense fallback={fallback}>
          <SettingsModal
            isOpen={settingsModalOpen}
            onClose={onCloseSettings}
            localAIEnabled={localAIEnabled}
            onLocalAIToggle={onToggleLocalAI}
            investigationProfile={investigationProfile}
            onInvestigationProfileChange={(value) => {
              void onInvestigationProfileChange(value);
            }}
            defaultWorkspaceView={defaultWorkspaceView}
            restoreSavedViewOnOpen={restoreSavedViewOnOpen}
            defaultSidebarTab={defaultSidebarTab}
            autoHideInspectorWhenIdle={autoHideInspectorWhenIdle}
            onDefaultWorkspaceViewChange={(value) => {
              void onDefaultWorkspaceViewChange(value);
            }}
            onRestoreSavedViewOnOpenChange={(value) => {
              void onRestoreSavedViewOnOpenChange(value);
            }}
            onDefaultSidebarTabChange={(value) => {
              void onDefaultSidebarTabChange(value);
            }}
            onAutoHideInspectorWhenIdleChange={(value) => {
              void onAutoHideInspectorWhenIdleChange(value);
            }}
            showNodeLabels={showNodeLabels}
            onShowNodeLabelsChange={(value) => {
              void onShowNodeLabelsChange(value);
            }}
            showNodeImages={showNodeImages}
            onShowNodeImagesChange={(value) => {
              void onShowNodeImagesChange(value);
            }}
            autoLayoutPreset={autoLayoutPreset}
            onAutoLayoutPresetChange={(value) => {
              void onAutoLayoutPresetChange(value);
            }}
            defaultRelationshipConfidence={defaultRelationshipConfidence}
            onDefaultRelationshipConfidenceChange={(value) => {
              void onDefaultRelationshipConfidenceChange(value);
            }}
            assertionFieldAutomation={assertionFieldAutomation}
            onAssertionFieldAutomationChange={(value) => {
              void onAssertionFieldAutomationChange(value);
            }}
            defaultReportTemplate={defaultReportTemplate}
            defaultReportIncludeAttachments={defaultReportIncludeAttachments}
            defaultReportUseAI={defaultReportUseAI}
            defaultReportAIProvider={defaultReportAIProvider}
            onDefaultReportTemplateChange={(value) => {
              void onDefaultReportTemplateChange(value);
            }}
            onDefaultReportIncludeAttachmentsChange={(value) => {
              void onDefaultReportIncludeAttachmentsChange(value);
            }}
            onDefaultReportUseAIChange={(value) => {
              void onDefaultReportUseAIChange(value);
            }}
            onDefaultReportAIProviderChange={(value) => {
              void onDefaultReportAIProviderChange(value);
            }}
            mediaLibraryDefaultView={mediaLibraryDefaultView}
            mediaLibraryDefaultSort={mediaLibraryDefaultSort}
            mediaLibraryShowFolders={mediaLibraryShowFolders}
            onMediaLibraryDefaultViewChange={(value) => {
              void onMediaLibraryDefaultViewChange(value);
            }}
            onMediaLibraryDefaultSortChange={(value) => {
              void onMediaLibraryDefaultSortChange(value);
            }}
            onMediaLibraryShowFoldersChange={(value) => {
              void onMediaLibraryShowFoldersChange(value);
            }}
            uiDensity={uiDensity}
            motionPreference={motionPreference}
            showExampleCaseOnWelcome={showExampleCaseOnWelcome}
            personalizationTheme={personalizationTheme}
            onUiDensityChange={(value) => {
              void onUiDensityChange(value);
            }}
            onMotionPreferenceChange={(value) => {
              void onMotionPreferenceChange(value);
            }}
            onShowExampleCaseOnWelcomeChange={(value) => {
              void onShowExampleCaseOnWelcomeChange(value);
            }}
            onPersonalizationThemeChange={(value) => {
              void onPersonalizationThemeChange(value);
            }}
          />
        </Suspense>
      )}
      <NodeDeletionModal
        isOpen={deletionModal.isOpen}
        node={deletionModal.node}
        onClose={onCloseNodeDeletion}
        onConfirm={() => {
          void onConfirmNodeDeletion();
        }}
      />
      <RelationshipDeletionModal
        isOpen={edgeDeletionModal.isOpen}
        relationship={edgeDeletionModal.relationship}
        onClose={onCloseEdgeDeletion}
        onConfirm={() => {
          void onConfirmEdgeDeletion();
        }}
      />
      {assertionModalOpen && (
        <Suspense fallback={fallback}>
          <AssertionCreationModal
            isOpen={assertionModalOpen}
            entity={selectedNode}
            onClose={onCloseAssertionModal}
            onAssertionCreated={onAssertionCreated}
            onOpenMediaLibrary={onOpenMediaLibrary}
          />
        </Suspense>
      )}
      {sourceModalOpen && (
        <Suspense fallback={fallback}>
          <SourceCreationModal
            isOpen={sourceModalOpen}
            entity={selectedNode}
            onClose={onCloseSourceModal}
            onSourceCreated={onSourceCreated}
            onOpenMediaLibrary={onOpenMediaLibrary}
          />
        </Suspense>
      )}
      {mediaLibraryState.isOpen && (
        <Suspense fallback={fallback}>
          <MediaLibraryModal
            isOpen={mediaLibraryState.isOpen}
            mode={mediaLibraryState.mode}
            onClose={onCloseMediaLibrary}
            onSelect={mediaLibraryState.onSelect ?? undefined}
          />
        </Suspense>
      )}
      {terminologyOpen && (
        <Suspense fallback={fallback}>
          <TerminologyModal isOpen={terminologyOpen} onClose={onCloseTerminology} />
        </Suspense>
      )}
      {projectInfoOpen && (
        <Suspense fallback={fallback}>
          <ProjectSettingsModal isOpen={projectInfoOpen} onClose={onCloseProjectInfo} />
        </Suspense>
      )}
      {exportReportOpen && (
        <Suspense fallback={fallback}>
          <ExportReportModal isOpen={exportReportOpen} onClose={onCloseExportReport} />
        </Suspense>
      )}
    </>
  );
}
