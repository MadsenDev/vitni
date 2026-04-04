import type { SourceWithUsage } from '@shared/types';
import { relationshipTypes } from '@renderer/lib/relationshipTypes';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';
import type { SearchResult, SearchResultKind } from '@renderer/types/app';

const GROUP_ORDER: SearchResultKind[] = ['node', 'relationship', 'assertion', 'source'];
const EMPTY_QUERY_LIMITS: Record<SearchResultKind, number> = {
  node: 8,
  relationship: 6,
  assertion: 6,
  source: 6
};
const QUERY_LIMITS: Record<SearchResultKind, number> = {
  node: 10,
  relationship: 8,
  assertion: 8,
  source: 8
};

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/[^\p{L}\p{N}\s.@:/#+]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function uniqueTexts(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function collectScalarTexts(value: unknown, trail = ''): string[] {
  if (value == null) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return trail ? [trail, String(value)] : [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectScalarTexts(entry, trail ? `${trail} ${index}` : String(index)));
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
      collectScalarTexts(entry, trail ? `${trail} ${key}` : key)
    );
  }
  return [];
}

function relationshipLabel(typeId: string, subtypeId?: string | null): string {
  const relationshipType = relationshipTypes.find((entry) => entry.id === typeId);
  if (!relationshipType) return typeId;
  if (!subtypeId) return relationshipType.label;
  const subtype = relationshipType.subtypes?.find((entry) => entry.id === subtypeId);
  return subtype ? `${relationshipType.label} • ${subtype.label}` : relationshipType.label;
}

function buildNodeResults(graph: GraphSnapshot): SearchResult[] {
  return graph.nodes.map((node) => {
    const propertyTexts = uniqueTexts(collectScalarTexts(node.properties));
    const title = node.label?.trim() || 'Untitled Entity';
    const subtitle = `${node.type.replace(/_/g, ' ')} • ${node.id}`;
    const metadata = propertyTexts.slice(0, 4).join(' • ');

    return {
      id: `node:${node.id}`,
      kind: 'node',
      title,
      subtitle,
      metadata,
      relatedNodeIds: [node.id],
      nodeId: node.id,
      primaryText: normalizeText([title, node.id].join(' ')),
      secondaryText: normalizeText([node.type, metadata].join(' ')),
      searchText: normalizeText([title, node.id, node.type, ...propertyTexts].join(' '))
    } satisfies SearchResult;
  });
}

function buildRelationshipResults(graph: GraphSnapshot): SearchResult[] {
  return graph.edges.map((edge) => {
    const sourceNode = graph.nodes.find((node) => node.id === edge.src_id);
    const targetNode = graph.nodes.find((node) => node.id === edge.dst_id);
    const subtype = typeof edge.properties?.subtype === 'string' ? edge.properties.subtype : null;
    const notes = typeof edge.properties?.notes === 'string' ? edge.properties.notes : '';
    const date = typeof edge.properties?.date === 'string' ? edge.properties.date : '';
    const title = relationshipLabel(edge.type, subtype);
    const subtitle = `${sourceNode?.label || edge.src_id} -> ${targetNode?.label || edge.dst_id}`;
    const metadata = uniqueTexts([date, notes]).join(' • ') || undefined;

    return {
      id: `relationship:${edge.id}`,
      kind: 'relationship',
      title,
      subtitle,
      metadata,
      relatedNodeIds: [edge.src_id, edge.dst_id],
      edgeId: edge.id,
      primaryText: normalizeText([title, subtitle].join(' ')),
      secondaryText: normalizeText([edge.type, subtype, date].join(' ')),
      searchText: normalizeText([title, edge.type, subtype, sourceNode?.label, targetNode?.label, edge.src_id, edge.dst_id, notes, date].join(' '))
    } satisfies SearchResult;
  });
}

