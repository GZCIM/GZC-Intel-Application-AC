-- Migration script for gzc_fund table
-- This script creates the gzc_fund table and copies GMF/GCF records from the legacy table

-- Step 1: Create the gzc_fund table
CREATE TABLE IF NOT EXISTS gzc_fund (
    Id INTEGER PRIMARY KEY,
    FundName VARCHAR(100) NOT NULL,
    Description TEXT,
    mod_user VARCHAR(100) DEFAULT 'system',
    mod_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_gzc_fund_name ON gzc_fund(FundName);

-- Step 3: Insert GMF and GCF records from legacy table
-- Actual table structure: FundId, FundNameShort, FundNameFull
INSERT INTO gzc_fund (Id, FundName, Description, mod_user, mod_timestamp)
SELECT 
    "FundId" as Id,
    "FundNameShort" as FundName,
    "FundNameFull" as Description,
    'migration' as mod_user,
    CURRENT_TIMESTAMP as mod_timestamp
FROM leg."tblFund" 
WHERE "FundId" IN (1, 6)  -- Only GMF and GCF
ON CONFLICT (Id) DO UPDATE SET
    FundName = EXCLUDED.FundName,
    Description = EXCLUDED.Description,
    mod_user = EXCLUDED.mod_user,
    mod_timestamp = EXCLUDED.mod_timestamp;

-- Step 4: Verify the migration
SELECT 
    Id,
    FundName,
    Description,
    mod_user,
    mod_timestamp
FROM gzc_fund 
ORDER BY Id;

-- Expected output:
-- Id | FundName | Description                    | mod_user  | mod_timestamp
-- 1  | GMF      | Global Macro Fund              | migration | [timestamp]
-- 6  | GCF      | Global Currencies Fund         | migration | [timestamp]
