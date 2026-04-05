import type { SourceWithUsage } from '@shared/types';
import { ConfidenceBadge } from './ConfidenceBadge';
import type { DerivedReviewAssertion, ReviewFilters } from '@renderer/features/review/reviewModel';
import type { GraphSnapshot } from '@renderer/types/graph';
import { piBridge } from '@renderer/services/piBridge';
import { emitToast } from '@renderer/lib/toast';
import React from 'react';

type ReviewSectionId =
  | 'needs-review'
  | 'disputed'
  | 'rejected'
  | 'weakly-supported'
  | 'no-sources'
  | 'recently-reviewed';

interface ReviewWorkspaceProps {
  graph: GraphSnapshot;
  reviewItems: DerivedReviewAssertion[];
  filteredReviewItems: DerivedReviewAssertion[];
  reviewFilters: ReviewFilters;
  activeReviewAssertionId: string | null;
  reviewSources: SourceWithUsage[];
  onReviewFiltersChange: React.Dispatch<React.SetStateAction<ReviewFilters>>;
  onSelectReviewAssertion: (assertionId: string) => void;
  onAdvanceReview: (direction: 'previous' | 'next') => void;
  onNextUnreviewedReview: () => void;
  onOpenInInvestigation: (assertionId: string) => void;
}

function reviewTone(state: DerivedReviewAssertion['review_state']) {
  if (state === 'accepted') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';
  if (state === 'disputed') return 'border-amber-500/20 bg-amber-500/10 text-amber-200';
  if (state === 'rejected') return 'border-rose-500/20 bg-rose-500/10 text-rose-200';
  return 'border-slate-700/80 bg-slate-900/70 text-slate-300';
}

function evidenceTone(status: DerivedReviewAssertion['evidenceStatus']) {
  if (status === 'multiple') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';
  if (status === 'single') return 'border-sky-500/20 bg-sky-500/10 text-sky-200';
  return 'border-rose-500/20 bg-rose-500/10 text-rose-200';
}

function evidenceLabel(status: DerivedReviewAssertion['evidenceStatus']) {
  if (status === 'multiple') return 'Multiple sources';
  if (status === 'single') return 'Single source';
  return 'No sources';
}

