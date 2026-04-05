import type { EntityType } from '@shared/types';
import type { AssertionReviewState, Confidence } from '@shared/types';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';

export type AssertionFieldMapping = {
  nodeType: EntityType;
  propertyKey: string;
  assertionPath: string;
  autoAssert: boolean;
  derivedSummary: boolean;
  multiValue?: boolean;
};

export type AssertionFieldEvidenceStatus = 'none' | 'single' | 'multiple';

export type DerivedFieldAssertionState = {
  mapping: AssertionFieldMapping;
  assertions: ParsedAssertionRecord[];
  strongestAssertion: ParsedAssertionRecord | null;
  supportingSourceCount: number;
  evidenceStatus: AssertionFieldEvidenceStatus;
  reviewState: AssertionReviewState | 'mixed' | null;
  hasConflict: boolean;
  displayValue: string | null;
};

const FIELD_MAPPINGS: AssertionFieldMapping[] = [
  { nodeType: 'person', propertyKey: 'firstName', assertionPath: 'identity.first_name', autoAssert: true, derivedSummary: true },
  { nodeType: 'person', propertyKey: 'lastName', assertionPath: 'identity.last_name', autoAssert: true, derivedSummary: true },
  { nodeType: 'person', propertyKey: 'alias', assertionPath: 'identity.aliases', autoAssert: true, derivedSummary: true, multiValue: true },
  { nodeType: 'person', propertyKey: 'birthDate', assertionPath: 'identity.birth_date', autoAssert: true, derivedSummary: true },
  { nodeType: 'person', propertyKey: 'birthPlace', assertionPath: 'identity.birth_place', autoAssert: true, derivedSummary: true },
  { nodeType: 'person', propertyKey: 'nationality', assertionPath: 'identity.nationality', autoAssert: true, derivedSummary: true },
  { nodeType: 'person', propertyKey: 'email', assertionPath: 'contact.email', autoAssert: true, derivedSummary: true },
  { nodeType: 'person', propertyKey: 'phone', assertionPath: 'contact.phone', autoAssert: true, derivedSummary: true },
  { nodeType: 'person', propertyKey: 'nationalId', assertionPath: 'identity.national_id', autoAssert: true, derivedSummary: true },
  { nodeType: 'person', propertyKey: 'passport', assertionPath: 'identity.passport_number', autoAssert: true, derivedSummary: true },
  { nodeType: 'person', propertyKey: 'driversLicense', assertionPath: 'identity.drivers_license', autoAssert: true, derivedSummary: true },

  { nodeType: 'organization', propertyKey: 'name', assertionPath: 'identity.name', autoAssert: true, derivedSummary: true },
  { nodeType: 'organization', propertyKey: 'legalName', assertionPath: 'identity.legal_name', autoAssert: true, derivedSummary: true },
  { nodeType: 'organization', propertyKey: 'registrationNumber', assertionPath: 'registration.number', autoAssert: true, derivedSummary: true },
  { nodeType: 'organization', propertyKey: 'taxId', assertionPath: 'registration.tax_id', autoAssert: true, derivedSummary: true },
  { nodeType: 'organization', propertyKey: 'website', assertionPath: 'contact.website', autoAssert: true, derivedSummary: true },
  { nodeType: 'organization', propertyKey: 'email', assertionPath: 'contact.email', autoAssert: true, derivedSummary: true },
  { nodeType: 'organization', propertyKey: 'phone', assertionPath: 'contact.phone', autoAssert: true, derivedSummary: true },
  { nodeType: 'organization', propertyKey: 'foundedDate', assertionPath: 'organization.founded_date', autoAssert: true, derivedSummary: true },
  { nodeType: 'organization', propertyKey: 'status', assertionPath: 'organization.status', autoAssert: true, derivedSummary: true },

  { nodeType: 'domain', propertyKey: 'domain', assertionPath: 'domain.name', autoAssert: true, derivedSummary: true },
  { nodeType: 'domain', propertyKey: 'registrar', assertionPath: 'domain.registrar', autoAssert: true, derivedSummary: true },
  { nodeType: 'domain', propertyKey: 'registrationDate', assertionPath: 'domain.registration_date', autoAssert: true, derivedSummary: true },
  { nodeType: 'domain', propertyKey: 'expirationDate', assertionPath: 'domain.expiration_date', autoAssert: true, derivedSummary: true },
  { nodeType: 'domain', propertyKey: 'dnsProvider', assertionPath: 'domain.dns_provider', autoAssert: true, derivedSummary: true },
  { nodeType: 'domain', propertyKey: 'registrantName', assertionPath: 'domain.registrant_name', autoAssert: true, derivedSummary: true },
  { nodeType: 'domain', propertyKey: 'registrantCountry', assertionPath: 'domain.registrant_country', autoAssert: true, derivedSummary: true },
  { nodeType: 'domain', propertyKey: 'status', assertionPath: 'domain.status', autoAssert: true, derivedSummary: true },

  { nodeType: 'website', propertyKey: 'url', assertionPath: 'website.url', autoAssert: true, derivedSummary: true },
  { nodeType: 'website', propertyKey: 'title', assertionPath: 'website.title', autoAssert: true, derivedSummary: true },
  { nodeType: 'website', propertyKey: 'websiteType', assertionPath: 'website.type', autoAssert: true, derivedSummary: true },
  { nodeType: 'website', propertyKey: 'status', assertionPath: 'website.status', autoAssert: true, derivedSummary: true },
  { nodeType: 'website', propertyKey: 'sslStatus', assertionPath: 'website.ssl_status', autoAssert: true, derivedSummary: true },

  { nodeType: 'online_account', propertyKey: 'platform', assertionPath: 'account.platform', autoAssert: true, derivedSummary: true },
  { nodeType: 'online_account', propertyKey: 'handle', assertionPath: 'account.handle', autoAssert: true, derivedSummary: true },
  { nodeType: 'online_account', propertyKey: 'displayName', assertionPath: 'account.display_name', autoAssert: true, derivedSummary: true },
  { nodeType: 'online_account', propertyKey: 'profileUrl', assertionPath: 'account.profile_url', autoAssert: true, derivedSummary: true },
  { nodeType: 'online_account', propertyKey: 'createdDate', assertionPath: 'account.created_date', autoAssert: true, derivedSummary: true },
  { nodeType: 'online_account', propertyKey: 'lastSeen', assertionPath: 'account.last_seen', autoAssert: true, derivedSummary: true },
  { nodeType: 'online_account', propertyKey: 'status', assertionPath: 'account.status', autoAssert: true, derivedSummary: true },

  { nodeType: 'email', propertyKey: 'address', assertionPath: 'email.address', autoAssert: true, derivedSummary: true },
  { nodeType: 'email', propertyKey: 'provider', assertionPath: 'email.provider', autoAssert: true, derivedSummary: true },
  { nodeType: 'email', propertyKey: 'createdDate', assertionPath: 'email.created_date', autoAssert: true, derivedSummary: true },
  { nodeType: 'email', propertyKey: 'lastActive', assertionPath: 'email.last_active', autoAssert: true, derivedSummary: true },
  { nodeType: 'email', propertyKey: 'status', assertionPath: 'email.status', autoAssert: true, derivedSummary: true },

  { nodeType: 'phone', propertyKey: 'number', assertionPath: 'phone.number', autoAssert: true, derivedSummary: true },
  { nodeType: 'phone', propertyKey: 'carrier', assertionPath: 'phone.carrier', autoAssert: true, derivedSummary: true },
  { nodeType: 'phone', propertyKey: 'countryCode', assertionPath: 'phone.country_code', autoAssert: true, derivedSummary: true },
  { nodeType: 'phone', propertyKey: 'registeredDate', assertionPath: 'phone.registered_date', autoAssert: true, derivedSummary: true },
  { nodeType: 'phone', propertyKey: 'lastActive', assertionPath: 'phone.last_active', autoAssert: true, derivedSummary: true },
  { nodeType: 'phone', propertyKey: 'status', assertionPath: 'phone.status', autoAssert: true, derivedSummary: true },

  { nodeType: 'device', propertyKey: 'name', assertionPath: 'device.name', autoAssert: true, derivedSummary: true },
  { nodeType: 'device', propertyKey: 'manufacturer', assertionPath: 'device.manufacturer', autoAssert: true, derivedSummary: true },
  { nodeType: 'device', propertyKey: 'model', assertionPath: 'device.model', autoAssert: true, derivedSummary: true },
  { nodeType: 'device', propertyKey: 'serialNumber', assertionPath: 'device.serial_number', autoAssert: true, derivedSummary: true },
  { nodeType: 'device', propertyKey: 'imei', assertionPath: 'device.imei', autoAssert: true, derivedSummary: true },
  { nodeType: 'device', propertyKey: 'macAddress', assertionPath: 'device.mac_address', autoAssert: true, derivedSummary: true },
  { nodeType: 'device', propertyKey: 'ipAddress', assertionPath: 'device.ip_address', autoAssert: true, derivedSummary: true },
  { nodeType: 'device', propertyKey: 'os', assertionPath: 'device.os', autoAssert: true, derivedSummary: true },
  { nodeType: 'device', propertyKey: 'purchaseDate', assertionPath: 'device.purchase_date', autoAssert: true, derivedSummary: true },
  { nodeType: 'device', propertyKey: 'status', assertionPath: 'device.status', autoAssert: true, derivedSummary: true },

  { nodeType: 'ip_address', propertyKey: 'ipAddress', assertionPath: 'ip.address', autoAssert: true, derivedSummary: true },
  { nodeType: 'ip_address', propertyKey: 'asn', assertionPath: 'ip.asn', autoAssert: true, derivedSummary: true },
  { nodeType: 'ip_address', propertyKey: 'provider', assertionPath: 'ip.provider', autoAssert: true, derivedSummary: true },
  { nodeType: 'ip_address', propertyKey: 'reverseDns', assertionPath: 'ip.reverse_dns', autoAssert: true, derivedSummary: true },
  { nodeType: 'ip_address', propertyKey: 'country', assertionPath: 'ip.country', autoAssert: true, derivedSummary: true },
  { nodeType: 'ip_address', propertyKey: 'city', assertionPath: 'ip.city', autoAssert: true, derivedSummary: true },
  { nodeType: 'ip_address', propertyKey: 'status', assertionPath: 'ip.status', autoAssert: true, derivedSummary: true },

  { nodeType: 'document', propertyKey: 'title', assertionPath: 'document.title', autoAssert: true, derivedSummary: true },
  { nodeType: 'document', propertyKey: 'documentType', assertionPath: 'document.type', autoAssert: true, derivedSummary: true },
  { nodeType: 'document', propertyKey: 'author', assertionPath: 'document.author', autoAssert: true, derivedSummary: true },
  { nodeType: 'document', propertyKey: 'recipient', assertionPath: 'document.recipient', autoAssert: true, derivedSummary: true },
  { nodeType: 'document', propertyKey: 'createdDate', assertionPath: 'document.created_date', autoAssert: true, derivedSummary: true },
  { nodeType: 'document', propertyKey: 'modifiedDate', assertionPath: 'document.modified_date', autoAssert: true, derivedSummary: true },
  { nodeType: 'document', propertyKey: 'url', assertionPath: 'document.url', autoAssert: true, derivedSummary: true },
  { nodeType: 'document', propertyKey: 'filePath', assertionPath: 'document.file_path', autoAssert: true, derivedSummary: true },
  { nodeType: 'document', propertyKey: 'hash', assertionPath: 'document.hash', autoAssert: true, derivedSummary: true },
  { nodeType: 'document', propertyKey: 'confidentiality', assertionPath: 'document.confidentiality', autoAssert: true, derivedSummary: true },

  { nodeType: 'identity_document', propertyKey: 'documentType', assertionPath: 'identity_document.type', autoAssert: true, derivedSummary: true },
  { nodeType: 'identity_document', propertyKey: 'documentNumber', assertionPath: 'identity_document.number', autoAssert: true, derivedSummary: true },
  { nodeType: 'identity_document', propertyKey: 'issuingCountry', assertionPath: 'identity_document.issuing_country', autoAssert: true, derivedSummary: true },
  { nodeType: 'identity_document', propertyKey: 'issuingAuthority', assertionPath: 'identity_document.issuing_authority', autoAssert: true, derivedSummary: true },
  { nodeType: 'identity_document', propertyKey: 'issueDate', assertionPath: 'identity_document.issue_date', autoAssert: true, derivedSummary: true },
  { nodeType: 'identity_document', propertyKey: 'expiryDate', assertionPath: 'identity_document.expiry_date', autoAssert: true, derivedSummary: true },
  { nodeType: 'identity_document', propertyKey: 'holderName', assertionPath: 'identity_document.holder_name', autoAssert: true, derivedSummary: true },

  { nodeType: 'financial_account', propertyKey: 'accountType', assertionPath: 'financial_account.type', autoAssert: true, derivedSummary: true },
  { nodeType: 'financial_account', propertyKey: 'accountNumber', assertionPath: 'financial_account.number', autoAssert: true, derivedSummary: true },
  { nodeType: 'financial_account', propertyKey: 'institutionName', assertionPath: 'financial_account.institution', autoAssert: true, derivedSummary: true },
  { nodeType: 'financial_account', propertyKey: 'routingNumber', assertionPath: 'financial_account.routing_number', autoAssert: true, derivedSummary: true },
  { nodeType: 'financial_account', propertyKey: 'currency', assertionPath: 'financial_account.currency', autoAssert: true, derivedSummary: true },
  { nodeType: 'financial_account', propertyKey: 'balance', assertionPath: 'financial_account.balance', autoAssert: true, derivedSummary: true },
  { nodeType: 'financial_account', propertyKey: 'status', assertionPath: 'financial_account.status', autoAssert: true, derivedSummary: true },
  { nodeType: 'financial_account', propertyKey: 'openedDate', assertionPath: 'financial_account.opened_date', autoAssert: true, derivedSummary: true },

  { nodeType: 'financial_transaction', propertyKey: 'transactionReference', assertionPath: 'transaction.reference', autoAssert: true, derivedSummary: true },
  { nodeType: 'financial_transaction', propertyKey: 'transactionType', assertionPath: 'transaction.type', autoAssert: true, derivedSummary: true },
  { nodeType: 'financial_transaction', propertyKey: 'transactionDate', assertionPath: 'transaction.date', autoAssert: true, derivedSummary: true },
  { nodeType: 'financial_transaction', propertyKey: 'amount', assertionPath: 'transaction.amount', autoAssert: true, derivedSummary: true },
  { nodeType: 'financial_transaction', propertyKey: 'currency', assertionPath: 'transaction.currency', autoAssert: true, derivedSummary: true },
  { nodeType: 'financial_transaction', propertyKey: 'merchant', assertionPath: 'transaction.merchant', autoAssert: true, derivedSummary: true },
  { nodeType: 'financial_transaction', propertyKey: 'status', assertionPath: 'transaction.status', autoAssert: true, derivedSummary: true },

  { nodeType: 'location', propertyKey: 'name', assertionPath: 'location.name', autoAssert: true, derivedSummary: true },
  { nodeType: 'location', propertyKey: 'address', assertionPath: 'location.address', autoAssert: true, derivedSummary: true },
  { nodeType: 'location', propertyKey: 'city', assertionPath: 'location.city', autoAssert: true, derivedSummary: true },
  { nodeType: 'location', propertyKey: 'state', assertionPath: 'location.state', autoAssert: true, derivedSummary: true },
  { nodeType: 'location', propertyKey: 'zipCode', assertionPath: 'location.postal_code', autoAssert: true, derivedSummary: true },
  { nodeType: 'location', propertyKey: 'country', assertionPath: 'location.country', autoAssert: true, derivedSummary: true },
  { nodeType: 'location', propertyKey: 'latitude', assertionPath: 'location.latitude', autoAssert: true, derivedSummary: true },
  { nodeType: 'location', propertyKey: 'longitude', assertionPath: 'location.longitude', autoAssert: true, derivedSummary: true }
];

