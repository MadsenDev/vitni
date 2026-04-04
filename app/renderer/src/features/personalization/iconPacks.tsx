import type { ComponentType } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBriefcase,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiGlobe,
  FiHash,
  FiHardDrive,
  FiImage,
  FiLayers,
  FiMail,
  FiMapPin,
  FiMessageSquare,
  FiPhone,
  FiPlayCircle,
  FiRadio,
  FiServer,
  FiUser,
  FiUsers,
  FiWifi
} from 'react-icons/fi';
import type { NodeCategory, NodeType } from '@renderer/lib/nodeTypes';
import type { IconPackId } from './theme';

const WIREFRAME_NODE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  person: FiUser,
  organization: FiUsers,
  domain: FiGlobe,
  website: FiGlobe,
  online_account: FiMail,
  email: FiMail,
  phone: FiPhone,
  device: FiHardDrive,
  ip_address: FiHash,
  infrastructure: FiServer,
  crypto_wallet: FiCreditCard,
  location: FiMapPin,
  event: FiClock,
  incident: FiAlertTriangle,
  document: FiFileText,
  identity_document: FiFileText,
  communication: FiMessageSquare,
  media: FiImage,
  financial_account: FiCreditCard,
  financial_transaction: FiActivity,
  evidence: FiLayers,
  case: FiBriefcase,
  vehicle: FiRadio,
  aircraft: FiPlayCircle
};

const WIREFRAME_CATEGORY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  people: FiUser,
  organizations: FiUsers,
  technology: FiWifi,
  evidence: FiLayers
};

export const ICON_PACK_DEFINITIONS: Array<{
  id: IconPackId;
  label: string;
  description: string;
}> = [
  {
    id: 'default',
    label: 'Default',
    description: 'Current colorful icon set used across Vitni.'
  },
  {
    id: 'wireframe',
    label: 'Wireframe',
    description: 'Cleaner outline icons for a more schematic workspace look.'
  }
];

export function resolveNodeTypeIcon(nodeType: NodeType, iconPack: IconPackId) {
  if (iconPack === 'wireframe') {
    return WIREFRAME_NODE_ICONS[nodeType.id] ?? nodeType.icon;
  }
  return nodeType.icon;
}

export function resolveCategoryIcon(category: NodeCategory, iconPack: IconPackId) {
  if (iconPack === 'wireframe') {
    return WIREFRAME_CATEGORY_ICONS[category.id] ?? category.icon;
  }
  return category.icon;
}
