-- Script to check the structure of gzc_platform.leg.tblFund table
-- This will help us understand the actual column names and structure

-- Step 1: Check if the table exists and get its structure
SELECT
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    column_default
FROM information_schema.columns
WHERE table_schema = 'leg'
  AND table_name = 'tblFund'
ORDER BY ordinal_position;

-- Step 2: Get sample data to understand the actual values
SELECT * FROM gzc_platform.leg.tblFund
WHERE FundId IN (1, 6)
ORDER BY FundId;

-- Step 3: Get all available funds to see the full structure
SELECT * FROM gzc_platform.leg.tblFund
ORDER BY FundId;

-- Step 4: Check for any constraints or indexes
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'leg'
  AND tc.table_name = 'tblFund';

