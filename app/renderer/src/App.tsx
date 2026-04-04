import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SourceWithUsage } from '@shared/types';
import { FaCrosshairs, FaLink, FaSearchPlus, FaTrash, FaUserEdit } from 'react-icons/fa';
import { TitleBar } from './components/TitleBar';
import { ContextMenu, type ContextMenuItem } from './components/ContextMenu';
import { GraphWorkspace } from './components/GraphWorkspace';
import { ProjectCreationModal } from './components/ProjectCreationModal';
import { ToastViewport } from './components/ToastViewport';
import { DEFAULT_MANUAL_LAYOUT_PRESET, getGraphLayoutPreset, type GraphLayoutPresetId } from './features/graph/layoutPresets';
import { applyPersonalizationTheme } from './features/personalization/theme';
import { buildSearchResults } from './features/search/searchIndex';
import { nodeTypes } from './lib/nodeTypes';
import { emitToast } from './lib/toast';
import { mapGraphElements } from './features/graph/labeling';
import { usePersonNodeImagePreviews } from './hooks/usePersonNodeImagePreviews';
import { piBridge, piMenu, type ParsedAssertionRecord } from './services/piBridge';
import { useAppStore } from './store/appStore';
import type { GraphCanvasApi } from './types/graphCanvasApi';
import type { SearchFocusState, SearchResult } from './types/app';

const WelcomeScreen = lazy(() => import('./components/WelcomeScreen').then((module) => ({ default: module.WelcomeScreen })));
const SplashOverlay = lazy(() => import('./components/SplashOverlay').then((module) => ({ default: module.SplashOverlay })));
const AppModalLayer = lazy(() => import('./components/AppModalLayer').then((module) => ({ default: module.AppModalLayer })));

