import type { SourceRecord, TransformManifest } from '@shared/types';
import type { GraphLayoutPresetId } from '@renderer/features/graph/layoutPresets';
import type { InvestigationProfile } from '@renderer/features/profiles/investigationProfiles';
import type { PersonalizationTheme } from '@renderer/features/personalization/theme';
import { nodeTypes, type NodeType } from '@renderer/lib/nodeTypes';
import {
  DEVICE_LEFT_SIDEBAR_COLLAPSED_SETTING_KEY,
  DEVICE_LEFT_SIDEBAR_WIDTH_SETTING_KEY,
  DEVICE_RIGHT_SIDEBAR_COLLAPSED_SETTING_KEY,
  DEVICE_RIGHT_SIDEBAR_WIDTH_SETTING_KEY
} from '@renderer/lib/settings';
import { piBridge } from '@renderer/services/piBridge';
import type { AssertionView, RelationshipToolState, SavedView, SearchFocusState, SearchResult } from '@renderer/types/app';
import type { GraphCanvasApi } from '@renderer/types/graphCanvasApi';
import type { GraphSnapshot } from '@renderer/types/graph';
import { FilterPanel } from './FilterPanel';
import { GraphCanvas } from './GraphCanvas';
import { GraphSidebar } from './GraphSidebar';
import { InspectorPanel } from './InspectorPanel';
import { SearchPalette } from './SearchPalette';
import { TimelineWorkspace } from './TimelineWorkspace';
import { TopToolbar } from './TopToolbar';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import React from 'react';

interface GraphWorkspaceProps {
  graph: GraphSnapshot;
  filteredElements: any[];
  view: 'graph' | 'timeline';
  relationshipTool: RelationshipToolState;
  lastLayoutPreset: GraphLayoutPresetId | null;
  boxSelectEnabled: boolean;
  filtersOpen: boolean;
  filterAnchor: DOMRect | null;
  filterRef: React.RefObject<HTMLDivElement>;
  activeTypeIds: Set<string>;
  hasSourcesOnly: boolean;
  searchOpen: boolean;
  searchResults: SearchResult[];
  searchFocus: SearchFocusState;
  localAIEnabled: boolean;
  investigationProfile: InvestigationProfile;
  personalizationTheme: PersonalizationTheme;
  sidebarTab: 'nodes' | 'ai';
  graphApiRef: React.MutableRefObject<GraphCanvasApi | null>;
  showNodeImages: boolean;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  assertions: AssertionView[];
  sources: SourceRecord[];
  defaultRelationshipConfidence: 'unverified' | 'asserted' | 'verified';
  autoHideInspectorWhenIdle: boolean;
  savedViews: SavedView[];
  activeSavedViewId: string | null;
  onNodeDragStart: (nodeType: NodeType, event: React.DragEvent) => void;
  onGraphDrop: (event: React.DragEvent) => void;
  onGraphDragOver: (event: React.DragEvent) => void;
  onToggleFilters: (anchor: DOMRect | null) => void;
  onSwitchWorkspace: (view: 'graph' | 'timeline') => void;
  onRelationshipToolActivate: () => void;
  onRelationshipToolDeactivate: () => void;
  onToggleBoxSelect: () => void;
  onRunLayoutPreset: (preset: GraphLayoutPresetId) => void;
  onSidebarTabChange: (tab: 'nodes' | 'ai') => void;
  onToggleType: (id: string) => void;
  onShowAllTypes: () => void;
  onToggleHasSources: (value: boolean) => void;
  onSearchClose: () => void;
  onSearchSelect: (result: SearchResult) => void;
  onSelectionChange: (nodeIds: string[]) => void;
  onSelectNode: (id: string) => void;
  onUnselectNode: () => void;
  onSelectEdge: (id: string) => void;
  onUnselectEdge: () => void;
  onOpenNodeContextMenu: (payload: { nodeId: string; x: number; y: number }) => void;
  onNodeDragFree: (id: string, x: number, y: number) => void;
  onRequestCreateEdge: (sourceId: string, targetId: string) => void;
  onDeleteNode: () => void;
  onDeleteNodes: (ids: string[]) => Promise<void>;
  onDeleteEdge: () => void;
  onUpdateLabel: (nodeId: string, label: string) => Promise<void>;
  onUpdateProperty: (nodeId: string, key: string, value: unknown) => Promise<void>;
  onUpdateEdgeProperty: (edgeId: string, key: string, value: unknown) => Promise<void>;
  onRequestRemoteTransform: (transform: TransformManifest, payload: Record<string, unknown>) => void;
  onAddAssertion: () => void;
  onAddSource: () => void;
  onApplySavedView: (viewId: string) => void;
  onSaveView: () => void;
  onSaveViewAs: () => void;
  onDeleteSavedView: () => void;
  onNodeCreate: (nodeType: NodeType) => void;
}