const REVIEW_PRIORITY: Record<AssertionReviewState, number> = {
  accepted: 0,
  unreviewed: 1,
  disputed: 2,
  rejected: 3
};

const CONFIDENCE_PRIORITY: Record<Confidence, number> = {
  verified: 0,
  asserted: 1,
  unverified: 2
};

export function getAssertionFieldMappings(nodeType: EntityType) {
  return FIELD_MAPPINGS.filter((mapping) => mapping.nodeType === nodeType);
}

export function getAssertionFieldMapping(nodeType: EntityType, propertyKey: string) {
  return FIELD_MAPPINGS.find((mapping) => mapping.nodeType === nodeType && mapping.propertyKey === propertyKey) ?? null;
}

export function buildFieldAssertionValue(value: unknown) {
  return { value };
}

export function getFieldAssertionPrimitiveValue(assertion: ParsedAssertionRecord): unknown {
  if ('value' in assertion.value) return assertion.value.value;
  const entries = Object.values(assertion.value);
  if (entries.length === 1) return entries[0];
  return assertion.value;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`).join(',')}}`;
}

function compareAssertions(left: ParsedAssertionRecord, right: ParsedAssertionRecord) {
  const reviewDelta = REVIEW_PRIORITY[left.review_state] - REVIEW_PRIORITY[right.review_state];
  if (reviewDelta !== 0) return reviewDelta;
  const confidenceDelta = CONFIDENCE_PRIORITY[left.confidence] - CONFIDENCE_PRIORITY[right.confidence];
  if (confidenceDelta !== 0) return confidenceDelta;
  return right.created_at - left.created_at;
}

