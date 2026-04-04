import { describe, expect, it } from 'vitest';
import { createSavedView, normalizeSavedViews, sanitizeSavedViewForGraph } from './savedViews';

describe('saved views', () => {
  it('normalizes persisted saved views and drops invalid entries', () => {
    const savedViews = normalizeSavedViews([
      {
        id: 'view-1',
        name: 'Focus',
        view: 'timeline',
        sidebarTab: 'ai',
        activeTypeIds: ['person', 'organization'],
        hasSourcesOnly: true,
        selectedNodeIds: ['node-1'],
        selectedEdgeIds: ['edge-1'],
        viewport: { zoom: 1.5, pan: { x: 10, y: 20 } },
        createdAt: 100,
        updatedAt: 200
      },
      {
        id: '',
        name: 'Broken'
      }
    ]);

    expect(savedViews).toHaveLength(1);
    expect(savedViews[0]).toMatchObject({
      id: 'view-1',
      name: 'Focus',
      view: 'timeline',
      sidebarTab: 'ai',
      activeTypeIds: ['person', 'organization'],
      hasSourcesOnly: true
    });
  });

  it('creates new saved views and preserves metadata on update', () => {
    const created = createSavedView('Downtown cluster', {
      view: 'graph',
      sidebarTab: 'nodes',
      activeTypeIds: ['person'],
      hasSourcesOnly: false,
      selectedNodeIds: ['node-1'],
      selectedEdgeIds: [],
      viewport: null
    });

    const updated = createSavedView(
      'Downtown cluster',
      {
        ...created,
        activeTypeIds: ['person', 'organization']
      },
      created
    );

    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
    expect(updated.activeTypeIds).toEqual(['person', 'organization']);
  });

  it('removes selection targets that no longer exist in the graph', () => {
    const savedView = createSavedView('Working set', {
      view: 'graph',
      sidebarTab: 'nodes',
      activeTypeIds: ['person'],
      hasSourcesOnly: false,
      selectedNodeIds: ['node-1', 'missing-node'],
      selectedEdgeIds: ['edge-1', 'missing-edge'],
      viewport: null
    });

    const sanitized = sanitizeSavedViewForGraph(savedView, {
      nodes: [
        { id: 'node-1', type: 'person', label: 'Alice', properties: {}, created_at: 0, updated_at: 0 }
      ],
      edges: [
        { id: 'edge-1', src_id: 'node-1', dst_id: 'node-1', type: 'knows', properties: {}, created_at: 0, updated_at: 0 }
      ]
    });

    expect(sanitized.selectedNodeIds).toEqual(['node-1']);
    expect(sanitized.selectedEdgeIds).toEqual(['edge-1']);
  });
});
