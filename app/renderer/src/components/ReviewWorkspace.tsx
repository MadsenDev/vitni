import type { SourceWithUsage } from '@shared/types';
import { ConfidenceBadge } from './ConfidenceBadge';
import type { DerivedReviewAssertion, ReviewFilters } from '@renderer/features/review/reviewModel';
import type { GraphSnapshot } from '@renderer/types/graph';
import { piBridge } from '@renderer/services/piBridge';
import { emitToast } from '@renderer/lib/toast';
import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import {
  ThemedBadge,
  ThemedButton,
  ThemedCard,
  ThemedInput,
  ThemedPanel,
  ThemedSection,
  ThemedSelect,
  ThemedTextarea
} from '@renderer/features/personalization/primitives';

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
  if (state === 'accepted') return 'success' as const;
  if (state === 'disputed') return 'warning' as const;
  if (state === 'rejected') return 'danger' as const;
  return 'default' as const;
}

function evidenceTone(status: DerivedReviewAssertion['evidenceStatus']) {
  if (status === 'multiple') return 'success' as const;
  if (status === 'single') return 'accent' as const;
  return 'danger' as const;
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
    <ThemedButton
      type="button"
      onClick={onClick}
      variant={active ? 'accent' : 'default'}
      className="w-full rounded-2xl px-3 py-3 text-left shadow-none"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{title}</span>
        <ThemedBadge className="px-2 py-0.5" style={{ color: 'var(--text-muted)' }}>
          {count}
        </ThemedBadge>
      </div>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>{description}</p>
    </ThemedButton>
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
  const [activeSection, setActiveSection] = React.useState<ReviewSectionId | null>(null);
  const [navDirection, setNavDirection] = React.useState<'forward' | 'back'>('forward');
  const [reviewStateDraft, setReviewStateDraft] = React.useState<DerivedReviewAssertion['review_state']>('unreviewed');
  const [reviewNoteDraft, setReviewNoteDraft] = React.useState('');
  const [reviewBusy, setReviewBusy] = React.useState(false);

  const sections = React.useMemo(
    () => [
      {
        id: 'needs-review' as const,
        title: 'Needs review',
        description: 'Facts still waiting for an explicit decision.',
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
        description: 'Facts removed from the defensible case narrative.',
        rows: filteredReviewItems.filter((item) => item.review_state === 'rejected')
      },
      {
        id: 'weakly-supported' as const,
        title: 'Weakly supported',
        description: 'Facts with no source or only one supporting source.',
        rows: filteredReviewItems.filter((item) => item.evidenceStatus !== 'multiple')
      },
      {
        id: 'no-sources' as const,
        title: 'No sources',
        description: 'Facts that have no supporting source at all.',
        rows: filteredReviewItems.filter((item) => item.evidenceStatus === 'none')
      },
      {
        id: 'recently-reviewed' as const,
        title: 'Recently reviewed',
        description: 'Accepted, disputed, or rejected facts ordered by review time.',
        rows: filteredReviewItems
          .filter((item) => item.reviewed_at)
          .sort((a, b) => (b.reviewed_at ?? 0) - (a.reviewed_at ?? 0))
      }
    ],
    [filteredReviewItems]
  );

  const activeRows = React.useMemo(
    () => (activeSection ? sections.find((section) => section.id === activeSection)?.rows ?? [] : []),
    [activeSection, sections]
  );

  const activeItem = React.useMemo(
    () => activeRows.find((item) => item.id === activeReviewAssertionId) ?? activeRows[0] ?? null,
    [activeReviewAssertionId, activeRows]
  );

  React.useEffect(() => {
    if (!activeSection) return;
    if (!activeRows.length) return;
    if (!activeItem) onSelectReviewAssertion(activeRows[0].id);
  }, [activeItem, activeRows, activeSection, onSelectReviewAssertion]);

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

  const activeSectionMeta = React.useMemo(
    () => (activeSection ? sections.find((section) => section.id === activeSection) ?? null : null),
    [activeSection, sections]
  );

  const queueTransition = React.useMemo(
    () => ({
      initial: { opacity: 0, x: navDirection === 'forward' ? 28 : -28 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: navDirection === 'forward' ? -28 : 28 }
    }),
    [navDirection]
  );

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: 'var(--app-bg-soft)' }}>
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-elevated)' }}>
        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Review workspace</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Review the case deliberately</h2>
            <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--text-muted)' }}>
              Work through facts one at a time, see their source context, and decide what belongs in the defensible case narrative.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { label: 'Coverage', value: `${reviewCoverage}%`, color: 'var(--text-primary)' },
              { label: 'Unreviewed', value: unreviewedCount, color: 'var(--text-primary)' },
              { label: 'Disputed', value: disputedCount, color: 'var(--status-warning-text)' },
              { label: 'Rejected', value: rejectedCount, color: 'var(--status-danger-text)' },
              { label: 'No sources', value: evidenceGapCount, color: 'var(--status-danger-text)' }
            ].map((metric) => (
              <ThemedCard key={metric.label} className="px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>{metric.label}</div>
                <div className="mt-2 text-xl font-semibold" style={{ color: metric.color }}>{metric.value}</div>
              </ThemedCard>
            ))}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[330px_minmax(0,1fr)_360px]">
        <aside className="min-h-0 overflow-y-auto px-4 py-4" style={{ borderRight: '1px solid var(--border-subtle)', background: 'var(--surface-base)' }}>
          <div className="space-y-3">
            <ThemedInput
              type="text"
              value={reviewFilters.query}
              onChange={(event) => onReviewFiltersChange((current) => ({ ...current, query: event.target.value }))}
              placeholder="Search subject, path, value, or source…"
            />
            <div className="grid grid-cols-2 gap-2">
              <ThemedSelect
                value={reviewFilters.reviewState}
                onChange={(event) => onReviewFiltersChange((current) => ({ ...current, reviewState: event.target.value as ReviewFilters['reviewState'] }))}
              >
                <option value="all">All states</option>
                <option value="unreviewed">Unreviewed</option>
                <option value="accepted">Accepted</option>
                <option value="disputed">Disputed</option>
                <option value="rejected">Rejected</option>
              </ThemedSelect>
              <ThemedSelect
                value={reviewFilters.evidence}
                onChange={(event) => onReviewFiltersChange((current) => ({ ...current, evidence: event.target.value as ReviewFilters['evidence'] }))}
              >
                <option value="all">All evidence</option>
                <option value="none">No sources</option>
                <option value="weak">Weak support</option>
              </ThemedSelect>
              <ThemedSelect
                value={reviewFilters.confidence}
                onChange={(event) => onReviewFiltersChange((current) => ({ ...current, confidence: event.target.value as ReviewFilters['confidence'] }))}
              >
                <option value="all">All confidence</option>
                <option value="unverified">Unverified</option>
                <option value="asserted">Asserted</option>
                <option value="verified">Verified</option>
              </ThemedSelect>
              <ThemedSelect
                value={reviewFilters.sort}
                onChange={(event) => onReviewFiltersChange((current) => ({ ...current, sort: event.target.value as ReviewFilters['sort'] }))}
              >
                <option value="unreviewed_first">Unreviewed first</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="weakest_evidence">Weakest evidence first</option>
              </ThemedSelect>
            </div>
          </div>

          <div className="relative mt-4 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {activeSectionMeta ? (
                <motion.div
                  key={`section-${activeSectionMeta.id}`}
                  variants={queueTransition}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-2"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <ThemedButton
                      type="button"
                      onClick={() => {
                        setNavDirection('back');
                        setActiveSection(null);
                      }}
                      variant="quiet"
                      className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em]"
                    >
                      <span aria-hidden="true">←</span>
                      Back
                    </ThemedButton>
                    <div className="text-right">
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{activeSectionMeta.title}</div>
                      <div className="text-[11px]" style={{ color: 'var(--text-soft)' }}>{activeSectionMeta.rows.length} items</div>
                    </div>
                  </div>

                  <ThemedCard className="mb-4 px-3 py-3">
                    <div className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>{activeSectionMeta.description}</div>
                  </ThemedCard>

                  {activeRows.length === 0 ? (
                    <ThemedCard className="border-dashed px-3 py-4 text-sm" style={{ color: 'var(--text-soft)' }}>
                      No facts match the current review section and filters.
                    </ThemedCard>
                  ) : (
                    activeRows.map((item) => (
                      <ThemedButton
                        key={item.id}
                        type="button"
                        onClick={() => onSelectReviewAssertion(item.id)}
                        variant={activeItem?.id === item.id ? 'accent' : 'default'}
                        className="w-full rounded-2xl px-3 py-3 text-left"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.subjectLabel}</div>
                          <div className="text-[11px]" style={{ color: 'var(--text-soft)' }}>{formatRelativeTime(item.reviewed_at ?? item.created_at)}</div>
                        </div>
                        <div className="mt-1 truncate text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-soft)' }}>{item.path}</div>
                        <div className="mt-2 line-clamp-2 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>{item.valueSummary}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <ThemedBadge tone={reviewTone(item.review_state)} className="px-2 py-0.5">
                            {item.review_state}
                          </ThemedBadge>
                          <ThemedBadge tone={evidenceTone(item.evidenceStatus)} className="px-2 py-0.5">
                            {evidenceLabel(item.evidenceStatus)}
                          </ThemedBadge>
                          {item.conflictStatus === 'conflict' ? (
                            <ThemedBadge tone="warning" className="px-2 py-0.5">
                              Conflict
                            </ThemedBadge>
                          ) : null}
                        </div>
                      </ThemedButton>
                    ))
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="section-list"
                  variants={queueTransition}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-2"
                >
                  {sections.map((section) => (
                    <ReviewSectionButton
                      key={section.id}
                      active={false}
                      title={section.title}
                      count={section.rows.length}
                      description={section.description}
                      onClick={() => {
                        setNavDirection('forward');
                        setActiveSection(section.id);
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto px-6 py-5">
          {!activeSectionMeta ? (
            <ThemedSection className="flex h-full items-center justify-center border-dashed text-sm" style={{ color: 'var(--text-soft)' }}>
              Choose a review category to open its fact queue.
            </ThemedSection>
          ) : !activeItem ? (
            <ThemedSection className="flex h-full items-center justify-center border-dashed text-sm" style={{ color: 'var(--text-soft)' }}>
              Select a fact from the review queue to begin.
            </ThemedSection>
          ) : (
            <div className="space-y-5">
              <ThemedPanel className="rounded-[28px] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>{activeItem.subjectLabel}</p>
                    <h3 className="mt-2 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{activeItem.path}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
                      Review this fact in context, verify that its source support is strong enough, and decide whether it belongs in the case narrative.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ThemedBadge tone={reviewTone(activeItem.review_state)} className="px-3 py-1 text-[11px]">
                      {activeItem.review_state}
                    </ThemedBadge>
                    <ThemedBadge tone={evidenceTone(activeItem.evidenceStatus)} className="px-3 py-1 text-[11px]">
                      {evidenceLabel(activeItem.evidenceStatus)}
                    </ThemedBadge>
                    {activeItem.conflictStatus === 'conflict' ? (
                      <ThemedBadge tone="warning" className="px-3 py-1 text-[11px]">
                        Conflict candidate
                      </ThemedBadge>
                    ) : null}
                    <ConfidenceBadge confidence={activeItem.confidence} />
                  </div>
                </div>

                <ThemedCard className="mt-5 p-4">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Fact value</div>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-6" style={{ color: 'var(--text-primary)' }}>{formatValue(activeItem.value)}</pre>
                </ThemedCard>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ['Primary source', activeItem.sourceTitle || 'None linked'],
                    ['Supporting sources', String(activeItem.supportingSourceCount)],
                    ['Corroboration', String(activeItem.corroborationCount)],
                    ['Created', formatTimestamp(activeItem.created_at) || 'Unknown']
                  ].map(([label, value]) => (
                    <ThemedCard key={label} className="px-4 py-3">
                      <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>{label}</div>
                      <div className="mt-2 text-sm" style={{ color: 'var(--text-primary)' }}>{value}</div>
                    </ThemedCard>
                  ))}
                </div>
              </ThemedPanel>

              <ThemedPanel className="rounded-[28px] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Review decision</h4>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>Set the review outcome and keep a note explaining why.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ThemedButton variant="quiet" className="text-[11px]" onClick={() => onAdvanceReview('previous')}>Previous</ThemedButton>
                    <ThemedButton variant="quiet" className="text-[11px]" onClick={onNextUnreviewedReview}>Next unreviewed</ThemedButton>
                    <ThemedButton variant="quiet" className="text-[11px]" onClick={() => onAdvanceReview('next')}>Next</ThemedButton>
                    <ThemedButton variant="accent" className="text-[11px]" onClick={() => onOpenInInvestigation(activeItem.id)}>Open in Investigation</ThemedButton>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {(['accepted', 'disputed', 'rejected', 'unreviewed'] as const).map((state) => (
                    <ThemedButton
                      key={state}
                      type="button"
                      disabled={reviewBusy}
                      onClick={() => {
                        setReviewStateDraft(state);
                        void persistReview(state);
                      }}
                      variant={reviewStateDraft === state ? reviewTone(state) : 'default'}
                      className="rounded-2xl px-4 py-3 text-left"
                    >
                      <div className="text-sm font-semibold capitalize">{state === 'unreviewed' ? 'Reset' : state}</div>
                      <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {state === 'accepted'
                          ? 'Keep this claim in the defensible case narrative.'
                          : state === 'disputed'
                            ? 'Flag it for follow-up or contradiction resolution.'
                            : state === 'rejected'
                              ? 'Mark it as unfit for the final narrative.'
                              : 'Return it to the inbox for review later.'}
                      </div>
                    </ThemedButton>
                  ))}
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Review note</label>
                  <ThemedTextarea
                    value={reviewNoteDraft}
                    onChange={(event) => setReviewNoteDraft(event.target.value)}
                    rows={4}
                    placeholder="Why is this accepted, disputed, or rejected?"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs" style={{ color: 'var(--text-soft)' }}>
                      {activeItem.reviewed_at ? `Last reviewed ${formatTimestamp(activeItem.reviewed_at)}` : 'Not reviewed yet'}
                    </div>
                    <ThemedButton type="button" disabled={reviewBusy} onClick={() => void saveNote()}>
                      {reviewBusy ? 'Saving…' : 'Save note'}
                    </ThemedButton>
                  </div>
                </div>
              </ThemedPanel>
            </div>
          )}
        </section>

        <aside className="min-h-0 overflow-y-auto px-4 py-5" style={{ borderLeft: '1px solid var(--border-subtle)', background: 'var(--surface-base)' }}>
          {!activeSectionMeta || !activeItem ? null : (
            <div className="space-y-5">
              <ThemedSection>
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Supporting sources</h4>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>Everything currently linked to this fact.</p>
                <div className="mt-4 space-y-2">
                  {activeSourceUsages.length === 0 ? (
                    <ThemedCard className="border-dashed px-3 py-3 text-sm" style={{ color: 'var(--text-soft)' }}>
                      No supporting source is linked yet.
                    </ThemedCard>
                  ) : (
                    activeSourceUsages.map((source) => (
                      <ThemedCard key={source.id} className="px-3 py-3">
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {source.title || source.display_name || source.file_name || source.locator}
                        </div>
                        <div className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>{source.kind} • {source.mime || 'unknown MIME'}</div>
                        <div className="mt-2 break-all text-xs" style={{ color: 'var(--text-muted)' }}>{source.locator}</div>
                      </ThemedCard>
                    ))
                  )}
                </div>
              </ThemedSection>

              <ThemedSection>
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Corroboration</h4>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>Other facts on the same subject and path.</p>
                <div className="mt-4 space-y-2">
                  {relatedAssertions.corroborating.length === 0 ? (
                    <ThemedCard className="border-dashed px-3 py-3 text-sm" style={{ color: 'var(--text-soft)' }}>
                      No corroborating facts were found.
                    </ThemedCard>
                  ) : (
                    relatedAssertions.corroborating.map((item) => (
                      <ThemedCard key={item.id} tone="success" className="px-3 py-3">
                        <div className="text-xs">{item.valueSummary}</div>
                        <div className="mt-2 text-[11px]" style={{ color: 'var(--text-soft)' }}>{item.sourceTitle || 'No direct source'} • {formatRelativeTime(item.created_at)}</div>
                      </ThemedCard>
                    ))
                  )}
                </div>
              </ThemedSection>

              <ThemedSection>
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Conflicts</h4>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>Values that disagree with the active fact.</p>
                <div className="mt-4 space-y-2">
                  {relatedAssertions.conflicting.length === 0 ? (
                    <ThemedCard className="border-dashed px-3 py-3 text-sm" style={{ color: 'var(--text-soft)' }}>
                      No conflict candidates were detected.
                    </ThemedCard>
                  ) : (
                    relatedAssertions.conflicting.map((item) => (
                      <ThemedCard key={item.id} tone="warning" className="px-3 py-3">
                        <div className="text-xs">{item.valueSummary}</div>
                        <div className="mt-2 text-[11px]" style={{ color: 'var(--text-soft)' }}>{item.sourceTitle || 'No direct source'} • {formatRelativeTime(item.created_at)}</div>
                      </ThemedCard>
                    ))
                  )}
                </div>
              </ThemedSection>

              <ThemedSection>
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Subject context</h4>
                <ThemedCard className="mt-4 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Entity</div>
                  <div className="mt-2 text-sm" style={{ color: 'var(--text-primary)' }}>{activeItem.subjectLabel}</div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>
                    {graph.nodes.find((node) => node.id === activeItem.subject_id)?.type || 'unknown type'}
                  </div>
                </ThemedCard>
              </ThemedSection>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
