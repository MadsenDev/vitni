import { useEffect, useRef } from 'react';
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
  apiRef?: React.MutableRefObject<{
    runLayout: (name: 'grid' | 'concentric' | 'cose') => void;
    toggleBoxSelect: () => void;
    alignSelected: (kind: 'left' | 'top') => void;
    invertSelection: () => void;
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
  apiRef
}: GraphCanvasProps) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const relationSourceRef = useRef<string | null>(null);
  const completedRef = useRef<boolean>(false);

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
    };
  }, [isRelationshipMode, onRequestCreateEdge]);

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
            cy.boxSelectionEnabled(!cy.boxSelectionEnabled());
          },
          alignSelected: (kind) => {
            const sel = cy.nodes(':selected');
            if (sel.nonempty()) {
              if (kind === 'left') {
                const minX = Math.min(...sel.map(n => n.position('x')));
                sel.positions((_, n) => ({ x: minX, y: n.position('y') }));
              } else if (kind === 'top') {
                const minY = Math.min(...sel.map(n => n.position('y')));
                sel.positions((_, n) => ({ x: n.position('x'), y: minY }));
              }
            }
          },
          invertSelection: () => {
            const nodes = cy.nodes();
            const toSelect = nodes.filter(n => !n.selected());
            nodes.unselect();
            toSelect.select();
          }
        }
      : null;
    return () => {
      if (apiRef) apiRef.current = null;
    };
  }, [apiRef]);

  return (
    <CytoscapeComponent
      className="h-full w-full"
      elements={elements}
      layout={{ name: 'preset' }}
      style={{ background: '#0f172a' }}
      stylesheet={[
        {
          selector: 'node',
          style: {
            'background-color': '#374151',
            'border-width': 2,
            'border-color': '#6b7280',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#ffffff',
            'font-size': '12px',
            'font-weight': 'bold',
            'text-outline-width': 1,
            'text-outline-color': '#000000',
            'width': '60px',
            'height': '60px',
            'shape': 'round-rectangle'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#3b82f6',
            'border-width': 3,
            'background-color': '#1e40af'
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
            'line-color': '#6b7280',
            'target-arrow-color': '#6b7280',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'color': '#ffffff',
            'text-outline-width': 1,
            'text-outline-color': '#000000'
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
      ]}
      cy={(cyInstance: cytoscape.Core) => {
        cyRef.current = cyInstance;
        cyInstance.on('select', 'node', (event) => onSelectNode(event.target.id()));
        cyInstance.on('unselect', 'node', () => onUnselectNode());
        cyInstance.on('select', 'edge', (event) => onSelectEdge(event.target.id()));
        cyInstance.on('unselect', 'edge', () => onUnselectEdge());
        cyInstance.on('tap', 'node', (event) => onTapNode(event.target.id()));
      }}
    />
  );
}
