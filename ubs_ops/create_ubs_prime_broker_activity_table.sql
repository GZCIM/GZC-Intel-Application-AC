-- ============================================================================
-- UBS Prime Broker Activity Statement Table Structure
-- Purpose: Store daily transaction-level activity statements with monthly accumulation
-- ============================================================================

CREATE TABLE IF NOT EXISTS ubs.ubs_prime_broker_activity (
    id BIGSERIAL PRIMARY KEY,
    source_filename VARCHAR(255) NOT NULL,
    file_date DATE NOT NULL,  -- Date from filename (YYYYMMDD)
    row_type VARCHAR(20) NOT NULL,  -- 'transaction', 'opening_balance', 'closing_balance', 'subtotal_currency', 'subtotal_account', 'empty'

    -- Account and Currency
    account_name VARCHAR(255),
    account_id VARCHAR(50),
    settle_ccy VARCHAR(10),

    -- Transaction Dates (actual transaction dates, not file date)
    entry_date DATE,
    trade_date DATE,
    settle_date DATE,

    -- Transaction Details
    trans_type VARCHAR(50),  -- Withdraw, Deposit, Interest, Buy, Sell
    cancel VARCHAR(10),
    isin VARCHAR(50),
    security_description VARCHAR(500),
    ubs_ref VARCHAR(100),
    client_ref VARCHAR(100),
    exec_broker VARCHAR(100),

    -- Transaction Amounts
    quantity NUMERIC(20, 8),
    price NUMERIC(20, 8),
    comm NUMERIC(20, 4),
    net_amount NUMERIC(20, 4),

    -- Balance Information (for opening/closing balance rows)
    balance_date DATE,  -- Extracted from "Opening TD Balance - DD MMM YYYY"
    balance_amount NUMERIC(20, 4),
    balance_type VARCHAR(20),  -- 'opening' or 'closing'

    -- Metadata
    line_number INTEGER,
    record_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_prime_broker_activity_record UNIQUE (record_hash)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pb_activity_file_date ON ubs.ubs_prime_broker_activity(file_date);
CREATE INDEX IF NOT EXISTS idx_pb_activity_trade_date ON ubs.ubs_prime_broker_activity(trade_date);
CREATE INDEX IF NOT EXISTS idx_pb_activity_account_id ON ubs.ubs_prime_broker_activity(account_id);
CREATE INDEX IF NOT EXISTS idx_pb_activity_settle_ccy ON ubs.ubs_prime_broker_activity(settle_ccy);
CREATE INDEX IF NOT EXISTS idx_pb_activity_trans_type ON ubs.ubs_prime_broker_activity(trans_type);
CREATE INDEX IF NOT EXISTS idx_pb_activity_row_type ON ubs.ubs_prime_broker_activity(row_type);
CREATE INDEX IF NOT EXISTS idx_pb_activity_ubs_ref ON ubs.ubs_prime_broker_activity(ubs_ref);
CREATE INDEX IF NOT EXISTS idx_pb_activity_account_trade_date ON ubs.ubs_prime_broker_activity(account_id, trade_date);
CREATE INDEX IF NOT EXISTS idx_pb_activity_balance_date ON ubs.ubs_prime_broker_activity(balance_date, account_id, settle_ccy);

COMMENT ON TABLE ubs.ubs_prime_broker_activity IS 'Stores daily Prime Broker Activity Statement transactions. Files accumulate monthly history, so same transaction may appear in multiple files.';
COMMENT ON COLUMN ubs.ubs_prime_broker_activity.file_date IS 'Date extracted from filename (YYYYMMDD). File contains transactions from start of month to this date.';
COMMENT ON COLUMN ubs.ubs_prime_broker_activity.trade_date IS 'Actual transaction date. Used to identify unique transactions across files.';
COMMENT ON COLUMN ubs.ubs_prime_broker_activity.row_type IS 'Classification: transaction, opening_balance, closing_balance, subtotal_currency, subtotal_account, empty';
COMMENT ON COLUMN ubs.ubs_prime_broker_activity.record_hash IS 'Hash of key fields (account_id, trade_date, ubs_ref, trans_type, net_amount) for duplicate detection across files.';

