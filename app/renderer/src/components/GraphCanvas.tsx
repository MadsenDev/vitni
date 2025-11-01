import { useEffect, useMemo, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import type cytoscape from 'cytoscape';
import type { ElementDefinition } from 'cytoscape';

interface GraphCanvasProps {
  elements: ElementDefinition[];
  onSelectNode: (id: string) => void;
  onUnselectNode: () => void;
  onSelectEdge: (id: string) => void;
  onUnselectEdge: () => void;
  onTapNode: (id: string) => void;
  // Relationship drag mode
  isRelationshipMode?: boolean;
  onRequestCreateEdge?: (sourceId: string, targetId: string) => void;
  onNodeDragFree?: (id: string, x: number, y: number) => void;
  onSelectionChange?: (nodeIds: string[], edgeIds: string[]) => void;
  showNodeImages?: boolean;
  apiRef?: React.MutableRefObject<{
    runLayout: (name: 'grid' | 'concentric' | 'cose') => void;
    toggleBoxSelect: () => void;
    setBoxSelectEnabled: (enabled: boolean) => void;
    alignSelected: (kind: 'left' | 'top') => void;
    invertSelection: () => void;
    zoomToSelection: () => void;
    fitToScreen: () => void;
    centerSelection: () => void;
    containerToGraph: (clientX: number, clientY: number) => { x: number; y: number } | null;
    getNodePositions: () => Record<string, { x: number; y: number }>;
    getSelectedNodeIds: () => string[];
    getSelectedEdgeIds: () => string[];
  } | null>;
}

const PREVIEW_NODE_ID = '__pi_preview_node__';
const PREVIEW_EDGE_ID = '__pi_preview_edge__';

export function GraphCanvas({
  elements,
  onSelectNode,
  onUnselectNode,
  onSelectEdge,
  onUnselectEdge,
  onTapNode,
  isRelationshipMode = false,
  onRequestCreateEdge,
  onNodeDragFree,
  onSelectionChange,
  showNodeImages = false,
  apiRef
}: GraphCanvasProps) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const relationSourceRef = useRef<string | null>(null);
  const completedRef = useRef<boolean>(false);
  const boxSelectRef = useRef<boolean>(false);
  const prevUserPanningRef = useRef<boolean | null>(null);
  const prevPanningRef = useRef<boolean | null>(null);
  const prevZoomingRef = useRef<boolean | null>(null);

  const applyBoxSelectState = (cy: cytoscape.Core, enabled: boolean) => {
    boxSelectRef.current = enabled;
    cy.boxSelectionEnabled(enabled);
    cy.autounselectify(false);
    try { cy.selectionType((enabled ? 'additive' : 'single') as any); } catch {}

    // Manage panning/zoom so box selection takes precedence when enabled
    if (enabled) {
      if (prevUserPanningRef.current === null) prevUserPanningRef.current = Boolean((cy as any).userPanningEnabled());
      if (prevPanningRef.current === null) prevPanningRef.current = Boolean((cy as any).panningEnabled());
      if (prevZoomingRef.current === null) prevZoomingRef.current = Boolean((cy as any).zoomingEnabled());
      try { cy.userPanningEnabled(false); } catch {}
      try { cy.panningEnabled(false); } catch {}
      try { cy.zoomingEnabled(false); } catch {}
    } else {
      try { cy.userPanningEnabled(prevUserPanningRef.current ?? true); } catch {}
      try { cy.panningEnabled(prevPanningRef.current ?? true); } catch {}
      try { cy.zoomingEnabled(prevZoomingRef.current ?? true); } catch {}
      prevUserPanningRef.current = null;
      prevPanningRef.current = null;
      prevZoomingRef.current = null;
    }

    const container = (cy as any).container?.() as HTMLElement | undefined;
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
      const nodeIds = cy.nodes(':selected').map((n: any) => n.id()) as unknown as string[];
      const edgeIds = cy.edges(':selected').map((e: any) => e.id()) as unknown as string[];
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

    if (isRelationshipMode) {
      cy.on('mousedown', 'node', handleMouseDown);
      cy.on('mousemove', handleMouseMove);
      cy.on('mouseup', 'node', handleMouseUpOnNode);
      cy.on('mouseup', handleMouseUpCore);
    }

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
      cy.off('select unselect', 'node', emitSelection);
      cy.off('select unselect', 'edge', emitSelection);
      // Ensure box select is disabled on cleanup to avoid stuck state
      applyBoxSelectState(cy, false);
      try { cy.userPanningEnabled(true); } catch {}
      try { cy.panningEnabled(true); } catch {}
      try { cy.zoomingEnabled(true); } catch {}
    };
  }, [isRelationshipMode, onRequestCreateEdge, onSelectionChange]);

  // Ensure box select state reapplies if cy remounts
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (boxSelectRef.current) applyBoxSelectState(cy, true);
  });

  // Expose imperative API
  useEffect(() => {
    if (!apiRef) return;
    const cy = cyRef.current;
    apiRef.current = cy
      ? {
          runLayout: (name) => {
            cy.layout({ name }).run();
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
                const xs = sel.map((n: any) => n.position('x') as number) as unknown as number[];
                const minX = Math.min(...xs);
                sel.positions((_, n: any) => ({ x: minX, y: n.position('y') }));
              } else if (kind === 'top') {
                const ys = sel.map((n: any) => n.position('y') as number) as unknown as number[];
                const minY = Math.min(...ys);
                sel.positions((_, n: any) => ({ x: n.position('x'), y: minY }));
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
              cy.animate({ fit: { eles: sel, padding: 60 } }, { duration: 250, easing: 'ease' });
            }
          },
          fitToScreen: () => {
            cy.animate({ fit: { eles: cy.elements(), padding: 60 } }, { duration: 250, easing: 'ease' });
          },
          centerSelection: () => {
            const sel = cy.elements(':selected');
            if (sel.nonempty()) {
              cy.center(sel);
            }
          },
          containerToGraph: (clientX: number, clientY: number) => {
            const container = (cy as any).container() as HTMLElement;
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
          getSelectedNodeIds: () => cy.nodes(':selected').map((n: any) => n.id()) as unknown as string[],
          getSelectedEdgeIds: () => cy.edges(':selected').map((e: any) => e.id()) as unknown as string[]
        }
      : null;
    return () => {
      if (apiRef) apiRef.current = null;
    };
  }, [apiRef]);

  const stylesheet = useMemo<cytoscape.Stylesheet[]>(
    () => [
      {
        selector: 'node',
        style: {
          'background-color': '#0b1220',
          'border-width': 1,
          'border-color': '#1f2a44',
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': '#e2e8f0',
          'font-size': '11px',
          'font-weight': '600',
          'text-outline-width': 0,
          'text-wrap': 'wrap',
          'text-max-width': '120px',
          'text-background-color': '#111827',
          'text-background-opacity': 0.0,
          'width': 'label',
          'height': 'label',
          'padding': '10px',
          'shape': 'round-rectangle'
        }
      },
      ...(showNodeImages
        ? [
            {
              selector: 'node[hasImage = "true"][imageUrl]',
              style: {
                'background-image': 'data(imageUrl)',
                'background-fit': 'cover',
                'background-width': '100%',
                'background-height': '100px',
                'background-position-x': 'center',
                'background-position-y': 'top',
                'height': 'label',
                'min-height': '140px',
                'padding-top': '100px',
                'text-valign': 'bottom',
                'text-margin-y': -8
              }
            } satisfies cytoscape.Stylesheet
          ]
        : []),
      {
        selector: 'node:selected',
        style: {
          'border-color': '#22d3ee',
          'border-width': 4,
          'background-color': '#0f3a4f',
          'outline-width': 10,
          'outline-color': 'rgba(34,211,238,0.22)',
          'color': '#ffffff',
          'text-outline-width': 2,
          'text-outline-color': '#081018'
        }
      },
      {
        selector: 'node:hover',
        style: {
          'border-color': '#38bdf8',
          'border-width': 2
        }
      },
      {
        selector: 'node.preview',
        style: {
          'opacity': 0,
          'width': 1,
          'height': 1,
          'label': '',
          'events': 'no'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#334155',
          'target-arrow-color': '#334155',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'label': 'data(label)',
          'font-size': '10px',
          'color': '#cbd5e1',
          'text-outline-width': 0,
          'text-background-color': '#0f172a',
          'text-background-opacity': 0.6,
          'text-background-padding': 2
        }
      },
      {
        selector: 'edge.preview',
        style: {
          'line-color': '#3b82f6',
          'target-arrow-color': '#3b82f6',
          'target-arrow-shape': 'triangle',
          'width': 2,
          'line-style': 'dashed',
          'events': 'no'
        }
      },
      {
        selector: 'edge:selected',
        style: {
          'line-color': '#3b82f6',
          'target-arrow-color': '#3b82f6',
          'width': 3
        }
      }
    ],
    [showNodeImages]
  );

  return (
    <CytoscapeComponent
      className="h-full w-full"
      elements={elements}
      layout={{ name: 'preset' }}
      style={{ background: '#0f172a' }}
      stylesheet={stylesheet}
      cy={(cyInstance: cytoscape.Core) => {
        cyRef.current = cyInstance;
        // Reapply box-select state on mount if previously enabled
        if (boxSelectRef.current) applyBoxSelectState(cyInstance, true);
        cyInstance.on('select', 'node', (event) => onSelectNode(event.target.id()));
        cyInstance.on('unselect', 'node', () => onUnselectNode());
        cyInstance.on('select', 'edge', (event) => onSelectEdge(event.target.id()));
        cyInstance.on('unselect', 'edge', () => onUnselectEdge());
        cyInstance.on('tap', 'node', (event) => onTapNode(event.target.id()));
      }}
    />
  );
}
