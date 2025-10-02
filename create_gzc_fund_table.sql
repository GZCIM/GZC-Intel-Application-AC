-- Create gzc_fund table
CREATE TABLE IF NOT EXISTS gzc_fund (
    Id INTEGER PRIMARY KEY,
    FundName VARCHAR(100) NOT NULL,
    Description TEXT,
    mod_user VARCHAR(100) DEFAULT 'system',
    mod_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Copy GMF and GCF records from leg.tblFund
-- Actual table structure: FundId, FundNameShort, FundNameFull
INSERT INTO gzc_fund (Id, FundName, Description, mod_user, mod_timestamp)
SELECT 
    "FundId" as Id,
    "FundNameShort" as FundName,
    "FundNameFull" as Description,
    'system' as mod_user,
    CURRENT_TIMESTAMP as mod_timestamp
FROM leg."tblFund" 
WHERE "FundId" IN (1, 6)  -- Only GMF and GCF
ON CONFLICT (Id) DO UPDATE SET
    FundName = EXCLUDED.FundName,
    Description = EXCLUDED.Description,
    mod_user = EXCLUDED.mod_user,
    mod_timestamp = EXCLUDED.mod_timestamp;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_gzc_fund_name ON gzc_fund(FundName);

-- Verify the data
SELECT * FROM gzc_fund ORDER BY Id;
