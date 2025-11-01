import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import cytoscape, { type ElementDefinition } from 'cytoscape';
import type { EntityRecord, SourceRecord } from '@shared/types';
import { ConsentModal } from './components/ConsentModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { TitleBar } from './components/TitleBar';
import { NodePalette } from './components/NodePalette';
import { NodeCreationModal } from './components/NodeCreationModal';
import { relationshipTypes, type RelationshipType } from './lib/relationshipTypes';
import { RelationshipCreationModal } from './components/RelationshipCreationModal';
import { NodeDeletionModal } from './components/NodeDeletionModal';
import { RelationshipDeletionModal } from './components/RelationshipDeletionModal';
import { TopToolbar } from './components/TopToolbar';
import { nodeTypes, type NodeType } from './lib/nodeTypes/index';
import { GraphCanvas } from './components/GraphCanvas';
import { SettingsModal } from './components/SettingsModal';
import { LocalAIInsights } from './components/LocalAIInsights';
import { InspectorPanel } from './components/InspectorPanel';
import type { GraphSnapshot } from './types/graph';
import { SplashOverlay } from './components/SplashOverlay';
import { SearchPalette } from './components/SearchPalette';
import { AssertionCreationModal } from './components/AssertionCreationModal';
import { SourceCreationModal } from './components/SourceCreationModal';
import { MediaLibraryModal } from './components/MediaLibraryModal';
import { TimelineWorkspace } from './components/TimelineWorkspace';
import { TerminologyModal } from './components/TerminologyModal';
import { FilterPanel } from './components/FilterPanel';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { ExportReportModal } from './components/ExportReportModal';

type ParsedAssertionRecord = {
  id: string;
  subject_kind: string;
  subject_id: string;
  path: string;
  value: Record<string, unknown>;
  source_id: string;
  confidence: 'asserted' | 'unverified' | 'verified';
  created_at: number;
};

// Mapping from node types to Unicode icons for Cytoscape
const nodeTypeIcons: Record<string, string> = {
  person: '👤',
  organization: '🏢', 
  location: '📍',
  event: '📅',
  document: '📄',
  communication: '💬',
  financial: '💰',
  evidence: '🔍'
};

cytoscape.warnings(false);

const LOCAL_AI_SETTING_KEY = 'local_ai_enabled';
const SHOW_NODE_LABELS_SETTING_KEY = 'show_node_labels';
const AUTO_LAYOUT_ON_CREATE_SETTING_KEY = 'auto_layout_on_create';
const DEFAULT_RELATIONSHIP_CONFIDENCE_SETTING_KEY = 'default_relationship_confidence';

type AssertionView = ParsedAssertionRecord;

