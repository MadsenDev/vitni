export type TimelineMeta = {
  entityOptions: { id: string; label: string }[];
  buckets: string[];
  filteredCount: number;
  totalEvents: number;
  uniqueDates: number;
  relCount: number;
  span: string;
};

interface TimelineSidebarProps extends TimelineMeta {
  entityFilter: string;
  setEntityFilter: (v: string) => void;
  bucketFilter: string;
  setBucketFilter: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
}

export function TimelineSidebar({
  entityFilter, setEntityFilter,
  bucketFilter, setBucketFilter,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  entityOptions, buckets,
  filteredCount, totalEvents, uniqueDates, relCount, span,
}: TimelineSidebarProps) {
  const hasFilters = !!(entityFilter || bucketFilter !== 'All' || dateFrom || dateTo);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
      <div className="shrink-0 px-5 pb-3 pt-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Timeline</p>
        <h2 className="mt-1 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Filters</h2>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {/* Entity */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--text-soft)' }}>
            Entity
          </label>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{
              background: 'var(--surface-base)',
              border: '1px solid var(--border-subtle)',
              color: entityFilter ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <option value="">All entities</option>
            {entityOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--text-soft)' }}>
            Date range
          </label>
          <div className="space-y-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-base)',
                border: '1px solid var(--border-subtle)',
                color: dateFrom ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-base)',
                border: '1px solid var(--border-subtle)',
                color: dateTo ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--text-soft)' }}>
            Category
          </label>
          <div className="flex flex-wrap gap-1.5">
            {buckets.map((b) => (
              <button
                key={b}
                onClick={() => setBucketFilter(b)}
                className="rounded-full px-3 py-1 text-[12px] font-medium transition-all"
                style={bucketFilter === b ? {
                  background: 'rgba(95,212,255,0.15)',
                  border: '1px solid rgba(95,212,255,0.4)',
                  color: 'var(--accent-sky)',
                } : {
                  background: 'var(--surface-base)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={() => { setEntityFilter(''); setBucketFilter('All'); setDateFrom(''); setDateTo(''); }}
            className="w-full rounded-lg py-2 text-[12px] transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
          >
            Clear filters
          </button>
        )}

        {/* Summary */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--text-soft)' }}>
            Summary
          </p>
          <div className="space-y-2.5">
            {[
              { label: 'Events', value: filteredCount === totalEvents ? `${totalEvents}` : `${filteredCount} / ${totalEvents}` },
              { label: 'Dates', value: `${uniqueDates}` },
              { label: 'Linked activity', value: `${relCount}` },
              { label: 'Span', value: span },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: 'var(--text-soft)' }}>{label}</span>
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