function summarizePrimitive(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((entry) => summarizePrimitive(entry)).filter(Boolean).join(', ') || null;
  if (typeof value === 'object') {
    const serialized = JSON.stringify(value);
    return serialized.length > 120 ? `${serialized.slice(0, 117)}...` : serialized;
  }
  return String(value);
}

export function deriveFieldAssertionState(
  mapping: AssertionFieldMapping,
  assertions: ParsedAssertionRecord[]
): DerivedFieldAssertionState {
  const pathAssertions = assertions
    .filter((assertion) => assertion.path === mapping.assertionPath)
    .sort(compareAssertions);
  const strongestAssertion = pathAssertions[0] ?? null;
  const supportingSourceCount = new Set(pathAssertions.map((assertion) => assertion.source_id).filter(Boolean)).size;
  const evidenceStatus: AssertionFieldEvidenceStatus =
    supportingSourceCount === 0 ? 'none' : supportingSourceCount === 1 ? 'single' : 'multiple';
  const reviewStates = new Set(pathAssertions.map((assertion) => assertion.review_state));
  const serializedValues = new Set(pathAssertions.map((assertion) => stableSerialize(getFieldAssertionPrimitiveValue(assertion))));
  return {
    mapping,
    assertions: pathAssertions,
    strongestAssertion,
    supportingSourceCount,
    evidenceStatus,
    reviewState:
      reviewStates.size === 0 ? null : reviewStates.size === 1 ? pathAssertions[0]?.review_state ?? null : 'mixed',
    hasConflict: serializedValues.size > 1,
    displayValue: strongestAssertion ? summarizePrimitive(getFieldAssertionPrimitiveValue(strongestAssertion)) : null
  };
}
