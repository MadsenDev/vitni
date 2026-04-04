import type { GraphSnapshot, GraphNodeSnapshot } from '../types/graph';
import type { NodeType } from './nodeTypes';

export interface LocalAINodeInsight {
  id: string;
  label: string;
  type: string;
  connectionCount: number;
  missingProperties?: string[];
}

export interface LocalAILeadGroup {
  id: string;
  title: string;
  description: string;
  nodes: LocalAINodeInsight[];
}

export interface LocalAIDuplicateGroup {
  id: string;
  reason: string;
  nodes: LocalAINodeInsight[];
}

export interface LocalAIAnalysisResult {
  generatedAt: number;
  summary: string;
  leads: LocalAILeadGroup[];
  duplicates: LocalAIDuplicateGroup[];
}

const UNIQUE_IDENTITY_FIELDS = new Set([
  'email',
  'phone',
  'ssn',
  'passport',
  'driversLicense',
  'vin',
  'accountNumber',
  'documentNumber',
  'username',
  'handle',
  'domain',
  'url',
  'ipAddress',
  'address',
  'transactionReference'
]);

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9@\.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatEntityLabel(node: GraphNodeSnapshot, nodeTypeById: Map<string, NodeType>): string {
  if (node.label && node.label.trim().length > 0) {
    return node.label.trim();
  }
  const nodeType = nodeTypeById.get(node.type);
  if (!nodeType) {
    return 'Untitled Entity';
  }
  const firstName = typeof node.properties?.firstName === 'string' ? node.properties.firstName.trim() : '';
  const lastName = typeof node.properties?.lastName === 'string' ? node.properties.lastName.trim() : '';
  const fallback = [firstName, lastName].filter(Boolean).join(' ');
  return fallback || `Untitled ${nodeType.label}`;
}

function buildConnectionCountMap(graph: GraphSnapshot): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of graph.nodes) {
    counts.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    counts.set(edge.src_id, (counts.get(edge.src_id) ?? 0) + 1);
    counts.set(edge.dst_id, (counts.get(edge.dst_id) ?? 0) + 1);
  }
  return counts;
}

function detectMissingRequiredProperties(
  node: GraphNodeSnapshot,
  nodeType: NodeType | undefined
): string[] {
  if (!nodeType) return [];
  const missing: string[] = [];
  for (const property of nodeType.properties) {
    if (!property.required) continue;
    const value = node.properties?.[property.id];
    if (value == null || (typeof value === 'string' && value.trim().length === 0)) {
      missing.push(property.label);
    }
  }
  return missing;
}

function computeSummary(
  graph: GraphSnapshot,
  nodeTypeById: Map<string, NodeType>,
  connectionCounts: Map<string, number>,
  duplicateCount: number
): string {
  if (graph.nodes.length === 0) {
    return 'Local AI is standing by. Add entities or relationships to generate insights.';
  }

  const totalNodes = graph.nodes.length;
  const totalEdges = graph.edges.length;

  const typeCounts = new Map<string, number>();
  for (const node of graph.nodes) {
    const typeLabel = nodeTypeById.get(node.type)?.label ?? node.type;
    typeCounts.set(typeLabel, (typeCounts.get(typeLabel) ?? 0) + 1);
  }

  const sortedTypeCounts = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1]);
  const typeSummary = sortedTypeCounts
    .slice(0, 3)
    .map(([label, count]) => `${count} ${label.toLowerCase()}${count === 1 ? '' : 's'}`)
    .join(', ');

  const summaryParts: string[] = [];
  summaryParts.push(
    `Tracking ${totalNodes} ${totalNodes === 1 ? 'entity' : 'entities'} with ${totalEdges} recorded ${
      totalEdges === 1 ? 'relationship' : 'relationships'
    }.`
  );
  if (typeSummary) {
    summaryParts.push(`Most common types: ${typeSummary}.`);
  }

  const rankedNodes = [...graph.nodes]
    .map(node => ({
      node,
      degree: connectionCounts.get(node.id) ?? 0
    }))
    .sort((a, b) => b.degree - a.degree);

  const mostConnected = rankedNodes.filter(entry => entry.degree > 0).slice(0, 2);
  if (mostConnected.length > 0) {
    const connectors = mostConnected
      .map(entry => `${formatEntityLabel(entry.node, nodeTypeById)} (${entry.degree})`)
      .join(' and ');
    summaryParts.push(`Key connectors include ${connectors}.`);
  }

  const isolatedCount = rankedNodes.filter(entry => entry.degree === 0).length;
  if (isolatedCount > 0) {
    summaryParts.push(`${isolatedCount} lead${isolatedCount === 1 ? '' : 's'} currently have no relationships.`);
  }

  if (duplicateCount > 0) {
    summaryParts.push(`Flagged ${duplicateCount} potential duplicate group${duplicateCount === 1 ? '' : 's'} for review.`);
  }

  return summaryParts.join(' ');
}

