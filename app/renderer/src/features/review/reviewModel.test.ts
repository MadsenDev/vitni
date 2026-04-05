import { describe, expect, it } from 'vitest';
import { buildDerivedReviewAssertions, filterReviewAssertions, getAdjacentReviewAssertionId, getNextUnreviewedAssertionId } from './reviewModel';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { SourceWithUsage } from '@shared/types';
import type { GraphSnapshot } from '@renderer/types/graph';

const graph: GraphSnapshot = {
  nodes: [
    { id: 'person-1', type: 'person', label: 'Alice Example', properties: {}, created_at: 1, updated_at: 1 },
    { id: 'person-2', type: 'person', label: 'Bob Example', properties: {}, created_at: 1, updated_at: 1 }
  ],
  edges: []
};

const sources: SourceWithUsage[] = [
  { id: 'source-1', kind: 'report', locator: 'a.txt', title: 'Report A', added_at: 1, hash: null, mime: 'text/plain', usage: [] },
  { id: 'source-2', kind: 'report', locator: 'b.txt', title: 'Report B', added_at: 1, hash: null, mime: 'text/plain', usage: [] }
];

const assertions: ParsedAssertionRecord[] = [
  {
    id: 'assertion-1',
    subject_kind: 'entity',
    subject_id: 'person-1',
    path: 'name.full',
    value: { value: 'Alice Example' },
    source_id: 'source-1',
    confidence: 'asserted',
    review_state: 'unreviewed',
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: 10
  },
  {
    id: 'assertion-2',
    subject_kind: 'entity',
    subject_id: 'person-1',
    path: 'name.full',
    value: { value: 'Alice Example' },
    source_id: 'source-2',
    confidence: 'verified',
    review_state: 'accepted',
    review_note: null,
    reviewed_by: 'Analyst',
    reviewed_at: 20,
    created_at: 20
  },
  {
    id: 'assertion-3',
    subject_kind: 'entity',
    subject_id: 'person-1',
    path: 'name.full',
    value: { value: 'Mallory Example' },
    source_id: '',
    confidence: 'unverified',
    review_state: 'disputed',
    review_note: null,
    reviewed_by: 'Analyst',
    reviewed_at: 30,
    created_at: 30
  }
];

describe('reviewModel', () => {
  it('derives supporting source and conflict status', () => {
    const items = buildDerivedReviewAssertions(assertions, sources, graph);
    const target = items.find((item) => item.id === 'assertion-1');
    expect(target?.subjectLabel).toBe('Alice Example');
    expect(target?.supportingSourceCount).toBe(2);
    expect(target?.evidenceStatus).toBe('multiple');
    expect(target?.conflictStatus).toBe('conflict');
  });

  it('filters and sorts assertions for review', () => {
    const items = buildDerivedReviewAssertions(assertions, sources, graph);
    const filtered = filterReviewAssertions(items, {
      query: 'alice',
      reviewState: 'all',
      evidence: 'weak',
      confidence: 'all',
      sort: 'weakest_evidence'
    });
    expect(filtered.map((item) => item.id)).toEqual(['assertion-3']);
  });

  it('navigates review items predictably', () => {
    const items = buildDerivedReviewAssertions(assertions, sources, graph);
    const ordered = filterReviewAssertions(items, {
      query: '',
      reviewState: 'all',
      evidence: 'all',
      confidence: 'all',
      sort: 'newest'
    });
    expect(getAdjacentReviewAssertionId(ordered, 'assertion-2', 'next')).toBe('assertion-1');
    expect(getAdjacentReviewAssertionId(ordered, 'assertion-2', 'previous')).toBe('assertion-3');
    expect(getNextUnreviewedAssertionId(ordered, 'assertion-2')).toBe('assertion-1');
  });
});
