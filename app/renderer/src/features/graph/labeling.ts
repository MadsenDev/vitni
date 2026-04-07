import cytoscape, { type ElementDefinition } from 'cytoscape';
import type { GraphSnapshot } from '@renderer/types/graph';
import { relationshipTypes } from '@renderer/lib/relationshipTypes';
import type { DerivedNodeReviewStatus } from '@renderer/features/review/reviewModel';

const PLACEHOLDER_VALUES = new Set(['n/a', 'na', 'none', 'unknown', 'null', '-']);

export const nodeTypeIcons: Record<string, string> = {
  person: '👤',
  organization: '🏢',
  domain: '🌐',
  website: '🖥️',
  online_account: '🪪',
  phone: '📞',
  email: '✉️',
  device: '📱',
  ip_address: '🧭',
  infrastructure: '🖧',
  crypto_wallet: '₿',
  location: '📍',
  event: '📅',
  incident: '⚠️',
  document: '📄',
  identity_document: '🪪',
  communication: '💬',
  media: '🎞️',
  evidence: '🔍',
  financial_account: '🏦',
  financial_transaction: '💸',
  vehicle: '🚗',
  aircraft: '✈️',
  case: '🗂️'
};

cytoscape.warnings(false);

export function getMeaningfulString(props: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = props[key];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) continue;
    return trimmed;
  }
  return '';
}

export function getDevicePrimaryLabel(props: Record<string, unknown>): string {
  return getMeaningfulString(props, 'name', 'model', 'device_id', 'serialNumber', 'serial', 'imei');
}

export function getDeviceSecondaryLabel(props: Record<string, unknown>): string {
  const serial = getMeaningfulString(props, 'serialNumber', 'serial');
  if (serial) return `SN: ${serial}`;
  const imei = getMeaningfulString(props, 'imei');
  if (imei) return `IMEI: ${imei}`;
  return '';
}

export function inferEntityLabel(type: string, props: Record<string, unknown>): string | undefined {
  const typeLower = (type || '').toLowerCase();
  if (typeLower === 'phone' || typeLower.includes('phone')) {
    return getMeaningfulString(props, 'number', 'phone_number', 'phone', 'e164') || undefined;
  }
  if (typeLower === 'email' || typeLower.includes('email')) {
    return getMeaningfulString(props, 'address', 'email_address', 'email') || undefined;
  }
  if (typeLower === 'device' || typeLower.includes('device')) {
    return getDevicePrimaryLabel(props) || undefined;
  }
  if (typeLower === 'infrastructure' || typeLower === 'server') {
    return getMeaningfulString(props, 'hostname', 'ipAddress', 'ip_address') || undefined;
  }
  if (typeLower === 'domain') {
    return getMeaningfulString(props, 'domain') || undefined;
  }
  if (typeLower === 'website' || typeLower.includes('website')) {
    return getMeaningfulString(props, 'url', 'domain', 'title') || undefined;
  }
  if (typeLower === 'online_account') {
    return getMeaningfulString(props, 'handle', 'displayName', 'profileUrl') || undefined;
  }
  if (typeLower === 'ip_address') {
    return getMeaningfulString(props, 'ipAddress') || undefined;
  }
  if (typeLower === 'crypto_wallet') {
    return getMeaningfulString(props, 'address') || undefined;
  }
  if (typeLower === 'financial_account') {
    return getMeaningfulString(props, 'accountNumber', 'institutionName') || undefined;
  }
  if (typeLower === 'financial_transaction') {
    return getMeaningfulString(props, 'transactionReference', 'merchant') || undefined;
  }
  if (typeLower === 'identity_document') {
    return getMeaningfulString(props, 'documentNumber', 'holderName') || undefined;
  }
  if (typeLower === 'organization') {
    return getMeaningfulString(props, 'name', 'legalName', 'dba') || undefined;
  }
  if (
    typeLower.includes('organization') ||
    typeLower.includes('company') ||
    typeLower.includes('institution') ||
    typeLower.includes('agency')
  ) {
    return getMeaningfulString(
      props,
      'name',
      'organization_name',
      'company_name',
      'institution_name',
      'legal_name',
      'legalName',
      'abbr',
      'alias'
    ) || undefined;
  }
  return undefined;
}

