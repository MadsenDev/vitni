import { useEffect, useMemo, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import fcose from 'cytoscape-fcose';
import type { ElementDefinition } from 'cytoscape';
import { getGraphLayoutPreset, type GraphEdgeStyleMode, type GraphLayoutPresetId } from '@renderer/features/graph/layoutPresets';
import { buildCanvasImageStyle, type PersonalizationTheme } from '@renderer/features/personalization/theme';
import type { GraphCanvasApi } from '@renderer/types/graphCanvasApi';

cytoscape.use(dagre);
cytoscape.use(fcose);

interface GraphCanvasProps {
  elements: ElementDefinition[];
  overlayInsets?: { left: number; right: number; top?: number; bottom?: number };
  personalizationTheme: PersonalizationTheme;
  onSelectNode: (id: string) => void;
  onUnselectNode: () => void;
  onSelectEdge: (id: string) => void;
  onUnselectEdge: () => void;
  onTapNode: (id: string) => void;
  onOpenNodeContextMenu?: (payload: { nodeId: string; x: number; y: number }) => void;
  // Relationship drag mode
  isRelationshipMode?: boolean;
  onRequestCreateEdge?: (sourceId: string, targetId: string) => void;
  onNodeDragFree?: (id: string, x: number, y: number) => void;
  onSelectionChange?: (nodeIds: string[], edgeIds: string[]) => void;
  boxSelectEnabled?: boolean;
  showNodeImages?: boolean;
  lastLayoutPreset?: GraphLayoutPresetId | null;
  apiRef?: React.MutableRefObject<GraphCanvasApi | null>;
}

const PREVIEW_NODE_ID = '__pi_preview_node__';
const PREVIEW_EDGE_ID = '__pi_preview_edge__';

type SelectionMode = 'additive' | 'single';

type ExtendedCyCore = cytoscape.Core & {
  selectionType?: (mode: SelectionMode) => void;
};

interface GraphElementData {
  id?: string;
  source?: string;
  target?: string;
  label?: string;
  hasImage?: string;
  imageUrl?: string;
}

function getElementData(element: ElementDefinition): GraphElementData {
  if (!element.data || typeof element.data !== 'object' || Array.isArray(element.data)) {
    return {};
  }
  return element.data as GraphElementData;
}

function getHighestDegreeNodeId(nodes: cytoscape.NodeCollection): string | undefined {
  let winnerId: string | undefined;
  let winnerDegree = -1;
  nodes.forEach((node) => {
    const degree = node.degree(false);
    if (degree > winnerDegree) {
      winnerDegree = degree;
      winnerId = node.id();
    }
  });
  return winnerId;
}

function runLayoutPreset(
  cy: cytoscape.Core,
  preset: GraphLayoutPresetId,
  insets?: { left: number; right: number; top?: number; bottom?: number }
) {
  const presetDefinition = getGraphLayoutPreset(preset);
  const resolvedInsets = normalizeInsets(insets);
  const selectedNodes = cy.nodes(':selected').filter((node) => node.id() !== PREVIEW_NODE_ID);
  const visibleNodes = cy.nodes(':visible').filter((node) => node.id() !== PREVIEW_NODE_ID);
  const visibleEdges = cy.edges(':visible').filter((edge) => edge.id() !== PREVIEW_EDGE_ID);
  const useSelectionScope = selectedNodes.length >= 2;
  const scopedNodes = useSelectionScope ? selectedNodes : visibleNodes;
  const selectedNodeIds = new Set(selectedNodes.toArray().map((node) => node.id()));
  const scopedNodeIds = new Set(scopedNodes.toArray().map((node) => node.id()));
  const scopedEdges = useSelectionScope
    ? visibleEdges.filter((edge) => {
        const graphEdge = edge as cytoscape.EdgeSingular;
        return scopedNodeIds.has(graphEdge.source().id()) && scopedNodeIds.has(graphEdge.target().id());
      })
    : visibleEdges;
  const scopedElements = scopedNodes.union(scopedEdges);

  if (scopedNodes.length === 0) {
    return null;
  }

  const selectedRoot = selectedNodes.nonempty() ? selectedNodes.first().id() : undefined;
  const fallbackRoot = getHighestDegreeNodeId(scopedNodes);
  const rootNodeId = useSelectionScope ? selectedRoot ?? fallbackRoot : fallbackRoot;
  const nonScopedNodes = useSelectionScope
    ? visibleNodes.filter((node) => !scopedNodeIds.has(node.id()))
    : cy.collection();

  nonScopedNodes.lock();

  let layoutOptions: Record<string, unknown>;
  switch (preset) {
    case 'chain_view':
      layoutOptions = {
        name: 'dagre',
        rankDir: 'TB',
        rankSep: 180,
        nodeSep: 80,
        edgeSep: 40,
        acyclicer: 'greedy',
        ranker: 'network-simplex',
        fit: true,
        padding: 110 + Math.max(resolvedInsets.left, resolvedInsets.right) * 0.15,
        animate: true,
        animationDuration: 650,
        animationEasing: 'ease-out',
        spacingFactor: 1.2,
        nodeDimensionsIncludeLabels: true,
        roots: rootNodeId ? `#${rootNodeId}` : undefined
      };
      break;
    case 'focus_rings':
      layoutOptions = {
        name: 'concentric',
        fit: true,
        padding: 90,
        spacingFactor: 1.55,
        avoidOverlap: true,
        avoidOverlapPadding: 26,
        nodeDimensionsIncludeLabels: true,
        concentric: (node: cytoscape.NodeSingular) => {
          const isSelected = selectedNodeIds.has(node.id());
          return (isSelected ? 1000 : 0) + node.degree(false);
        },
        levelWidth: () => 1.5,
        animate: true,
        animationDuration: 600,
        animationEasing: 'ease-out'
      };
      break;
    case 'tidy_grid':
      layoutOptions = {
        name: 'grid',
        fit: true,
        padding: 60,
        spacingFactor: 1.2,
        avoidOverlap: true,
        avoidOverlapPadding: 26,
        nodeDimensionsIncludeLabels: true,
        condense: false
      };
      break;
    case 'investigation_map':
    default: {
      const complexity = scopedEdges.length / Math.max(scopedNodes.length, 1);
      const isSmallReadableGraph = scopedNodes.length <= 12 && scopedEdges.length <= scopedNodes.length + 2;

      if (isSmallReadableGraph) {
        layoutOptions = {
          name: 'dagre',
          rankDir: 'TB',
          rankSep: 170,
          nodeSep: 90,
          edgeSep: 50,
          ranker: 'network-simplex',
          fit: true,
          padding: 120 + Math.max(resolvedInsets.left, resolvedInsets.right) * 0.15,
          nodeDimensionsIncludeLabels: true,
          animate: true,
          animationDuration: 650,
          animationEasing: 'ease-out',
          roots: rootNodeId ? `#${rootNodeId}` : undefined
        };
      } else {
        layoutOptions = {
          name: 'fcose',
          fit: true,
          padding: (useSelectionScope ? 90 : 130) + Math.max(resolvedInsets.left, resolvedInsets.right) * 0.15,
          nodeDimensionsIncludeLabels: true,
          quality: 'default',
          randomize: false,
          animate: true,
          animationDuration: 750,
          animationEasing: 'ease-out',
          packComponents: false,
          nodeRepulsion: complexity > 2 ? 280000 : 240000,
          idealEdgeLength: complexity > 2 ? 260 : complexity > 1 ? 230 : 200,
          edgeElasticity: 0.08,
          gravity: 0.12,
          gravityRangeCompound: 1.4,
          nestingFactor: 0.9,
          tile: false,
          uniformNodeDimensions: false
        };
      }
      break;
    }
  }

  const layout = cy.layout({
    ...layoutOptions,
    eles: scopedElements
  } as unknown as cytoscape.LayoutOptions);

  const cleanup = () => {
    applyViewportOffset(cy, resolvedInsets);
    nonScopedNodes.unlock();
    layout.off('layoutstop', cleanup);
  };

  layout.on('layoutstop', cleanup);
  layout.run();

  return {
    scope: useSelectionScope ? 'selection' : 'graph',
    preset: presetDefinition.id
  } as const;
}

function getSuppressedGenericEdgeLabels(elements: ElementDefinition[]) {
  const specificEdgePairs = new Set<string>();
  const hiddenEdgeIds = new Set<string>();

  for (const element of elements) {
    if (element.group !== 'edges' || !element.data) continue;
    const source = typeof element.data.source === 'string' ? element.data.source : null;
    const target = typeof element.data.target === 'string' ? element.data.target : null;
    const label = typeof element.data.label === 'string' ? element.data.label.trim().toLowerCase() : '';
    if (!source || !target || !label) continue;
    if (label !== 'linked to') {
      specificEdgePairs.add([source, target].sort().join('::'));
    }
  }

  for (const element of elements) {
    if (element.group !== 'edges' || !element.data) continue;
    const id = typeof element.data.id === 'string' ? element.data.id : null;
    const source = typeof element.data.source === 'string' ? element.data.source : null;
    const target = typeof element.data.target === 'string' ? element.data.target : null;
    const label = typeof element.data.label === 'string' ? element.data.label.trim().toLowerCase() : '';
    if (!id || !source || !target) continue;
    if (label === 'linked to' && specificEdgePairs.has([source, target].sort().join('::'))) {
      hiddenEdgeIds.add(id);
    }
  }

  return hiddenEdgeIds;
}

function normalizeInsets(insets?: { left: number; right: number; top?: number; bottom?: number }) {
  return {
    left: insets?.left ?? 0,
    right: insets?.right ?? 0,
    top: insets?.top ?? 0,
    bottom: insets?.bottom ?? 0
  };
}

function applyViewportOffset(cy: cytoscape.Core, insets?: { left: number; right: number; top?: number; bottom?: number }) {
  const resolved = normalizeInsets(insets);
  const dx = (resolved.left - resolved.right) / 2;
  const dy = (resolved.top - resolved.bottom) / 2;
  if (dx !== 0 || dy !== 0) {
    cy.panBy({ x: dx, y: dy });
  }
}

export function GraphCanvas({
  elements,
  overlayInsets,
  personalizationTheme,
  onSelectNode,
  onUnselectNode,
  onSelectEdge,
  onUnselectEdge,
  onTapNode,
  onOpenNodeContextMenu,
  isRelationshipMode = false,
  onRequestCreateEdge,
  onNodeDragFree,
  onSelectionChange,
  boxSelectEnabled = false,
  showNodeImages = false,
  lastLayoutPreset,
  apiRef
}: GraphCanvasProps) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const viewportInsetsRef = useRef(normalizeInsets(overlayInsets));
  const relationSourceRef = useRef<string | null>(null);
  const completedRef = useRef<boolean>(false);
  const boxSelectRef = useRef<boolean>(false);
  const prevUserPanningRef = useRef<boolean | null>(null);
  const prevPanningRef = useRef<boolean | null>(null);
  const prevZoomingRef = useRef<boolean | null>(null);

  const canvasStyle = useMemo(() => {
    const imageStyle = buildCanvasImageStyle(personalizationTheme);
    if (imageStyle) return { background: personalizationTheme.colors.appBgSoft };

    if (personalizationTheme.canvasBackground.mode === 'none') {
      return { background: personalizationTheme.colors.appBgSoft };
    }

    if (personalizationTheme.canvasBackground.mode === 'gradient') {
      return { background: 'var(--canvas-gradient-background)' };
    }

    return { background: 'var(--canvas-grid-background)', backgroundSize: '36px 36px' };
  }, [personalizationTheme]);

  useEffect(() => {
    viewportInsetsRef.current = normalizeInsets(overlayInsets);
  }, [overlayInsets]);

  const applyBoxSelectState = (cy: cytoscape.Core, enabled: boolean) => {
    boxSelectRef.current = enabled;
    cy.boxSelectionEnabled(enabled);
    cy.autounselectify(false);
    try {
      (cy as ExtendedCyCore).selectionType?.(enabled ? 'additive' : 'single');
    } catch {
      // Older Cytoscape builds may not expose selectionType.
    }

    // Manage panning/zoom so box selection takes precedence when enabled
    if (enabled) {
      if (prevUserPanningRef.current === null) prevUserPanningRef.current = Boolean(cy.userPanningEnabled());
      if (prevPanningRef.current === null) prevPanningRef.current = Boolean(cy.panningEnabled());
      if (prevZoomingRef.current === null) prevZoomingRef.current = Boolean(cy.zoomingEnabled());
      try {
        cy.userPanningEnabled(false);
      } catch {
        // Ignore unsupported panning toggles.
      }
      try {
        cy.panningEnabled(false);
      } catch {
        // Ignore unsupported panning toggles.
      }
      try {
        cy.zoomingEnabled(false);
      } catch {
        // Ignore unsupported zoom toggles.
      }
    } else {
      try {
        cy.userPanningEnabled(prevUserPanningRef.current ?? true);
      } catch {
        // Ignore unsupported panning toggles.
      }
      try {
        cy.panningEnabled(prevPanningRef.current ?? true);
      } catch {
        // Ignore unsupported panning toggles.
      }
      try {
        cy.zoomingEnabled(prevZoomingRef.current ?? true);
      } catch {
        // Ignore unsupported zoom toggles.
      }
      prevUserPanningRef.current = null;
      prevPanningRef.current = null;
      prevZoomingRef.current = null;
    }

    const container = cy.container();
    if (container) {
      if (enabled) container.classList.add('pi-box-select');
      else container.classList.remove('pi-box-select');
    }
  };

  const cleanupPreview = (cy: cytoscape.Core) => {
    const toRemove = cy.elements(`#${PREVIEW_EDGE_ID}, #${PREVIEW_NODE_ID}`);
    if (toRemove.nonempty()) toRemove.remove();
  };

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const handleDragFree = (evt: cytoscape.EventObject) => {
      if (!onNodeDragFree) return;
      const id = evt.target.id();
      const pos = evt.target.position();
      onNodeDragFree(id, pos.x, pos.y);
    };

    cy.on('dragfree', 'node', handleDragFree);
    return () => {
      cy.off('dragfree', 'node', handleDragFree);
    };
  }, [onNodeDragFree]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const emitSelection = () => {
      if (!onSelectionChange) return;
      const nodeIds = cy.nodes(':selected').toArray().map((node) => node.id());
      const edgeIds = cy.edges(':selected').toArray().map((edge) => edge.id());
      onSelectionChange(nodeIds, edgeIds);
    };

    const handleMouseDown = (evt: cytoscape.EventObject) => {
      const id = evt.target.id();
      relationSourceRef.current = id;
      completedRef.current = false;
      cy.autoungrabify(true);
      cleanupPreview(cy);
      const pos = evt.position;
      cy.add({ group: 'nodes', data: { id: PREVIEW_NODE_ID }, position: pos }).addClass('preview');
      cy.add({ group: 'edges', data: { id: PREVIEW_EDGE_ID, source: id, target: PREVIEW_NODE_ID } }).addClass('preview');
    };

    const handleMouseMove = (evt: cytoscape.EventObject) => {
      if (!relationSourceRef.current) return;
      const pos = evt.position;
      const n = cy.$(`#${PREVIEW_NODE_ID}`);
      if (n.nonempty()) n.position(pos);
    };

    const finishCreate = (targetId: string) => {
      const sourceId = relationSourceRef.current;
      relationSourceRef.current = null;
      cy.autoungrabify(false);
      cleanupPreview(cy);
      if (!sourceId) return;
      if (targetId && targetId !== sourceId && onRequestCreateEdge) {
        onRequestCreateEdge(sourceId, targetId);
      }
    };

    const cancelCreate = () => {
      relationSourceRef.current = null;
      cy.autoungrabify(false);
      cleanupPreview(cy);
    };

    const handleMouseUpOnNode = (evt: cytoscape.EventObject) => {
      if (!relationSourceRef.current) return;
      completedRef.current = true;
      evt.stopPropagation();
      finishCreate(evt.target.id());
    };

    const handleMouseUpCore = () => {
      if (!relationSourceRef.current) return;
      if (completedRef.current) {
        completedRef.current = false;
        return;
      }
      cancelCreate();
    };

    const handleContextTapOnNode = (evt: cytoscape.EventObject) => {
      const originalEvent = evt.originalEvent as MouseEvent | undefined;
      if (!originalEvent || !onOpenNodeContextMenu) return;
      originalEvent.preventDefault();
      onOpenNodeContextMenu({
        nodeId: evt.target.id(),
        x: originalEvent.clientX,
        y: originalEvent.clientY
      });
    };

    if (isRelationshipMode) {
      cy.on('mousedown', 'node', handleMouseDown);
      cy.on('mousemove', handleMouseMove);
      cy.on('mouseup', 'node', handleMouseUpOnNode);
      cy.on('mouseup', handleMouseUpCore);
    }

    cy.on('cxttap', 'node', handleContextTapOnNode);
    cy.on('select unselect', 'node', emitSelection);
    cy.on('select unselect', 'edge', emitSelection);

    return () => {
      if (isRelationshipMode) {
        cy.off('mousedown', 'node', handleMouseDown);
        cy.off('mousemove', handleMouseMove);
        cy.off('mouseup', 'node', handleMouseUpOnNode);
        cy.off('mouseup', handleMouseUpCore);
        cy.autoungrabify(false);
        cleanupPreview(cy);
        relationSourceRef.current = null;
        completedRef.current = false;
      }
      cy.off('cxttap', 'node', handleContextTapOnNode);
      cy.off('select unselect', 'node', emitSelection);
      cy.off('select unselect', 'edge', emitSelection);
      // Ensure box select is disabled on cleanup to avoid stuck state
      applyBoxSelectState(cy, false);
      try {
        cy.userPanningEnabled(true);
      } catch {
        // Ignore unsupported panning toggles during cleanup.
      }
      try {
        cy.panningEnabled(true);
      } catch {
        // Ignore unsupported panning toggles during cleanup.
      }
      try {
        cy.zoomingEnabled(true);
      } catch {
        // Ignore unsupported zoom toggles during cleanup.
      }
    };
  }, [isRelationshipMode, onOpenNodeContextMenu, onRequestCreateEdge, onSelectionChange]);

  // Ensure box select state reapplies if cy remounts
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    applyBoxSelectState(cy, boxSelectEnabled);
  }, [boxSelectEnabled]);

  // Expose imperative API
  useEffect(() => {
    if (!apiRef) return;
    const cy = cyRef.current;
    apiRef.current = cy
      ? {
          runLayout: (preset) => runLayoutPreset(cy, preset, viewportInsetsRef.current),
          setViewportInsets: (insets: { left: number; right: number; top?: number; bottom?: number }) => {
            viewportInsetsRef.current = normalizeInsets(insets);
          },
          toggleBoxSelect: () => {
            applyBoxSelectState(cy, !boxSelectRef.current);
          },
          setBoxSelectEnabled: (enabled: boolean) => {
            applyBoxSelectState(cy, enabled);
          },
          alignSelected: (kind) => {
            const sel = cy.nodes(':selected');
            if (sel.nonempty()) {
              if (kind === 'left') {
                const xs = sel.toArray().map((node) => node.position('x'));
                const minX = Math.min(...xs);
                sel.positions((node) => ({ x: minX, y: node.position('y') }));
              } else if (kind === 'top') {
                const ys = sel.toArray().map((node) => node.position('y'));
                const minY = Math.min(...ys);
                sel.positions((node) => ({ x: node.position('x'), y: minY }));
              }
            }
          },
          invertSelection: () => {
            const nodes = cy.nodes();
            const toSelect = nodes.filter(n => !n.selected());
            nodes.unselect();
            toSelect.select();
          },
          zoomToSelection: () => {
            const sel = cy.elements(':selected');
            if (sel.nonempty()) {
              cy.animate(
                {
                  fit: {
                    eles: sel,
                    padding: 60 + Math.max(viewportInsetsRef.current.left, viewportInsetsRef.current.right) * 0.15
                  }
                },
                {
                  duration: 250,
                  easing: 'ease',
                  complete: () => applyViewportOffset(cy, viewportInsetsRef.current)
                }
              );
            }
          },
          fitToScreen: () => {
            cy.animate(
              {
                fit: {
                  eles: cy.elements(),
                  padding: 60 + Math.max(viewportInsetsRef.current.left, viewportInsetsRef.current.right) * 0.15
                }
              },
              {
                duration: 250,
                easing: 'ease',
                complete: () => applyViewportOffset(cy, viewportInsetsRef.current)
              }
            );
          },
          centerSelection: () => {
            const sel = cy.elements(':selected');
            if (sel.nonempty()) {
              cy.center(sel);
              applyViewportOffset(cy, viewportInsetsRef.current);
            }
          },
          containerToGraph: (clientX: number, clientY: number) => {
            const container = cy.container();
            if (!container) return null;
            const rect = container.getBoundingClientRect();
            const zoom = cy.zoom();
            const pan = cy.pan();
            const x = (clientX - rect.left - pan.x) / zoom;
            const y = (clientY - rect.top - pan.y) / zoom;
            return { x, y };
          },
          getNodePositions: () => {
            const map: Record<string, { x: number; y: number }> = {};
            cy.nodes().forEach(n => {
              const p = n.position();
              map[n.id()] = { x: p.x, y: p.y };
            });
            return map;
          },
          getSelectedNodeIds: () => cy.nodes(':selected').toArray().map((node) => node.id()),
          getSelectedEdgeIds: () => cy.edges(':selected').toArray().map((edge) => edge.id()),
          clearSelection: () => {
            cy.elements(':selected').unselect();
          },
          selectElements: (nodeIds, edgeIds) => {
            cy.batch(() => {
              cy.elements(':selected').unselect();
              nodeIds.forEach((id) => cy.$id(id).select());
              edgeIds.forEach((id) => cy.$id(id).select());
            });
          },
          getViewport: () => ({
            zoom: cy.zoom(),
            pan: cy.pan()
          }),
          setViewport: (viewport) => {
            cy.zoom(viewport.zoom);
            cy.pan(viewport.pan);
          }
        }
      : null;
    return () => {
      if (apiRef) apiRef.current = null;
    };
  }, [apiRef]);

  // Apply image styles programmatically after graph initialization to avoid Cytoscape parser errors
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const imageStyleKeys = [
      'background-image',
      'background-fit',
      'background-width',
      'background-height',
      'background-position-x',
      'background-position-y',
      'background-clip',
      'background-opacity',
      'background-color',
      'width',
      'height',
      'padding-top',
      'padding-bottom',
      'padding-left',
      'padding-right',
      'text-valign',
      'text-halign',
      'text-outline-width',
      'text-outline-color',
      'color',
      'text-wrap',
      'text-max-width'
    ].join(' ');

    // Small delay to ensure graph is fully initialized
    const timeoutId = setTimeout(() => {
      // Find nodes with images and apply styles directly
      const imageNodes = elements.filter((element) => {
        const data = getElementData(element);
        const hasImage = data.hasImage === 'true';
        const imageUrl = data.imageUrl;
        return showNodeImages && hasImage && imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0 && imageUrl.startsWith('blob:');
      });

      imageNodes.forEach((element) => {
        const data = getElementData(element);
        const nodeId = data.id;
        const imageUrl = data.imageUrl;

        if (!nodeId || !imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('blob:')) {
          return;
        }

        try {
          const node = cy.$(`#${nodeId}`);
          if (node.length === 0) return;

          // Apply image styles for a taller node with image at top and label below
          const imageHeight = 110; // Height of the image area at top (good aspect ratio for portraits)
          const labelPadding = 10; // Padding between image and label
          const estimatedLabelHeight = 40; // Estimated height needed for wrapped label text
          const totalHeight = imageHeight + labelPadding + estimatedLabelHeight; // Total node height (~160px)

          // Apply all image styles with error handling
          try {
            // Set image dimensions and positioning first
            node.style('background-image', imageUrl);
            node.style('background-fit', 'cover');
            node.style('background-width', '100%');
            node.style('background-height', imageHeight);
            node.style('background-position-x', 'center');
            node.style('background-position-y', 'top');
            node.style('background-clip', 'none');

            // Dim the image by reducing its opacity and adding a dark overlay
            // This ensures text is always readable even if it overlaps the image
            node.style('background-opacity', 0.6); // Reduce image brightness to 60%
            node.style('background-color', 'rgba(15, 23, 42, 0.5)'); // Semi-transparent dark overlay (matches app theme)

            // Ensure good minimum width for image display (maintain aspect ratio)
            const currentWidth = parseFloat(node.style('width') as string) || 0;
            const minWidth = Math.max(160, currentWidth); // At least 160px wide, or keep current if wider
            node.style('width', minWidth);

            // Make node taller to accommodate image + label
            node.style('height', totalHeight);

            // Position label below the image with proper spacing
            node.style('padding-top', imageHeight + labelPadding);
            node.style('padding-bottom', 12);
            node.style('padding-left', 10);
            node.style('padding-right', 10);
            node.style('text-valign', 'bottom');
            node.style('text-halign', 'center');

            // Enhance text readability with outline
            node.style('text-outline-width', 1);
            node.style('text-outline-color', 'rgba(0, 0, 0, 0.8)');
            node.style('color', '#ffffff'); // Brighter text color for contrast

            // Ensure text wraps nicely and doesn't overflow
            node.style('text-wrap', 'wrap');
            node.style('text-max-width', `${minWidth - 20}px`);
          } catch {
            // Ignore image styling failures and keep the graph usable.
          }
        } catch {
          // Ignore optional image-preview failures.
        }
      });

      // Reset image styles for nodes that should no longer have them
      cy.nodes().forEach((node) => {
        const nodeData = node.data() as GraphElementData;
        const shouldHaveImage =
          showNodeImages &&
          nodeData.hasImage === 'true' &&
          nodeData.imageUrl &&
          typeof nodeData.imageUrl === 'string' &&
          nodeData.imageUrl.length > 0 &&
          nodeData.imageUrl.startsWith('blob:');
        if (!shouldHaveImage) {
          try {
            node.removeStyle(imageStyleKeys);
          } catch {
            // Ignore style reset failures for optional image presentation.
          }
        }
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [showNodeImages, elements]);

  // Build stylesheet - no image styles here to avoid parser errors
  const stylesheet = useMemo(() => {
    const { colors, appearanceMode } = personalizationTheme;
    const edgeStyleMode: GraphEdgeStyleMode = lastLayoutPreset ? getGraphLayoutPreset(lastLayoutPreset).edgeStyleMode : 'smart';
    const hiddenEdgeLabelIds = getSuppressedGenericEdgeLabels(elements);
    const denseGraph = elements.filter((element) => element.group === 'edges').length > Math.max(10, elements.filter((element) => element.group === 'nodes').length * 1.2);
    const baseStyles: cytoscape.StylesheetStyle[] = [
      {
        selector: 'node',
        style: {
          'background-color': colors.appBgSoft,
          'border-width': 1.5,
          'border-color': colors.borderStrong,
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': colors.textPrimary,
          'font-size': '11px',
          'font-weight': 'bold',
          'text-outline-width': 0,
          'text-wrap': 'wrap',
          'text-max-width': '120px',
          'text-background-color': colors.appBg,
          'text-background-opacity': 0.0,
          'width': 'label',
          'height': 'label',
          'padding': '10px',
          'shape': 'round-rectangle'
        } as unknown as cytoscape.Css.Node
      }
    ];

    // Note: Image styles are NOT included in the stylesheet because Cytoscape's parser
    // evaluates data() expressions for all nodes during parsing, even with specific selectors.
    // When a node doesn't have the imageUrl property, it evaluates to null and causes errors.
    // Instead, image styles are applied programmatically via useEffect (see lines ~290-380).

    // Node selected
    baseStyles.push({
      selector: 'node:selected',
      style: {
        'border-color': colors.accentSky,
        'border-width': 4,
        'background-color': colors.surfaceRaised,
        'outline-width': 12,
        'outline-color': colors.accentSky,
        'outline-opacity': 0.18,
        'color': colors.textPrimary,
        'text-outline-width': 2,
        'text-outline-color': colors.appBg
      } as unknown as cytoscape.Css.Node
    });

    // Node hover
    baseStyles.push({
      selector: 'node:hover',
      style: {
        'border-color': colors.accentEmerald,
        'border-width': 2
      } as unknown as cytoscape.Css.Node
    });

    baseStyles.push({
      selector: 'node[reviewTone = "needs_review"]',
      style: {
        'border-color': colors.accentSky,
        'border-width': 2.25,
        'outline-width': 8,
        'outline-color': colors.accentSky,
        'outline-opacity': 0.08
      } as unknown as cytoscape.Css.Node
    });

    baseStyles.push({
      selector: 'node[reviewTone = "conflict"]',
      style: {
        'border-color': '#f59e0b',
        'border-width': 2.75,
        'outline-width': 10,
        'outline-color': '#f59e0b',
        'outline-opacity': 0.1
      } as unknown as cytoscape.Css.Node
    });

    baseStyles.push({
      selector: 'node[evidenceTone = "gap"]',
      style: {
        'background-color': appearanceMode === 'light' ? 'rgba(217, 83, 79, 0.18)' : 'rgba(69, 10, 10, 0.75)'
      } as unknown as cytoscape.Css.Node
    });

    // Node preview
    baseStyles.push({
      selector: 'node.preview',
      style: {
        'opacity': 0,
        'width': 1,
        'height': 1,
        'label': '',
        'events': 'no'
      } as unknown as cytoscape.Css.Node
    });

    // Edge default
    baseStyles.push({
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': colors.textSoft,
        'target-arrow-color': colors.textSoft,
        'target-arrow-shape': 'triangle',
        'curve-style': edgeStyleMode === 'flow' ? 'taxi' : 'bezier',
        'taxi-direction': edgeStyleMode === 'flow' ? 'vertical' : 'downward',
        'taxi-turn': edgeStyleMode === 'flow' ? '40px' : undefined,
        'control-point-step-size': edgeStyleMode === 'rings' ? 110 : edgeStyleMode === 'smart' ? 95 : 65,
        'control-point-weight': edgeStyleMode === 'flow' ? 0.25 : 0.5,
        'source-endpoint': 'outside-to-node',
        'target-endpoint': 'outside-to-node',
        'label': (edge: cytoscape.EdgeSingular) => {
          const id = edge.id();
          const rawLabel = `${edge.data('label') ?? ''}`.trim();
          if (!rawLabel || hiddenEdgeLabelIds.has(id)) return '';
          if (edge.selected()) return rawLabel;
          if (edgeStyleMode === 'minimal') return '';
          const zoom = edge.cy().zoom();
          if (edgeStyleMode === 'smart' && (denseGraph || zoom < 1.05)) return '';
          if (edgeStyleMode === 'flow' && zoom < 0.95) return '';
          if (edgeStyleMode === 'rings' && zoom < 0.9) return '';
          return rawLabel;
        },
        'font-size': '9px', // Slightly smaller to reduce overlap
        'color': colors.textPrimary,
        'text-outline-width': 1, // Add outline for better readability
        'text-outline-color': colors.appBgSoft,
        'text-background-color': colors.appBgSoft,
        'text-background-opacity': edgeStyleMode === 'minimal' ? 0.0 : 0.85, // More opaque background
        'text-background-padding': '4px', // More padding around text
        'text-margin-y': edgeStyleMode === 'flow' ? -8 : -5, // Offset label slightly above edge
        'edge-text-rotation': edgeStyleMode === 'flow' ? 'none' : 'autorotate',
        'text-rotation': 'none', // Don't rotate text if possible
        'text-max-width': '100px', // Limit label width
        'text-wrap': 'wrap'
      } as unknown as cytoscape.Css.Edge
    });

    // Edge preview
    baseStyles.push({
      selector: 'edge.preview',
      style: {
        'line-color': colors.accentSky,
        'target-arrow-color': colors.accentSky,
        'target-arrow-shape': 'triangle',
        'width': 2,
        'line-style': 'dashed',
        'events': 'no'
      } as unknown as cytoscape.Css.Edge
    });

    // Edge selected
    baseStyles.push({
      selector: 'edge:selected',
      style: {
        'line-color': colors.accentSky,
        'target-arrow-color': colors.accentSky,
        'width': 3.5
      } as unknown as cytoscape.Css.Edge
    });

    return baseStyles;
  }, [elements, lastLayoutPreset, personalizationTheme]);

  const imageCanvasStyle = buildCanvasImageStyle(personalizationTheme);

  return (
    <div className="relative h-full w-full overflow-hidden" style={canvasStyle}>
      {imageCanvasStyle ? <div className="pointer-events-none absolute inset-0" style={imageCanvasStyle} /> : null}
      <CytoscapeComponent
        className="workspace-grid relative z-[1] h-full w-full"
        elements={elements}
        layout={{ name: 'preset' }}
        style={imageCanvasStyle ? { background: 'transparent' } : canvasStyle}
        stylesheet={stylesheet}
        cy={(cyInstance: cytoscape.Core) => {
          cyRef.current = cyInstance;
          const container = cyInstance.container();
          container?.addEventListener('contextmenu', (event) => event.preventDefault());
          applyBoxSelectState(cyInstance, boxSelectEnabled);
          cyInstance.on('select', 'node', (event) => onSelectNode(event.target.id()));
          cyInstance.on('unselect', 'node', () => onUnselectNode());
          cyInstance.on('select', 'edge', (event) => onSelectEdge(event.target.id()));
          cyInstance.on('unselect', 'edge', () => onUnselectEdge());
          cyInstance.on('tap', 'node', (event) => onTapNode(event.target.id()));
        }}
      />
    </div>
  );
}
