import { InfoTip } from './InfoTip';

interface FilterPanelProps {
  nodeTypes: { id: string; label: string }[];
  activeTypeIds: Set<string>;
  onToggleType: (id: string) => void;
  onShowAllTypes: () => void;
  hasSourcesOnly: boolean;
  onToggleHasSources: (value: boolean) => void;
}

export function FilterPanel({ nodeTypes, activeTypeIds, onToggleType, onShowAllTypes, hasSourcesOnly, onToggleHasSources }: FilterPanelProps) {
  const hiddenTypeCount = nodeTypes.length - activeTypeIds.size;

  return (
    <div className="panel-elevated animate-enter-scale rounded-2xl p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Filters
        <InfoTip text={'Filter visible nodes. Edges only show when both endpoints are visible.'} className="ml-1" />
      </div>
      <div className="space-y-3">
        <label className="flex items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={hasSourcesOnly}
            onChange={(e) => onToggleHasSources(e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-400"
          />
          Has sources only
          <InfoTip text={'Only show nodes that have at least one attached source.'} />
        </label>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Types</div>
            <div className="mt-1 text-xs text-slate-500">
              {hiddenTypeCount > 0 ? `${hiddenTypeCount} hidden type${hiddenTypeCount === 1 ? '' : 's'}` : 'All types visible'}
            </div>
          </div>
          <button
            type="button"
            onClick={onShowAllTypes}
            disabled={hiddenTypeCount === 0}
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Show all
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {nodeTypes.map((nt) => (
            <label key={nt.id} className="flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/55 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800/70">
              <input
                type="checkbox"
                checked={activeTypeIds.has(nt.id)}
                onChange={() => onToggleType(nt.id)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-400"
              />
              {nt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