function buildAssertionResults(graph: GraphSnapshot, assertions: ParsedAssertionRecord[]): SearchResult[] {
  return assertions.map((assertion) => {
    const subjectNode = graph.nodes.find((node) => node.id === assertion.subject_id);
    const valueTexts = uniqueTexts(collectScalarTexts(assertion.value));
    const title = assertion.path;
    const subtitle = `${subjectNode?.label || assertion.subject_id} • ${assertion.confidence}`;
    const metadata = valueTexts.slice(0, 4).join(' • ');

    return {
      id: `assertion:${assertion.id}`,
      kind: 'assertion',
      title,
      subtitle,
      metadata,
      relatedNodeIds: [assertion.subject_id],
      assertionId: assertion.id,
      primaryText: normalizeText([assertion.path, subjectNode?.label, assertion.subject_id].join(' ')),
      secondaryText: normalizeText([assertion.confidence, metadata].join(' ')),
      searchText: normalizeText([assertion.path, assertion.subject_id, subjectNode?.label, assertion.confidence, ...valueTexts].join(' '))
    } satisfies SearchResult;
  });
}

function buildSourceResults(sources: SourceWithUsage[]): SearchResult[] {
  return sources.map((source) => {
    const relatedNodeIds = source.usage.map((usage) => usage.entity_id);
    const usageContext = uniqueTexts(
      source.usage.flatMap((usage) => [usage.entity_label || usage.entity_id, usage.assertion_path])
    );
    const title = source.title?.trim() || source.locator;
    const subtitle = `${source.kind} • ${source.locator}`;
    const metadata = usageContext.slice(0, 4).join(' • ') || undefined;

    return {
      id: `source:${source.id}`,
      kind: 'source',
      title,
      subtitle,
      metadata,
      relatedNodeIds,
      sourceId: source.id,
      primaryText: normalizeText([title, source.locator].join(' ')),
      secondaryText: normalizeText([source.kind, metadata].join(' ')),
      searchText: normalizeText([title, source.locator, source.kind, source.hash, source.mime, ...usageContext].join(' '))
    } satisfies SearchResult;
  });
}

export function buildSearchResults(input: {
  graph: GraphSnapshot;
  assertions: ParsedAssertionRecord[];
  sources: SourceWithUsage[];
}): SearchResult[] {
  return [
    ...buildNodeResults(input.graph),
    ...buildRelationshipResults(input.graph),
    ...buildAssertionResults(input.graph, input.assertions),
    ...buildSourceResults(input.sources)
  ];
}

function scoreResult(result: SearchResult, query: string): number {
  const exactPrimary = result.primaryText === query;
  const exactSecondary = result.secondaryText === query;
  const exactSearch = result.searchText === query;
  const primaryStarts = result.primaryText.startsWith(query);
  const secondaryStarts = Boolean(result.secondaryText?.startsWith(query));
  const primaryIncludes = result.primaryText.includes(query);
  const secondaryIncludes = Boolean(result.secondaryText?.includes(query));
  const searchIncludes = result.searchText.includes(query);

  let score = 0;
  if (exactPrimary) score += 120;
  if (exactSecondary) score += 95;
  if (exactSearch) score += 80;
  if (primaryStarts) score += 70;
  if (secondaryStarts) score += 50;
  if (primaryIncludes) score += 35;
  if (secondaryIncludes) score += 20;
  if (searchIncludes) score += 10;
  return score;
}

export function filterSearchResults(results: SearchResult[], rawQuery: string): SearchResult[] {
  const query = normalizeText(rawQuery);
  if (!query) {
    return GROUP_ORDER.flatMap((kind) =>
      results.filter((result) => result.kind === kind).slice(0, EMPTY_QUERY_LIMITS[kind])
    );
  }

  const scored = results
    .map((result) => ({ result, score: scoreResult(result, query) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const groupCompare = GROUP_ORDER.indexOf(left.result.kind) - GROUP_ORDER.indexOf(right.result.kind);
      if (groupCompare !== 0) return groupCompare;
      return left.result.title.localeCompare(right.result.title);
    });

  return GROUP_ORDER.flatMap((kind) =>
    scored
      .filter(({ result }) => result.kind === kind)
      .slice(0, QUERY_LIMITS[kind])
      .map(({ result }) => result)
  );
}

export function searchGroupLabel(kind: SearchResultKind): string {
  switch (kind) {
    case 'node':
      return 'Nodes';
    case 'relationship':
      return 'Relationships';
    case 'assertion':
      return 'Assertions';
    case 'source':
      return 'Sources';
  }
}
