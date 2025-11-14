# Jenkins Setup for UBS Prime Broker Activity Statement Processing

## Overview
Automate ingestion of daily `PrimeBrokerActivityStatement` CSV files from the UBS SFTP feed into the `ubs.ubs_prime_broker_activity` table. Files accumulate monthly history (each daily file contains all transactions from the start of the month to that day), so duplicate detection is critical.

## Prerequisites
- Jenkins on Windows Server
- Python 3.8+ in `PATH`
- Git access to this repository
- UBS SFTP credentials
- PostgreSQL connection string for the `ubs` schema

## Jenkins Job (Freestyle)

1. **Source Code Management**
   - Git Repository: `https://github.com/GZCIM/GZC-Intel-Application-AC`
   - Branch: `*/main`

2. **Build Environment**
   - Check **Use secret text(s) or file(s)** and bind:
     - `UBS_SFTP_USERNAME` → secret text credential
     - `UBS_SFTP_PASSWORD` → secret text credential
     - `POSTGRES_CONNECTION_STRING` → secret text credential
   - Add environment variables:
     - `UBS_SFTP_HOST` = `st-ext-prd-uk.ubs.com`
     - `UBS_SFTP_PORT` = `8022`
     - `UBS_SFTP_REMOTE_DIR` = `/from_UBS`
     - *(Optional)* `UBS_LOCAL_DOWNLOAD_DIR` = `C:\tmpubs` (folder for local copies)

3. **Build Parameters**
   - Enable **This project is parameterized**
   - Add **Date Parameter**:
     - **Name**: `PROCESS_DATE`
     - **Date Format**: `yyyy-MM-dd`
     - **Default Value**: `LocalDate.now()` (script automatically processes the last workday before this reference date)
     - **Description**: `Reference date (script processes the last workday before this date)`

4. **Build Steps**
   ```batch
   cd ubs_ops
   pip install -r requirements_ubs_processing.txt
   echo Reference date: %PROCESS_DATE%
   python process_ubs_prime_broker_activity_daily.py --date %PROCESS_DATE%
   ```

5. **Build Triggers**
   - Schedule: `0 11 * * 1-5` (11 AM Monday–Friday) or aligned with file availability.

6. **Post-build Actions**
   - Archive `ubs_ops/ubs_prime_broker_activity_processing.log` (allow empty archive).

## Processing Notes
- **Monthly Accumulation**: Each daily file contains all transactions from the start of the month to that day. The same transaction may appear in multiple files (e.g., Nov 3 transactions appear in both Nov 3 and Nov 4 files).
- **Duplicate Detection**: Uses `record_hash` based on `account_id`, `trade_date`, `ubs_ref`, `trans_type`, `net_amount`, and `settle_ccy` to prevent duplicate inserts.
- **Transaction Dates**: Stores actual transaction dates (`trade_date`, `entry_date`, `settle_date`) extracted from the CSV, not the file date.
- **File Date**: The `file_date` column stores the date from the filename (YYYYMMDD), indicating which day's file contained the transaction.
- Files saved locally to `UBS_LOCAL_DOWNLOAD_DIR` (defaults to `C:\tmpubs\<filename>`).
- All row types are preserved: transactions, opening/closing balances, and subtotals.

## Monitoring
- Raw data stored in `ubs.ubs_prime_broker_activity`.
- Processing history tracked in `ubs.ubs_file_processing_log` with `file_category = 'prime_broker_activity'`.
- Example queries:
  ```sql
  -- Check processing status
  SELECT *
  FROM ubs.ubs_file_processing_log
  WHERE file_category = 'prime_broker_activity'
  ORDER BY cob_date DESC, completed_at DESC
  LIMIT 20;

  -- Count transactions by date
  SELECT trade_date, COUNT(*) as transaction_count
  FROM ubs.ubs_prime_broker_activity
  WHERE row_type = 'transaction'
    AND trade_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY trade_date
  ORDER BY trade_date DESC;

  -- Daily transaction summary by account
  SELECT
    trade_date,
    account_id,
    account_name,
    settle_ccy,
    trans_type,
    COUNT(*) as count,
    SUM(net_amount) as total_net_amount
  FROM ubs.ubs_prime_broker_activity
  WHERE row_type = 'transaction'
    AND trade_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY trade_date, account_id, account_name, settle_ccy, trans_type
  ORDER BY trade_date DESC, account_id, trans_type;

  -- Opening/closing balances by account and currency
  SELECT
    balance_date,
    account_id,
    account_name,
    settle_ccy,
    balance_type,
    balance_amount
  FROM ubs.ubs_prime_broker_activity
  WHERE row_type IN ('opening_balance', 'closing_balance')
    AND balance_date >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY balance_date DESC, account_id, settle_ccy, balance_type;
  ```

## Local File Processing

For testing, manual processing, or reprocessing files, use the standalone `process_local_prime_broker_file.py` script.

### Usage

**Required Arguments:**
1. `file_path` - Full path to the CSV file (positional argument)
2. `--connection-string` - PostgreSQL connection string (required)

**Basic Command:**
```bash
python process_local_prime_broker_file.py "C:\tmp\20251113.PrimeBrokerActivityStatement.GRPGZCAP.818292019.CSV" --connection-string "postgresql://user:pass@host:5432/db?sslmode=require"
```

**Windows PowerShell Example:**
```powershell
cd ubs_ops
python process_local_prime_broker_file.py `
  "C:\tmp\20251113.PrimeBrokerActivityStatement.GRPGZCAP.818292019.CSV" `
  --connection-string "postgresql://mikael:Ii89rra137+*@gzcdevserver.postgres.database.azure.com:5432/gzc_platform?sslmode=require"
```

**Windows CMD Example:**
```cmd
cd ubs_ops
python process_local_prime_broker_file.py "C:\tmp\20251113.PrimeBrokerActivityStatement.GRPGZCAP.818292019.CSV" --connection-string "postgresql://user:pass@host:5432/db?sslmode=require"
```

### How It Works

- **Date Extraction**: Automatically extracts date from filename (format: `YYYYMMDD.*.CSV`)
- **Filename Extraction**: Uses filename from file path for database storage
- **CSV Parsing**: Parses and classifies rows (transactions, balances, subtotals)
- **Duplicate Detection**: Uses `record_hash` to prevent duplicate inserts
- **Database Insertion**: Inserts into `ubs.ubs_prime_broker_activity` table
- **Logging**: Logs to `ubs.ubs_file_processing_log` and `ubs_prime_broker_activity_local_processing.log`

### Differences from Jenkins/SFTP Processing

| Feature | Local Processing | Jenkins/SFTP Processing |
|---------|------------------|------------------------|
| File Source | Local filesystem | UBS SFTP server |
| Date Parameter | Extracted from filename | Uses `PROCESS_DATE` env var |
| Connection | Command-line argument | Environment variables |
| Scheduling | Manual execution | Automated (cron) |
| File Discovery | User provides path | Searches SFTP directory |
| Use Case | Testing, reprocessing | Production automation |

