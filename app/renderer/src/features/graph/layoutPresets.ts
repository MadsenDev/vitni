export type GraphLayoutPresetId = 'investigation_map' | 'chain_view' | 'focus_rings' | 'tidy_grid';
export type GraphLayoutEngineId = 'fcose' | 'dagre' | 'concentric' | 'grid';
export type GraphEdgeStyleMode = 'flow' | 'minimal' | 'rings' | 'smart';

export interface GraphLayoutPreset {
  id: GraphLayoutPresetId;
  label: string;
  shortLabel: string;
  description: string;
  layoutEngine: GraphLayoutEngineId;
  edgeStyleMode: GraphEdgeStyleMode;
  supportsSelectionScope: boolean;
}

export const GRAPH_LAYOUT_PRESETS: GraphLayoutPreset[] = [
  {
    id: 'investigation_map',
    label: 'Readable map',
    shortLabel: 'Readable map',
    description: 'Best-effort readable investigation map with stronger node spacing and fewer visual crossings.',
    layoutEngine: 'fcose',
    edgeStyleMode: 'smart',
    supportsSelectionScope: true
  },
  {
    id: 'chain_view',
    label: 'Chain / flow',
    shortLabel: 'Chain / flow',
    description: 'Directional layout for sequences and communication trails with cleaner flow and fewer crossings.',
    layoutEngine: 'dagre',
    edgeStyleMode: 'flow',
    supportsSelectionScope: true
  },
  {
    id: 'focus_rings',
    label: 'Focus rings',
    shortLabel: 'Focus rings',
    description: 'Centers the most important nodes and pushes related entities into readable outer rings.',
    layoutEngine: 'concentric',
    edgeStyleMode: 'rings',
    supportsSelectionScope: true
  },
  {
    id: 'tidy_grid',
    label: 'Tidy grid',
    shortLabel: 'Tidy grid',
    description: 'Simple cleanup layout for quick untangling when a graph needs a hard reset.',
    layoutEngine: 'grid',
    edgeStyleMode: 'minimal',
    supportsSelectionScope: true
  }
];

export const DEFAULT_MANUAL_LAYOUT_PRESET: GraphLayoutPresetId = 'investigation_map';

export function normalizeAutoLayoutPresetSetting(
  value: unknown,
  legacyValue?: boolean | null
): 'off' | GraphLayoutPresetId {
  if (value === 'off' || value === 'investigation_map' || value === 'chain_view' || value === 'focus_rings' || value === 'tidy_grid') {
    return value;
  }
  return legacyValue ? 'investigation_map' : 'off';
}

export function getGraphLayoutPreset(presetId: GraphLayoutPresetId): GraphLayoutPreset {
  return GRAPH_LAYOUT_PRESETS.find((preset) => preset.id === presetId) ?? GRAPH_LAYOUT_PRESETS[0];
}