function buildPersonName(props: Record<string, unknown> | undefined, fallback: string): string {
  const firstCamel = (props?.firstName as string) || '';
  const middleCamel = (props?.middleName as string) || '';
  const lastCamel = (props?.lastName as string) || '';
  const first = (props?.first_name as string) || (props?.firstname as string) || '';
  const middle = (props?.middle_name as string) || '';
  const last = (props?.last_name as string) || (props?.lastname as string) || '';
  const parts = [firstCamel || first, middleCamel || middle, lastCamel || last].map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : fallback;
}

export function displayNameForNode(node: GraphSnapshot['nodes'][number]): string {
  const props = (node.properties || {}) as Record<string, unknown>;
  if (node.type === 'person') {
    return buildPersonName(props, node.label ?? '');
  }

  const inferred = inferEntityLabel(node.type, props);
  if (inferred) return inferred;

  const nameLike = getMeaningfulString(props, 'name', 'title', 'institution_name', 'organization_name', 'company');
  const base = (node.label ?? '').trim();
  const picked = (nameLike || base).trim();
  return picked || node.id;
}

export function mapGraphElements(
  data: GraphSnapshot,
  showLabels: boolean,
  showImages: boolean,
  imagePreviewMap: Map<string, string>,
  nodeReviewStatusMap?: Map<string, DerivedNodeReviewStatus>
): ElementDefinition[] {
  const relById = new Map(relationshipTypes.map((rt) => [rt.id, rt]));
  const edgePairCounts = new Map<string, { hasSpecificRelationship: boolean }>();

  data.edges.forEach((edge) => {
    const pairKey = [edge.src_id, edge.dst_id].sort().join('::');
    const entry = edgePairCounts.get(pairKey) ?? { hasSpecificRelationship: false };
    if (edge.type !== 'associated_with') {
      entry.hasSpecificRelationship = true;
    }
    edgePairCounts.set(pairKey, entry);
  });

  return [
    ...data.nodes.map((node) => {
      const photoSourceId = showImages && node.type === 'person' ? (node.properties?.photo as string | undefined) : undefined;
      const imageUrl = photoSourceId ? imagePreviewMap.get(photoSourceId) : undefined;
      const displayName = displayNameForNode(node);
      const secondaryLabel =
        showLabels && (node.type || '').toLowerCase().includes('device')
          ? getDeviceSecondaryLabel((node.properties || {}) as Record<string, unknown>)
          : '';

      const elementData: Record<string, unknown> = {
        id: node.id,
        label: showLabels
          ? `${nodeTypeIcons[node.type] || '●'} ${displayName}${secondaryLabel ? `\n${secondaryLabel}` : ''}`
          : '',
        type: node.type,
        icon: nodeTypeIcons[node.type] || '●',
        hasImage: imageUrl ? 'true' : 'false'
      };

      const reviewStatus = nodeReviewStatusMap?.get(node.id);
      if (reviewStatus) {
        elementData.reviewTone = reviewStatus.reviewTone;
        elementData.evidenceTone = reviewStatus.evidenceTone;
      }

      if (imageUrl) {
        elementData.imageUrl = imageUrl;
      }

      return {
        data: elementData,
        position: node.pos_x != null && node.pos_y != null ? { x: Number(node.pos_x), y: Number(node.pos_y) } : undefined
      };
    }),
    ...data.edges.map((edge) => {
      const rel = relById.get(edge.type);
      const subtypeId = (edge.properties?.subtype as string | undefined) || '';
      const subtypeLabel = rel?.subtypes?.find((subtype) => subtype.id === subtypeId)?.label;
      let edgeLabel = subtypeLabel ?? rel?.label ?? edge.type;
      const pairKey = [edge.src_id, edge.dst_id].sort().join('::');
      const pairInfo = edgePairCounts.get(pairKey);
      const isGenericAssociation = edge.type === 'associated_with' && (!subtypeId || subtypeId === 'linked_to');
      if (isGenericAssociation && pairInfo?.hasSpecificRelationship) {
        edgeLabel = '';
      }
      const dateStr = (edge.properties?.date as string | undefined) || '';
      if (dateStr) {
        const year = dateStr.slice(0, 4);
        if (/^\d{4}$/.test(year)) edgeLabel = `${edgeLabel} (${year})`;
      }

      return {
        data: {
          id: edge.id,
          source: edge.src_id,
          target: edge.dst_id,
          label: edgeLabel
        }
      } as ElementDefinition;
    })
  ];
}
