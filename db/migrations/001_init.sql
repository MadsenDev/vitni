CREATE TABLE IF NOT EXISTS entity (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  label TEXT,
  properties_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS edge (
  id TEXT PRIMARY KEY,
  src_id TEXT NOT NULL,
  dst_id TEXT NOT NULL,
  type TEXT NOT NULL,
  properties_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(src_id) REFERENCES entity(id),
  FOREIGN KEY(dst_id) REFERENCES entity(id)
);

CREATE TABLE IF NOT EXISTS source (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  locator TEXT NOT NULL,
  title TEXT,
  added_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assertion (
  id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  path TEXT NOT NULL,
  value_json TEXT NOT NULL,
  source_id TEXT NOT NULL,
  confidence TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(subject_id) REFERENCES entity(id),
  FOREIGN KEY(source_id) REFERENCES source(id)
);

CREATE TABLE IF NOT EXISTS transform_run (
  id TEXT PRIMARY KEY,
  transform_id TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_summary TEXT,
  consent_snapshot_json TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER
);

CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT,
  transform_run_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(transform_run_id) REFERENCES transform_run(id)
);

CREATE INDEX IF NOT EXISTS idx_entity_type ON entity(type);
CREATE INDEX IF NOT EXISTS idx_edge_src ON edge(src_id);
CREATE INDEX IF NOT EXISTS idx_edge_dst ON edge(dst_id);
CREATE INDEX IF NOT EXISTS idx_assertion_subject ON assertion(subject_id);
CREATE INDEX IF NOT EXISTS idx_assertion_source ON assertion(source_id);
