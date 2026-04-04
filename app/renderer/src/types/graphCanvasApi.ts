import type { GraphViewport } from '@renderer/types/app';
import type { GraphLayoutPresetId } from '@renderer/features/graph/layoutPresets';

export interface GraphCanvasApi {
  runLayout: (preset: GraphLayoutPresetId) => { scope: 'selection' | 'graph'; preset: GraphLayoutPresetId } | null;
  setViewportInsets: (insets: { left: number; right: number; top?: number; bottom?: number }) => void;
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
  clearSelection: () => void;
  selectElements: (nodeIds: string[], edgeIds: string[]) => void;
  getViewport: () => GraphViewport;
  setViewport: (viewport: GraphViewport) => void;
}
