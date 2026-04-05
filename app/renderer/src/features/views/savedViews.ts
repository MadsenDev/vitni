import type { SavedView, SavedViewSnapshot } from '@renderer/types/app';
import type { GraphSnapshot } from '@renderer/types/graph';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function normalizeViewport(value: unknown): SavedView['viewport'] {
  if (!isRecord(value)) return null;
  const zoom = typeof value.zoom === 'number' && Number.isFinite(value.zoom) ? value.zoom : null;
  const pan = isRecord(value.pan) ? value.pan : null;
  const x = pan && typeof pan.x === 'number' && Number.isFinite(pan.x) ? pan.x : null;
  const y = pan && typeof pan.y === 'number' && Number.isFinite(pan.y) ? pan.y : null;

  if (zoom === null || x === null || y === null) return null;
  return { zoom, pan: { x, y } };
}

export function normalizeSavedViews(value: unknown): SavedView[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((item) => {
      const id = typeof item.id === 'string' && item.id.trim().length > 0 ? item.id : null;
      const name = typeof item.name === 'string' && item.name.trim().length > 0 ? item.name.trim() : null;
      const view = item.view === 'timeline' ? 'timeline' : item.view === 'review' ? 'review' : 'graph';
      const sidebarTab = item.sidebarTab === 'ai' ? 'ai' : 'nodes';
      const createdAt = typeof item.createdAt === 'number' && Number.isFinite(item.createdAt) ? item.createdAt : Date.now();
      const updatedAt = typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt) ? item.updatedAt : createdAt;

      if (!id || !name) return null;

      return {
        id,
        name,
        createdAt,
        updatedAt,
        view,
        sidebarTab,
        activeTypeIds: normalizeStringArray(item.activeTypeIds),
        hasSourcesOnly: Boolean(item.hasSourcesOnly),
        selectedNodeIds: normalizeStringArray(item.selectedNodeIds),
        selectedEdgeIds: normalizeStringArray(item.selectedEdgeIds),
        viewport: normalizeViewport(item.viewport)
      } satisfies SavedView;
    })
    .filter((view): view is SavedView => Boolean(view));
}

export function createSavedView(name: string, snapshot: SavedViewSnapshot, existing?: SavedView): SavedView {
  const now = Date.now();

  return {
    id: existing?.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    name: name.trim(),
    ...snapshot
  };
}

export function sanitizeSavedViewForGraph(savedView: SavedView, graph: GraphSnapshot): SavedView {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const edgeIds = new Set(graph.edges.map((edge) => edge.id));

  return {
    ...savedView,
    selectedNodeIds: savedView.selectedNodeIds.filter((id) => nodeIds.has(id)),
    selectedEdgeIds: savedView.selectedEdgeIds.filter((id) => edgeIds.has(id))
  };
}
