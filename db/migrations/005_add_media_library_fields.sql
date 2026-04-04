ALTER TABLE source ADD COLUMN folder_path TEXT;
ALTER TABLE source ADD COLUMN file_name TEXT;
ALTER TABLE source ADD COLUMN display_name TEXT;
ALTER TABLE source ADD COLUMN file_size INTEGER;
ALTER TABLE source ADD COLUMN modified_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_source_folder_path ON source(folder_path);
