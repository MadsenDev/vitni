import { InfoTip } from './InfoTip';

interface FilterPanelProps {
  nodeTypes: { id: string; label: string }[];
  activeTypeIds: Set<string>;
  onToggleType: (id: string) => void;
  hasSourcesOnly: boolean;
  onToggleHasSources: (value: boolean) => void;
}

export function FilterPanel({ nodeTypes, activeTypeIds, onToggleType, hasSourcesOnly, onToggleHasSources }: FilterPanelProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Filters
        <InfoTip text={'Filter visible nodes. Edges only show when both endpoints are visible.'} className="ml-1" />
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={hasSourcesOnly}
            onChange={(e) => onToggleHasSources(e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-400"
          />
          Has sources only
          <InfoTip text={'Only show nodes that have at least one attached source.'} />
        </label>
        <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Types</div>
        <div className="grid grid-cols-2 gap-2">
          {nodeTypes.map((nt) => (
            <label key={nt.id} className="flex items-center gap-2 text-sm text-slate-300">
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


