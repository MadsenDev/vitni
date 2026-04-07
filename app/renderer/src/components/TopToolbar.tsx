import { FaLink, FaVectorSquare, FaProjectDiagram, FaAlignLeft, FaAlignJustify, FaRetweet, FaSearchPlus, FaExpandArrowsAlt, FaCrosshairs, FaFilter, FaClock, FaSave, FaPlus, FaTrash } from 'react-icons/fa';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SavedView } from '@renderer/types/app';
import { GRAPH_LAYOUT_PRESETS, type GraphLayoutPresetId } from '@renderer/features/graph/layoutPresets';

interface TopToolbarProps {
  view: 'graph' | 'timeline' | 'review';
  relationshipTool: {
    isActive: boolean;
    selectedType: unknown | null; // kept for compatibility but unused
    sourceNode: { id: string; label: string; type: string } | null;
    targetNode: { id: string; label: string; type: string } | null;
  };
  onRelationshipToolActivate: () => void;
  onRelationshipToolDeactivate: () => void;
  onToggleBoxSelect: () => void;
  onRunLayoutPreset: (preset: GraphLayoutPresetId) => void;
  lastLayoutPreset: GraphLayoutPresetId | null;
  onAlignLeft: () => void;
  onAlignTop: () => void;
  onInvertSelection: () => void;
  boxSelectEnabled?: boolean;
  onZoomSelection: () => void;
  onFitScreen: () => void;
  onCenterSelection: () => void;
  onToggleFilters: (anchor: DOMRect | null) => void;
  onSwitchWorkspace: (view: 'graph' | 'timeline' | 'review') => void;
  savedViews: SavedView[];
  activeSavedViewId: string | null;
  onApplySavedView: (viewId: string) => void;
  onSaveView: () => void;
  onSaveViewAs: () => void;
  onDeleteSavedView: () => void;
}

