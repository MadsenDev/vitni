import { describe, expect, it } from 'vitest';
import type { GraphSnapshot } from '@renderer/types/graph';
import { buildSearchResults, filterSearchResults } from './searchIndex';

const graph: GraphSnapshot = {
  nodes: [
    {
      id: 'person-1',
      type: 'person',
      label: 'Alice Example',
      properties: { email: 'alice@example.com', notes: 'Primary witness' },
      created_at: 0,
      updated_at: 0
    },
    {
      id: 'device-1',
      type: 'device',
      label: 'Field Phone',
      properties: { imei: '123456789012345', serialNumber: 'SN-42' },
      created_at: 0,
      updated_at: 0
    }
  ],
  edges: [
    {
      id: 'edge-1',
      src_id: 'person-1',
      dst_id: 'device-1',
      type: 'used_or_accessed',
      properties: { subtype: 'logged_into', notes: 'Observed in seized browser history' },
      created_at: 0,
      updated_at: 0
    }
  ]
};

describe('search index', () => {
  it('matches node identifiers and scalar properties', () => {
    const results = buildSearchResults({
      graph,
      assertions: [],
      sources: []
    });

    const filtered = filterSearchResults(results, 'alice@example.com');
    expect(filtered[0]?.kind).toBe('node');
    expect(filtered[0]?.nodeId).toBe('person-1');
  });

  it('matches relationship family and subtype context', () => {
    const results = buildSearchResults({
      graph,
      assertions: [],
      sources: []
    });

    const filtered = filterSearchResults(results, 'logged into');
    expect(filtered.some((result) => result.kind === 'relationship' && result.edgeId === 'edge-1')).toBe(true);
  });

  it('matches assertion path and value text', () => {
    const results = buildSearchResults({
      graph,
      assertions: [
        {
          id: 'assertion-1',
          subject_kind: 'entity',
          subject_id: 'person-1',
          path: 'identity.alias',
          source_id: 'source-1',
          confidence: 'verified',
          created_at: 0,
          value: { alias: 'Red Fox' }
        }
      ],
      sources: []
    });

    const filtered = filterSearchResults(results, 'red fox');
    expect(filtered.some((result) => result.kind === 'assertion' && result.assertionId === 'assertion-1')).toBe(true);
  });

  it('matches sources by title, locator, and usage context', () => {
    const results = buildSearchResults({
      graph,
      assertions: [],
      sources: [
        {
          id: 'source-1',
          kind: 'web',
          locator: 'https://example.com/profile',
          title: 'Example profile page',
          added_at: 0,
          hash: null,
          mime: null,
          usage: [
            {
              assertion_id: 'assertion-1',
              entity_id: 'person-1',
              entity_label: 'Alice Example',
              assertion_path: 'identity.alias'
            }
          ]
        }
      ]
    });

    const filtered = filterSearchResults(results, 'profile page');
    expect(filtered.some((result) => result.kind === 'source' && result.sourceId === 'source-1')).toBe(true);
  });
});