function formatValue(value: Record<string, unknown>) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatRelativeTime(timestampSeconds: number | null | undefined) {
  if (typeof timestampSeconds !== 'number' || !Number.isFinite(timestampSeconds) || timestampSeconds <= 0) return 'recent';
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

function formatTimestamp(timestampSeconds: number | null | undefined) {
  if (typeof timestampSeconds !== 'number' || !Number.isFinite(timestampSeconds) || timestampSeconds <= 0) return null;
  const normalized = timestampSeconds > 1_000_000_000_000 ? timestampSeconds : timestampSeconds * 1000;
  return new Date(normalized).toLocaleString();
}

function ReviewSectionButton({
  active,
  title,
  count,
  description,
  onClick
}: {
  active: boolean;
  title: string;
  count: number;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
        active
          ? 'border-sky-500/40 bg-sky-500/10 text-white shadow-[0_18px_40px_rgba(14,165,233,0.08)]'
          : 'border-slate-800/80 bg-slate-950/35 text-slate-300 hover:border-slate-700 hover:bg-slate-900/55'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{title}</span>
        <span className="rounded-full border border-slate-700/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-400">
          {count}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </button>
  );
}

export function ReviewWorkspace({
  graph,
  reviewItems,
  filteredReviewItems,
  reviewFilters,
  activeReviewAssertionId,
  reviewSources,
  onReviewFiltersChange,
  onSelectReviewAssertion,
  onAdvanceReview,
  onNextUnreviewedReview,
  onOpenInInvestigation
}: ReviewWorkspaceProps) {
  const [activeSection, setActiveSection] = React.useState<ReviewSectionId>('needs-review');
  const [reviewStateDraft, setReviewStateDraft] = React.useState<DerivedReviewAssertion['review_state']>('unreviewed');
  const [reviewNoteDraft, setReviewNoteDraft] = React.useState('');
  const [reviewBusy, setReviewBusy] = React.useState(false);

  const sections = React.useMemo(
    () => [
      {
        id: 'needs-review' as const,
        title: 'Needs review',
        description: 'Assertions still waiting for an explicit decision.',
        rows: filteredReviewItems.filter((item) => item.review_state === 'unreviewed')
      },
      {
        id: 'disputed' as const,
        title: 'Disputed',
        description: 'Claims that need resolution or follow-up sourcing.',
        rows: filteredReviewItems.filter((item) => item.review_state === 'disputed')
      },
      {
        id: 'rejected' as const,
        title: 'Rejected',
        description: 'Assertions removed from the defensible case narrative.',
        rows: filteredReviewItems.filter((item) => item.review_state === 'rejected')
      },
      {
        id: 'weakly-supported' as const,
        title: 'Weakly supported',
        description: 'Assertions with no source or only one supporting source.',
        rows: filteredReviewItems.filter((item) => item.evidenceStatus !== 'multiple')
      },
      {
        id: 'no-sources' as const,
        title: 'No sources',
        description: 'Assertions that have no supporting source at all.',
        rows: filteredReviewItems.filter((item) => item.evidenceStatus === 'none')
      },
      {
        id: 'recently-reviewed' as const,
        title: 'Recently reviewed',
        description: 'Accepted, disputed, or rejected assertions ordered by review time.',
        rows: filteredReviewItems
          .filter((item) => item.reviewed_at)
          .sort((a, b) => (b.reviewed_at ?? 0) - (a.reviewed_at ?? 0))
      }
    ],
    [filteredReviewItems]
  );

  const activeRows = React.useMemo(
    () => sections.find((section) => section.id === activeSection)?.rows ?? filteredReviewItems,
    [activeSection, filteredReviewItems, sections]
  );

  const activeItem = React.useMemo(
    () => activeRows.find((item) => item.id === activeReviewAssertionId) ?? activeRows[0] ?? null,
    [activeReviewAssertionId, activeRows]
  );

  React.useEffect(() => {
    if (!activeRows.length) return;
    if (!activeItem) onSelectReviewAssertion(activeRows[0].id);
  }, [activeItem, activeRows, onSelectReviewAssertion]);

  React.useEffect(() => {
    if (!activeItem) {
      setReviewStateDraft('unreviewed');
      setReviewNoteDraft('');
      return;
    }
    setReviewStateDraft(activeItem.review_state);
    setReviewNoteDraft(activeItem.review_note ?? '');
  }, [activeItem]);

  const activeSourceUsages = React.useMemo(() => {
    if (!activeItem) return [];
    return reviewSources.filter((source) => source.usage.some((usage) => usage.assertion_id === activeItem.id));
  }, [activeItem, reviewSources]);

  const relatedAssertions = React.useMemo(() => {
    if (!activeItem) return { corroborating: [], conflicting: [] } as const;
    const samePath = reviewItems.filter(
      (item) => item.subject_id === activeItem.subject_id && item.path === activeItem.path && item.id !== activeItem.id
    );
    const ownValue = JSON.stringify(activeItem.value);
    return {
      corroborating: samePath.filter((item) => JSON.stringify(item.value) === ownValue),
      conflicting: samePath.filter((item) => JSON.stringify(item.value) !== ownValue)
    } as const;
  }, [activeItem, reviewItems]);

  const reviewCoverage = reviewItems.length === 0 ? 0 : Math.round((reviewItems.filter((item) => item.review_state !== 'unreviewed').length / reviewItems.length) * 100);
  const evidenceGapCount = reviewItems.filter((item) => item.evidenceStatus === 'none').length;
  const disputedCount = reviewItems.filter((item) => item.review_state === 'disputed').length;
  const rejectedCount = reviewItems.filter((item) => item.review_state === 'rejected').length;
  const unreviewedCount = reviewItems.filter((item) => item.review_state === 'unreviewed').length;

  const persistReview = React.useCallback(
    async (nextReviewState: DerivedReviewAssertion['review_state']) => {
      if (!activeItem) return;
      setReviewBusy(true);
      try {
        await piBridge.updateAssertion(activeItem.id, {
          review_state: nextReviewState,
          review_note: reviewNoteDraft.trim() || null
        });
        window.dispatchEvent(new CustomEvent('pi:refresh'));
        emitToast({
          tone: 'success',
          title: 'Review updated',
          description: `${activeItem.subjectLabel} marked ${nextReviewState}.`
        });
      } catch (error) {
        emitToast({
          tone: 'error',
          title: 'Review update failed',
          description: error instanceof Error ? error.message : 'Could not update the assertion review state.'
        });
      } finally {
        setReviewBusy(false);
      }
    },
    [activeItem, reviewNoteDraft]
  );

  const saveNote = React.useCallback(async () => {
    if (!activeItem) return;
    setReviewBusy(true);
    try {
      await piBridge.updateAssertion(activeItem.id, {
        review_note: reviewNoteDraft.trim() || null
      });
      window.dispatchEvent(new CustomEvent('pi:refresh'));
      emitToast({
        tone: 'success',
        title: 'Review note saved',
        description: 'The assertion note was updated.'
      });
    } catch (error) {
      emitToast({
        tone: 'error',
        title: 'Note save failed',
        description: error instanceof Error ? error.message : 'Could not save the review note.'
      });
    } finally {
      setReviewBusy(false);
    }
  }, [activeItem, reviewNoteDraft]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[rgba(7,11,23,0.94)]">
      <div className="border-b border-slate-800/80 px-6 py-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Review workspace</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Review the case deliberately</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Work through assertions one at a time, see their evidence context, and decide what belongs in the defensible case narrative.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { label: 'Coverage', value: `${reviewCoverage}%`, tone: 'text-slate-100' },
              { label: 'Unreviewed', value: unreviewedCount, tone: 'text-slate-100' },
              { label: 'Disputed', value: disputedCount, tone: 'text-amber-200' },
              { label: 'Rejected', value: rejectedCount, tone: 'text-rose-200' },
              { label: 'No sources', value: evidenceGapCount, tone: 'text-rose-200' }
            ].map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-800/80 bg-slate-950/45 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{metric.label}</div>
                <div className={`mt-2 text-xl font-semibold ${metric.tone}`}>{metric.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[330px_minmax(0,1fr)_360px]">
        <aside className="min-h-0 overflow-y-auto border-r border-slate-800/80 bg-slate-950/40 px-4 py-4">
          <div className="space-y-3">
            <input
              type="text"
              value={reviewFilters.query}
              onChange={(event) => onReviewFiltersChange((current) => ({ ...current, query: event.target.value }))}
              placeholder="Search subject, path, value, or source…"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={reviewFilters.reviewState}
                onChange={(event) => onReviewFiltersChange((current) => ({ ...current, reviewState: event.target.value as ReviewFilters['reviewState'] }))}
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All states</option>
                <option value="unreviewed">Unreviewed</option>
                <option value="accepted">Accepted</option>
                <option value="disputed">Disputed</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={reviewFilters.evidence}
                onChange={(event) => onReviewFiltersChange((current) => ({ ...current, evidence: event.target.value as ReviewFilters['evidence'] }))}
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All evidence</option>
                <option value="none">No sources</option>
                <option value="weak">Weak support</option>
              </select>
              <select
                value={reviewFilters.confidence}
                onChange={(event) => onReviewFiltersChange((current) => ({ ...current, confidence: event.target.value as ReviewFilters['confidence'] }))}
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All confidence</option>
                <option value="unverified">Unverified</option>
                <option value="asserted">Asserted</option>
                <option value="verified">Verified</option>
              </select>
              <select
                value={reviewFilters.sort}
                onChange={(event) => onReviewFiltersChange((current) => ({ ...current, sort: event.target.value as ReviewFilters['sort'] }))}
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="unreviewed_first">Unreviewed first</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="weakest_evidence">Weakest evidence first</option>
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {sections.map((section) => (
              <ReviewSectionButton
                key={section.id}
                active={activeSection === section.id}
                title={section.title}
                count={section.rows.length}
                description={section.description}
                onClick={() => setActiveSection(section.id)}
              />
            ))}
          </div>

          <div className="mt-5 space-y-2">
            {activeRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-3 py-4 text-sm text-slate-500">
                No assertions match the current review section and filters.
              </div>
            ) : (
              activeRows.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectReviewAssertion(item.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                    activeItem?.id === item.id
                      ? 'border-sky-500/40 bg-sky-500/10 shadow-[0_14px_30px_rgba(14,165,233,0.08)]'
                      : 'border-slate-800/80 bg-slate-950/35 hover:border-slate-700 hover:bg-slate-900/55'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-semibold text-slate-100">{item.subjectLabel}</div>
                    <div className="text-[11px] text-slate-500">{formatRelativeTime(item.reviewed_at ?? item.created_at)}</div>
                  </div>
                  <div className="mt-1 truncate text-xs uppercase tracking-[0.16em] text-slate-500">{item.path}</div>
                  <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{item.valueSummary}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${reviewTone(item.review_state)}`}>
                      {item.review_state}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${evidenceTone(item.evidenceStatus)}`}>
                      {evidenceLabel(item.evidenceStatus)}
                    </span>
                    {item.conflictStatus === 'conflict' ? (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-amber-200">
                        Conflict
                      </span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto px-6 py-5">
          {!activeItem ? (
            <div className="flex h-full items-center justify-center rounded-[28px] border border-dashed border-slate-800 bg-slate-950/30 text-sm text-slate-500">
              Select an assertion from the review queue to begin.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-[28px] border border-slate-800/80 bg-slate-950/35 p-5 shadow-[0_22px_44px_rgba(2,6,23,0.26)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{activeItem.subjectLabel}</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">{activeItem.path}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                      Review this assertion in context, verify that its evidence support is strong enough, and decide whether it belongs in the case narrative.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${reviewTone(activeItem.review_state)}`}>
                      {activeItem.review_state}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${evidenceTone(activeItem.evidenceStatus)}`}>
                      {evidenceLabel(activeItem.evidenceStatus)}
                    </span>
                    {activeItem.conflictStatus === 'conflict' ? (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-200">
                        Conflict candidate
                      </span>
                    ) : null}
                    <ConfidenceBadge confidence={activeItem.confidence} />
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">Assertion value</div>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">{formatValue(activeItem.value)}</pre>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/45 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Primary source</div>
                    <div className="mt-2 text-sm text-slate-100">{activeItem.sourceTitle || 'None linked'}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/45 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Supporting sources</div>
                    <div className="mt-2 text-sm text-slate-100">{activeItem.supportingSourceCount}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/45 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Corroboration</div>
                    <div className="mt-2 text-sm text-slate-100">{activeItem.corroborationCount}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/45 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Created</div>
                    <div className="mt-2 text-sm text-slate-100">{formatTimestamp(activeItem.created_at) || 'Unknown'}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-800/80 bg-slate-950/35 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Review decision</h4>
                    <p className="mt-1 text-xs text-slate-500">Set the review outcome and keep a note explaining why.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-[11px] text-slate-300 transition hover:bg-slate-800"
                      onClick={() => onAdvanceReview('previous')}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-[11px] text-slate-300 transition hover:bg-slate-800"
                      onClick={onNextUnreviewedReview}
                    >
                      Next unreviewed
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-[11px] text-slate-300 transition hover:bg-slate-800"
                      onClick={() => onAdvanceReview('next')}
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[11px] text-sky-200 transition hover:bg-sky-500/20"
                      onClick={() => onOpenInInvestigation(activeItem.id)}
                    >
                      Open in Investigation
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {(['accepted', 'disputed', 'rejected', 'unreviewed'] as const).map((state) => (
                    <button
                      key={state}
                      type="button"
                      disabled={reviewBusy}
                      onClick={() => {
                        setReviewStateDraft(state);
                        void persistReview(state);
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        reviewStateDraft === state
                          ? reviewTone(state)
                          : 'border-slate-800/80 bg-slate-950/35 text-slate-300 hover:border-slate-700 hover:bg-slate-900/55'
                      } ${reviewBusy ? 'cursor-wait opacity-70' : ''}`}
                    >
                      <div className="text-sm font-semibold capitalize">{state === 'unreviewed' ? 'Reset' : state}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {state === 'accepted'
                          ? 'Keep this claim in the defensible case narrative.'
                          : state === 'disputed'
                            ? 'Flag it for follow-up or contradiction resolution.'
                            : state === 'rejected'
                              ? 'Mark it as unfit for the final narrative.'
                              : 'Return it to the inbox for review later.'}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-slate-500">Review note</label>
                  <textarea
                    value={reviewNoteDraft}
                    onChange={(event) => setReviewNoteDraft(event.target.value)}
                    rows={4}
                    placeholder="Why is this accepted, disputed, or rejected?"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      {activeItem.reviewed_at ? `Last reviewed ${formatTimestamp(activeItem.reviewed_at)}` : 'Not reviewed yet'}
                    </div>
                    <button
                      type="button"
                      disabled={reviewBusy}
                      onClick={() => void saveNote()}
                      className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
                    >
                      {reviewBusy ? 'Saving…' : 'Save note'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="min-h-0 overflow-y-auto border-l border-slate-800/80 bg-slate-950/30 px-4 py-5">
          {!activeItem ? null : (
            <div className="space-y-5">
              <section className="rounded-[24px] border border-slate-800/80 bg-slate-950/35 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Supporting sources</h4>
                <p className="mt-1 text-xs text-slate-500">Everything currently linked to this assertion.</p>
                <div className="mt-4 space-y-2">
                  {activeSourceUsages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-3 py-3 text-sm text-slate-500">
                      No supporting source is linked yet.
                    </div>
                  ) : (
                    activeSourceUsages.map((source) => (
                      <div key={source.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/55 px-3 py-3">
                        <div className="text-sm font-semibold text-slate-100">
                          {source.title || source.display_name || source.file_name || source.locator}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{source.kind} • {source.mime || 'unknown MIME'}</div>
                        <div className="mt-2 text-xs text-slate-400 break-all">{source.locator}</div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-800/80 bg-slate-950/35 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Corroboration</h4>
                <p className="mt-1 text-xs text-slate-500">Other assertions on the same subject and path.</p>
                <div className="mt-4 space-y-2">
                  {relatedAssertions.corroborating.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-3 py-3 text-sm text-slate-500">
                      No corroborating assertions were found.
                    </div>
                  ) : (
                    relatedAssertions.corroborating.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-3">
                        <div className="text-xs text-emerald-200">{item.valueSummary}</div>
                        <div className="mt-2 text-[11px] text-slate-500">{item.sourceTitle || 'No direct source'} • {formatRelativeTime(item.created_at)}</div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-800/80 bg-slate-950/35 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Conflicts</h4>
                <p className="mt-1 text-xs text-slate-500">Values that disagree with the active assertion.</p>
                <div className="mt-4 space-y-2">
                  {relatedAssertions.conflicting.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-3 py-3 text-sm text-slate-500">
                      No conflict candidates were detected.
                    </div>
                  ) : (
                    relatedAssertions.conflicting.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-3 py-3">
                        <div className="text-xs text-amber-100">{item.valueSummary}</div>
                        <div className="mt-2 text-[11px] text-slate-500">{item.sourceTitle || 'No direct source'} • {formatRelativeTime(item.created_at)}</div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-800/80 bg-slate-950/35 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Subject context</h4>
                <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/55 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Entity</div>
                  <div className="mt-2 text-sm text-slate-100">{activeItem.subjectLabel}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {graph.nodes.find((node) => node.id === activeItem.subject_id)?.type || 'unknown type'}
                  </div>
                </div>
              </section>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