export function TopToolbar({
  view,
  relationshipTool,
  onRelationshipToolActivate,
  onRelationshipToolDeactivate,
  onToggleBoxSelect,
  boxSelectEnabled,
  onRunLayoutPreset,
  lastLayoutPreset,
  onAlignLeft,
  onAlignTop,
  onInvertSelection,
  onZoomSelection,
  onFitScreen,
  onCenterSelection,
  onToggleFilters,
  onSwitchWorkspace,
  savedViews,
  activeSavedViewId,
  onApplySavedView,
  onSaveView,
  onSaveViewAs,
  onDeleteSavedView
}: TopToolbarProps) {
  const filterBtnRef = useRef<HTMLButtonElement | null>(null);
  const layoutBtnRef = useRef<HTMLButtonElement | null>(null);
  const layoutPanelRef = useRef<HTMLDivElement | null>(null);
  const [layoutPanelOpen, setLayoutPanelOpen] = useState(false);
  const [layoutAnchor, setLayoutAnchor] = useState<DOMRect | null>(null);
  const toggleRelationshipMode = () => {
    if (relationshipTool.isActive) onRelationshipToolDeactivate();
    else onRelationshipToolActivate();
  };

  useEffect(() => {
    if (!layoutPanelOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (layoutPanelRef.current?.contains(target) || layoutBtnRef.current?.contains(target)) {
        return;
      }
      setLayoutPanelOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [layoutPanelOpen]);

  useEffect(() => {
    if (!layoutPanelOpen || !layoutBtnRef.current) return;

    const updateAnchor = () => {
      setLayoutAnchor(layoutBtnRef.current?.getBoundingClientRect() ?? null);
    };

    updateAnchor();
    window.addEventListener('resize', updateAnchor);
    window.addEventListener('scroll', updateAnchor, true);
    return () => {
      window.removeEventListener('resize', updateAnchor);
      window.removeEventListener('scroll', updateAnchor, true);
    };
  }, [layoutPanelOpen]);

  const toolbarShellStyle = {
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--surface-elevated)',
    boxShadow: 'var(--shadow-panel)'
  } as const;

  const segmentedControlStyle = {
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-base)'
  } as const;

  return (
    <div className="flex items-center justify-between px-6 py-3 backdrop-blur-xl" style={toolbarShellStyle}>
      <div className="flex items-center space-x-5">
        <div className="flex items-center gap-1 rounded-xl p-1" style={segmentedControlStyle}>
          <button
            className="rounded-lg px-3 py-1.5 text-sm transition-colors"
            style={view === 'graph' ? { background: 'var(--surface-raised)', color: 'var(--text-primary)' } : { color: 'var(--text-muted)' }}
            onClick={() => onSwitchWorkspace('graph')}
            title="Switch to Investigation"
          >
            Investigation
          </button>
          <button
            className="rounded-lg px-3 py-1.5 text-sm transition-colors"
            style={view === 'timeline' ? { background: 'var(--surface-raised)', color: 'var(--text-primary)' } : { color: 'var(--text-muted)' }}
            onClick={() => onSwitchWorkspace('timeline')}
            title="Switch to Timeline"
          >
            Timeline
          </button>
          <button
            className="rounded-lg px-3 py-1.5 text-sm transition-colors"
            style={view === 'review' ? { background: 'var(--surface-raised)', color: 'var(--text-primary)' } : { color: 'var(--text-muted)' }}
            onClick={() => onSwitchWorkspace('review')}
            title="Switch to Review"
          >
            Review
          </button>
        </div>
        {view === 'graph' ? <div className="h-6 w-px" style={{ background: 'var(--border-subtle)' }}></div> : null}
        {view === 'graph' ? (
        <div className="flex items-center space-x-2">
          <span className="mr-1 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Tools</span>
          <button
            onClick={toggleRelationshipMode}
            className={`control-chip rounded-xl p-2.5 ${relationshipTool.isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15' : ''}`}
            style={!relationshipTool.isActive ? { color: 'var(--text-muted)' } : undefined}
            title="Relationship tool (drag from one node to another)"
          >
            <FaLink className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleBoxSelect}
            className={`control-chip rounded-xl p-2.5 ${boxSelectEnabled ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/15' : ''}`}
            style={!boxSelectEnabled ? { color: 'var(--text-muted)' } : undefined}
            title="Toggle box selection"
          >
            <FaVectorSquare className="w-4 h-4" />
          </button>
          <div className="mx-1 h-5 w-px" style={{ background: 'var(--border-subtle)' }}></div>
          <button
            onClick={onZoomSelection}
            className="control-chip rounded-xl p-2.5"
            style={{ color: 'var(--text-muted)' }}
            title="Zoom to selection"
          >
            <FaSearchPlus className="w-4 h-4" />
          </button>
          <button
            onClick={onFitScreen}
            className="control-chip rounded-xl p-2.5"
            style={{ color: 'var(--text-muted)' }}
            title="Fit to screen"
          >
            <FaExpandArrowsAlt className="w-4 h-4" />
          </button>
          <button
            onClick={onCenterSelection}
            className="control-chip rounded-xl p-2.5"
            style={{ color: 'var(--text-muted)' }}
            title="Center selection"
          >
            <FaCrosshairs className="w-4 h-4" />
          </button>
          <div className="mx-1 h-5 w-px" style={{ background: 'var(--border-subtle)' }}></div>
          <button
            ref={filterBtnRef}
            onClick={() => onToggleFilters(filterBtnRef.current ? filterBtnRef.current.getBoundingClientRect() : null)}
            className="control-chip rounded-xl p-2.5"
            style={{ color: 'var(--text-muted)' }}
            title="Filters"
          >
            <FaFilter className="w-4 h-4" />
          </button>
          {view === 'graph' && (
            <button
              onClick={() => onSwitchWorkspace('timeline')}
              className="control-chip rounded-xl p-2.5"
              style={{ color: 'var(--text-muted)' }}
              title="Open timeline"
            >
              <FaClock className="w-4 h-4" />
            </button>
          )}
          <div className="relative">
            <button
              ref={layoutBtnRef}
              onClick={() => {
                setLayoutAnchor(layoutBtnRef.current?.getBoundingClientRect() ?? null);
                setLayoutPanelOpen((current) => !current);
              }}
              className={`control-chip rounded-xl px-3 py-2.5 ${layoutPanelOpen ? 'bg-sky-500/15 ring-1 ring-sky-500/40' : ''}`}
              style={{ color: layoutPanelOpen ? 'var(--accent-sky)' : 'var(--text-muted)' }}
              title="Layout presets"
            >
              <span className="flex items-center gap-2">
                <FaProjectDiagram className="w-4 h-4" />
                <span className="text-sm">Layout</span>
              </span>
            </button>
          </div>
          <div className="mx-1 h-5 w-px" style={{ background: 'var(--border-subtle)' }}></div>
          <button
            onClick={onAlignLeft}
            className="control-chip rounded-xl p-2.5"
            style={{ color: 'var(--text-muted)' }}
            title="Align left (selected)"
          >
            <FaAlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onAlignTop}
            className="control-chip rounded-xl p-2.5"
            style={{ color: 'var(--text-muted)' }}
            title="Align top (selected)"
          >
            <FaAlignJustify className="w-4 h-4 transform rotate-90" />
          </button>
          <div className="mx-1 h-5 w-px" style={{ background: 'var(--border-subtle)' }}></div>
          <button
            onClick={onInvertSelection}
            className="control-chip rounded-xl p-2.5"
            style={{ color: 'var(--text-muted)' }}
            title="Invert selection"
          >
            <FaRetweet className="w-4 h-4" />
          </button>
        </div>
        ) : null}
      </div>
      <div className="flex items-center space-x-4">
        {view === 'graph' ? (
        <div className="flex items-center gap-2 rounded-xl px-2 py-1.5" style={segmentedControlStyle}>
          <label htmlFor="saved-view-select" className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>
            View
          </label>
          <select
            id="saved-view-select"
            value={activeSavedViewId ?? ''}
            onChange={(event) => {
              if (!event.target.value) return;
              onApplySavedView(event.target.value);
            }}
            className="rounded-lg px-2 py-1.5 text-sm transition-colors focus:outline-none"
            style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            title="Apply saved investigation view"
          >
            <option value="" disabled>
              {savedViews.length > 0 ? 'Select view' : 'No saved views'}
            </option>
            {savedViews.map((savedView) => (
              <option key={savedView.id} value={savedView.id}>
                {savedView.name}
              </option>
            ))}
          </select>
          <button
            onClick={onSaveView}
            className="control-chip rounded-lg p-2"
            style={{ color: 'var(--text-muted)' }}
            title={activeSavedViewId ? 'Update current saved view' : 'Save current state as a new view'}
          >
            <FaSave className="w-4 h-4" />
          </button>
          <button
            onClick={onSaveViewAs}
            className="control-chip rounded-lg p-2"
            style={{ color: 'var(--text-muted)' }}
            title="Save current state as a new named view"
          >
            <FaPlus className="w-4 h-4" />
          </button>
          <button
            onClick={onDeleteSavedView}
            disabled={!activeSavedViewId}
            className="control-chip rounded-lg p-2 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ color: 'var(--text-muted)' }}
            title="Delete current saved view"
          >
            <FaTrash className="w-4 h-4" />
          </button>
        </div>
        ) : null}
        {view === 'graph' && relationshipTool.isActive && (
          <div className="animate-enter-rise flex items-center space-x-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-sm">
            <span style={{ color: 'var(--text-primary)' }}>Relationship mode</span>
            {relationshipTool.sourceNode && (
              <>
                <span style={{ color: 'var(--text-soft)' }}>from</span>
                <span className="text-green-400">{relationshipTool.sourceNode.label}</span>
              </>
            )}
            {relationshipTool.targetNode && (
              <>
                <span style={{ color: 'var(--text-soft)' }}>to</span>
                <span className="text-green-400">{relationshipTool.targetNode.label}</span>
              </>
            )}
          </div>
        )}
        <div className="text-sm" style={{ color: 'var(--text-soft)' }}>
          {view === 'graph'
            ? 'Drag nodes • Relationship: drag A → B • Select to inspect'
            : view === 'timeline'
              ? 'Review the chronology and supporting dates.'
              : 'Process assertions, close evidence gaps, and move the case forward.'}
        </div>
      </div>
      {layoutPanelOpen && layoutAnchor
        ? createPortal(
            <div
              ref={layoutPanelRef}
              className="fixed z-[70] w-80 rounded-2xl border p-2 backdrop-blur-xl"
              style={{
                left: Math.min(layoutAnchor.left, window.innerWidth - 336),
                top: layoutAnchor.bottom + 8,
                borderColor: 'var(--border-subtle)',
                background: 'var(--surface-elevated)',
                boxShadow: 'var(--shadow-float)'
              }}
            >
              <div className="px-3 pb-2 pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Layout Presets</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Choose a readability-first layout for the full graph or current selection.</p>
              </div>
              <div className="space-y-1">
                {GRAPH_LAYOUT_PRESETS.map((preset) => {
                  const isActive = preset.id === lastLayoutPreset;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        onRunLayoutPreset(preset.id);
                        setLayoutPanelOpen(false);
                      }}
                      className={`w-full rounded-2xl px-3 py-3 text-left transition ${isActive ? 'bg-sky-500/12 ring-1 ring-sky-500/35' : ''}`}
                      style={{ color: isActive ? 'var(--accent-sky)' : 'var(--text-primary)' }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold">{preset.label}</span>
                        {isActive ? (
                          <span className="rounded-full border border-sky-500/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent-sky)' }}>
                            Last used
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>{preset.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
