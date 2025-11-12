-- ============================================================================
-- UBS Margin Data Table Structure
-- Purpose: Store daily UBS margin CSV data with filename tracking
-- ============================================================================

-- Drop table if exists (use with caution in production)
-- DROP TABLE IF EXISTS ubs_margin_data CASCADE;

-- Create main table for UBS margin data
CREATE TABLE IF NOT EXISTS ubs_margin_data (
    -- Primary key and metadata
    id BIGSERIAL PRIMARY KEY,
    source_filename VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'system',

    -- CSV columns from UBS file
    account VARCHAR(50) NOT NULL,
    cob_date DATE NOT NULL,
    roll_ccy VARCHAR(10),
    margin_type VARCHAR(50),
    product VARCHAR(50),
    reporting_group VARCHAR(255),
    security_description VARCHAR(500),
    sec_type VARCHAR(50),
    isin_ticket_code VARCHAR(100),
    strategy VARCHAR(255),
    rating_cat_scenario VARCHAR(50),
    cnv_ratio VARCHAR(50),
    contract_multiplier VARCHAR(50),
    duration VARCHAR(50),
    trade_date VARCHAR(50), -- Stored as string due to format variations
    pos_dv01_roll DECIMAL(20, 8),
    delta VARCHAR(50),
    ccy VARCHAR(10),
    ccy_price DECIMAL(20, 8),
    fx_rate DECIMAL(20, 8), -- Note: CSV column is "FX-Rate"
    quantity DECIMAL(20, 8),
    mv_rollup DECIMAL(20, 2),
    margin_rollup DECIMAL(20, 2),
    req_percent DECIMAL(10, 4),
    ric_code VARCHAR(100),
    account_name VARCHAR(255),
    run_id VARCHAR(100),

    -- Additional metadata
    file_processed_date DATE,
    record_hash VARCHAR(64), -- For duplicate detection

    -- Constraints
    CONSTRAINT uq_record_hash UNIQUE (record_hash)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ubs_margin_account ON ubs_margin_data(account);
CREATE INDEX IF NOT EXISTS idx_ubs_margin_cob_date ON ubs_margin_data(cob_date);
CREATE INDEX IF NOT EXISTS idx_ubs_margin_filename ON ubs_margin_data(source_filename);
CREATE INDEX IF NOT EXISTS idx_ubs_margin_account_date ON ubs_margin_data(account, cob_date);
CREATE INDEX IF NOT EXISTS idx_ubs_margin_margin_type ON ubs_margin_data(margin_type);
CREATE INDEX IF NOT EXISTS idx_ubs_margin_product ON ubs_margin_data(product);
CREATE INDEX IF NOT EXISTS idx_ubs_margin_created_at ON ubs_margin_data(created_at);
CREATE INDEX IF NOT EXISTS idx_ubs_margin_file_processed_date ON ubs_margin_data(file_processed_date);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_ubs_margin_account_date_type ON ubs_margin_data(account, cob_date, margin_type);

-- Create a view for the latest data per account and date
CREATE OR REPLACE VIEW v_ubs_margin_data_latest AS
SELECT DISTINCT ON (account, cob_date, margin_type, product, reporting_group, security_description, isin_ticket_code)
    *
FROM ubs_margin_data
ORDER BY account, cob_date, margin_type, product, reporting_group, security_description, isin_ticket_code, created_at DESC;

-- Create a summary table for daily margin summaries (optional - for reporting)
CREATE TABLE IF NOT EXISTS ubs_margin_summary_daily (
    id BIGSERIAL PRIMARY KEY,
    account VARCHAR(50) NOT NULL,
    cob_date DATE NOT NULL,
    source_filename VARCHAR(255) NOT NULL,

    -- Summary calculations
    total_market_value DECIMAL(20, 2),
    total_margin DECIMAL(20, 2),
    excess DECIMAL(20, 2),

    -- Component totals
    long_positions_mv DECIMAL(20, 2) DEFAULT 0,
    short_positions_mv DECIMAL(20, 2) DEFAULT 0,
    otc_mtm_mv DECIMAL(20, 2) DEFAULT 0,
    money_market_mv DECIMAL(20, 2) DEFAULT 0,
    net_cash_mv DECIMAL(20, 2) DEFAULT 0,

    cross_margined_req DECIMAL(20, 2) DEFAULT 0,
    otc_cross_netted_req DECIMAL(20, 2) DEFAULT 0,
    money_market_margin_req DECIMAL(20, 2) DEFAULT 0,
    long_short_benefit DECIMAL(20, 2) DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    calculation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_summary_account_date_file UNIQUE (account, cob_date, source_filename)
);

-- Indexes for summary table
CREATE INDEX IF NOT EXISTS idx_ubs_summary_account ON ubs_margin_summary_daily(account);
CREATE INDEX IF NOT EXISTS idx_ubs_summary_date ON ubs_margin_summary_daily(cob_date);
CREATE INDEX IF NOT EXISTS idx_ubs_summary_account_date ON ubs_margin_summary_daily(account, cob_date);

-- Create a function to calculate and store daily summary
CREATE OR REPLACE FUNCTION calculate_daily_margin_summary(
    p_account VARCHAR(50),
    p_cob_date DATE,
    p_source_filename VARCHAR(255)
) RETURNS void AS $$
BEGIN
    INSERT INTO ubs_margin_summary_daily (
        account,
        cob_date,
        source_filename,
        otc_mtm_mv,
        money_market_mv,
        net_cash_mv,
        otc_cross_netted_req,
        total_market_value,
        total_margin,
        excess
    )
    SELECT
        p_account,
        p_cob_date,
        p_source_filename,
        COALESCE(SUM(CASE WHEN margin_type = 'CrossNetOTC'
                          AND reporting_group IN ('Forward', 'Option', 'Swap', 'Cash')
                     THEN mv_rollup ELSE 0 END), 0) as otc_mtm_mv,
        COALESCE(SUM(CASE WHEN margin_type = 'CrossMarginPosition' AND product = 'MMS'
                     THEN mv_rollup ELSE 0 END), 0) as money_market_mv,
        COALESCE(SUM(CASE WHEN margin_type = 'Cash Balances'
                     THEN mv_rollup ELSE 0 END), 0) as net_cash_mv,
        COALESCE(SUM(CASE WHEN margin_type = 'CrossNetOTC'
                     THEN margin_rollup ELSE 0 END), 0) as otc_cross_netted_req,
        COALESCE(SUM(mv_rollup), 0) as total_market_value,
        COALESCE(SUM(margin_rollup), 0) as total_margin,
        COALESCE(SUM(mv_rollup), 0) - COALESCE(SUM(margin_rollup), 0) as excess
    FROM ubs_margin_data
    WHERE account = p_account
      AND cob_date = p_cob_date
      AND source_filename = p_source_filename
    ON CONFLICT (account, cob_date, source_filename)
    DO UPDATE SET
        otc_mtm_mv = EXCLUDED.otc_mtm_mv,
        money_market_mv = EXCLUDED.money_market_mv,
        net_cash_mv = EXCLUDED.net_cash_mv,
        otc_cross_netted_req = EXCLUDED.otc_cross_netted_req,
        total_market_value = EXCLUDED.total_market_value,
        total_margin = EXCLUDED.total_margin,
        excess = EXCLUDED.excess,
        calculation_timestamp = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create a table to track file processing history
CREATE TABLE IF NOT EXISTS ubs_file_processing_log (
    id BIGSERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    account VARCHAR(50),
    cob_date DATE,
    file_size_bytes BIGINT,
    record_count INTEGER,
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for processing log
CREATE INDEX IF NOT EXISTS idx_file_log_filename ON ubs_file_processing_log(filename);
CREATE INDEX IF NOT EXISTS idx_file_log_status ON ubs_file_processing_log(processing_status);
CREATE INDEX IF NOT EXISTS idx_file_log_account_date ON ubs_file_processing_log(account, cob_date);

-- Add comments for documentation
COMMENT ON TABLE ubs_margin_data IS 'Stores daily UBS margin CSV data with filename tracking to prevent overwrites';
COMMENT ON COLUMN ubs_margin_data.source_filename IS 'Original filename to prevent duplicate processing';
COMMENT ON COLUMN ubs_margin_data.record_hash IS 'Hash of key fields for duplicate detection';
COMMENT ON TABLE ubs_margin_summary_daily IS 'Daily margin summary calculations per account';
COMMENT ON TABLE ubs_file_processing_log IS 'Tracks file processing history and status';

