ALTER TABLE assertion ADD COLUMN review_state TEXT NOT NULL DEFAULT 'unreviewed';
ALTER TABLE assertion ADD COLUMN review_note TEXT;
ALTER TABLE assertion ADD COLUMN reviewed_by TEXT;
ALTER TABLE assertion ADD COLUMN reviewed_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_assertion_review_state ON assertion(review_state);
