import {
  FaLink,
  FaHeart,
  FaBriefcase,
  FaShieldAlt,
  FaMapMarkerAlt,
  FaComments,
  FaFileAlt,
  FaSignInAlt,
  FaDollarSign,
  FaExclamationTriangle,
  FaCalendarAlt
} from 'react-icons/fa';
import type React from 'react';
import type { EntityType } from '@shared/types';

export interface RelationshipSubtype {
  id: string;
  label: string;
  description?: string;
}

export interface RelationshipType {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  bidirectional: boolean;
  subtypes?: RelationshipSubtype[];
  allowedSourceTypes: EntityType[];
  allowedTargetTypes: EntityType[];
  defaultDirectionLabel: string;
  supportsDate: boolean;
  supportsStrength: boolean;
}

const PEOPLE: EntityType[] = ['person'];
const ORGANIZATIONS: EntityType[] = ['organization'];
const DIGITAL_IDENTIFIERS: EntityType[] = ['domain', 'website', 'online_account', 'email', 'phone', 'ip_address', 'crypto_wallet'];
const DIGITAL_ASSETS: EntityType[] = ['device', 'infrastructure'];
const PLACES_AND_ASSETS: EntityType[] = ['location', 'vehicle', 'aircraft'];
const CASE_OBJECTS: EntityType[] = ['case', 'incident', 'event'];
const RECORDS: EntityType[] = ['document', 'identity_document', 'communication', 'media', 'evidence', 'financial_account', 'financial_transaction'];
const ALL_TYPES: EntityType[] = [
  ...PEOPLE,
  ...ORGANIZATIONS,
  ...DIGITAL_IDENTIFIERS,
  ...DIGITAL_ASSETS,
  ...PLACES_AND_ASSETS,
  ...CASE_OBJECTS,
  ...RECORDS
];