function mapGraphElements(data: GraphSnapshot, showLabels: boolean): ElementDefinition[] {
  const relById = new Map(relationshipTypes.map(rt => [rt.id, rt]));
  const buildPersonName = (props: Record<string, unknown> | undefined, fallback: string) => {
    const first = (props?.first_name as string) || (props?.firstname as string) || '';
    const middle = (props?.middle_name as string) || '';
    const last = (props?.last_name as string) || (props?.lastname as string) || '';
    const parts = [first, middle, last].map(p => (p || '').trim()).filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : fallback;
  };
  const displayNameForNode = (node: GraphSnapshot['nodes'][number]): string => {
    const props = node.properties || {} as Record<string, unknown>;
    if (node.type === 'person') {
      return buildPersonName(props, node.label ?? '');
    }
    // Heuristics by common asset/identifier kinds
    const typeLower = (node.type || '').toLowerCase();
    const getStr = (k: string) => (props[k] as string | undefined) || '';
    if (typeLower.includes('phone')) {
      const phone = getStr('phone_number') || getStr('phone') || getStr('e164') || getStr('number');
      if (phone) return phone;
    }
    if (typeLower.includes('email')) {
      const email = getStr('email') || getStr('email_address') || getStr('address');
      if (email) return email;
    }
    if (typeLower.includes('device')) {
      const dev = getStr('device_id') || getStr('imei') || getStr('serial') || getStr('name') || getStr('model');
      if (dev) return dev;
    }
    if (typeLower === 'website' || typeLower.includes('website')) {
      const url = getStr('url') || getStr('domain') || getStr('title');
      if (url) return url;
    }
    if (typeLower === 'server') {
      const host = getStr('hostname') || getStr('ipAddress') || getStr('ip_address');
      if (host) return host;
    }
    if (typeLower === 'cryptocurrency') {
      const addr = getStr('address');
      if (addr) return addr;
    }
    // Generic fallbacks
    const nameLike = getStr('name')
      || getStr('title')
      || getStr('institution_name')
      || getStr('organization_name')
      || getStr('company');
    const base = (node.label ?? '').trim();
    const pick = (nameLike || base).trim();
    return pick || node.id;
  };
  return [
    ...data.nodes.map((node) => ({
      data: {
        id: node.id,
        label: showLabels ? `${nodeTypeIcons[node.type] || '●'} ${displayNameForNode(node)}` : '',
        type: node.type,
        icon: nodeTypeIcons[node.type] || '●'
      },
      position: node.pos_x != null && node.pos_y != null ? { x: Number(node.pos_x), y: Number(node.pos_y) } : undefined
    })),
    ...data.edges.map((edge) => {
      const rel = relById.get(edge.type);
      const subtypeId = (edge.properties?.subtype as string | undefined) || '';
      const subtypeLabel = rel?.subtypes?.find(s => s.id === subtypeId)?.label;
      let edgeLabel = subtypeLabel ?? rel?.label ?? edge.type;
      const dateStr = (edge.properties?.date as string | undefined) || '';
      if (dateStr) {
        const year = dateStr.slice(0, 4);
        if (/^\d{4}$/.test(year)) edgeLabel = `${edgeLabel} (${year})`;
      }
      return {
        data: {
          id: edge.id,
          source: edge.src_id,
          target: edge.dst_id,
          label: edgeLabel
        }
      } as ElementDefinition;
    })
  ];
}

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [graph, setGraph] = useState<GraphSnapshot>({ nodes: [], edges: [] });
  const [graphLoaded, setGraphLoaded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [assertions, setAssertions] = useState<AssertionView[]>([]);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [consentData, setConsentData] = useState<{
    transformId: string;
    payload: Record<string, unknown>;
    destination: string;
  } | null>(null);
  const [nodeCreationModal, setNodeCreationModal] = useState<{
    isOpen: boolean;
    nodeType: NodeType | null;
    position: { x: number; y: number } | null;
  }>({
    isOpen: false,
    nodeType: null,
    position: null
  });
  const [relationshipTool, setRelationshipTool] = useState<{
    isActive: boolean;
    selectedType: RelationshipType | null;
    sourceNode: { id: string; label: string } | null;
    targetNode: { id: string; label: string } | null;
  }>({
    isActive: false,
    selectedType: null,
    sourceNode: null,
    targetNode: null
  });
  const [relationshipModal, setRelationshipModal] = useState<{
    isOpen: boolean;
  }>({
    isOpen: false
  });
  const [deletionModal, setDeletionModal] = useState<{
    isOpen: boolean;
    node: { id: string; label: string; type: string } | null;
  }>({
    isOpen: false,
    node: null
  });
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeDeletionModal, setEdgeDeletionModal] = useState<{
    isOpen: boolean;
    relationship: {
      id: string;
      type: string;
      sourceLabel: string;
      targetLabel: string;
    } | null;
  }>({
    isOpen: false,
    relationship: null
  });
  const [localAIEnabled, setLocalAIEnabled] = useState(false);
  const [isLocalAILoading, setIsLocalAILoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<'settings' | 'graph' | 'complete'>('settings');
  const [splashReadyToHide, setSplashReadyToHide] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [showNodeLabels, setShowNodeLabels] = useState(true);
  const [autoLayoutOnCreate, setAutoLayoutOnCreate] = useState(false);
  const [defaultRelationshipConfidence, setDefaultRelationshipConfidence] = useState<'unverified' | 'asserted' | 'verified'>('unverified');
  const [searchOpen, setSearchOpen] = useState(false);
  const [boxSelectEnabled, setBoxSelectEnabled] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'nodes' | 'ai'>('nodes');
  const [activeTypeIds, setActiveTypeIds] = useState<Set<string>>(new Set(nodeTypes.map(nt => nt.id)));
  const [hasSourcesOnly, setHasSourcesOnly] = useState(false);
  const [nodeIdsWithSources, setNodeIdsWithSources] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState<DOMRect | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const [assertionModalOpen, setAssertionModalOpen] = useState(false);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [terminologyOpen, setTerminologyOpen] = useState(false);
  const [mediaLibraryState, setMediaLibraryState] = useState<{
    isOpen: boolean;
    mode: 'manage' | 'select';
    onSelect?: ((source: SourceRecord) => void) | null;
  }>({ isOpen: false, mode: 'manage', onSelect: null });
  const [view, setView] = useState<'graph' | 'timeline'>('graph');
  const [projectInfoOpen, setProjectInfoOpen] = useState(false);
  const [exportReportOpen, setExportReportOpen] = useState(false);
  const graphApiRef = useRef<{
    runLayout: (name: 'grid' | 'concentric' | 'cose') => void;
    toggleBoxSelect: () => void;
    alignSelected: (kind: 'left' | 'top') => void;
    invertSelection: () => void;
  } | null>(null);
  // Real-time editing state - no separate editing mode needed

  const loadSettings = useCallback(async () => {
    setIsLocalAILoading(true);
    setLoadingStage('settings');
    try {
      const [localAI, showLabels, autoLayout, defaultConfidence] = await Promise.all([
        window.piBridge.getProjectSetting(LOCAL_AI_SETTING_KEY),
        window.piBridge.getProjectSetting(SHOW_NODE_LABELS_SETTING_KEY),
        window.piBridge.getProjectSetting(AUTO_LAYOUT_ON_CREATE_SETTING_KEY),
        window.piBridge.getProjectSetting(DEFAULT_RELATIONSHIP_CONFIDENCE_SETTING_KEY)
      ]);
      setLocalAIEnabled(Boolean(localAI));
      setShowNodeLabels(showLabels === null ? true : Boolean(showLabels));
      setAutoLayoutOnCreate(Boolean(autoLayout));
      setDefaultRelationshipConfidence((defaultConfidence as typeof defaultRelationshipConfidence) || 'unverified');
      // Only move to 'graph' stage if graph isn't loaded yet
      if (!graphLoaded) {
        setLoadingStage('graph');
      }
    } catch (error) {
      console.error('[App] Failed to load settings', error);
      if (!graphLoaded) {
        setLoadingStage('graph');
      }
    } finally {
      setIsLocalAILoading(false);
    }
  }, [graphLoaded]);

  const handleLocalAIToggle = useCallback(async () => {
    const next = !localAIEnabled;
    try {
      setIsLocalAILoading(true);
      await window.piBridge.setProjectSetting(LOCAL_AI_SETTING_KEY, next);
      setLocalAIEnabled(next);
    } catch (error) {
      console.error('[App] Failed to persist local AI preference', error);
    } finally {
      setIsLocalAILoading(false);
    }
  }, [localAIEnabled]);

  const handleShowNodeLabelsChange = useCallback(async (value: boolean) => {
    try {
      await window.piBridge.setProjectSetting(SHOW_NODE_LABELS_SETTING_KEY, value);
      setShowNodeLabels(value);
    } catch (error) {
      console.error('[App] Failed to persist show node labels setting', error);
    }
  }, []);

  const handleAutoLayoutOnCreateChange = useCallback(async (value: boolean) => {
    try {
      await window.piBridge.setProjectSetting(AUTO_LAYOUT_ON_CREATE_SETTING_KEY, value);
      setAutoLayoutOnCreate(value);
    } catch (error) {
      console.error('[App] Failed to persist auto layout setting', error);
    }
  }, []);

  const handleDefaultRelationshipConfidenceChange = useCallback(async (value: 'unverified' | 'asserted' | 'verified') => {
    try {
      await window.piBridge.setProjectSetting(DEFAULT_RELATIONSHIP_CONFIDENCE_SETTING_KEY, value);
      setDefaultRelationshipConfidence(value);
    } catch (error) {
      console.error('[App] Failed to persist default relationship confidence', error);
    }
  }, []);

  useEffect(() => {
    if (!hasSourcesOnly) return;
    let cancelled = false;
    // Compute which nodes have sources; naive parallel fetch for now
    (async () => {
      const pairs = await Promise.all(
        graph.nodes.map(async (n) => {
          try {
            const s = await window.piBridge.listSourcesByEntity(n.id);
            return [n.id, (s?.length ?? 0) > 0] as const;
          } catch {
            return [n.id, false] as const;
          }
        })
      );
      if (cancelled) return;
      const set = new Set<string>();
      for (const [id, has] of pairs) if (has) set.add(id);
      setNodeIdsWithSources(set);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasSourcesOnly, graph.nodes]);

  useEffect(() => {
    const startTime = Date.now();
    setLoadingStage('graph'); // Set to graph stage when graph loading starts
    
    // Load settings and graph in parallel
    Promise.all([
      loadSettings(),
      window.piBridge.loadGraph()
    ]).then(([, graphData]) => {
      setGraph({ nodes: graphData.nodes, edges: graphData.edges });
      setLoadingStage('complete');
      const elapsed = Date.now() - startTime;
      // Ensure minimum 2 seconds display time for smooth UX
      const remainingTime = Math.max(0, 2000 - elapsed);
      setTimeout(() => {
        setGraphLoaded(true);
        // Additional delay before hiding splash for polish
        setTimeout(() => setSplashReadyToHide(true), 300);
      }, remainingTime);
      // Normalize labels for identifiers if missing or generic
      (async () => {
        try {
          await Promise.allSettled(
            graphData.nodes.map(async (n) => {
              const typeLower = (n.type || '').toLowerCase();
              const props = (n.properties || {}) as Record<string, unknown>;
              const getStr = (k: string) => (props[k] as string | undefined) || '';
              let candidate: string | undefined;
              
              // Map node types to their required/primary identifier properties
              if (typeLower === 'phone' || typeLower.includes('phone')) {
                candidate = getStr('number') || getStr('phone_number') || getStr('phone') || getStr('e164') || undefined;
              } else if (typeLower === 'email' || typeLower.includes('email')) {
                candidate = getStr('address') || getStr('email_address') || getStr('email') || undefined;
              } else if (typeLower === 'device' || typeLower.includes('device')) {
                candidate = getStr('name') || getStr('device_id') || getStr('imei') || getStr('serialNumber') || getStr('serial') || getStr('model') || undefined;
              } else if (typeLower === 'server') {
                candidate = getStr('hostname') || getStr('ipAddress') || getStr('ip_address') || undefined;
              } else if (typeLower === 'website' || typeLower.includes('website')) {
                candidate = getStr('url') || getStr('domain') || getStr('title') || undefined;
              } else if (typeLower === 'cryptocurrency') {
                candidate = getStr('address') || undefined;
              } else if (typeLower === 'organization' || typeLower === 'educational' || typeLower === 'government' || typeLower === 'healthcare') {
                // All organization types use 'name' as the required field
                candidate = getStr('name') || getStr('legalName') || getStr('dba') || undefined;
              } else if (
                typeLower.includes('organization') ||
                typeLower.includes('company') ||
                typeLower.includes('institution') ||
                typeLower.includes('educational') ||
                typeLower.includes('agency') ||
                typeLower.includes('government') ||
                typeLower.includes('healthcare') ||
                typeLower.includes('university') ||
                typeLower.includes('school')
              ) {
                // Fallback for any organization-like types
                candidate =
                  getStr('name') ||
                  getStr('organization_name') ||
                  getStr('company_name') ||
                  getStr('institution_name') ||
                  getStr('legal_name') ||
                  getStr('legalName') ||
                  getStr('abbr') ||
                  getStr('alias') ||
                  undefined;
              }
              
              if (!candidate) return;
              const currentLabel = (n.label || '').trim().toLowerCase();
              const typeWord = (n.type || '').replaceAll('_', ' ').trim().toLowerCase();
              const isGeneric = currentLabel === '' || currentLabel === typeWord;
              if (isGeneric || currentLabel !== candidate.toLowerCase()) {
                await window.piBridge.updateEntity(n.id, { label: candidate });
              }
            })
          );
        } catch {
          // non-blocking normalization errors ignored
        }
      })();
    });
  }, []);

  // Ensure the AI tab is only active when enabled
  useEffect(() => {
    if (!localAIEnabled && sidebarTab === 'ai') {
      setSidebarTab('nodes');
    }
  }, [localAIEnabled, sidebarTab]);

  // Refresh assertions/sources when requested
  useEffect(() => {
    const handler = () => {
      if (!selectedNodeId) return;
      void fetchAssertions(selectedNodeId).then(setAssertions);
      void fetchSources(selectedNodeId).then(setSources);
    };
    window.addEventListener('pi:refresh', handler);
    // Hook menu events if available
    const offZoom = window.piMenu?.onViewZoomSelection?.(() => graphApiRef.current?.zoomToSelection());
    const offFit = window.piMenu?.onViewFit?.(() => graphApiRef.current?.fitToScreen());
    const offCenter = window.piMenu?.onViewCenterSelection?.(() => graphApiRef.current?.centerSelection());
    const keyHandler = (e: KeyboardEvent) => {
      // Ctrl+F opens search
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      // Ctrl+Shift+Z: Zoom to Selection
      if (e.ctrlKey && e.shiftKey && (e.key === 'Z' || e.key === 'z')) {
        e.preventDefault();
        graphApiRef.current?.zoomToSelection();
      }
      // Ctrl+Shift+F: Fit to Screen
      if (e.ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        graphApiRef.current?.fitToScreen();
      }
      // Ctrl+Shift+C: Center Selection
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        graphApiRef.current?.centerSelection();
      }
    };
    window.addEventListener('keydown', keyHandler);
    const clickOutside = (ev: MouseEvent) => {
      if (!filtersOpen) return;
      const t = ev.target as Node;
      if (filterRef.current && !filterRef.current.contains(t)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => {
      window.removeEventListener('pi:refresh', handler);
      window.removeEventListener('keydown', keyHandler);
      document.removeEventListener('mousedown', clickOutside);
      offZoom && offZoom();
      offFit && offFit();
      offCenter && offCenter();
    };
  }, [selectedNodeId, filtersOpen]);

  useEffect(() => {
    if (!window.piMenu) return;
    const offNew = window.piMenu.onProjectNew(async () => { await handleProjectCreate(); });
    const offOpen = window.piMenu.onProjectOpen(async () => { await handleProjectLoad(); });
    const offSaveAs = window.piMenu.onProjectSaveAs(async () => {
      try {
        const ok = await window.piBridge.projectSaveAs();
        if (ok) console.debug('[App] Project saved');
      } catch (e) {
        console.error('project:saveAs failed', e);
      }
    });
    const offSettings = window.piMenu.onSettingsOpen(() => {
      setSettingsModalOpen(true);
    });
    const offTerminology = window.piMenu.onTerminologyOpen?.(() => setTerminologyOpen(true));
    const offMediaGallery = window.piMenu.onMediaGalleryOpen(() => {
      setMediaLibraryState({ isOpen: true, mode: 'manage', onSelect: null });
    });
    const offProjectInfo = window.piMenu.onProjectInfoOpen?.(() => setProjectInfoOpen(true));
    const offExportReport = window.piMenu.onExportReportOpen?.(() => setExportReportOpen(true));
    return () => {
      offNew?.();
      offOpen?.();
      offSaveAs?.();
      offSettings?.();
      offMediaGallery?.();
      offTerminology?.();
      offProjectInfo?.();
      offExportReport?.();
    };
  }, []);

  // Keyboard event listener for delete key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle delete if no modal is open
      if (event.key === 'Delete' && 
          !nodeCreationModal.isOpen && 
          !relationshipModal.isOpen && 
          !deletionModal.isOpen &&
          !edgeDeletionModal.isOpen) {
        event.preventDefault();
        if (selectedNodeId) {
          handleDeleteNode();
        } else if (selectedEdgeId) {
          handleDeleteEdge();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, nodeCreationModal.isOpen, relationshipModal.isOpen, deletionModal.isOpen, edgeDeletionModal.isOpen]);

  useEffect(() => {
    setAssertionModalOpen(false);
    setSourceModalOpen(false);
  }, [selectedNodeId]);

  const elements = useMemo(() => mapGraphElements(graph, showNodeLabels), [graph, showNodeLabels]);
  const filteredElements = useMemo(() => {
    // Filter nodes by type and source presence
    const allowedTypes = activeTypeIds;
    const visibleNodeIds = new Set(
      graph.nodes
        .filter(n => allowedTypes.has(n.type))
        .filter(n => !hasSourcesOnly || nodeIdsWithSources.has(n.id))
        .map(n => n.id)
    );
    const nodes = elements.filter(el => (el as any).data?.source == null && visibleNodeIds.has((el as any).data?.id));
    const edges = elements.filter(el => {
      const d = (el as any).data;
      if (!d?.source || !d?.target) return false;
      return visibleNodeIds.has(d.source) && visibleNodeIds.has(d.target);
    });
    return [...nodes, ...edges];
  }, [elements, graph.nodes, activeTypeIds, hasSourcesOnly, nodeIdsWithSources]);

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graph.nodes, selectedNodeId]
  );

  const refreshEntityDetails = useCallback(async (entityId: string) => {
    const [entityAssertions, entitySources] = await Promise.all([
      fetchAssertions(entityId),
      fetchSources(entityId)
    ]);
    setAssertions(entityAssertions);
    setSources(entitySources);
  }, []);

  const openMediaLibraryForSelection = useCallback(
    (onSelect: (source: SourceRecord) => void) => {
      setMediaLibraryState({ isOpen: true, mode: 'select', onSelect });
    },
    []
  );

  const closeMediaLibrary = useCallback(() => {
    setMediaLibraryState((current) => ({ ...current, isOpen: false, onSelect: null }));
  }, []);

  useEffect(() => {
    if (!selectedNodeId) {
      setAssertions([]);
      setSources([]);
      return;
    }

    void refreshEntityDetails(selectedNodeId);
  }, [selectedNodeId, refreshEntityDetails]);

  const handleProjectCreate = async () => {
    try {
      const ok = await window.piBridge.projectNew();
      if (ok) {
        // Reset loading states for new project
        setGraphLoaded(false);
        setSplashReadyToHide(false);
        setLoadingStage('settings');
        setIsLocalAILoading(true);
        
        const startTime = Date.now();
        const updatedGraph = await window.piBridge.loadGraph();
        setGraph({ nodes: updatedGraph.nodes, edges: updatedGraph.edges });
        setLoadingStage('complete');
        
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, 2000 - elapsed);
        setTimeout(() => {
          setGraphLoaded(true);
          setTimeout(() => setSplashReadyToHide(true), 300);
        }, remainingTime);
        
        setShowWelcome(false);
        void loadSettings();
      }
    } catch (e) {
      console.error('project:new failed', e);
      setShowWelcome(false);
      void loadSettings();
    }
  };

  const handleProjectLoad = async () => {
    try {
      const ok = await window.piBridge.projectOpen();
      if (ok) {
        // Reset loading states for loaded project
        setGraphLoaded(false);
        setSplashReadyToHide(false);
        setLoadingStage('settings');
        setIsLocalAILoading(true);
        
        const startTime = Date.now();
        const updatedGraph = await window.piBridge.loadGraph();
        setGraph({ nodes: updatedGraph.nodes, edges: updatedGraph.edges });
        setLoadingStage('complete');
        
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, 2000 - elapsed);
        setTimeout(() => {
          setGraphLoaded(true);
          setTimeout(() => setSplashReadyToHide(true), 300);
        }, remainingTime);
        
        setShowWelcome(false);
        void loadSettings();
      }
    } catch (e) {
      console.error('project:open failed', e);
    }
  };

  const handleProjectLoaded = useCallback(async () => {
    try {
      // Reset loading states
      setGraphLoaded(false);
      setSplashReadyToHide(false);
      setLoadingStage('settings');
      setIsLocalAILoading(true);
      
      const startTime = Date.now();
      const updatedGraph = await window.piBridge.loadGraph();
      setGraph({ nodes: updatedGraph.nodes, edges: updatedGraph.edges });
      setLoadingStage('complete');
      
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsed);
      setTimeout(() => {
        setGraphLoaded(true);
        setTimeout(() => setSplashReadyToHide(true), 300);
      }, remainingTime);
      
      setShowWelcome(false);
      void loadSettings();
    } catch (e) {
      console.error('project:loaded event handler failed', e);
    }
  }, [loadSettings]);

  // Listen for project:loaded event from WelcomeScreen
  useEffect(() => {
    const handler = () => handleProjectLoaded();
    window.addEventListener('project:loaded', handler);
    return () => window.removeEventListener('project:loaded', handler);
  }, [handleProjectLoaded]);

  const handleNodeDragStart = (nodeType: NodeType, event: React.DragEvent) => {
    event.dataTransfer.setData('application/json', JSON.stringify({ id: nodeType.id }));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleGraphDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const nodeTypeData = event.dataTransfer.getData('application/json');
    if (!nodeTypeData) return;

    try {
      const { id } = JSON.parse(nodeTypeData);
      const nodeType = nodeTypes.find(nt => nt.id === id);
      if (!nodeType) return;
      // Convert client coords into graph coords via Cytoscape viewport transform
      const graphPos = graphApiRef.current?.containerToGraph(event.clientX, event.clientY);
      const x = graphPos?.x ?? 0;
      const y = graphPos?.y ?? 0;

      setNodeCreationModal({
        isOpen: true,
        nodeType,
        position: { x, y }
      });
    } catch (error) {
      console.error('Error parsing node type data:', error);
    }
  };

  const handleGraphDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleNodeCreate = async (data: { label: string; properties: Record<string, unknown> }) => {
    if (!nodeCreationModal.nodeType) return;

    try {
      console.debug('[App] Creating entity:', {
        type: nodeCreationModal.nodeType.id,
        label: data.label,
        hasProps: Object.keys(data.properties || {}).length,
        dropPos: nodeCreationModal.position
      });
      const entityId = await window.piBridge.createEntity({
        type: nodeCreationModal.nodeType.id as EntityRecord['type'],
        label: data.label,
        properties: data.properties
      });
      console.debug('[App] Created entity id:', entityId);

      if (entityId && nodeCreationModal.position) {
        window.piBridge
          .updateEntityPosition(entityId, {
            x: nodeCreationModal.position.x,
            y: nodeCreationModal.position.y
          })
          .then(() => console.debug('[App] Initial position saved for', entityId))
          .catch((e) => console.warn('[App] Position save failed (non-blocking):', e));
      }

      const updatedGraph = await window.piBridge.loadGraph();
      console.debug('[App] Graph reloaded: nodes=', updatedGraph.nodes.length, 'edges=', updatedGraph.edges.length);
      setGraph({ nodes: updatedGraph.nodes, edges: updatedGraph.edges });
    } catch (error) {
      console.error('[App] Error creating entity:', error);
    }
  };

  const handleRelationshipToolActivate = () => {
    setRelationshipTool(prev => ({ ...prev, isActive: true }));
  };

  const handleRelationshipToolDeactivate = () => {
    setRelationshipTool({
      isActive: false,
      selectedType: null,
      sourceNode: null,
      targetNode: null
    });
  };

  const handleSelectRelationshipType = (type: RelationshipType) => {
    setRelationshipTool(prev => ({ ...prev, selectedType: type }));
  };

  const handleNodeClick = (nodeId: string) => {
    if (!relationshipTool.isActive || !relationshipTool.selectedType) return;

    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const nodeInfo = { id: nodeId, label: node.label || 'Untitled Entity' };

    if (!relationshipTool.sourceNode) {
      setRelationshipTool(prev => ({ ...prev, sourceNode: nodeInfo }));
    } else if (!relationshipTool.targetNode && relationshipTool.sourceNode.id !== nodeId) {
      setRelationshipTool(prev => ({ ...prev, targetNode: nodeInfo }));
      setRelationshipModal({ isOpen: true });
    }
  };

  const handleRelationshipCreate = async (data: {
    relationshipType: string;
    sourceId: string;
    targetId: string;
    properties: Record<string, unknown>;
  }) => {
    try {
      // Preserve current positions to avoid unintended layout shifts on reload
      const beforePositions = graphApiRef.current?.getNodePositions() || {};
      // Create the edge/relationship
      await window.piBridge.createEdge({
        src_id: data.sourceId,
        dst_id: data.targetId,
        type: data.relationshipType,
        properties: data.properties
      });

      // Refresh the graph to show the new relationship
      const updatedGraph = await window.piBridge.loadGraph();
      // Reuse previous positions for nodes that lack persisted coordinates
      const nodesWithPos = updatedGraph.nodes.map(n => {
        const hasPos = n.pos_x != null && n.pos_y != null;
        if (hasPos) return n;
        const p = beforePositions[n.id];
        return p ? { ...n, pos_x: p.x, pos_y: p.y } : n;
      });
      setGraph({ nodes: nodesWithPos, edges: updatedGraph.edges });

      // Persist any restored positions to the database so they remain stable
      const toPersist = nodesWithPos.filter(n => {
        const before = beforePositions[n.id];
        return before && (n.pos_x == null || n.pos_y == null);
      });
      void Promise.allSettled(
        toPersist.map(n =>
          window.piBridge.updateEntityPosition(n.id, { x: Number(beforePositions[n.id].x), y: Number(beforePositions[n.id].y) })
        )
      );

      // Reset relationship tool state
      setRelationshipTool({
        isActive: false,
        selectedType: null,
        sourceNode: null,
        targetNode: null
      });
    } catch (error) {
      console.error('Error creating relationship:', error);
    }
  };

  const handleUpdateEdgeProperty = async (edgeId: string, key: string, value: unknown) => {
    const edge = graph.edges.find(e => e.id === edgeId);
    if (!edge) return;
    const nextProps = { ...(edge.properties || {}), [key]: value } as Record<string, unknown>;
    try {
      await window.piBridge.updateEdge(edgeId, { properties: nextProps });
      const updatedGraph = await window.piBridge.loadGraph();
      setGraph({ nodes: updatedGraph.nodes, edges: updatedGraph.edges });
    } catch (error) {
      console.error('Failed to update edge property', error);
    }
  };

  const handleDeleteNode = () => {
    if (!selectedNodeId) return;
    
    const node = graph.nodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    setDeletionModal({
      isOpen: true,
      node: {
        id: node.id,
        label: node.label || 'Untitled Entity',
        type: node.type
      }
    });
  };

  const handleConfirmDelete = async () => {
    if (!deletionModal.node) return;

    try {
      // Delete the node (this should also cascade delete related data)
      await window.piBridge.deleteEntity(deletionModal.node.id);

      // Refresh the graph to remove the deleted node
      const updatedGraph = await window.piBridge.loadGraph();
      setGraph({ nodes: updatedGraph.nodes, edges: updatedGraph.edges });

      // Clear selection and close modal
      setSelectedNodeId(null);
      setDeletionModal({ isOpen: false, node: null });
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  const handleDeleteEdge = () => {
    if (!selectedEdgeId) return;
    
    const edge = graph.edges.find(e => e.id === selectedEdgeId);
    if (!edge) return;

    const sourceNode = graph.nodes.find(n => n.id === edge.src_id);
    const targetNode = graph.nodes.find(n => n.id === edge.dst_id);

    setEdgeDeletionModal({
      isOpen: true,
      relationship: {
        id: edge.id,
        type: edge.type,
        sourceLabel: sourceNode?.label || 'Unknown',
        targetLabel: targetNode?.label || 'Unknown'
      }
    });
  };

  const handleConfirmEdgeDelete = async () => {
    if (!edgeDeletionModal.relationship) return;

    try {
      // Delete the edge
      await window.piBridge.deleteEdge(edgeDeletionModal.relationship.id);

      // Refresh the graph to remove the deleted edge
      const updatedGraph = await window.piBridge.loadGraph();
      setGraph({ nodes: updatedGraph.nodes, edges: updatedGraph.edges });

      // Clear selection and close modal
      setSelectedEdgeId(null);
      setEdgeDeletionModal({ isOpen: false, relationship: null });
    } catch (error) {
      console.error('Error deleting edge:', error);
    }
  };

  // Real-time property update function
  const handlePropertyUpdate = async (nodeId: string, propertyKey: string, value: unknown) => {
    try {
      const node = graph.nodes.find(n => n.id === nodeId);
      if (!node) return;

      const currentProperties = node.properties || {};
      const newProperties = { ...currentProperties };
      
      if (value === '' || value === null || value === undefined) {
        delete newProperties[propertyKey];
      } else {
        newProperties[propertyKey] = value;
      }

      // Auto-label: prefer identifier fields for certain types
      let nextLabel: string | undefined;
      const typeLower = (node.type || '').toLowerCase();
      const getStr = (k: string) => (newProperties[k] as string | undefined) || '';
      
      // Map node types to their required/primary identifier properties
      if (typeLower === 'phone' || typeLower.includes('phone')) {
        nextLabel = getStr('number') || getStr('phone_number') || getStr('phone') || getStr('e164') || undefined;
      } else if (typeLower === 'email' || typeLower.includes('email')) {
        nextLabel = getStr('address') || getStr('email_address') || getStr('email') || undefined;
      } else if (typeLower === 'device' || typeLower.includes('device')) {
        nextLabel = getStr('name') || getStr('device_id') || getStr('imei') || getStr('serialNumber') || getStr('serial') || getStr('model') || undefined;
      } else if (typeLower === 'server') {
        nextLabel = getStr('hostname') || getStr('ipAddress') || getStr('ip_address') || undefined;
      } else if (typeLower === 'website' || typeLower.includes('website')) {
        nextLabel = getStr('url') || getStr('domain') || getStr('title') || undefined;
      } else if (typeLower === 'cryptocurrency') {
        nextLabel = getStr('address') || undefined;
      } else if (typeLower === 'organization' || typeLower === 'educational' || typeLower === 'government' || typeLower === 'healthcare') {
        // All organization types use 'name' as the required field
        nextLabel = getStr('name') || getStr('legalName') || getStr('dba') || undefined;
      } else if (
        typeLower.includes('organization') ||
        typeLower.includes('company') ||
        typeLower.includes('institution') ||
        typeLower.includes('educational') ||
        typeLower.includes('agency') ||
        typeLower.includes('government') ||
        typeLower.includes('healthcare') ||
        typeLower.includes('university') ||
        typeLower.includes('school')
      ) {
        // Fallback for any organization-like types
        nextLabel =
          getStr('name') ||
          getStr('organization_name') ||
          getStr('company_name') ||
          getStr('institution_name') ||
          getStr('legal_name') ||
          getStr('legalName') ||
          getStr('abbr') ||
          getStr('alias') ||
          undefined;
      }

      // Update in database (include label if we computed one)
      await window.piBridge.updateEntity(nodeId, nextLabel ? {
        label: nextLabel,
        properties: newProperties
      } : {
        properties: newProperties
      });

      // Update local state immediately for responsive UI
      setGraph(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => 
          n.id === nodeId 
            ? { ...n, properties: newProperties, label: nextLabel ?? n.label }
            : n
        )
      }));
    } catch (error) {
      console.error('Error updating property:', error);
    }
  };

  // Real-time label update function
  const handleLabelUpdate = async (nodeId: string, newLabel: string) => {
    try {
      // Update in database
      await window.piBridge.updateEntity(nodeId, {
        label: newLabel
      });

      // Update local state immediately
      setGraph(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => 
          n.id === nodeId 
            ? { ...n, label: newLabel }
            : n
        )
      }));
    } catch (error) {
      console.error('Error updating label:', error);
    }
  };

  const isBooting = isLocalAILoading || !graphLoaded || !splashReadyToHide;

  const handleProjectClose = useCallback(() => {
    setShowWelcome(true);
    setGraph({ nodes: [], edges: [] });
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
  }, []);

  const titleBarProps = {
    context: isBooting ? 'booting' : showWelcome ? 'welcome' : 'main',
    onProjectNew: handleProjectCreate,
    onProjectOpen: handleProjectLoad,
    onProjectClose: handleProjectClose,
    onProjectSaveAs: async () => {
      try {
        const ok = await window.piBridge.projectSaveAs();
        if (ok) console.debug('[App] Project saved');
      } catch (e) {
        console.error('project:saveAs failed', e);
      }
    },
    onExportReport: () => setExportReportOpen(true),
    onSettingsOpen: () => setSettingsModalOpen(true),
    onProjectInfo: () => setProjectInfoOpen(true),
    onTerminology: () => setTerminologyOpen(true),
    onMediaGallery: () => setMediaLibraryState({ isOpen: true, mode: 'manage', onSelect: null }),
    onViewZoomSelection: () => graphApiRef.current?.zoomToSelection(),
    onViewFit: () => graphApiRef.current?.fitToScreen(),
    onViewCenterSelection: () => graphApiRef.current?.centerSelection()
  };

  if (isBooting) {
    return (
      <div className="relative flex h-full flex-col overflow-hidden">
        <TitleBar {...titleBarProps} />
        <div className="flex-1 overflow-auto pt-8">
          <SplashOverlay showing={true} loadingStage={loadingStage} />
        </div>
      </div>
    );
  }

  if (showWelcome) {
    return (
      <div className="relative flex h-full flex-col overflow-hidden">
        <TitleBar {...titleBarProps} />
        <div className="flex-1 overflow-auto pt-8">
          <SplashOverlay showing={false} />
          <WelcomeScreen onProjectCreate={handleProjectCreate} onProjectLoad={handleProjectLoad} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <TitleBar {...titleBarProps} />
      <div className="flex-1 flex flex-col overflow-hidden pt-8">
        <TopToolbar
        view={view}
        relationshipTool={relationshipTool}
        onRelationshipToolActivate={handleRelationshipToolActivate}
        onRelationshipToolDeactivate={handleRelationshipToolDeactivate}
        onToggleBoxSelect={() => { const next = !boxSelectEnabled; graphApiRef.current?.setBoxSelectEnabled?.(next); setBoxSelectEnabled(next); }}
        boxSelectEnabled={boxSelectEnabled}
        onLayoutGrid={() => graphApiRef.current?.runLayout('grid')}
        onLayoutConcentric={() => graphApiRef.current?.runLayout('concentric')}
        onLayoutCose={() => graphApiRef.current?.runLayout('cose')}
        onAlignLeft={() => graphApiRef.current?.alignSelected('left')}
        onAlignTop={() => graphApiRef.current?.alignSelected('top')}
        onInvertSelection={() => graphApiRef.current?.invertSelection()}
        onZoomSelection={() => graphApiRef.current?.zoomToSelection()}
        onFitScreen={() => graphApiRef.current?.fitToScreen()}
        onCenterSelection={() => graphApiRef.current?.centerSelection()}
        onToggleFilters={(anchor) => { setFilterAnchor(anchor); setFiltersOpen(v => !v); }}
        onSwitchWorkspace={(v) => setView(v)}
      />

      {filtersOpen && (
        <div
          ref={filterRef}
          className="fixed z-40 w-80 rounded-lg border border-slate-800 bg-slate-900/90 p-3 shadow-xl backdrop-blur"
          style={filterAnchor ? { left: Math.min(filterAnchor.left, window.innerWidth - 340), top: filterAnchor.bottom + 8, position: 'fixed' as const } : { right: 16, top: 64, position: 'fixed' as const }}
        >
          <FilterPanel
            nodeTypes={nodeTypes.map(nt => ({ id: nt.id, label: nt.label }))}
            activeTypeIds={activeTypeIds}
            onToggleType={(id) => {
              setActiveTypeIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
              });
            }}
            hasSourcesOnly={hasSourcesOnly}
            onToggleHasSources={(v) => setHasSourcesOnly(v)}
          />
        </div>
      )}
      <SearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        items={graph.nodes.map(n => ({ id: n.id, label: n.label || '' }))}
        onSelect={(id) => {
          setSelectedNodeId(id);
          // zoom to selection after state updates in next tick
          setTimeout(() => graphApiRef.current?.zoomToSelection(), 0);
        }}
      />
      {view === 'timeline' ? (
        <TimelineWorkspace nodes={graph.nodes} edges={graph.edges} />
      ) : null}
      
      <div className="flex flex-1 overflow-hidden min-w-0">
      {view === 'graph' ? (
        <aside className="w-80 min-w-[240px] max-w-[320px] flex-shrink-0 border-r border-slate-800 bg-slate-950/70">
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 pt-4">
              <button
                className={`rounded-t px-3 py-2 text-sm ${sidebarTab === 'nodes' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => setSidebarTab('nodes')}
              >
                Nodes
              </button>
              {localAIEnabled && (
                <button
                  className={`rounded-t px-3 py-2 text-sm ${sidebarTab === 'ai' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  onClick={() => setSidebarTab('ai')}
                >
                  AI
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 pr-3">
              {sidebarTab === 'nodes' && (
                <NodePalette onNodeDragStart={handleNodeDragStart} />
              )}
              {sidebarTab === 'ai' && localAIEnabled && (
                <LocalAIInsights enabled={localAIEnabled} graph={graph} nodeTypes={nodeTypes} />
              )}
            </div>
          </div>
        </aside>
      ) : null}

      <main className="flex flex-1 flex-col min-w-0">
        <div className="flex flex-1 overflow-hidden min-w-0">
            {view === 'graph' ? (
              <>
                <section
                  className="flex-1 min-w-0"
                  onDrop={handleGraphDrop}
                  onDragOver={handleGraphDragOver}
                >
                  <GraphCanvas
                    elements={filteredElements}
                apiRef={graphApiRef}
                onSelectionChange={(nodeIds) => {
                  setSelectedNodeIds(nodeIds);
                }}
                    onSelectNode={(id) => { setSelectedNodeId(id); setSelectedEdgeId(null); }}
                    onUnselectNode={() => setSelectedNodeId(null)}
                    onSelectEdge={(id) => { setSelectedEdgeId(id); setSelectedNodeId(null); }}
                    onUnselectEdge={() => setSelectedEdgeId(null)}
                    onTapNode={() => { /* disabled: drag-only relationship creation */ }}
                    isRelationshipMode={relationshipTool.isActive}
                    onNodeDragFree={(id, x, y) => {
                      void window.piBridge.updateEntityPosition(id, { x, y });
                      setGraph(prev => ({
                        ...prev,
                        nodes: prev.nodes.map(n => (n.id === id ? { ...n, pos_x: x, pos_y: y } : n))
                      }));
                    }}
                    onRequestCreateEdge={(sourceId, targetId) => {
                      const sourceNode = graph.nodes.find(n => n.id === sourceId);
                      const targetNode = graph.nodes.find(n => n.id === targetId);
                      if (!sourceNode || !targetNode || sourceId === targetId) return;
                      setRelationshipTool(prev => ({
                        ...prev,
                        sourceNode: { id: sourceId, label: sourceNode.label || 'Untitled Entity' },
                        targetNode: { id: targetId, label: targetNode.label || 'Untitled Entity' }
                      }));
                      setRelationshipModal({ isOpen: true });
                    }}
                  />
                </section>
                <InspectorPanel
                  nodeTypes={nodeTypes}
                  graphNodes={graph.nodes}
                  graphEdges={graph.edges}
                  selectedNodeId={selectedNodeId}
                selectedNodeIds={selectedNodeIds}
                  selectedEdgeId={selectedEdgeId}
                  assertions={assertions}
                  sources={sources}
                  onAddAssertion={() => setAssertionModalOpen(true)}
                  onAddSource={() => setSourceModalOpen(true)}
                  onDeleteNode={handleDeleteNode}
                onDeleteNodes={async (ids) => {
                  for (const id of ids) {
                    await window.piBridge.deleteEntity(id);
                  }
                  const updatedGraph = await window.piBridge.loadGraph();
                  setGraph({ nodes: updatedGraph.nodes, edges: updatedGraph.edges });
                }}
                  onDeleteEdge={handleDeleteEdge}
                  onUpdateLabel={handleLabelUpdate}
                  onUpdateProperty={handlePropertyUpdate}
                onUpdateEdgeProperty={handleUpdateEdgeProperty}
                onAlignLeft={() => graphApiRef.current?.alignSelected('left')}
                onAlignTop={() => graphApiRef.current?.alignSelected('top')}
                />
              </>
            ) : (
              <div className="flex-1">
                <TimelineWorkspace nodes={graph.nodes} edges={graph.edges} />
              </div>
            )}
          </div>
        </main>
      </div>
      </div>
      {consentData && (
        <ConsentModal
          consent={consentData}
          onCancel={() => setConsentData(null)}
          onConfirm={async () => {
            if (!consentData) return;
            const snapshot = {
              destination: consentData.destination,
              payload: consentData.payload
            };
            await window.piBridge.createTransformRun({
              transform_id: consentData.transformId,
              input_json: JSON.stringify(consentData.payload),
              output_summary: null,
              consent_snapshot_json: JSON.stringify(snapshot),
              finished_at: null
            });
            setConsentData(null);
          }}
        />
      )}
      
      <NodeCreationModal
        isOpen={nodeCreationModal.isOpen}
        nodeType={nodeCreationModal.nodeType}
        position={nodeCreationModal.position}
        onClose={() => setNodeCreationModal({ isOpen: false, nodeType: null, position: null })}
        onCreate={handleNodeCreate}
      />
      
      <RelationshipCreationModal
        isOpen={relationshipModal.isOpen}
        relationshipType={relationshipTool.selectedType}
        sourceNode={relationshipTool.sourceNode}
        targetNode={relationshipTool.targetNode}
        defaultConfidence={defaultRelationshipConfidence}
        onClose={() => setRelationshipModal({ isOpen: false })}
        onCreate={handleRelationshipCreate}
      />
      
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        localAIEnabled={localAIEnabled}
        onLocalAIToggle={handleLocalAIToggle}
        showNodeLabels={showNodeLabels}
        onShowNodeLabelsChange={handleShowNodeLabelsChange}
        autoLayoutOnCreate={autoLayoutOnCreate}
        onAutoLayoutOnCreateChange={handleAutoLayoutOnCreateChange}
        defaultRelationshipConfidence={defaultRelationshipConfidence}
        onDefaultRelationshipConfidenceChange={handleDefaultRelationshipConfidenceChange}
      />
      
      <NodeDeletionModal
        isOpen={deletionModal.isOpen}
        node={deletionModal.node}
        onClose={() => setDeletionModal({ isOpen: false, node: null })}
        onConfirm={handleConfirmDelete}
      />
      
      <RelationshipDeletionModal
        isOpen={edgeDeletionModal.isOpen}
        relationship={edgeDeletionModal.relationship}
        onClose={() => setEdgeDeletionModal({ isOpen: false, relationship: null })}
        onConfirm={handleConfirmEdgeDelete}
      />

      <AssertionCreationModal
        isOpen={assertionModalOpen}
        entity={selectedNode}
        onClose={() => setAssertionModalOpen(false)}
        onAssertionCreated={() => {
          if (selectedNodeId) {
            void refreshEntityDetails(selectedNodeId);
          }
        }}
        onOpenMediaLibrary={openMediaLibraryForSelection}
      />

      <SourceCreationModal
        isOpen={sourceModalOpen}
        entity={selectedNode}
        onClose={() => setSourceModalOpen(false)}
        onSourceCreated={() => {
          if (selectedNodeId) {
            void refreshEntityDetails(selectedNodeId);
          }
        }}
        onOpenMediaLibrary={openMediaLibraryForSelection}
      />

      <MediaLibraryModal
        isOpen={mediaLibraryState.isOpen}
        mode={mediaLibraryState.mode}
        onClose={closeMediaLibrary}
        onSelect={mediaLibraryState.onSelect ?? undefined}
      />

      <TerminologyModal isOpen={terminologyOpen} onClose={() => setTerminologyOpen(false)} />
      <ProjectSettingsModal isOpen={projectInfoOpen} onClose={() => setProjectInfoOpen(false)} />
      <ExportReportModal isOpen={exportReportOpen} onClose={() => setExportReportOpen(false)} />
    </div>
  );
}

async function refreshGraph() {
  const result = await window.piBridge.loadGraph();
  return { nodes: result.nodes, edges: result.edges };
}

async function fetchAssertions(entityId: string): Promise<AssertionView[]> {
  const results = await window.piBridge.listAssertionsByEntity(entityId);
  return results; // Assertions now come with parsed values from the backend
}

async function fetchSources(entityId: string): Promise<SourceRecord[]> {
  return window.piBridge.listSourcesByEntity(entityId);
}

function safeParseJson(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch (error) {
    console.warn('Failed to parse JSON value', error);
    return {};
  }
}
