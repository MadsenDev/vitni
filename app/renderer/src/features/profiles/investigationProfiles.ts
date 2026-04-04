import type { NodeCategory, NodeType } from '@renderer/lib/nodeTypes';

export type InvestigationProfile = 'general' | 'cyber_osint' | 'casework';

export interface InvestigationProfileDefinition {
  id: InvestigationProfile;
  label: string;
  shortLabel: string;
  description: string;
  welcomeTitle: string;
  welcomeBody: string;
  sidebarTitle: string;
  sidebarDescription: string;
  categoryOrder: string[];
  featuredNodeTypeIds: string[];
}

export const DEFAULT_INVESTIGATION_PROFILE: InvestigationProfile = 'general';

export const INVESTIGATION_PROFILES: InvestigationProfileDefinition[] = [
  {
    id: 'general',
    label: 'General Investigations',
    shortLabel: 'General',
    description: 'Balanced defaults for mixed investigations involving people, organizations, digital traces, evidence, and financial activity.',
    welcomeTitle: 'Balanced investigation workspace',
    welcomeBody: 'A broad starting point for mixed cases. People, organizations, digital identifiers, evidence, and reporting all stay equally visible.',
    sidebarTitle: 'Build a balanced case graph',
    sidebarDescription: 'Prioritizes people, organizations, core identifiers, evidence, and case objects.',
    categoryOrder: ['people', 'organizations', 'technology', 'evidence'],
    featuredNodeTypeIds: ['person', 'organization', 'phone', 'online_account', 'document', 'financial_transaction', 'case']
  },
  {
    id: 'cyber_osint',
    label: 'Cyber / OSINT',
    shortLabel: 'Cyber / OSINT',
    description: 'Emphasizes online accounts, domains, devices, infrastructure, communications, and digital pivots.',
    welcomeTitle: 'Digital-first investigation workspace',
    welcomeBody: 'Optimized for cyber and OSINT-heavy workflows. Digital identifiers and infrastructure are surfaced first, while the core graph and evidence model stays the same.',
    sidebarTitle: 'Build a digital pivot graph',
    sidebarDescription: 'Prioritizes domains, accounts, devices, IPs, infrastructure, and communication records.',
    categoryOrder: ['technology', 'people', 'organizations', 'evidence'],
    featuredNodeTypeIds: ['domain', 'website', 'online_account', 'email', 'phone', 'ip_address', 'infrastructure', 'device']
  },
  {
    id: 'casework',
    label: 'Casework / LE',
    shortLabel: 'Casework / LE',
    description: 'Emphasizes incidents, evidence, communications, locations, events, and case-role workflows.',
    welcomeTitle: 'Casework-focused investigation workspace',
    welcomeBody: 'Optimized for structured casework. Evidence, incidents, timelines, and subject relationships are surfaced first without changing the underlying ontology.',
    sidebarTitle: 'Build an evidence-backed case graph',
    sidebarDescription: 'Prioritizes incidents, evidence, documents, communications, locations, and case objects.',
    categoryOrder: ['people', 'evidence', 'organizations', 'technology'],
    featuredNodeTypeIds: ['case', 'incident', 'event', 'evidence', 'document', 'communication', 'location', 'person']
  }
];

export function getInvestigationProfileDefinition(profile: InvestigationProfile | null | undefined) {
  return INVESTIGATION_PROFILES.find((entry) => entry.id === profile) ?? INVESTIGATION_PROFILES[0];
}

export function orderNodeCategoriesForProfile(
  profile: InvestigationProfile | null | undefined,
  categories: NodeCategory[]
) {
  const order = getInvestigationProfileDefinition(profile).categoryOrder;
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...categories].sort((left, right) => {
    const leftRank = rank.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = rank.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank || left.label.localeCompare(right.label);
  });
}

export function orderNodeTypesForProfile(
  profile: InvestigationProfile | null | undefined,
  nodes: NodeType[]
) {
  const featured = getInvestigationProfileDefinition(profile).featuredNodeTypeIds;
  const rank = new Map(featured.map((id, index) => [id, index]));
  return [...nodes].sort((left, right) => {
    const leftRank = rank.get(left.id);
    const rightRank = rank.get(right.id);
    if (leftRank !== undefined || rightRank !== undefined) {
      return (leftRank ?? Number.MAX_SAFE_INTEGER) - (rightRank ?? Number.MAX_SAFE_INTEGER);
    }
    return left.label.localeCompare(right.label);
  });
}