export const relationshipTypes: RelationshipType[] = [
  {
    id: 'associated_with',
    label: 'Associated With',
    icon: FaLink,
    color: 'text-slate-300',
    description: 'General association used when a more specific relationship is not yet supported.',
    bidirectional: true,
    allowedSourceTypes: ALL_TYPES,
    allowedTargetTypes: ALL_TYPES,
    defaultDirectionLabel: 'is associated with',
    supportsDate: true,
    supportsStrength: true,
    subtypes: [
      { id: 'linked_to', label: 'Linked To' },
      { id: 'alias_of', label: 'Alias Of' },
      { id: 'same_as', label: 'Same As' },
      { id: 'possible_same_as', label: 'Possible Same As' }
    ]
  },
  {
    id: 'family_or_personal',
    label: 'Family / Personal',
    icon: FaHeart,
    color: 'text-rose-300',
    description: 'Personal, family, or social relationships between people.',
    bidirectional: false,
    allowedSourceTypes: PEOPLE,
    allowedTargetTypes: PEOPLE,
    defaultDirectionLabel: 'has personal relationship with',
    supportsDate: true,
    supportsStrength: true,
    subtypes: [
      { id: 'parent_of', label: 'Parent Of' },
      { id: 'child_of', label: 'Child Of' },
      { id: 'sibling_of', label: 'Sibling Of' },
      { id: 'spouse_of', label: 'Spouse Of' },
      { id: 'friend_of', label: 'Friend Of' },
      { id: 'neighbor_of', label: 'Neighbor Of' }
    ]
  },
  {
    id: 'employment_or_affiliation',
    label: 'Employment / Affiliation',
    icon: FaBriefcase,
    color: 'text-blue-300',
    description: 'Employment, education, treatment, or other institutional affiliation.',
    bidirectional: false,
    allowedSourceTypes: PEOPLE,
    allowedTargetTypes: ORGANIZATIONS,
    defaultDirectionLabel: 'is affiliated with',
    supportsDate: true,
    supportsStrength: true,
    subtypes: [
      { id: 'employee_of', label: 'Employee Of' },
      { id: 'contractor_for', label: 'Contractor For' },
      { id: 'member_of', label: 'Member Of' },
      { id: 'affiliate_of', label: 'Affiliate Of' },
      { id: 'founder_of', label: 'Founder Of' },
      { id: 'executive_of', label: 'Executive Of' },
      { id: 'student_at', label: 'Student At' },
      { id: 'patient_at', label: 'Patient At' }
    ]
  },
  {
    id: 'ownership_or_control',
    label: 'Ownership / Control',
    icon: FaShieldAlt,
    color: 'text-cyan-300',
    description: 'Ownership, registration, assignment, or administrative control.',
    bidirectional: false,
    allowedSourceTypes: [...PEOPLE, ...ORGANIZATIONS],
    allowedTargetTypes: [...DIGITAL_IDENTIFIERS, ...DIGITAL_ASSETS, ...PLACES_AND_ASSETS, 'financial_account'],
    defaultDirectionLabel: 'owns or controls',
    supportsDate: true,
    supportsStrength: true,
    subtypes: [
      { id: 'owns', label: 'Owns' },
      { id: 'leases', label: 'Leases' },
      { id: 'controls', label: 'Controls' },
      { id: 'administers', label: 'Administers' },
      { id: 'assigned_to', label: 'Assigned To' },
      { id: 'registered_to', label: 'Registered To' }
    ]
  },
  {
    id: 'located_at',
    label: 'Located At',
    icon: FaMapMarkerAlt,
    color: 'text-red-300',
    description: 'Physical or hosting location of an entity, asset, or event.',
    bidirectional: false,
    allowedSourceTypes: [...PEOPLE, ...ORGANIZATIONS, ...DIGITAL_ASSETS, ...PLACES_AND_ASSETS, ...CASE_OBJECTS, 'website', 'domain'],
    allowedTargetTypes: ['location', 'infrastructure'],
    defaultDirectionLabel: 'is located at',
    supportsDate: true,
    supportsStrength: false,
    subtypes: [
      { id: 'resides_at', label: 'Resides At' },
      { id: 'based_at', label: 'Based At' },
      { id: 'headquartered_at', label: 'Headquartered At' },
      { id: 'operates_at', label: 'Operates At' },
      { id: 'hosted_at', label: 'Hosted At' },
      { id: 'stored_at', label: 'Stored At' }
    ]
  },
  {
    id: 'communicated_with',
    label: 'Communicated With',
    icon: FaComments,
    color: 'text-indigo-300',
    description: 'A communication relationship between people, accounts, phones, emails, or communication records.',
    bidirectional: false,
    allowedSourceTypes: [...PEOPLE, 'online_account', 'phone', 'email', 'communication'],
    allowedTargetTypes: [...PEOPLE, 'online_account', 'phone', 'email', 'communication'],
    defaultDirectionLabel: 'communicated with',
    supportsDate: true,
    supportsStrength: true,
    subtypes: [
      { id: 'called', label: 'Called' },
      { id: 'texted', label: 'Texted' },
      { id: 'emailed', label: 'Emailed' },
      { id: 'messaged', label: 'Messaged' },
      { id: 'met_with', label: 'Met With' },
      { id: 'video_called', label: 'Video Called' }
    ]
  },
  {
    id: 'participated_in',
    label: 'Participated In',
    icon: FaCalendarAlt,
    color: 'text-purple-300',
    description: 'Participation in events, incidents, travel, or case activities.',
    bidirectional: false,
    allowedSourceTypes: [...PEOPLE, ...ORGANIZATIONS, 'vehicle', 'aircraft'],
    allowedTargetTypes: ['event', 'incident'],
    defaultDirectionLabel: 'participated in',
    supportsDate: true,
    supportsStrength: false,
    subtypes: [
      { id: 'attended', label: 'Attended' },
      { id: 'organized', label: 'Organized' },
      { id: 'spoke_at', label: 'Spoke At' },
      { id: 'present_at', label: 'Present At' },
      { id: 'departed_from', label: 'Departed From' },
      { id: 'arrived_at', label: 'Arrived At' }
    ]
  },
  {
    id: 'documented_by',
    label: 'Documented By',
    icon: FaFileAlt,
    color: 'text-yellow-300',
    description: 'A fact, entity, or event is documented, captured, or recorded by a record.',
    bidirectional: false,
    allowedSourceTypes: ALL_TYPES.filter((type) => !['document', 'identity_document', 'media', 'communication', 'evidence'].includes(type)),
    allowedTargetTypes: ['document', 'identity_document', 'media', 'communication', 'evidence'],
    defaultDirectionLabel: 'is documented by',
    supportsDate: true,
    supportsStrength: false,
    subtypes: [
      { id: 'mentioned_in', label: 'Mentioned In' },
      { id: 'cited_in', label: 'Cited In' },
      { id: 'authored', label: 'Authored' },
      { id: 'sent', label: 'Sent' },
      { id: 'received', label: 'Received' },
      { id: 'recorded_in', label: 'Recorded In' },
      { id: 'captured_in', label: 'Captured In' }
    ]
  },
  {
    id: 'used_or_accessed',
    label: 'Used / Accessed',
    icon: FaSignInAlt,
    color: 'text-teal-300',
    description: 'Use of devices, infrastructure, sites, services, or accounts.',
    bidirectional: false,
    allowedSourceTypes: [...PEOPLE, 'online_account', 'device', 'infrastructure'],
    allowedTargetTypes: [...DIGITAL_IDENTIFIERS, ...DIGITAL_ASSETS],
    defaultDirectionLabel: 'used or accessed',
    supportsDate: true,
    supportsStrength: true,
    subtypes: [
      { id: 'used', label: 'Used' },
      { id: 'logged_into', label: 'Logged Into' },
      { id: 'accessed', label: 'Accessed' },
      { id: 'visited', label: 'Visited' },
      { id: 'operated', label: 'Operated' },
      { id: 'connected_to', label: 'Connected To' }
    ]
  },
  {
    id: 'financially_linked',
    label: 'Financially Linked',
    icon: FaDollarSign,
    color: 'text-emerald-300',
    description: 'A financial transfer, payment, funding, or transaction relationship.',
    bidirectional: false,
    allowedSourceTypes: [...PEOPLE, ...ORGANIZATIONS, 'financial_account', 'financial_transaction', 'crypto_wallet'],
    allowedTargetTypes: [...PEOPLE, ...ORGANIZATIONS, 'financial_account', 'financial_transaction', 'crypto_wallet'],
    defaultDirectionLabel: 'is financially linked to',
    supportsDate: true,
    supportsStrength: true,
    subtypes: [
      { id: 'paid', label: 'Paid' },
      { id: 'received_from', label: 'Received From' },
      { id: 'transferred_to', label: 'Transferred To' },
      { id: 'funded', label: 'Funded' },
      { id: 'donated_to', label: 'Donated To' },
      { id: 'purchased_from', label: 'Purchased From' }
    ]
  },
  {
    id: 'case_or_incident_role',
    label: 'Case / Incident Role',
    icon: FaBriefcase,
    color: 'text-orange-300',
    description: 'The role an entity plays in a case or incident.',
    bidirectional: false,
    allowedSourceTypes: [...PEOPLE, ...ORGANIZATIONS, 'evidence', 'document', 'media', 'communication', 'financial_transaction'],
    allowedTargetTypes: ['case', 'incident'],
    defaultDirectionLabel: 'has role in',
    supportsDate: true,
    supportsStrength: false,
    subtypes: [
      { id: 'suspect_in', label: 'Suspect In' },
      { id: 'victim_in', label: 'Victim In' },
      { id: 'witness_in', label: 'Witness In' },
      { id: 'investigator_on', label: 'Investigator On' },
      { id: 'reported_by', label: 'Reported By' },
      { id: 'evidence_for', label: 'Evidence For' }
    ]
  },
  {
    id: 'threat_or_harm',
    label: 'Threat / Harm',
    icon: FaExclamationTriangle,
    color: 'text-red-400',
    description: 'Threat, coercion, attack, fraud, or harm relationships.',
    bidirectional: false,
    allowedSourceTypes: [...PEOPLE, ...ORGANIZATIONS, 'online_account'],
    allowedTargetTypes: [...PEOPLE, ...ORGANIZATIONS],
    defaultDirectionLabel: 'harmed or threatened',
    supportsDate: true,
    supportsStrength: true,
    subtypes: [
      { id: 'threatened', label: 'Threatened' },
      { id: 'attacked', label: 'Attacked' },
      { id: 'defrauded', label: 'Defrauded' },
      { id: 'extorted', label: 'Extorted' },
      { id: 'harassed', label: 'Harassed' }
    ]
  }
];

export function isRelationshipAllowed(
  relationship: RelationshipType,
  sourceType?: string | null,
  targetType?: string | null
): boolean {
  if (!sourceType || !targetType) return true;
  return (
    relationship.allowedSourceTypes.includes(sourceType as EntityType) &&
    relationship.allowedTargetTypes.includes(targetType as EntityType)
  );
}
