-- ============================================================================
-- UBS Cash Balance Data Table Structure
-- Purpose: Store daily UBS cash balance CSV data with filename tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS ubs.ubs_cash_balance_data (
    id BIGSERIAL PRIMARY KEY,
    cob_date DATE NOT NULL,
    source_filename VARCHAR(255) NOT NULL,
    file_sequence INTEGER NOT NULL,
    row_type VARCHAR(20) NOT NULL,
    fund_account VARCHAR(50),
    account_name_raw VARCHAR(255),
    account_id_raw VARCHAR(255),
    ccy VARCHAR(10),
    td_cash_balance NUMERIC(20, 4),
    sd_cash_balance NUMERIC(20, 4),
    fx_rate NUMERIC(20, 8),
    td_cash_balance_base NUMERIC(20, 4),
    sd_cash_balance_base NUMERIC(20, 4),
    line_number INTEGER,
    record_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ubs_cash_balance_record UNIQUE (record_hash)
);

-- Helpful indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_ubs_cash_balance_cob_date ON ubs.ubs_cash_balance_data(cob_date);
CREATE INDEX IF NOT EXISTS idx_ubs_cash_balance_fund_account ON ubs.ubs_cash_balance_data(fund_account);
CREATE INDEX IF NOT EXISTS idx_ubs_cash_balance_row_type ON ubs.ubs_cash_balance_data(row_type);
CREATE INDEX IF NOT EXISTS idx_ubs_cash_balance_file_sequence ON ubs.ubs_cash_balance_data(cob_date, file_sequence);

COMMENT ON TABLE ubs.ubs_cash_balance_data IS 'Stores daily UBS cash balance CSV data (detail and subtotal rows) with duplicate tracking.';
COMMENT ON COLUMN ubs.ubs_cash_balance_data.file_sequence IS 'Sequence of unique files processed for the same COB date (1 = first file, 2 = second unique file, etc.).';
COMMENT ON COLUMN ubs.ubs_cash_balance_data.row_type IS 'Classification of the row: detail, subtotal, grand_total, etc.';
COMMENT ON COLUMN ubs.ubs_cash_balance_data.record_hash IS 'Hash of row contents for duplicate detection across files.';