export function analyzeInvestigation(graph: GraphSnapshot, nodeTypes: NodeType[]): LocalAIAnalysisResult {
  const nodeTypeById = new Map(nodeTypes.map(type => [type.id, type]));
  const connectionCounts = buildConnectionCountMap(graph);

  const missingDetailNodes: LocalAINodeInsight[] = [];
  const isolatedNodes: LocalAINodeInsight[] = [];
  const connectorNodes: LocalAINodeInsight[] = [];

  const duplicateCandidates = new Map<string, LocalAIDuplicateGroup>();

  for (const node of graph.nodes) {
    const nodeType = nodeTypeById.get(node.type);
    const label = formatEntityLabel(node, nodeTypeById);
    const connectionCount = connectionCounts.get(node.id) ?? 0;

    const missing = detectMissingRequiredProperties(node, nodeType);
    if (missing.length > 0) {
      missingDetailNodes.push({
        id: node.id,
        label,
        type: nodeType?.label ?? node.type,
        connectionCount,
        missingProperties: missing
      });
    }

    if (connectionCount === 0) {
      isolatedNodes.push({
        id: node.id,
        label,
        type: nodeType?.label ?? node.type,
        connectionCount
      });
    }

    if (connectionCount >= 3) {
      connectorNodes.push({
        id: node.id,
        label,
        type: nodeType?.label ?? node.type,
        connectionCount
      });
    }

    const normalizedLabel = normalizeText(node.label);
    if (normalizedLabel) {
      const key = `label:${normalizedLabel}`;
      const group = duplicateCandidates.get(key) ?? {
        id: key,
        reason: `Same label \u201c${label}\u201d`,
        nodes: []
      };
      group.nodes.push({ id: node.id, label, type: nodeType?.label ?? node.type, connectionCount });
      duplicateCandidates.set(key, group);
    }

    if (nodeType) {
      for (const property of nodeType.properties) {
        if (!UNIQUE_IDENTITY_FIELDS.has(property.id)) continue;
        const value = node.properties?.[property.id];
        if (typeof value !== 'string') continue;
        const normalizedValue = normalizeText(value);
        if (!normalizedValue) continue;
        const key = `${property.id}:${normalizedValue}`;
        const group = duplicateCandidates.get(key) ?? {
          id: key,
          reason: `Matching ${property.label}: ${value.trim()}`,
          nodes: []
        };
        group.nodes.push({ id: node.id, label, type: nodeType.label, connectionCount });
        duplicateCandidates.set(key, group);
      }
    }
  }

  const duplicates = Array.from(duplicateCandidates.values())
    .map(group => ({
      ...group,
      nodes: group.nodes.filter((node, index, self) => self.findIndex(n => n.id === node.id) === index)
    }))
    .filter(group => group.nodes.length > 1)
    .sort((a, b) => b.nodes.length - a.nodes.length);

  const summary = computeSummary(graph, nodeTypeById, connectionCounts, duplicates.length);

  const leads: LocalAILeadGroup[] = [];
  if (missingDetailNodes.length > 0) {
    leads.push({
      id: 'missing-details',
      title: 'Fill in critical details',
      description: 'These records are missing required attributes that help correlate evidence.',
      nodes: missingDetailNodes.sort((a, b) => b.missingProperties!.length - a.missingProperties!.length)
    });
  }

  if (isolatedNodes.length > 0) {
    leads.push({
      id: 'isolated-nodes',
      title: 'Connect isolated leads',
      description: 'Consider linking these entities to relevant people, organizations, or documents.',
      nodes: isolatedNodes.sort((a, b) => a.label.localeCompare(b.label))
    });
  }

  if (connectorNodes.length > 0) {
    leads.push({
      id: 'key-connectors',
      title: 'Monitor key connectors',
      description: 'These entities sit at the center of multiple relationships.',
      nodes: connectorNodes
        .sort((a, b) => b.connectionCount - a.connectionCount)
        .slice(0, 5)
    });
  }

  return {
    generatedAt: Date.now(),
    summary,
    leads,
    duplicates
  };
}
