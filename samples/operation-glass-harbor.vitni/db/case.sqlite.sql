-- Operation Glass Harbor sample dataset
--
-- This SQL file mirrors the production schema (migrations 001-004) and seeds
-- the narrative data referenced throughout the demo project. To create the
-- SQLite/SQLCipher database expected by the Vitni application, run:
--
--   sqlite3 db/case.sqlite < db/case.sqlite.sql
--
-- Optionally wrap the generated file with SQLCipher afterwards using the
-- `PI_DB_KEY` from the README instructions.

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- Schema -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  label TEXT,
  properties_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  pos_x REAL,
  pos_y REAL
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
  added_at INTEGER NOT NULL,
  hash TEXT,
  mime TEXT
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

CREATE TABLE IF NOT EXISTS project_setting (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_type ON entity(type);
CREATE INDEX IF NOT EXISTS idx_edge_src ON edge(src_id);
CREATE INDEX IF NOT EXISTS idx_edge_dst ON edge(dst_id);
CREATE INDEX IF NOT EXISTS idx_assertion_subject ON assertion(subject_id);
CREATE INDEX IF NOT EXISTS idx_assertion_source ON assertion(source_id);
CREATE INDEX IF NOT EXISTS idx_source_hash ON source(hash);

-- Seed data ----------------------------------------------------------------
INSERT INTO entity (id, type, label, properties_json, created_at, updated_at, pos_x, pos_y) VALUES
  ('ent-mara-vance', 'person', 'Mara Vance', '{"role":"Investigator","agency":"Harbor Authority"}', 1713916800000, 1714694400000, 120.5, 280.0),
  ('ent-harbor-freight-logistics', 'organization', 'Harbor Freight Logistics', '{"registration":"NW-2291","jurisdiction":"WA"}', 1713830400000, 1714521600000, 360.0, 120.0),
  ('ent-northwind-imports', 'organization', 'Northwind Imports', '{"contact":"CFO Office","focus":"Maritime retail"}', 1714093200000, 1714179600000, 580.0, 180.0),
  ('ent-dock-77', 'location', 'Dock 77-B', '{"harbor":"Glass Harbor","notes":"Restricted night access"}', 1714179600000, 1714694400000, 400.0, 360.0),
  ('ent-surveillance-still', 'media', 'Dockside still frame', '{"capture":"2024-04-11T03:14:00Z","camera_id":"GH-C2"}', 1714266000000, 1714352400000, 400.0, 520.0),
  ('ent-signal-relay', 'infrastructure', 'Signal Relay GH-77B', '{"frequency":"5.8GHz","status":"Active"}', 1714179600000, 1714521600000, 520.0, 320.0);

INSERT INTO edge (id, src_id, dst_id, type, properties_json, created_at, updated_at) VALUES
  ('edge-investigation-lead', 'ent-mara-vance', 'ent-harbor-freight-logistics', 'investigates', '{"opened":"2024-04-06"}', 1714003200000, 1714694400000),
  ('edge-invoice-payment', 'ent-harbor-freight-logistics', 'ent-northwind-imports', 'financial-transaction', '{"amount":48200,"currency":"Harbor Credits"}', 1714093200000, 1714352400000),
  ('edge-night-transfer', 'ent-harbor-freight-logistics', 'ent-dock-77', 'route', '{"window":"02:00-03:00","code":"GH-77B"}', 1714179600000, 1714266000000),
  ('edge-surveillance-source', 'ent-dock-77', 'ent-surveillance-still', 'evidence', '{"camera":"GH-C2"}', 1714266000000, 1714352400000),
  ('edge-signal-handshake', 'ent-signal-relay', 'ent-harbor-freight-logistics', 'communication', '{"band":"5.8GHz","encryption":"WPA3"}', 1714179600000, 1714521600000);

INSERT INTO source (id, kind, locator, title, added_at, hash, mime) VALUES
  ('src-invoice', 'file', 'attachments/a8/72/a8722cae02b4646c8c90dcf2ffa28f49107e5ac710e1af5fb18ef4c0c91a5599.txt', 'Harbor Freight Logistics - Invoice NW-2291', 1714093200000, 'a8722cae02b4646c8c90dcf2ffa28f49107e5ac710e1af5fb18ef4c0c91a5599', 'text/plain'),
  ('src-surveillance', 'file', 'attachments/52/8d/528d4f1e1e4be74f18d29cea6837e8559215577e913dcca6d8b1e38a80e27c1d.png', 'Dockside surveillance still', 1714266000000, '528d4f1e1e4be74f18d29cea6837e8559215577e913dcca6d8b1e38a80e27c1d', 'image/png'),
  ('src-board-thread', 'transcript', 'sources/board-strategy-thread.txt', 'Strategy thread excerpt', 1714179600000, NULL, 'text/plain');

INSERT INTO assertion (id, subject_kind, subject_id, path, value_json, source_id, confidence, created_at) VALUES
  ('asrt-invoice-link', 'entity', 'ent-harbor-freight-logistics', 'properties.pending_invoice', '{"id":"NW-2291","amount":48200}', 'src-invoice', 'high', 1714093200000),
  ('asrt-night-transfer', 'entity', 'ent-dock-77', 'properties.transfer_window', '"02:00-03:00"', 'src-invoice', 'medium', 1714179600000),
  ('asrt-board-code', 'entity', 'ent-signal-relay', 'properties.route_code', '"GH-77B"', 'src-board-thread', 'medium', 1714266000000),
  ('asrt-surveillance-match', 'entity', 'ent-surveillance-still', 'properties.matches_route_code', 'true', 'src-surveillance', 'high', 1714269600000),
  ('asrt-investigator-note', 'entity', 'ent-mara-vance', 'properties.notes', '"Verified invoice routing anomaly"', 'src-invoice', 'high', 1714352400000),
  ('asrt-signal-handshake', 'entity', 'ent-harbor-freight-logistics', 'properties.signal_link', '"Relay GH-77B"', 'src-board-thread', 'medium', 1714352400000);

INSERT INTO transform_run (id, transform_id, input_json, output_summary, consent_snapshot_json, started_at, finished_at) VALUES
  ('trn-dedupe-001', 'local/dedupe/attachments', '{"hash":"a8722c...5599"}', 'Confirmed invoice attachment matches ledger copy.', '{"actor":"Mara Vance","granted":true}', 1714352400000, 1714352460000);

INSERT INTO audit (id, action, subject_kind, subject_id, actor, reason, transform_run_id, created_at) VALUES
  ('audit-create-entity-1', 'create', 'entity', 'ent-mara-vance', 'Mara Vance', 'Initial case setup', NULL, 1713916800000),
  ('audit-attach-invoice', 'attach-source', 'entity', 'ent-harbor-freight-logistics', 'Mara Vance', 'Invoice cross-check', 'trn-dedupe-001', 1714352400000),
  ('audit-log-surveillance', 'attach-source', 'entity', 'ent-surveillance-still', 'Mara Vance', 'Imported dockside still', NULL, 1714269600000);

INSERT INTO project_setting (key, value_json, updated_at) VALUES
  ('viewport', '{"pan":{"x":-120,"y":60},"zoom":1.1}', 1714694400000),
  ('defaultConfidence', '"medium"', 1714694400000),
  ('featureFlags', '{"attachments":true,"snapshots":true}', 1714694400000);

COMMIT;
