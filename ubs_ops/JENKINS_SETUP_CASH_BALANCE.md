# Jenkins Setup for UBS Cash Balance Processing

## Overview
Automate ingestion of daily `CashBalances` CSV files from the UBS SFTP feed into the `ubs.ubs_cash_balance_data` table. The job mirrors the existing margin-processing pipeline but targets cash balances.

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
   python process_ubs_cash_balance_daily.py --date %PROCESS_DATE%
   ```

5. **Build Triggers**
   - Schedule: `0 11 * * 1-5` (11 AM Monday–Friday) or aligned with cash file availability.

6. **Post-build Actions**
   - Archive `ubs_ops/ubs_cash_balance_processing.log` (allow empty archive).

## Pipeline Example

```groovy
pipeline {
    agent any

    parameters {
        date(name: 'PROCESS_DATE', defaultValue: 'now', description: 'Reference date (script processes last workday before this)')
    }

    environment {
        UBS_SFTP_HOST = 'st-ext-prd-uk.ubs.com'
        UBS_SFTP_PORT = '8022'
        UBS_SFTP_REMOTE_DIR = '/from_UBS'
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install Requirements') {
            steps {
                bat 'pip install -r ubs_ops\\requirements_ubs_processing.txt'
            }
        }

        stage('Process Cash Balances') {
            steps {
                withCredentials([
                    string(credentialsId: 'ubs-sftp-username', variable: 'UBS_SFTP_USERNAME'),
                    string(credentialsId: 'ubs-sftp-password', variable: 'UBS_SFTP_PASSWORD'),
                    string(credentialsId: 'postgres-connection-string', variable: 'POSTGRES_CONNECTION_STRING')
                ]) {
                    dir('ubs_ops') {
                        bat "python process_ubs_cash_balance_daily.py --date ${params.PROCESS_DATE}"
                    }
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'ubs_ops/ubs_cash_balance_processing.log', allowEmptyArchive: true
        }
    }
}
```

## Processing Notes
- The script treats `PROCESS_DATE` as a **reference** date and processes the **previous workday**.
- Files saved locally to `UBS_LOCAL_DOWNLOAD_DIR` (defaults to `C:\tmpubs\<filename>`).
- Entire files are stored when content changes; identical files are logged as `duplicate` and skipped.
- All rows (detail, subtotal, grand total) are preserved with `row_type` metadata.

## Monitoring
- Raw data stored in `ubs.ubs_cash_balance_data`.
- Processing history tracked in `ubs.ubs_file_processing_log` with `file_category = 'cash_balance'`.
- Example queries:
  ```sql
  SELECT *
  FROM ubs.ubs_file_processing_log
  WHERE file_category = 'cash_balance'
  ORDER BY cob_date DESC, completed_at DESC
  LIMIT 20;

  SELECT cob_date, file_sequence, row_type, fund_account, ccy,
         SUM(td_cash_balance_base) AS td_base,
         SUM(sd_cash_balance_base) AS sd_base
  FROM ubs.ubs_cash_balance_data
  WHERE cob_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY cob_date, file_sequence, row_type, fund_account, ccy
  ORDER BY cob_date DESC, file_sequence, row_type;
  ```

## Local File Processing

For testing, manual processing, or reprocessing files, use the standalone `process_local_cash_balance_file.py` script.

### Usage

**Required Arguments:**
1. `file_path` - Full path to the CSV file (positional argument)
2. `--connection-string` - PostgreSQL connection string (required)

**Basic Command:**
```bash
python process_local_cash_balance_file.py "C:\tmp\20251113.CashBalances.GRPGZCAP.818292019.CSV" --connection-string "postgresql://user:pass@host:5432/db?sslmode=require"
```

**Windows PowerShell Example:**
```powershell
cd ubs_ops
python process_local_cash_balance_file.py `
  "C:\tmp\20251113.CashBalances.GRPGZCAP.818292019.CSV" `
  --connection-string "postgresql://mikael:Ii89rra137+*@gzcdevserver.postgres.database.azure.com:5432/gzc_platform?sslmode=require"
```

**Windows CMD Example:**
```cmd
cd ubs_ops
python process_local_cash_balance_file.py "C:\tmp\20251113.CashBalances.GRPGZCAP.818292019.CSV" --connection-string "postgresql://user:pass@host:5432/db?sslmode=require"
```

### How It Works

- **Date Extraction**: Automatically extracts date from filename (format: `YYYYMMDD.CashBalances.*.CSV`)
- **Filename Extraction**: Uses filename from file path for database storage
- **File Sequence**: Automatically determines file sequence number based on existing files for the same date
- **CSV Parsing**: Parses and classifies rows (detail, subtotal, grand_total)
- **Duplicate Detection**: Uses `record_hash` to prevent duplicate inserts
- **Database Insertion**: Inserts into `ubs.ubs_cash_balance_data` table
- **Logging**: Logs to `ubs.ubs_file_processing_log` and `ubs_cash_balance_local_processing.log`

### Differences from Jenkins/SFTP Processing

| Feature | Local Processing | Jenkins/SFTP Processing |
|---------|------------------|------------------------|
| File Source | Local filesystem | UBS SFTP server |
| Date Parameter | Extracted from filename | Uses `PROCESS_DATE` env var |
| Connection | Command-line argument | Environment variables |
| Scheduling | Manual execution | Automated (cron) |
| File Discovery | User provides path | Searches SFTP directory |
| Use Case | Testing, reprocessing | Production automation |
