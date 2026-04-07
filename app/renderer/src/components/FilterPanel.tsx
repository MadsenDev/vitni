import { InfoTip } from './InfoTip';
import { ThemedButton, ThemedCard } from '@renderer/features/personalization/primitives';

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
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-dim)' }}>
        Filters
        <InfoTip text={'Filter visible nodes. Edges only show when both endpoints are visible.'} className="ml-1" />
      </div>
      <div className="space-y-3">
        <ThemedCard className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm" style={{ color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={hasSourcesOnly}
            onChange={(e) => onToggleHasSources(e.target.checked)}
            className="h-4 w-4"
          />
          Has sources only
          <InfoTip text={'Only show nodes that have at least one attached source.'} />
        </ThemedCard>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-dim)' }}>Types</div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
              {hiddenTypeCount > 0 ? `${hiddenTypeCount} hidden type${hiddenTypeCount === 1 ? '' : 's'}` : 'All types visible'}
            </div>
          </div>
          <ThemedButton type="button" onClick={onShowAllTypes} disabled={hiddenTypeCount === 0} variant="quiet" className="px-3 py-1.5 text-xs font-medium">
            Show all
          </ThemedButton>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {nodeTypes.map((nt) => (
            <ThemedCard key={nt.id} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={activeTypeIds.has(nt.id)}
                onChange={() => onToggleType(nt.id)}
                className="h-4 w-4"
              />
              {nt.label}
            </ThemedCard>
          ))}
        </div>
      </div>
    </div>
  );
}
