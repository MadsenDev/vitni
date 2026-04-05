import type { SourceWithUsage } from '@shared/types';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';
import type { DerivedReviewAssertion, ReviewFilters } from '@renderer/features/review/reviewModel';

interface ReviewQueueProps {
  graph: GraphSnapshot;
  assertions: ParsedAssertionRecord[];
  sources: SourceWithUsage[];
  reviewItems: DerivedReviewAssertion[];
  filteredItems: DerivedReviewAssertion[];
  filters: ReviewFilters;
  activeAssertionId: string | null;
  onFiltersChange: React.Dispatch<React.SetStateAction<ReviewFilters>>;
  onSelectAssertion: (assertionId: string) => void;
  onAdvance: (direction: 'previous' | 'next') => void;
}

function formatRelativeTime(timestampSeconds: number | null | undefined) {
  if (typeof timestampSeconds !== 'number' || !Number.isFinite(timestampSeconds) || timestampSeconds <= 0) return null;
  const normalized = timestampSeconds > 1_000_000_000_000 ? timestampSeconds : timestampSeconds * 1000;
  const diffMs = Date.now() - normalized;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function reviewTone(assertion: DerivedReviewAssertion) {
  if (assertion.review_state === 'disputed') return 'bg-amber-500/15 text-amber-200';
  if (assertion.review_state === 'rejected') return 'bg-rose-500/15 text-rose-200';
  if (assertion.review_state === 'accepted') return 'bg-emerald-500/15 text-emerald-200';
  return 'bg-slate-800/80 text-slate-300';
}

function evidenceTone(assertion: DerivedReviewAssertion) {
  if (assertion.evidenceStatus === 'none') return 'bg-rose-500/15 text-rose-200';
  if (assertion.evidenceStatus === 'single') return 'bg-sky-500/15 text-sky-200';
  return 'bg-emerald-500/15 text-emerald-200';
}

export function ReviewQueue({
  assertions,
  sources,
  reviewItems,
  filteredItems,
  filters,
  activeAssertionId,
  onFiltersChange,
  onSelectAssertion,
  onAdvance
}: ReviewQueueProps) {
  const activeItem = filteredItems.find((item) => item.id === activeAssertionId) ?? filteredItems[0] ?? null;

  const reviewedCount = reviewItems.filter((item) => item.review_state !== 'unreviewed').length;
  const evidenceGapCount = reviewItems.filter((item) => item.evidenceStatus === 'none').length;
  const disputedCount = reviewItems.filter((item) => item.review_state === 'disputed').length;
  const rejectedCount = reviewItems.filter((item) => item.review_state === 'rejected').length;
  const reviewCoverage = reviewItems.length === 0 ? 0 : Math.round((reviewedCount / reviewItems.length) * 100);

  const sections = [
    {
      id: 'needs-review',
      title: 'Needs review',
      description: 'Assertions still waiting for an explicit decision.',
      rows: filteredItems.filter((item) => item.review_state === 'unreviewed')
    },
    {
      id: 'disputed',
      title: 'Disputed',
      description: 'Claims that need resolution or supporting follow-up.',
      rows: filteredItems.filter((item) => item.review_state === 'disputed')
    },
    {
      id: 'rejected',
      title: 'Rejected',
      description: 'Assertions removed from the defensible case narrative.',
      rows: filteredItems.filter((item) => item.review_state === 'rejected')
    },
    {
      id: 'weakly-supported',
      title: 'Weakly supported',
      description: 'Assertions with no source or only a single supporting source.',
      rows: filteredItems.filter((item) => item.evidenceStatus !== 'multiple')
    },
    {
      id: 'no-sources',
      title: 'No sources',
      description: 'Assertions that do not currently point to any supporting source.',
      rows: filteredItems.filter((item) => item.evidenceStatus === 'none')
    },
    {
      id: 'recently-reviewed',
      title: 'Recently reviewed',
      description: 'Most recent accepted, disputed, or rejected decisions.',
      rows: filteredItems.filter((item) => item.reviewed_at).sort((a, b) => (b.reviewed_at ?? 0) - (a.reviewed_at ?? 0))
    }
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-slate-800/80 bg-slate-950/45 px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Review mode</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Ground the case</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Move through assertions deliberately, close evidence gaps, and track what is still too weak to trust.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: 'Review coverage', value: `${reviewCoverage}%`, tone: 'text-slate-100' },
            { label: 'Evidence gaps', value: evidenceGapCount, tone: 'text-rose-200' },
            { label: 'Disputed', value: disputedCount, tone: 'text-amber-200' },
            { label: 'Rejected', value: rejectedCount, tone: 'text-slate-200' }
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-800/80 bg-slate-900/55 px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{metric.label}</div>
              <div className={`mt-2 text-xl font-semibold ${metric.tone}`}>{metric.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2">
          <input
            type="text"
            value={filters.query}
            onChange={(event) => onFiltersChange((current) => ({ ...current, query: event.target.value }))}
            placeholder="Search path, subject, value, or source…"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filters.reviewState}
              onChange={(event) => onFiltersChange((current) => ({ ...current, reviewState: event.target.value as ReviewFilters['reviewState'] }))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All states</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="accepted">Accepted</option>
              <option value="disputed">Disputed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={filters.evidence}
              onChange={(event) => onFiltersChange((current) => ({ ...current, evidence: event.target.value as ReviewFilters['evidence'] }))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All evidence</option>
              <option value="none">No sources</option>
              <option value="weak">Weak support</option>
            </select>
            <select
              value={filters.confidence}
              onChange={(event) => onFiltersChange((current) => ({ ...current, confidence: event.target.value as ReviewFilters['confidence'] }))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All confidence</option>
              <option value="asserted">Asserted</option>
              <option value="unverified">Unverified</option>
              <option value="verified">Verified</option>
            </select>
            <select
              value={filters.sort}
              onChange={(event) => onFiltersChange((current) => ({ ...current, sort: event.target.value as ReviewFilters['sort'] }))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="unreviewed_first">Unreviewed first</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="weakest_evidence">Weakest evidence first</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-800/80 bg-slate-950/45 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Current review</h4>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {activeItem ? 'Use previous and next to move through the current review queue.' : 'No assertions match the current filters.'}
            </p>
          </div>
          <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300">
            {filteredItems.length} in queue
          </span>
        </div>
        {activeItem ? (
          <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/55 px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${reviewTone(activeItem)}`}>
                {activeItem.review_state}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${evidenceTone(activeItem)}`}>
                {activeItem.evidenceStatus === 'multiple' ? 'Multiple sources' : activeItem.evidenceStatus === 'single' ? 'Single source' : 'No sources'}
              </span>
              {activeItem.conflictStatus === 'conflict' ? (
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-amber-200">
                  Conflict candidate
                </span>
              ) : null}
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-400">{activeItem.subjectLabel}</div>
              <button
                type="button"
                className="mt-1 break-words text-left text-sm font-semibold leading-6 text-slate-100 hover:text-sky-200"
                onClick={() => onSelectAssertion(activeItem.id)}
              >
                {activeItem.path}
              </button>
              <div className="mt-2 text-xs leading-5 text-slate-400">{activeItem.valueSummary}</div>
              <div className="mt-2 text-[11px] text-slate-500">
                {activeItem.sourceTitle ? `Primary source: ${activeItem.sourceTitle}` : 'No linked source'} • {formatRelativeTime(activeItem.created_at) || 'recent'}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                onClick={() => onAdvance('previous')}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[11px] text-sky-200 transition-colors hover:bg-sky-500/20"
                onClick={() => onSelectAssertion(activeItem.id)}
              >
                Open review
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                onClick={() => onAdvance('next')}
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-3 py-3 text-sm text-slate-500">
            Adjust the filters to bring assertions back into the review queue.
          </p>
        )}
      </section>

      {sections.map((section) => (
        <section key={section.id} className="rounded-[24px] border border-slate-800/80 bg-slate-950/45 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-100">{section.title}</h4>
              <p className="mt-1 text-xs leading-5 text-slate-400">{section.description}</p>
            </div>
            <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300">
              {section.rows.length}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {section.rows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-3 py-3 text-sm text-slate-500">
                Nothing in this section for the current filters.
              </p>
            ) : (
              section.rows.slice(0, 8).map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onSelectAssertion(row.id)}
                  className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    activeAssertionId === row.id
                      ? 'border-sky-500/40 bg-sky-500/10'
                      : 'border-slate-800/80 bg-slate-900/45 hover:border-slate-700 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-100">{row.path}</div>
                    <div className="mt-1 text-xs text-slate-400">{row.subjectLabel} • {row.valueSummary}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${reviewTone(row)}`}>
                      {row.review_state}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${evidenceTone(row)}`}>
                      {row.evidenceStatus === 'multiple' ? '3+' : row.evidenceStatus === 'single' ? '1 src' : '0 src'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      ))}

      <section className="rounded-[24px] border border-slate-800/80 bg-slate-950/45 px-4 py-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Case quality snapshot</div>
        <div className="mt-2 text-sm leading-6 text-slate-400">
          {assertions.length} assertions, {sources.length} sources, {reviewItems.filter((item) => item.review_state === 'unreviewed').length} still unreviewed.
        </div>
      </section>
    </div>
  );
}
