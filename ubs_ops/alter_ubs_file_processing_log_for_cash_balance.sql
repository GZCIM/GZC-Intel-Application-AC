-- ============================================================================
-- Alter ubs_file_processing_log to support additional file metadata
-- ============================================================================

ALTER TABLE ubs.ubs_file_processing_log
    ADD COLUMN IF NOT EXISTS file_category VARCHAR(50),
    ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS file_sequence INTEGER,
    ADD COLUMN IF NOT EXISTS local_path TEXT;

CREATE INDEX IF NOT EXISTS idx_file_log_category_date
    ON ubs.ubs_file_processing_log(file_category, cob_date);

CREATE INDEX IF NOT EXISTS idx_file_log_hash
    ON ubs.ubs_file_processing_log(file_hash);

CREATE INDEX IF NOT EXISTS idx_file_log_category_status
    ON ubs.ubs_file_processing_log(file_category, processing_status);

COMMENT ON COLUMN ubs.ubs_file_processing_log.file_category IS 'Logical category of the processed file (e.g., margin, cash_balance).';
COMMENT ON COLUMN ubs.ubs_file_processing_log.file_hash IS 'SHA-256 hash of entire file contents for duplicate detection.';
COMMENT ON COLUMN ubs.ubs_file_processing_log.file_sequence IS 'Sequence number of unique files processed for a given COB date.';
COMMENT ON COLUMN ubs.ubs_file_processing_log.local_path IS 'Local filesystem path where the file copy was stored.';
