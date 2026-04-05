import type { EntityType } from '@shared/types';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';
import { inferEntityLabel } from '@renderer/features/graph/labeling';
import { getAssertionFieldMapping } from '@renderer/features/assertions/assertionFieldMappings';
import { nodeTypes, type NodeProperty } from '@renderer/lib/nodeTypes';

export type CsvColumnMapping = {
  column: string;
  propertyKey: string | null;
};

export function normalizeImportToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function getNodeTypeDefinition(type: EntityType) {
  return nodeTypes.find((nodeType) => nodeType.id === type) ?? null;
}

export function autoMapCsvColumns(headers: string[], entityType: EntityType): CsvColumnMapping[] {
  const nodeType = getNodeTypeDefinition(entityType);
  if (!nodeType) {
    return headers.map((column) => ({ column, propertyKey: null }));
  }

  const available = new Map<string, NodeProperty>();
  for (const property of nodeType.properties) {
    available.set(normalizeImportToken(property.id), property);
    available.set(normalizeImportToken(property.label), property);
    if (property.placeholder) {
      available.set(normalizeImportToken(property.placeholder), property);
    }
  }

  return headers.map((column) => {
    const normalized = normalizeImportToken(column);
    const property = available.get(normalized);
    return {
      column,
      propertyKey: property?.id ?? null
    };
  });
}

export function coerceImportedValue(rawValue: string, propertyType: NodeProperty['type']): unknown {
  const value = rawValue.trim();
  if (!value) return '';
  if (propertyType === 'number') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (propertyType === 'textarea') {
    return value
      .split(/\r?\n|;/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join('\n');
  }
  return value;
}

export function buildImportedProperties(
  row: Record<string, string>,
  mappings: CsvColumnMapping[],
  entityType: EntityType
): Record<string, unknown> {
  const nodeType = getNodeTypeDefinition(entityType);
  if (!nodeType) return {};

  const propertyById = new Map(nodeType.properties.map((property) => [property.id, property]));
  const properties: Record<string, unknown> = {};
  for (const mapping of mappings) {
    if (!mapping.propertyKey) continue;
    const property = propertyById.get(mapping.propertyKey);
    if (!property) continue;
    const rawValue = row[mapping.column] ?? '';
    const coerced = coerceImportedValue(rawValue, property.type);
    if (coerced === '') continue;
    properties[mapping.propertyKey] = coerced;
  }
  return properties;
}

export function inferImportedLabel(entityType: EntityType, properties: Record<string, unknown>, rowIndex: number): string {
  if (entityType === 'person') {
    const nameParts = [properties.firstName, properties.middleName, properties.lastName]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);
    if (nameParts.length > 0) return nameParts.join(' ');
  }
  const inferred = inferEntityLabel(entityType, properties);
  if (inferred) return inferred;
  const fallback = Object.values(properties).find((value) => typeof value === 'string' && value.trim().length > 0);
  if (typeof fallback === 'string' && fallback.trim()) return fallback.trim();
  return `Imported ${entityType.replace(/_/g, ' ')} ${rowIndex + 1}`;
}

export function findMatchingEntityId(
  graph: GraphSnapshot,
  entityType: EntityType,
  propertyKey: string | null,
  propertyValue: unknown
): string | null {
  if (!propertyKey) return null;
  const comparable = normalizeComparableValue(propertyValue);
  if (!comparable) return null;

  const match = graph.nodes.find((node) => {
    if (node.type !== entityType) return false;
    const currentValue = normalizeComparableValue(node.properties?.[propertyKey]);
    return currentValue !== '' && currentValue === comparable;
  });
  return match?.id ?? null;
}

export function collectImportableAssertionPaths(entityType: EntityType, properties: Record<string, unknown>) {
  return Object.entries(properties)
    .map(([propertyKey, value]) => {
      const mapping = getAssertionFieldMapping(entityType, propertyKey);
      if (!mapping) return null;
      return {
        propertyKey,
        assertionPath: mapping.assertionPath,
        value
      };
    })
    .filter((entry): entry is { propertyKey: string; assertionPath: string; value: unknown } => Boolean(entry));
}

export function buildAssertionDeduplicationKey(
  subjectId: string,
  assertionPath: string,
  sourceId: string,
  value: unknown
) {
  return `${subjectId}::${assertionPath}::${sourceId}::${stableSerialize(value)}`;
}

export function buildExistingAssertionDeduplicationSet(assertions: ParsedAssertionRecord[]) {
  return new Set(
    assertions.map((assertion) =>
      buildAssertionDeduplicationKey(assertion.subject_id, assertion.path, assertion.source_id, assertion.value)
    )
  );
}

function normalizeComparableValue(value: unknown) {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value ?? '').trim().toLowerCase();
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`).join(',')}}`;
}
