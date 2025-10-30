ALTER TABLE source ADD COLUMN hash TEXT;
ALTER TABLE source ADD COLUMN mime TEXT;
CREATE INDEX IF NOT EXISTS idx_source_hash ON source(hash);
