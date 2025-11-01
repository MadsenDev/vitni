export type EntityType =
  | 'person'
  | 'org'
  | 'domain'
  | 'phone'
  | 'email'
  | 'document';

export type Confidence = 'asserted' | 'unverified' | 'verified';

export interface EntityRecord {
  id: string;
  type: EntityType;
  label: string | null;
  properties_json: string;
  created_at: number;
  updated_at: number;
}

export interface EdgeRecord {
  id: string;
  src_id: string;
  dst_id: string;
  type: string;
  properties_json: string;
  created_at: number;
  updated_at: number;
}

export interface SourceRecord {
  id: string;
  kind: string;
  locator: string;
  title: string | null;
  added_at: number;
  hash: string | null;
  mime: string | null;
}

export interface SourceUsageRecord {
  assertion_id: string;
  entity_id: string;
  entity_label: string | null;
  assertion_path: string;
}

export interface SourceWithUsage extends SourceRecord {
  usage: SourceUsageRecord[];
}

export interface AssertionRecord {
  id: string;
  subject_kind: string;
  subject_id: string;
  path: string;
  value_json: string;
  source_id: string;
  confidence: Confidence;
  created_at: number;
}

export interface TransformRunRecord {
  id: string;
  transform_id: string;
  input_json: string;
  output_summary: string | null;
  consent_snapshot_json: string;
  started_at: number;
  finished_at: number | null;
}

export interface AuditRecord {
  id: string;
  action: string;
  subject_kind: string;
  subject_id: string;
  actor: string;
  reason: string | null;
  transform_run_id: string | null;
  created_at: number;
}

export interface ProjectSettingRecord {
  key: string;
  value_json: string;
  updated_at: number;
}

export interface GraphNode {
  id: string;
  type: EntityType;
  label: string;
  confidence: Confidence;
}

export interface GraphEdge {
  id: string;
  type: string;
  source: string;
  target: string;
}

export interface SourceSummary {
  id: string;
  kind: string;
  locator: string;
  title?: string | null;
  added_at: number;
  hash?: string | null;
  mime?: string | null;
}

export interface AttachmentResult {
  hash: string;
  relativePath: string;
  absolutePath: string;
  mimeType: string;
}

export interface ProjectMetadata {
  author?: string;
  description?: string;
  caseId?: string;
  agency?: string;
  contact?: string;
  jurisdiction?: string;
  tags?: string[];
  createdDate?: string; // ISO date
  modifiedDate?: string; // ISO date
  notes?: string;
}

export * from './transforms';