export default function App() {
  const graphApiRef = useRef<GraphCanvasApi | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const [searchAssertions, setSearchAssertions] = useState<ParsedAssertionRecord[]>([]);
  const [searchSources, setSearchSources] = useState<SourceWithUsage[]>([]);
  const [searchFocus, setSearchFocus] = useState<SearchFocusState>(null);
  const [lastLayoutPreset, setLastLayoutPreset] = useState<GraphLayoutPresetId | null>(null);
  const [projectCreationOpen, setProjectCreationOpen] = useState(false);
  const [nodeContextMenu, setNodeContextMenu] = useState<{
    nodeId: string;
    label: string;
    type: string;
    position: { x: number; y: number };
  } | null>(null);

  const {
    showWelcome,
    graph,
    graphLoaded,
    selectedNodeId,
    selectedNodeIds,
    selectedEdgeId,
    assertions,
    sources,
    consentData,
    nodeCreationModal,
    relationshipTool,
    relationshipModal,
    deletionModal,
    edgeDeletionModal,
    localAIEnabled,
    isLocalAILoading,
    loadingStage,
    splashReadyToHide,
    settingsModalOpen,
    investigationProfile,
    showNodeLabels,
    showNodeImages,
    autoLayoutPreset,
    defaultRelationshipConfidence,
    defaultWorkspaceView,
    restoreSavedViewOnOpen,
    defaultSidebarTab,
    autoHideInspectorWhenIdle,
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
    searchOpen,
    boxSelectEnabled,
    sidebarTab,
    activeTypeIds,
    hasSourcesOnly,
    nodeIdsWithSources,
    filtersOpen,
    filterAnchor,
    assertionModalOpen,
    sourceModalOpen,
    terminologyOpen,
    mediaLibraryState,
    view,
    projectInfoOpen,
    exportReportOpen,
    savedViews,
    activeSavedViewId,
    pendingSavedViewRestore,
    boot,
    createProject,
    openProject,
    handleProjectLoaded,
    closeProject,
    toggleLocalAI,
    persistShowNodeLabels,
    persistShowNodeImages,
    persistAutoLayoutPreset,
    persistDefaultRelationshipConfidence,
    persistInvestigationProfile,
    persistDefaultWorkspaceView,
    persistRestoreSavedViewOnOpen,
    persistDefaultSidebarTab,
    persistAutoHideInspectorWhenIdle,
    persistDefaultReportTemplate,
    persistDefaultReportIncludeAttachments,
    persistDefaultReportUseAI,
    persistDefaultReportAIProvider,
    persistMediaLibraryDefaultView,
    persistMediaLibraryDefaultSort,
    persistMediaLibraryShowFolders,
    persistUiDensity,
    persistMotionPreference,
    persistShowExampleCaseOnWelcome,
    persistPersonalizationTheme,
    refreshEntityDetails,
    refreshGraph,
    refreshNodesWithSources,
    createNode,
    createRelationship,
    updateEdgeProperty,
    confirmDeleteNode,
    confirmDeleteEdge,
    updateNodeProperty,
    updateNodeLabel,
    deleteNodes,
    handleNodeDragFree,
    saveNamedView,
    saveActiveView,
    applySavedView,
    deleteSavedView,
    setAssertions,
    setSources,
    setConsentData,
    setNodeCreationModal,
    setRelationshipTool,
    setRelationshipModal,
    setDeletionModal,
    setEdgeDeletionModal,
    setSelectedNodeId,
    setSelectedNodeIds,
    setSelectedEdgeId,
    setSettingsModalOpen,
    setSearchOpen,
    setBoxSelectEnabled,
    setSidebarTab,
    setActiveTypeIds,
    setHasSourcesOnly,
    setFiltersOpen,
    setFilterAnchor,
    setAssertionModalOpen,
    setSourceModalOpen,
    setTerminologyOpen,
    setMediaLibraryState,
    setView,
    setProjectInfoOpen,
    setExportReportOpen,
    setPendingSavedViewRestore
  } = useAppStore();

  const imagePreviews = usePersonNodeImagePreviews(graph, showNodeImages);

  const refreshSearchData = useCallback(async () => {
    try {
      const [allAssertions, allSources] = await Promise.all([
        piBridge.listAllAssertions(),
        piBridge.listAllSourcesWithUsage()
      ]);
      setSearchAssertions(allAssertions);
      setSearchSources(allSources);
    } catch (error) {
      console.error('Failed to refresh search data:', error);
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  useEffect(() => {
    if (!hasSourcesOnly) return;
    void refreshNodesWithSources();
  }, [hasSourcesOnly, graph.nodes, refreshNodesWithSources]);

  useEffect(() => {
    if (!localAIEnabled && sidebarTab === 'ai') {
      setSidebarTab('nodes');
    }
  }, [localAIEnabled, sidebarTab, setSidebarTab]);

  useEffect(() => {
    document.documentElement.dataset.uiDensity = uiDensity;
    document.body.dataset.uiDensity = uiDensity;
    return () => {
      delete document.documentElement.dataset.uiDensity;
      delete document.body.dataset.uiDensity;
    };
  }, [uiDensity]);

  useEffect(() => {
    document.documentElement.dataset.motionPreference = motionPreference;
    document.body.dataset.motionPreference = motionPreference;
    return () => {
      delete document.documentElement.dataset.motionPreference;
      delete document.body.dataset.motionPreference;
    };
  }, [motionPreference]);

  useEffect(() => {
    applyPersonalizationTheme(personalizationTheme);
  }, [personalizationTheme]);

  useEffect(() => {
    if (!pendingSavedViewRestore || !graphLoaded) return;
    let cancelled = false;
    let retryTimeout: number | null = null;
    let restoreFrame: number | null = null;

    const attemptRestore = () => {
      if (cancelled) return;
      const api = graphApiRef.current;
      if (!api) {
        retryTimeout = window.setTimeout(attemptRestore, 50);
        return;
      }

      restoreFrame = window.requestAnimationFrame(() => {
        api.clearSelection();
        api.selectElements(pendingSavedViewRestore.selectedNodeIds, pendingSavedViewRestore.selectedEdgeIds);
        if (pendingSavedViewRestore.viewport) {
          api.setViewport(pendingSavedViewRestore.viewport);
        }
        setPendingSavedViewRestore(null);
      });
    };

    attemptRestore();

    return () => {
      cancelled = true;
      if (retryTimeout !== null) window.clearTimeout(retryTimeout);
      if (restoreFrame !== null) window.cancelAnimationFrame(restoreFrame);
    };
  }, [graphLoaded, pendingSavedViewRestore, setPendingSavedViewRestore]);

  useEffect(() => {
    if (!selectedNodeId) {
      setAssertions([]);
      setSources([]);
      setAssertionModalOpen(false);
      setSourceModalOpen(false);
      return;
    }
    void refreshEntityDetails(selectedNodeId);
  }, [refreshEntityDetails, selectedNodeId, setAssertionModalOpen, setAssertions, setSourceModalOpen, setSources]);

  useEffect(() => {
    if (!graphLoaded) {
      setSearchAssertions([]);
      setSearchSources([]);
      return;
    }
    void refreshSearchData();
  }, [graphLoaded, refreshSearchData]);

  useEffect(() => {
    const refreshHandler = () => {
      void refreshSearchData();
      if (!selectedNodeId) return;
      void refreshEntityDetails(selectedNodeId);
    };

    const offZoom = piMenu.onViewZoomSelection(() => graphApiRef.current?.zoomToSelection());
    const offFit = piMenu.onViewFit(() => graphApiRef.current?.fitToScreen());
    const offCenter = piMenu.onViewCenterSelection(() => graphApiRef.current?.centerSelection());
    const keyHandler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && (event.key === 'f' || event.key === 'F')) {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (event.ctrlKey && event.shiftKey && (event.key === 'Z' || event.key === 'z')) {
        event.preventDefault();
        graphApiRef.current?.zoomToSelection();
      }
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        graphApiRef.current?.fitToScreen();
      }
      if (event.ctrlKey && event.shiftKey && (event.key === 'C' || event.key === 'c')) {
        event.preventDefault();
        graphApiRef.current?.centerSelection();
      }
    };
    const clickOutside = (event: MouseEvent) => {
      if (!filtersOpen) return;
      const target = event.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) {
        setFiltersOpen(false);
      }
    };

    window.addEventListener('pi:refresh', refreshHandler);
    window.addEventListener('keydown', keyHandler);
    document.addEventListener('mousedown', clickOutside);

    return () => {
      window.removeEventListener('pi:refresh', refreshHandler);
      window.removeEventListener('keydown', keyHandler);
      document.removeEventListener('mousedown', clickOutside);
      offZoom?.();
      offFit?.();
      offCenter?.();
    };
  }, [filtersOpen, refreshEntityDetails, refreshSearchData, selectedNodeId, setFiltersOpen, setSearchOpen]);

  useEffect(() => {
    const offNew = piMenu.onProjectNew(() => {
      setProjectCreationOpen(true);
    });
    const offOpen = piMenu.onProjectOpen(() => {
      void openProject();
    });
    const offSaveAs = piMenu.onProjectSaveAs(() => {
      void piBridge.projectSaveAs();
    });
    const offSettings = piMenu.onSettingsOpen(() => {
      setSettingsModalOpen(true);
    });
    const offTerminology = piMenu.onTerminologyOpen(() => {
      setTerminologyOpen(true);
    });
    const offMediaGallery = piMenu.onMediaGalleryOpen(() => {
      setMediaLibraryState({ isOpen: true, mode: 'manage', onSelect: null });
    });
    const offProjectInfo = piMenu.onProjectInfoOpen(() => {
      setProjectInfoOpen(true);
    });
    const offExportReport = piMenu.onExportReportOpen(() => {
      setExportReportOpen(true);
    });

    return () => {
      offNew?.();
      offOpen?.();
      offSaveAs?.();
      offSettings?.();
      offTerminology?.();
      offMediaGallery?.();
      offProjectInfo?.();
      offExportReport?.();
    };
  }, [
    createProject,
    openProject,
    setExportReportOpen,
    setMediaLibraryState,
    setProjectInfoOpen,
    setSettingsModalOpen,
    setTerminologyOpen
  ]);

  useEffect(() => {
    const handler = () => {
      void handleProjectLoaded();
    };
    window.addEventListener('project:loaded', handler);
    return () => window.removeEventListener('project:loaded', handler);
  }, [handleProjectLoaded]);

  useEffect(() => {
    const handleDeleteKey = (event: KeyboardEvent) => {
      if (
        event.key !== 'Delete' ||
        nodeCreationModal.isOpen ||
        relationshipModal.isOpen ||
        deletionModal.isOpen ||
        edgeDeletionModal.isOpen
      ) {
        return;
      }
      event.preventDefault();
      if (selectedNodeId) {
        openDeletionModal();
      } else if (selectedEdgeId) {
        openEdgeDeletionModal();
      }
    };
    window.addEventListener('keydown', handleDeleteKey);
    return () => window.removeEventListener('keydown', handleDeleteKey);
  }, [
    deletionModal.isOpen,
    edgeDeletionModal.isOpen,
    nodeCreationModal.isOpen,
    relationshipModal.isOpen,
    selectedEdgeId,
    selectedNodeId
  ]);

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graph.nodes, selectedNodeId]
  );

  const isBooting = isLocalAILoading || !graphLoaded || !splashReadyToHide;

  const elements = useMemo(
    () => mapGraphElements(graph, showNodeLabels, showNodeImages, imagePreviews),
    [graph, imagePreviews, showNodeImages, showNodeLabels]
  );

  const filteredElements = useMemo(() => {
    const visibleNodeIds = new Set(
      graph.nodes
        .filter((node) => activeTypeIds.has(node.type))
        .filter((node) => !hasSourcesOnly || nodeIdsWithSources.has(node.id))
        .map((node) => node.id)
    );

    const nodes = elements.filter((element) => (element as any).data?.source == null && visibleNodeIds.has((element as any).data?.id));
    const edges = elements.filter((element) => {
      const data = (element as any).data;
      if (!data?.source || !data?.target) return false;
      return visibleNodeIds.has(data.source) && visibleNodeIds.has(data.target);
    });
    return [...nodes, ...edges];
  }, [activeTypeIds, elements, graph.nodes, hasSourcesOnly, nodeIdsWithSources]);

  const searchResults = useMemo(
    () => buildSearchResults({ graph, assertions: searchAssertions, sources: searchSources }),
    [graph, searchAssertions, searchSources]
  );

  const currentNodeType = useMemo(
    () => nodeTypes.find((nodeType) => nodeType.id === nodeCreationModal.nodeTypeId) ?? null,
    [nodeCreationModal.nodeTypeId]
  );

  const openDeletionModal = useCallback(() => {
    if (!selectedNodeId) return;
    const node = graph.nodes.find((item) => item.id === selectedNodeId);
    if (!node) return;
    setDeletionModal({
      isOpen: true,
      node: {
        id: node.id,
        label: node.label || 'Untitled Entity',
        type: node.type
      }
    });
  }, [graph.nodes, selectedNodeId, setDeletionModal]);

  const openEdgeDeletionModal = useCallback(() => {
    if (!selectedEdgeId) return;
    const edge = graph.edges.find((item) => item.id === selectedEdgeId);
    if (!edge) return;
    const sourceNode = graph.nodes.find((item) => item.id === edge.src_id);
    const targetNode = graph.nodes.find((item) => item.id === edge.dst_id);
    setEdgeDeletionModal({
      isOpen: true,
      relationship: {
        id: edge.id,
        type: edge.type,
        sourceLabel: sourceNode?.label || 'Unknown',
        targetLabel: targetNode?.label || 'Unknown'
      }
    });
  }, [graph.edges, graph.nodes, selectedEdgeId, setEdgeDeletionModal]);

  const handleNodeDragStart = useCallback((nodeType: (typeof nodeTypes)[number], event: React.DragEvent) => {
    event.dataTransfer.setData('application/json', JSON.stringify({ id: nodeType.id }));
    event.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleGraphDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      const { id } = JSON.parse(raw) as { id?: string };
      const nodeType = nodeTypes.find((item) => item.id === id);
      if (!nodeType) return;
      const graphPos = graphApiRef.current?.containerToGraph(event.clientX, event.clientY);
      setNodeCreationModal({
        isOpen: true,
        nodeTypeId: nodeType.id,
        position: { x: graphPos?.x ?? 0, y: graphPos?.y ?? 0 }
      });
    } catch (error) {
      console.error('Error parsing node type data:', error);
    }
  }, [setNodeCreationModal]);

  const handleGraphDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleQuickCreateNode = useCallback((nodeType: (typeof nodeTypes)[number]) => {
    setNodeCreationModal({
      isOpen: true,
      nodeTypeId: nodeType.id,
      position: null
    });
  }, [setNodeCreationModal]);

  const handleCreateNode = useCallback((data: { label: string; properties: Record<string, unknown> }) => {
    if (!currentNodeType) return;
    void (async () => {
      await createNode({
        type: currentNodeType.id,
        label: data.label,
        properties: data.properties,
        position: nodeCreationModal.position
      });
      if (view === 'graph' && autoLayoutPreset !== 'off') {
        window.requestAnimationFrame(() => {
          const result = graphApiRef.current?.runLayout(autoLayoutPreset);
          if (!result) return;
          setLastLayoutPreset(result.preset);
          const preset = getGraphLayoutPreset(result.preset);
          emitToast({
            tone: 'info',
            title: `${preset.label} applied`,
            description: `Auto-layout ran on the ${result.scope === 'selection' ? 'current selection' : 'visible graph'}.`
          });
        });
      }
    })();
    setNodeCreationModal({ isOpen: false, nodeTypeId: null, position: null });
  }, [autoLayoutPreset, createNode, currentNodeType, nodeCreationModal.position, setNodeCreationModal, view]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (!relationshipTool.isActive) return;
    const node = graph.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    const nodeInfo = { id: nodeId, label: node.label || 'Untitled Entity', type: node.type };
    if (!relationshipTool.sourceNode) {
      setRelationshipTool((prev) => ({ ...prev, sourceNode: nodeInfo }));
      return;
    }
    if (!relationshipTool.targetNode && relationshipTool.sourceNode.id !== nodeId) {
      setRelationshipTool((prev) => ({ ...prev, targetNode: nodeInfo }));
      setRelationshipModal({ isOpen: true });
    }
  }, [graph.nodes, relationshipTool, setRelationshipModal, setRelationshipTool]);

  const handleRequestCreateEdge = useCallback((sourceId: string, targetId: string) => {
    const sourceNode = graph.nodes.find((node) => node.id === sourceId);
    const targetNode = graph.nodes.find((node) => node.id === targetId);
    if (!sourceNode || !targetNode || sourceId === targetId) return;
    setRelationshipTool((prev) => ({
      ...prev,
      sourceNode: { id: sourceId, label: sourceNode.label || 'Untitled Entity', type: sourceNode.type },
      targetNode: { id: targetId, label: targetNode.label || 'Untitled Entity', type: targetNode.type }
    }));
    setRelationshipModal({ isOpen: true });
  }, [graph.nodes, setRelationshipModal, setRelationshipTool]);

  const buildSavedViewSnapshot = useCallback(() => ({
    view,
    sidebarTab,
    activeTypeIds: Array.from(activeTypeIds),
    hasSourcesOnly,
    selectedNodeIds: graphApiRef.current?.getSelectedNodeIds() ?? selectedNodeIds,
    selectedEdgeIds: graphApiRef.current?.getSelectedEdgeIds() ?? (selectedEdgeId ? [selectedEdgeId] : []),
    viewport: graphApiRef.current?.getViewport() ?? null
  }), [activeTypeIds, hasSourcesOnly, selectedEdgeId, selectedNodeIds, sidebarTab, view]);

  const handleSaveView = useCallback(() => {
    const snapshot = buildSavedViewSnapshot();
    if (activeSavedViewId) {
      void saveActiveView(snapshot);
      return;
    }

    const name = window.prompt('Name this investigation view:');
    if (!name || name.trim().length === 0) return;
    void saveNamedView(name, snapshot);
  }, [activeSavedViewId, buildSavedViewSnapshot, saveActiveView, saveNamedView]);

  const handleSaveViewAs = useCallback(() => {
    const name = window.prompt('Name the new investigation view:');
    if (!name || name.trim().length === 0) return;
    void saveNamedView(name, buildSavedViewSnapshot());
  }, [buildSavedViewSnapshot, saveNamedView]);

  const handleDeleteSavedView = useCallback(() => {
    if (!activeSavedViewId) return;
    const currentSavedView = savedViews.find((savedView) => savedView.id === activeSavedViewId);
    const confirmed = window.confirm(
      currentSavedView ? `Delete saved view "${currentSavedView.name}"?` : 'Delete the current saved view?'
    );
    if (!confirmed) return;
    void deleteSavedView(activeSavedViewId);
  }, [activeSavedViewId, deleteSavedView, savedViews]);

  const handleRunLayoutPreset = useCallback((presetId: GraphLayoutPresetId) => {
    const result = graphApiRef.current?.runLayout(presetId);
    if (!result) {
      emitToast({
        tone: 'warning',
        title: 'No layout applied',
        description: 'There were no visible nodes available for this layout.'
      });
      return;
    }
    setLastLayoutPreset(result.preset);
    const preset = getGraphLayoutPreset(result.preset);
    emitToast({
      tone: 'info',
      title: `${preset.label} applied`,
      description: `Layout ran on the ${result.scope === 'selection' ? 'current selection' : 'visible graph'}.`
    });
  }, []);

  const titleBarProps = {
    context: (isBooting ? 'booting' : showWelcome ? 'welcome' : 'main') as 'welcome' | 'booting' | 'main',
    onProjectNew: () => {
      void createProject();
    },
    onProjectOpen: () => {
      void openProject();
    },
    onProjectClose: closeProject,
    onProjectSaveAs: () => {
      void piBridge.projectSaveAs();
    },
    onExportReport: () => setExportReportOpen(true),
    onSettingsOpen: () => setSettingsModalOpen(true),
    onProjectInfo: () => setProjectInfoOpen(true),
    onTerminology: () => setTerminologyOpen(true),
    onMediaGallery: () => setMediaLibraryState({ isOpen: true, mode: 'manage', onSelect: null }),
    onViewShowGraph: () => setView('graph'),
    onViewShowTimeline: () => setView('timeline'),
    onViewToggleFilters: () => {
      setFilterAnchor(null);
      setFiltersOpen(!filtersOpen);
    },
    onViewZoomSelection: () => graphApiRef.current?.zoomToSelection(),
    onViewFit: () => graphApiRef.current?.fitToScreen(),
    onViewCenterSelection: () => graphApiRef.current?.centerSelection(),
    onViewRunLayoutPreset: handleRunLayoutPreset,
    onToolsToggleRelationshipMode: () =>
      setRelationshipTool((prev) => ({
        ...prev,
        isActive: !prev.isActive,
        ...(prev.isActive ? { selectedType: null, sourceNode: null, targetNode: null } : {})
      })),
    onToolsToggleBoxSelect: () => {
      const next = !boxSelectEnabled;
      graphApiRef.current?.setBoxSelectEnabled(next);
      setBoxSelectEnabled(next);
    },
    onToolsAlignLeft: () => graphApiRef.current?.alignSelected('left'),
    onToolsAlignTop: () => graphApiRef.current?.alignSelected('top'),
    onToolsInvertSelection: () => graphApiRef.current?.invertSelection(),
    savedViews,
    activeSavedViewId,
    onApplySavedView: applySavedView
  };

  const focusNodeSelection = useCallback((nodeId: string) => {
    setSearchFocus(null);
    setSelectedEdgeId(null);
    setSelectedNodeId(nodeId);
    setSelectedNodeIds([nodeId]);
    window.requestAnimationFrame(() => {
      graphApiRef.current?.selectElements([nodeId], []);
    });
  }, [setSelectedEdgeId, setSelectedNodeId, setSelectedNodeIds]);

  const handleOpenNodeContextMenu = useCallback((payload: { nodeId: string; x: number; y: number }) => {
    const node = graph.nodes.find((item) => item.id === payload.nodeId);
    if (!node) return;
    focusNodeSelection(payload.nodeId);
    setNodeContextMenu({
      nodeId: node.id,
      label: node.label || 'Untitled Entity',
      type: node.type,
      position: { x: payload.x, y: payload.y }
    });
  }, [focusNodeSelection, graph.nodes]);

  const handleNodeContextAction = useCallback((actionId: string) => {
    const context = nodeContextMenu;
    setNodeContextMenu(null);
    if (!context) return;

    focusNodeSelection(context.nodeId);

    if (actionId === 'inspect') {
      return;
    }

    if (actionId === 'center') {
      window.requestAnimationFrame(() => graphApiRef.current?.centerSelection());
      return;
    }

    if (actionId === 'zoom') {
      window.requestAnimationFrame(() => graphApiRef.current?.zoomToSelection());
      return;
    }

    if (actionId === 'relationship') {
      setRelationshipTool({
        isActive: true,
        selectedType: null,
        sourceNode: {
          id: context.nodeId,
          label: context.label,
          type: context.type
        },
        targetNode: null
      });
      emitToast({
        tone: 'info',
        title: 'Relationship mode active',
        description: `Select a second node to relate to ${context.label}.`
      });
      return;
    }

    if (actionId === 'delete') {
      setDeletionModal({
        isOpen: true,
        node: {
          id: context.nodeId,
          label: context.label,
          type: context.type
        }
      });
    }
  }, [focusNodeSelection, nodeContextMenu, setDeletionModal, setRelationshipTool]);

  const nodeContextItems: ContextMenuItem[] = nodeContextMenu
    ? [
        {
          id: 'inspect',
          label: 'Inspect Node',
          description: 'Focus this entity in the inspector.',
          icon: <FaUserEdit className="h-3.5 w-3.5" />
        },
        {
          id: 'center',
          label: 'Center on Node',
          description: 'Move the current node into view.',
          icon: <FaCrosshairs className="h-3.5 w-3.5" />
        },
        {
          id: 'zoom',
          label: 'Zoom to Node',
          description: 'Fit the current selection on screen.',
          icon: <FaSearchPlus className="h-3.5 w-3.5" />
        },
        {
          id: 'relationship',
          label: 'Start Relationship',
          description: 'Use this node as the relationship source.',
          icon: <FaLink className="h-3.5 w-3.5" />
        },
        { id: 'separator-delete', separator: true },
        {
          id: 'delete',
          label: 'Delete Node',
          description: 'Open the delete confirmation for this entity.',
          icon: <FaTrash className="h-3.5 w-3.5" />,
          destructive: true
        }
      ]
    : [];

  const focusGraphSelection = useCallback((nodeIds: string[], edgeIds: string[]) => {
    window.requestAnimationFrame(() => {
      graphApiRef.current?.selectElements(nodeIds, edgeIds);
      graphApiRef.current?.zoomToSelection();
    });
  }, []);

  const handleSearchSelect = useCallback((result: SearchResult) => {
    if (result.kind === 'relationship' && result.edgeId) {
      setSearchFocus({ edgeId: result.edgeId });
      setSelectedNodeId(null);
      setSelectedNodeIds([]);
      setSelectedEdgeId(result.edgeId);
      focusGraphSelection([], [result.edgeId]);
      return;
    }

    if (result.kind === 'node' && result.nodeId) {
      setSearchFocus(null);
      setSelectedEdgeId(null);
      setSelectedNodeId(result.nodeId);
      setSelectedNodeIds([result.nodeId]);
      focusGraphSelection([result.nodeId], []);
      return;
    }

    const relatedNodeId = result.relatedNodeIds[0];
    if (!relatedNodeId) return;

    setSelectedEdgeId(null);
    setSelectedNodeId(relatedNodeId);
    setSelectedNodeIds([relatedNodeId]);
    setSearchFocus({
      assertionId: result.assertionId ?? null,
      sourceId: result.sourceId ?? null,
      edgeId: null
    });
    focusGraphSelection([relatedNodeId], []);
  }, [focusGraphSelection, setSelectedEdgeId, setSelectedNodeId, setSelectedNodeIds]);

  if (isBooting) {
    return (
      <div className="relative flex h-full flex-col overflow-hidden">
        <TitleBar {...titleBarProps} />
        <div className="flex-1 overflow-auto pt-9">
          <Suspense fallback={<div className="h-full bg-slate-950" />}>
            <SplashOverlay showing={true} loadingStage={loadingStage} />
          </Suspense>
        </div>
      </div>
    );
  }

  if (showWelcome) {
    return (
      <div className="relative flex h-full flex-col overflow-hidden">
        <TitleBar {...titleBarProps} />
        <ProjectCreationModal
          isOpen={projectCreationOpen}
          onClose={() => setProjectCreationOpen(false)}
          onCreate={(projectName) => {
            setProjectCreationOpen(false);
            void createProject(projectName);
          }}
        />
        <div className="flex-1 overflow-auto pt-9">
          <Suspense fallback={<div className="h-full bg-slate-950" />}>
            <SplashOverlay showing={false} />
            <WelcomeScreen
              onProjectCreate={() => {
                setProjectCreationOpen(true);
              }}
              onProjectLoad={() => {
                void openProject();
              }}
              investigationProfile={investigationProfile}
              onInvestigationProfileChange={(value) => {
                void persistInvestigationProfile(value);
              }}
              showExampleCase={showExampleCaseOnWelcome}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <TitleBar {...titleBarProps} />
      <ProjectCreationModal
        isOpen={projectCreationOpen}
        onClose={() => setProjectCreationOpen(false)}
        onCreate={(projectName) => {
          setProjectCreationOpen(false);
          void createProject(projectName);
        }}
      />
      <ToastViewport />
      <div className="flex-1 flex flex-col overflow-hidden pt-9">
        <GraphWorkspace
          graph={graph}
          filteredElements={filteredElements}
          view={view}
          relationshipTool={relationshipTool}
          lastLayoutPreset={lastLayoutPreset}
          boxSelectEnabled={boxSelectEnabled}
          filtersOpen={filtersOpen}
          filterAnchor={filterAnchor}
          filterRef={filterRef}
          activeTypeIds={activeTypeIds}
          hasSourcesOnly={hasSourcesOnly}
          searchOpen={searchOpen}
          searchResults={searchResults}
          searchFocus={searchFocus}
          localAIEnabled={localAIEnabled}
          investigationProfile={investigationProfile}
          personalizationTheme={personalizationTheme}
          sidebarTab={sidebarTab}
          graphApiRef={graphApiRef}
          showNodeImages={showNodeImages}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          selectedEdgeId={selectedEdgeId}
          assertions={assertions}
          sources={sources}
          defaultRelationshipConfidence={defaultRelationshipConfidence}
          autoHideInspectorWhenIdle={autoHideInspectorWhenIdle}
          savedViews={savedViews}
          activeSavedViewId={activeSavedViewId}
          onNodeDragStart={handleNodeDragStart}
          onNodeCreate={handleQuickCreateNode}
          onGraphDrop={handleGraphDrop}
          onGraphDragOver={handleGraphDragOver}
          onToggleFilters={(anchor) => {
            setFilterAnchor(anchor);
            setFiltersOpen(!filtersOpen);
          }}
          onSwitchWorkspace={setView}
          onRelationshipToolActivate={() => setRelationshipTool((prev) => ({ ...prev, isActive: true }))}
          onRelationshipToolDeactivate={() =>
            setRelationshipTool({
              isActive: false,
              selectedType: null,
              sourceNode: null,
              targetNode: null
            })
          }
          onToggleBoxSelect={() => {
            const next = !boxSelectEnabled;
            graphApiRef.current?.setBoxSelectEnabled(next);
            setBoxSelectEnabled(next);
          }}
          onRunLayoutPreset={handleRunLayoutPreset}
          onSidebarTabChange={setSidebarTab}
          onToggleType={(id) =>
            setActiveTypeIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onShowAllTypes={() => setActiveTypeIds(new Set(nodeTypes.map((nodeType) => nodeType.id)))}
          onToggleHasSources={setHasSourcesOnly}
          onSearchClose={() => setSearchOpen(false)}
          onSearchSelect={handleSearchSelect}
          onSelectionChange={(nodeIds) => setSelectedNodeIds(nodeIds)}
          onSelectNode={(id) => {
            setSearchFocus(null);
            setSelectedNodeId(id);
            setSelectedNodeIds([id]);
            setSelectedEdgeId(null);
            handleNodeClick(id);
          }}
          onUnselectNode={() => {
            setSearchFocus(null);
            setSelectedNodeId(null);
          }}
          onSelectEdge={(id) => {
            setSearchFocus(null);
            setSelectedEdgeId(id);
            setSelectedNodeId(null);
            setSelectedNodeIds([]);
          }}
          onUnselectEdge={() => {
            setSearchFocus(null);
            setSelectedEdgeId(null);
          }}
          onOpenNodeContextMenu={handleOpenNodeContextMenu}
          onNodeDragFree={(id, x, y) => {
            void handleNodeDragFree(id, x, y);
          }}
          onRequestCreateEdge={handleRequestCreateEdge}
          onDeleteNode={openDeletionModal}
          onDeleteNodes={deleteNodes}
          onDeleteEdge={openEdgeDeletionModal}
          onUpdateLabel={updateNodeLabel}
          onUpdateProperty={updateNodeProperty}
          onUpdateEdgeProperty={updateEdgeProperty}
          onRequestRemoteTransform={(transform, payload) => {
            setConsentData({
              transformId: transform.id,
              transformName: transform.name,
              subjectEntityId: selectedNodeId ?? '',
              subjectEntityType: selectedNodeId ? graph.nodes.find((node) => node.id === selectedNodeId)?.type ?? '' : '',
              payload,
              destination: transform.network?.host ?? 'remote service'
            });
          }}
          onAddAssertion={() => setAssertionModalOpen(true)}
          onAddSource={() => setSourceModalOpen(true)}
          onApplySavedView={applySavedView}
          onSaveView={handleSaveView}
          onSaveViewAs={handleSaveViewAs}
          onDeleteSavedView={handleDeleteSavedView}
        />
      </div>
      <Suspense fallback={null}>
        <AppModalLayer
          consentData={consentData}
          nodeCreationOpen={nodeCreationModal.isOpen}
          nodeType={currentNodeType}
          nodePosition={nodeCreationModal.position}
          relationshipModalOpen={relationshipModal.isOpen}
          relationshipTool={relationshipTool}
          defaultRelationshipConfidence={defaultRelationshipConfidence}
          settingsModalOpen={settingsModalOpen}
          localAIEnabled={localAIEnabled}
          investigationProfile={investigationProfile}
          defaultWorkspaceView={defaultWorkspaceView}
          restoreSavedViewOnOpen={restoreSavedViewOnOpen}
          defaultSidebarTab={defaultSidebarTab}
          autoHideInspectorWhenIdle={autoHideInspectorWhenIdle}
          showNodeLabels={showNodeLabels}
          showNodeImages={showNodeImages}
          autoLayoutPreset={autoLayoutPreset}
          defaultReportTemplate={defaultReportTemplate}
          defaultReportIncludeAttachments={defaultReportIncludeAttachments}
          defaultReportUseAI={defaultReportUseAI}
          defaultReportAIProvider={defaultReportAIProvider}
          mediaLibraryDefaultView={mediaLibraryDefaultView}
          mediaLibraryDefaultSort={mediaLibraryDefaultSort}
          mediaLibraryShowFolders={mediaLibraryShowFolders}
          uiDensity={uiDensity}
          motionPreference={motionPreference}
          showExampleCaseOnWelcome={showExampleCaseOnWelcome}
          personalizationTheme={personalizationTheme}
          deletionModal={deletionModal}
          edgeDeletionModal={edgeDeletionModal}
          assertionModalOpen={assertionModalOpen}
          sourceModalOpen={sourceModalOpen}
          mediaLibraryState={mediaLibraryState}
          terminologyOpen={terminologyOpen}
          projectInfoOpen={projectInfoOpen}
          exportReportOpen={exportReportOpen}
          selectedNode={selectedNode}
          onConfirmConsent={async () => {
            if (!consentData) return;
            try {
              const result = await piBridge.executeRemoteTransform({
                transformId: consentData.transformId,
                subjectEntityId: consentData.subjectEntityId,
                subjectEntityType: consentData.subjectEntityType,
                payload: consentData.payload,
                destination: consentData.destination
              });
              await refreshGraph();
              await refreshSearchData();
              if (selectedNodeId === consentData.subjectEntityId) {
                await refreshEntityDetails(consentData.subjectEntityId);
              }
              emitToast({
                tone: 'success',
                title: consentData.transformName,
                description: result.outputSummary
              });
            } catch (error) {
              emitToast({
                tone: 'error',
                title: `${consentData.transformName} failed`,
                description: error instanceof Error ? error.message : 'Unexpected transform execution error.'
              });
            } finally {
              setConsentData(null);
            }
          }}
          onDismissConsent={() => setConsentData(null)}
          onCloseNodeCreation={() => setNodeCreationModal({ isOpen: false, nodeTypeId: null, position: null })}
          onCreateNode={handleCreateNode}
          onCloseRelationshipModal={() => setRelationshipModal({ isOpen: false })}
          onCreateRelationship={(data) => {
            void createRelationship({
              ...data,
              beforePositions: graphApiRef.current?.getNodePositions() || {}
            });
          }}
          onCloseSettings={() => setSettingsModalOpen(false)}
          onToggleLocalAI={toggleLocalAI}
          onInvestigationProfileChange={persistInvestigationProfile}
          onDefaultWorkspaceViewChange={persistDefaultWorkspaceView}
          onRestoreSavedViewOnOpenChange={persistRestoreSavedViewOnOpen}
          onDefaultSidebarTabChange={persistDefaultSidebarTab}
          onAutoHideInspectorWhenIdleChange={persistAutoHideInspectorWhenIdle}
          onShowNodeLabelsChange={persistShowNodeLabels}
          onShowNodeImagesChange={persistShowNodeImages}
          onAutoLayoutPresetChange={persistAutoLayoutPreset}
          onDefaultRelationshipConfidenceChange={persistDefaultRelationshipConfidence}
          onDefaultReportTemplateChange={persistDefaultReportTemplate}
          onDefaultReportIncludeAttachmentsChange={persistDefaultReportIncludeAttachments}
          onDefaultReportUseAIChange={persistDefaultReportUseAI}
          onDefaultReportAIProviderChange={persistDefaultReportAIProvider}
          onMediaLibraryDefaultViewChange={persistMediaLibraryDefaultView}
          onMediaLibraryDefaultSortChange={persistMediaLibraryDefaultSort}
          onMediaLibraryShowFoldersChange={persistMediaLibraryShowFolders}
          onUiDensityChange={persistUiDensity}
          onMotionPreferenceChange={persistMotionPreference}
          onShowExampleCaseOnWelcomeChange={persistShowExampleCaseOnWelcome}
          onPersonalizationThemeChange={persistPersonalizationTheme}
          onCloseNodeDeletion={() => setDeletionModal({ isOpen: false, node: null })}
          onConfirmNodeDeletion={confirmDeleteNode}
          onCloseEdgeDeletion={() => setEdgeDeletionModal({ isOpen: false, relationship: null })}
          onConfirmEdgeDeletion={confirmDeleteEdge}
          onCloseAssertionModal={() => setAssertionModalOpen(false)}
          onAssertionCreated={() => {
            if (selectedNodeId) void refreshEntityDetails(selectedNodeId);
          }}
          onCloseSourceModal={() => setSourceModalOpen(false)}
          onSourceCreated={() => {
            if (selectedNodeId) void refreshEntityDetails(selectedNodeId);
          }}
          onOpenMediaLibrary={(onSelect) => setMediaLibraryState({ isOpen: true, mode: 'select', onSelect })}
          onCloseMediaLibrary={() => setMediaLibraryState((current) => ({ ...current, isOpen: false, onSelect: null }))}
          onCloseTerminology={() => setTerminologyOpen(false)}
          onCloseProjectInfo={() => setProjectInfoOpen(false)}
          onCloseExportReport={() => setExportReportOpen(false)}
        />
      </Suspense>
      <ContextMenu
        open={Boolean(nodeContextMenu)}
        position={nodeContextMenu?.position ?? null}
        items={nodeContextItems}
        onClose={() => setNodeContextMenu(null)}
        onAction={handleNodeContextAction}
      />
    </div>
  );
}