export function GraphWorkspace({
  graph,
  filteredElements,
  view,
  relationshipTool,
  lastLayoutPreset,
  boxSelectEnabled,
  filtersOpen,
  filterAnchor,
  filterRef,
  activeTypeIds,
  hasSourcesOnly,
  searchOpen,
  searchResults,
  searchFocus,
  localAIEnabled,
  investigationProfile,
  personalizationTheme,
  sidebarTab,
  graphApiRef,
  showNodeImages,
  selectedNodeId,
  selectedNodeIds,
  selectedEdgeId,
  assertions,
  sources,
  defaultRelationshipConfidence,
  autoHideInspectorWhenIdle,
  savedViews,
  activeSavedViewId,
  onNodeDragStart,
  onGraphDrop,
  onGraphDragOver,
  onToggleFilters,
  onSwitchWorkspace,
  onRelationshipToolActivate,
  onRelationshipToolDeactivate,
  onToggleBoxSelect,
  onRunLayoutPreset,
  onSidebarTabChange,
  onToggleType,
  onShowAllTypes,
  onToggleHasSources,
  onSearchClose,
  onSearchSelect,
  onSelectionChange,
  onSelectNode,
  onUnselectNode,
  onSelectEdge,
  onUnselectEdge,
  onOpenNodeContextMenu,
  onNodeDragFree,
  onRequestCreateEdge,
  onDeleteNode,
  onDeleteNodes,
  onDeleteEdge,
  onUpdateLabel,
  onUpdateProperty,
  onUpdateEdgeProperty,
  onRequestRemoteTransform,
  onAddAssertion,
  onAddSource,
  onApplySavedView,
  onSaveView,
  onSaveViewAs,
  onDeleteSavedView,
  onNodeCreate
}: GraphWorkspaceProps) {
  const LEFT_MIN = 280;
  const LEFT_MAX = 440;
  const RIGHT_MIN = 320;
  const RIGHT_MAX = 520;

  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = React.useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = React.useState(false);
  const [leftSidebarWidth, setLeftSidebarWidth] = React.useState(320);
  const [rightSidebarWidth, setRightSidebarWidth] = React.useState(400);
  const leftSidebarWidthRef = React.useRef(leftSidebarWidth);
  const rightSidebarWidthRef = React.useRef(rightSidebarWidth);

  React.useEffect(() => {
    leftSidebarWidthRef.current = leftSidebarWidth;
  }, [leftSidebarWidth]);

  React.useEffect(() => {
    rightSidebarWidthRef.current = rightSidebarWidth;
  }, [rightSidebarWidth]);

  React.useEffect(() => {
    let cancelled = false;
    const loadOverlayPrefs = async () => {
      const [leftCollapsed, rightCollapsed, leftWidth, rightWidth] = await Promise.all([
        piBridge.getDeviceSetting<boolean>(DEVICE_LEFT_SIDEBAR_COLLAPSED_SETTING_KEY),
        piBridge.getDeviceSetting<boolean>(DEVICE_RIGHT_SIDEBAR_COLLAPSED_SETTING_KEY),
        piBridge.getDeviceSetting<number>(DEVICE_LEFT_SIDEBAR_WIDTH_SETTING_KEY),
        piBridge.getDeviceSetting<number>(DEVICE_RIGHT_SIDEBAR_WIDTH_SETTING_KEY)
      ]);
      if (cancelled) return;
      if (typeof leftCollapsed === 'boolean') setLeftSidebarCollapsed(leftCollapsed);
      if (typeof rightCollapsed === 'boolean') setRightSidebarCollapsed(rightCollapsed);
      if (typeof leftWidth === 'number') setLeftSidebarWidth(Math.min(LEFT_MAX, Math.max(LEFT_MIN, leftWidth)));
      if (typeof rightWidth === 'number') setRightSidebarWidth(Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, rightWidth)));
    };
    void loadOverlayPrefs();
    return () => {
      cancelled = true;
    };
  }, []);

  const leftInset = view === 'graph' && !leftSidebarCollapsed ? leftSidebarWidth : 0;
  const rightInset = view === 'graph' && !rightSidebarCollapsed ? rightSidebarWidth : 0;
  const hasActiveInspection = Boolean(selectedNodeId || selectedEdgeId || selectedNodeIds.length > 0);

  React.useEffect(() => {
    if (view !== 'graph' || !autoHideInspectorWhenIdle) return;
    const nextCollapsed = !hasActiveInspection;
    setRightSidebarCollapsed(nextCollapsed);
    void piBridge.setDeviceSetting(DEVICE_RIGHT_SIDEBAR_COLLAPSED_SETTING_KEY, nextCollapsed);
  }, [autoHideInspectorWhenIdle, hasActiveInspection, view]);

  React.useEffect(() => {
    graphApiRef.current?.setViewportInsets({
      left: leftInset,
      right: rightInset,
      top: 0,
      bottom: 0
    });
  }, [graphApiRef, leftInset, rightInset]);

  const toggleLeftSidebar = React.useCallback(() => {
    setLeftSidebarCollapsed((value) => {
      const next = !value;
      void piBridge.setDeviceSetting(DEVICE_LEFT_SIDEBAR_COLLAPSED_SETTING_KEY, next);
      return next;
    });
  }, []);

  const toggleRightSidebar = React.useCallback(() => {
    setRightSidebarCollapsed((value) => {
      const next = !value;
      void piBridge.setDeviceSetting(DEVICE_RIGHT_SIDEBAR_COLLAPSED_SETTING_KEY, next);
      return next;
    });
  }, []);

  const startLeftResize = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = leftSidebarWidth;

    const handleMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.min(LEFT_MAX, Math.max(LEFT_MIN, startWidth + (moveEvent.clientX - startX)));
      setLeftSidebarWidth(nextWidth);
      leftSidebarWidthRef.current = nextWidth;
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      void piBridge.setDeviceSetting(DEVICE_LEFT_SIDEBAR_WIDTH_SETTING_KEY, leftSidebarWidthRef.current);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [leftSidebarWidth]);

  const startRightResize = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = rightSidebarWidth;

    const handleMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, startWidth - (moveEvent.clientX - startX)));
      setRightSidebarWidth(nextWidth);
      rightSidebarWidthRef.current = nextWidth;
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      void piBridge.setDeviceSetting(DEVICE_RIGHT_SIDEBAR_WIDTH_SETTING_KEY, rightSidebarWidthRef.current);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [rightSidebarWidth]);

  return (
    <>
      <TopToolbar
        view={view}
        relationshipTool={relationshipTool}
        onRelationshipToolActivate={onRelationshipToolActivate}
        onRelationshipToolDeactivate={onRelationshipToolDeactivate}
        onToggleBoxSelect={onToggleBoxSelect}
        boxSelectEnabled={boxSelectEnabled}
        onRunLayoutPreset={onRunLayoutPreset}
        lastLayoutPreset={lastLayoutPreset}
        onAlignLeft={() => graphApiRef.current?.alignSelected('left')}
        onAlignTop={() => graphApiRef.current?.alignSelected('top')}
        onInvertSelection={() => graphApiRef.current?.invertSelection()}
        onZoomSelection={() => graphApiRef.current?.zoomToSelection()}
        onFitScreen={() => graphApiRef.current?.fitToScreen()}
        onCenterSelection={() => graphApiRef.current?.centerSelection()}
        onToggleFilters={onToggleFilters}
        onSwitchWorkspace={onSwitchWorkspace}
        savedViews={savedViews}
        activeSavedViewId={activeSavedViewId}
        onApplySavedView={onApplySavedView}
        onSaveView={onSaveView}
        onSaveViewAs={onSaveViewAs}
        onDeleteSavedView={onDeleteSavedView}
      />
      {filtersOpen && (
        <div
          ref={filterRef}
          className="fixed z-[80] w-80 rounded-2xl"
          style={filterAnchor ? { left: Math.min(filterAnchor.left, window.innerWidth - 340), top: filterAnchor.bottom + 8, position: 'fixed' } : { right: 16, top: 64, position: 'fixed' }}
        >
          <FilterPanel
            nodeTypes={nodeTypes.map((nodeType) => ({ id: nodeType.id, label: nodeType.label }))}
            activeTypeIds={activeTypeIds}
            onToggleType={onToggleType}
            onShowAllTypes={onShowAllTypes}
            hasSourcesOnly={hasSourcesOnly}
            onToggleHasSources={onToggleHasSources}
          />
        </div>
      )}
      <SearchPalette
        open={searchOpen}
        onClose={onSearchClose}
        items={searchResults}
        onSelect={onSearchSelect}
      />
      {view === 'timeline' ? <TimelineWorkspace nodes={graph.nodes} edges={graph.edges} /> : null}
      <div className="relative flex flex-1 overflow-hidden min-w-0">
        <main className="flex flex-1 flex-col min-w-0">
          <div className="relative flex flex-1 overflow-hidden min-w-0">
            {view === 'graph' ? (
              <>
                <section className="absolute inset-0 z-0 min-w-0" onDrop={onGraphDrop} onDragOver={onGraphDragOver}>
                  <GraphCanvas
                    elements={filteredElements}
                    overlayInsets={{ left: leftInset, right: rightInset }}
                    apiRef={graphApiRef}
                    personalizationTheme={personalizationTheme}
                    lastLayoutPreset={lastLayoutPreset}
                    boxSelectEnabled={boxSelectEnabled}
                    showNodeImages={showNodeImages}
                    onSelectionChange={onSelectionChange}
                    onSelectNode={onSelectNode}
                    onUnselectNode={onUnselectNode}
                    onSelectEdge={onSelectEdge}
                    onUnselectEdge={onUnselectEdge}
                    onTapNode={() => undefined}
                    onOpenNodeContextMenu={onOpenNodeContextMenu}
                    isRelationshipMode={relationshipTool.isActive}
                    onNodeDragFree={onNodeDragFree}
                    onRequestCreateEdge={onRequestCreateEdge}
                  />
                </section>

                <div
                  className="pointer-events-none absolute inset-y-0 z-[30] flex items-start pt-4"
                  style={{ left: leftSidebarCollapsed ? 16 : leftSidebarWidth + 4 }}
                >
                  <button
                    type="button"
                    className="pointer-events-auto mt-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-950/85 text-slate-300 shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:border-slate-600 hover:text-white"
                    onClick={toggleLeftSidebar}
                    title={leftSidebarCollapsed ? 'Show workspace palette' : 'Hide workspace palette'}
                  >
                    {leftSidebarCollapsed ? <FaChevronRight className="h-3.5 w-3.5" /> : <FaChevronLeft className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {!leftSidebarCollapsed ? (
                  <div className="absolute inset-y-0 left-0 z-[20] flex p-4 pr-2" style={{ width: leftSidebarWidth }}>
                    <div className="flex min-w-0 flex-1 overflow-hidden rounded-[28px] border border-slate-800/80 shadow-[0_26px_60px_rgba(0,0,0,0.38)]">
                      <GraphSidebar
                        sidebarTab={sidebarTab}
                        localAIEnabled={localAIEnabled}
                        investigationProfile={investigationProfile}
                        iconPack={personalizationTheme.iconPack}
                        graph={graph}
                        onSidebarTabChange={onSidebarTabChange}
                        onNodeDragStart={onNodeDragStart}
                        onNodeCreate={onNodeCreate}
                      />
                    </div>
                    <div
                      className="group relative ml-2 w-3 cursor-col-resize"
                      onMouseDown={startLeftResize}
                      title="Resize palette"
                    >
                      <div className="absolute inset-y-10 left-1/2 w-px -translate-x-1/2 rounded-full bg-slate-700/60 transition group-hover:bg-sky-400/80" />
                    </div>
                  </div>
                ) : null}

                <div
                  className="pointer-events-none absolute inset-y-0 z-[30] flex items-start pt-4"
                  style={{ right: rightSidebarCollapsed ? 16 : rightSidebarWidth + 4 }}
                >
                  <button
                    type="button"
                    className="pointer-events-auto mt-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-950/85 text-slate-300 shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:border-slate-600 hover:text-white"
                    onClick={toggleRightSidebar}
                    title={rightSidebarCollapsed ? 'Show inspector' : 'Hide inspector'}
                  >
                    {rightSidebarCollapsed ? <FaChevronLeft className="h-3.5 w-3.5" /> : <FaChevronRight className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {!rightSidebarCollapsed ? (
                  <div className="absolute inset-y-0 right-0 z-[20] flex p-4 pl-2" style={{ width: rightSidebarWidth }}>
                    <div
                      className="group relative mr-2 w-3 cursor-col-resize"
                      onMouseDown={startRightResize}
                      title="Resize inspector"
                    >
                      <div className="absolute inset-y-10 left-1/2 w-px -translate-x-1/2 rounded-full bg-slate-700/60 transition group-hover:bg-sky-400/80" />
                    </div>
                    <div className="flex min-w-0 flex-1 overflow-hidden rounded-[28px] border border-slate-800/80 shadow-[0_26px_60px_rgba(0,0,0,0.38)]">
                      <InspectorPanel
                        nodeTypes={nodeTypes}
                        iconPack={personalizationTheme.iconPack}
                        graphNodes={graph.nodes}
                        graphEdges={graph.edges}
                        selectedNodeId={selectedNodeId}
                        selectedNodeIds={selectedNodeIds}
                        selectedEdgeId={selectedEdgeId}
                        assertions={assertions}
                        sources={sources}
                        onAddAssertion={onAddAssertion}
                        onAddSource={onAddSource}
                        onDeleteNode={onDeleteNode}
                        onDeleteNodes={onDeleteNodes}
                        onDeleteEdge={onDeleteEdge}
                        onUpdateLabel={(nodeId, label) => {
                          void onUpdateLabel(nodeId, label);
                        }}
                        onUpdateProperty={(nodeId, key, value) => {
                          void onUpdateProperty(nodeId, key, value);
                        }}
                        onUpdateEdgeProperty={(edgeId, key, value) => {
                          void onUpdateEdgeProperty(edgeId, key, value);
                        }}
                        onRequestRemoteTransform={onRequestRemoteTransform}
                        onAlignLeft={() => graphApiRef.current?.alignSelected('left')}
                        onAlignTop={() => graphApiRef.current?.alignSelected('top')}
                        searchFocus={searchFocus}
                      />
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex-1">
                <TimelineWorkspace nodes={graph.nodes} edges={graph.edges} />
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
