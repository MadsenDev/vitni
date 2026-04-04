import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopToolbar } from './TopToolbar';

describe('TopToolbar', () => {
  it('applies a saved view and exposes saved-view actions', () => {
    const onApplySavedView = vi.fn();
    const onSaveView = vi.fn();
    const onSaveViewAs = vi.fn();
    const onDeleteSavedView = vi.fn();

    render(
      <TopToolbar
        view="graph"
        relationshipTool={{ isActive: false, selectedType: null, sourceNode: null, targetNode: null }}
        onRelationshipToolActivate={vi.fn()}
        onRelationshipToolDeactivate={vi.fn()}
        onToggleBoxSelect={vi.fn()}
        boxSelectEnabled={false}
        onRunLayoutPreset={vi.fn()}
        lastLayoutPreset={null}
        onAlignLeft={vi.fn()}
        onAlignTop={vi.fn()}
        onInvertSelection={vi.fn()}
        onZoomSelection={vi.fn()}
        onFitScreen={vi.fn()}
        onCenterSelection={vi.fn()}
        onToggleFilters={vi.fn()}
        onSwitchWorkspace={vi.fn()}
        savedViews={[
          {
            id: 'view-1',
            name: 'Primary suspects',
            view: 'graph',
            sidebarTab: 'nodes',
            activeTypeIds: ['person'],
            hasSourcesOnly: true,
            selectedNodeIds: ['node-1'],
            selectedEdgeIds: [],
            viewport: null,
            createdAt: 1,
            updatedAt: 1
          }
        ]}
        activeSavedViewId="view-1"
        onApplySavedView={onApplySavedView}
        onSaveView={onSaveView}
        onSaveViewAs={onSaveViewAs}
        onDeleteSavedView={onDeleteSavedView}
      />
    );

    fireEvent.change(screen.getByLabelText('View'), { target: { value: 'view-1' } });
    fireEvent.click(screen.getByTitle('Update current saved view'));
    fireEvent.click(screen.getByTitle('Save current state as a new named view'));
    fireEvent.click(screen.getByTitle('Delete current saved view'));

    expect(onApplySavedView).toHaveBeenCalledWith('view-1');
    expect(onSaveView).toHaveBeenCalled();
    expect(onSaveViewAs).toHaveBeenCalled();
    expect(onDeleteSavedView).toHaveBeenCalled();
  });

  it('opens layout presets and runs the selected preset', () => {
    const onRunLayoutPreset = vi.fn();

    render(
      <TopToolbar
        view="graph"
        relationshipTool={{ isActive: false, selectedType: null, sourceNode: null, targetNode: null }}
        onRelationshipToolActivate={vi.fn()}
        onRelationshipToolDeactivate={vi.fn()}
        onToggleBoxSelect={vi.fn()}
        boxSelectEnabled={false}
        onRunLayoutPreset={onRunLayoutPreset}
        lastLayoutPreset="investigation_map"
        onAlignLeft={vi.fn()}
        onAlignTop={vi.fn()}
        onInvertSelection={vi.fn()}
        onZoomSelection={vi.fn()}
        onFitScreen={vi.fn()}
        onCenterSelection={vi.fn()}
        onToggleFilters={vi.fn()}
        onSwitchWorkspace={vi.fn()}
        savedViews={[]}
        activeSavedViewId={null}
        onApplySavedView={vi.fn()}
        onSaveView={vi.fn()}
        onSaveViewAs={vi.fn()}
        onDeleteSavedView={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTitle('Layout presets'));
    fireEvent.click(screen.getByRole('button', { name: /chain \/ flow/i }));

    expect(onRunLayoutPreset).toHaveBeenCalledWith('chain_view');
  });
});
