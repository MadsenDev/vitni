import { FaLink, FaVectorSquare, FaProjectDiagram, FaAlignLeft, FaAlignJustify, FaRetweet, FaSearchPlus, FaExpandArrowsAlt, FaCrosshairs, FaFilter, FaClock, FaSave, FaPlus, FaTrash } from 'react-icons/fa';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SavedView } from '@renderer/types/app';
import { GRAPH_LAYOUT_PRESETS, type GraphLayoutPresetId } from '@renderer/features/graph/layoutPresets';

interface TopToolbarProps {
  view: 'graph' | 'timeline';
  relationshipTool: {
    isActive: boolean;
    selectedType: any | null; // kept for compatibility but unused
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
  onSwitchWorkspace: (view: 'graph' | 'timeline') => void;
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

  return (
    <div className="flex items-center justify-between border-b border-slate-800/80 bg-[rgba(9,14,28,0.78)] px-6 py-3 backdrop-blur-xl">
      <div className="flex items-center space-x-5">
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/70 p-1">
          <button
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${view === 'graph' ? 'bg-slate-800 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]' : 'text-slate-400 hover:text-white'}`}
            onClick={() => onSwitchWorkspace('graph')}
            title="Switch to Investigation"
          >
            Investigation
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${view === 'timeline' ? 'bg-slate-800 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]' : 'text-slate-400 hover:text-white'}`}
            onClick={() => onSwitchWorkspace('timeline')}
            title="Switch to Timeline"
          >
            Timeline
          </button>
        </div>
        <div className="h-6 w-px bg-slate-700/80"></div>
        <div className="flex items-center space-x-2">
          <span className="mr-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">Tools</span>
          <button
            onClick={toggleRelationshipMode}
            className={`control-chip rounded-xl p-2.5 ${relationshipTool.isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15' : 'text-slate-300 hover:text-white'}`}
            title="Relationship tool (drag from one node to another)"
          >
            <FaLink className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleBoxSelect}
            className={`control-chip rounded-xl p-2.5 ${boxSelectEnabled ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/15' : 'text-slate-300 hover:text-white'}`}
            title="Toggle box selection"
          >
            <FaVectorSquare className="w-4 h-4" />
          </button>
          <div className="mx-1 h-5 w-px bg-slate-700/80"></div>
          <button
            onClick={onZoomSelection}
            className="control-chip rounded-xl p-2.5 text-slate-300 hover:text-white"
            title="Zoom to selection"
          >
            <FaSearchPlus className="w-4 h-4" />
          </button>
          <button
            onClick={onFitScreen}
            className="control-chip rounded-xl p-2.5 text-slate-300 hover:text-white"
            title="Fit to screen"
          >
            <FaExpandArrowsAlt className="w-4 h-4" />
          </button>
          <button
            onClick={onCenterSelection}
            className="control-chip rounded-xl p-2.5 text-slate-300 hover:text-white"
            title="Center selection"
          >
            <FaCrosshairs className="w-4 h-4" />
          </button>
          <div className="mx-1 h-5 w-px bg-slate-700/80"></div>
          <button
            ref={filterBtnRef}
            onClick={() => onToggleFilters(filterBtnRef.current ? filterBtnRef.current.getBoundingClientRect() : null)}
            className="control-chip rounded-xl p-2.5 text-slate-300 hover:text-white"
            title="Filters"
          >
            <FaFilter className="w-4 h-4" />
          </button>
          {view === 'graph' && (
            <button
              onClick={() => onSwitchWorkspace('timeline')}
              className="control-chip rounded-xl p-2.5 text-slate-300 hover:text-white"
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
              className={`control-chip rounded-xl px-3 py-2.5 text-slate-300 hover:text-white ${layoutPanelOpen ? 'bg-sky-500/15 text-sky-100 ring-1 ring-sky-500/40' : ''}`}
              title="Layout presets"
            >
              <span className="flex items-center gap-2">
                <FaProjectDiagram className="w-4 h-4" />
                <span className="text-sm">Layout</span>
              </span>
            </button>
          </div>
          <div className="mx-1 h-5 w-px bg-slate-700/80"></div>
          <button
            onClick={onAlignLeft}
            className="control-chip rounded-xl p-2.5 text-slate-300 hover:text-white"
            title="Align left (selected)"
          >
            <FaAlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onAlignTop}
            className="control-chip rounded-xl p-2.5 text-slate-300 hover:text-white"
            title="Align top (selected)"
          >
            <FaAlignJustify className="w-4 h-4 transform rotate-90" />
          </button>
          <div className="mx-1 h-5 w-px bg-slate-700/80"></div>
          <button
            onClick={onInvertSelection}
            className="control-chip rounded-xl p-2.5 text-slate-300 hover:text-white"
            title="Invert selection"
          >
            <FaRetweet className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <label htmlFor="saved-view-select" className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            View
          </label>
          <select
            id="saved-view-select"
            value={activeSavedViewId ?? ''}
            onChange={(event) => {
              if (!event.target.value) return;
              onApplySavedView(event.target.value);
            }}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200 transition-colors focus:border-sky-500 focus:outline-none"
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
            className="control-chip rounded-lg p-2 text-slate-300 hover:text-white"
            title={activeSavedViewId ? 'Update current saved view' : 'Save current state as a new view'}
          >
            <FaSave className="w-4 h-4" />
          </button>
          <button
            onClick={onSaveViewAs}
            className="control-chip rounded-lg p-2 text-slate-300 hover:text-white"
            title="Save current state as a new named view"
          >
            <FaPlus className="w-4 h-4" />
          </button>
          <button
            onClick={onDeleteSavedView}
            disabled={!activeSavedViewId}
            className="control-chip rounded-lg p-2 text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            title="Delete current saved view"
          >
            <FaTrash className="w-4 h-4" />
          </button>
        </div>
        {relationshipTool.isActive && (
          <div className="animate-enter-rise flex items-center space-x-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-sm">
            <span className="text-slate-300">Relationship mode</span>
            {relationshipTool.sourceNode && (
              <>
                <span className="text-slate-500">from</span>
                <span className="text-green-400">{relationshipTool.sourceNode.label}</span>
              </>
            )}
            {relationshipTool.targetNode && (
              <>
                <span className="text-slate-500">to</span>
                <span className="text-green-400">{relationshipTool.targetNode.label}</span>
              </>
            )}
          </div>
        )}
        <div className="text-sm text-slate-500">Drag nodes • Relationship: drag A → B • Select to inspect</div>
      </div>
      {layoutPanelOpen && layoutAnchor
        ? createPortal(
            <div
              ref={layoutPanelRef}
              className="fixed z-[70] w-80 rounded-2xl border border-slate-800 bg-slate-950/95 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
              style={{
                left: Math.min(layoutAnchor.left, window.innerWidth - 336),
                top: layoutAnchor.bottom + 8
              }}
            >
              <div className="px-3 pb-2 pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Layout Presets</p>
                <p className="mt-1 text-xs text-slate-400">Choose a readability-first layout for the full graph or current selection.</p>
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
                      className={`w-full rounded-2xl px-3 py-3 text-left transition ${
                        isActive
                          ? 'bg-sky-500/12 text-sky-50 ring-1 ring-sky-500/35'
                          : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold">{preset.label}</span>
                        {isActive ? (
                          <span className="rounded-full border border-sky-500/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-sky-200">
                            Last used
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{preset.description}</p>
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
