# Jenkins Setup for UBS Margin Data Processing

## Overview
Automated daily processing of UBS margin data files from SFTP to PostgreSQL database.

> Looking for the cash balance pipeline? See `JENKINS_SETUP_CASH_BALANCE.md`.

## Prerequisites
- Jenkins on Windows Server
- Python 3.8+ in PATH
- GitHub repository access
- SFTP and PostgreSQL credentials

## Quick Setup Guide

### 1. Add Credentials to Jenkins

**Navigate**: Jenkins → Manage Jenkins → Manage Credentials → (global)

**Add three credentials** (Kind: "Secret text"):
- **ID**: `ubs-sftp-username` → **Secret**: SFTP username
- **ID**: `ubs-sftp-password` → **Secret**: SFTP password
- **ID**: `postgres-connection-string` → **Secret**: `postgresql://user:pass@host:port/db?sslmode=require`

### 2. Create Jenkins Job

**Type**: Freestyle project

**Source Code Management**:
- Git → Repository URL: Your GitHub repo
- Branch: `*/main`

**Build Environment**:
- Check **"Use secret text(s) or file(s)"**
- Add bindings:
  - `UBS_SFTP_USERNAME` → `ubs-sftp-username`
  - `UBS_SFTP_PASSWORD` → `ubs-sftp-password`
  - `POSTGRES_CONNECTION_STRING` → `postgres-connection-string`
- Add environment variables:
  - `UBS_SFTP_HOST` = `sftp.ubs.com`
  - `UBS_SFTP_PORT` = `22`
  - `UBS_SFTP_REMOTE_DIR` = `/from_UBS`
  - *(Optional)* `UBS_LOCAL_DOWNLOAD_DIR` = `C:\tmpubs` (directory where copies of downloaded files are stored)

**Build Parameters**:
- Check **"This project is parameterized"**
- Add **Date Parameter**:
  - **Name**: `PROCESS_DATE`
  - **Date Format**: `yyyy-MM-dd`
  - **Default Value**: `LocalDate.now()`
  - **Description**: `Reference date (script processes the last workday before this date)`

**Build Steps**:
```batch
cd ubs_ops
pip install -r requirements_ubs_processing.txt
echo Processing date: %PROCESS_DATE%
python process_ubs_margin_daily.py
```

**Build Triggers**:
- **Build periodically**: `0 11 * * 1-5` (11 AM, Monday-Friday)

## Pipeline Script (Alternative)

```groovy
pipeline {
    agent any

    parameters {
        date(name: 'PROCESS_DATE', defaultValue: 'now', description: 'Reference date (script processes last workday before this)')
    }

    environment {
        UBS_SFTP_HOST = 'sftp.ubs.com'
        UBS_SFTP_PORT = '22'
        UBS_SFTP_REMOTE_DIR = '/from_UBS'
    }

    triggers {
        cron('0 11 * * 1-5')  // 11 AM, Monday-Friday
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install Dependencies') {
            steps {
                bat 'pip install -r ubs_ops\\requirements_ubs_processing.txt'
            }
        }

        stage('Process UBS Files') {
            steps {
                withCredentials([
                    string(credentialsId: 'ubs-sftp-username', variable: 'UBS_SFTP_USERNAME'),
                    string(credentialsId: 'ubs-sftp-password', variable: 'UBS_SFTP_PASSWORD'),
                    string(credentialsId: 'postgres-connection-string', variable: 'POSTGRES_CONNECTION_STRING')
                ]) {
                    dir('ubs_ops') {
                        echo "Processing date: ${params.PROCESS_DATE}"
                        bat 'python process_ubs_margin_daily.py'
                    }
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'ubs_ops/ubs_margin_processing.log', allowEmptyArchive: true
        }
    }
}
```

## PROCESS_DATE Parameter

**How it works**:
- `PROCESS_DATE` is a Date Parameter exposed to the build and passed as an environment variable
- The script **does not** process that date directly; it calculates the **last workday prior to the supplied date**
- Recommended default: `LocalDate.now()` or `LocalDate.now().plusDays(1)` depending on when Jenkins runs, so the resulting COB date is yesterday
- Manual builds let you pick the reference date via calendar picker
- If `PROCESS_DATE` is empty, the script uses today's date as the reference

**Priority** (if multiple sources):
1. Command-line argument (`--date`)
2. Environment variable (`PROCESS_DATE`)
3. Default reference date (today); script always converts reference date → last workday

## Workflow

1. Calculates COB date as the last workday before the reference `PROCESS_DATE`
2. Checks database for existing records
3. Connects to SFTP and lists files matching `YYYYMMDD.MFXCMDRCSV.*.CSV`
4. For each file:
   - Checks if already processed
   - Downloads from SFTP (saves a copy to `UBS_LOCAL_DOWNLOAD_DIR`, defaults to `C:\tmpubs`)
   - Parses CSV and loads to `ubs.ubs_margin_data`
   - Calculates summary and loads to `ubs.ubs_margin_summary_daily`
   - Logs to `ubs.ubs_file_processing_log`

## Monitoring

### Check Processing Status
```sql
SELECT * FROM ubs.ubs_file_processing_log
WHERE cob_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY started_at DESC
LIMIT 20;
```

### Check Failed Files
```sql
SELECT filename, account, cob_date, processing_status, error_message
FROM ubs.ubs_file_processing_log
WHERE processing_status = 'failed'
  AND cob_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY started_at DESC;
```

### Check Statistics
```sql
SELECT cob_date, COUNT(*) as total_files,
       SUM(CASE WHEN processing_status = 'completed' THEN 1 ELSE 0 END) as completed,
       SUM(CASE WHEN processing_status = 'failed' THEN 1 ELSE 0 END) as failed
FROM ubs.ubs_file_processing_log
WHERE cob_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY cob_date
ORDER BY cob_date DESC;
```

## Troubleshooting

**SFTP Connection Fails**:
- Verify credentials in Jenkins Credentials Store
- Check network connectivity to SFTP server

**No Files Found**:
- Verify files exist on SFTP server
- Check `UBS_SFTP_REMOTE_DIR` is correct
- Verify file naming pattern: `YYYYMMDD.MFXCMDRCSV.*.CSV`

**Database Errors**:
- Verify `POSTGRES_CONNECTION_STRING` format
- Check database accessibility from Jenkins server
- Verify INSERT permissions on `ubs` schema

**Python Not Found**:
- Ensure Python is in PATH
- Or use full path: `C:\Python39\python.exe`

## Local Testing

```cmd
REM Set environment variables
set UBS_SFTP_HOST=sftp.ubs.com
set UBS_SFTP_PORT=22
set UBS_SFTP_USERNAME=username
set UBS_SFTP_PASSWORD=password
set UBS_SFTP_REMOTE_DIR=/from_UBS
set POSTGRES_CONNECTION_STRING=postgresql://user:pass@host:port/db

REM Run script
python process_ubs_margin_daily.py

REM Or specify date
python process_ubs_margin_daily.py --date 2025-11-12
```

## Local File Processing

For testing, manual processing, or reprocessing files, use the standalone `process_local_margin_file.py` script.

### Usage

**Required Arguments:**
1. `file_path` - Full path to the CSV file (positional argument)
2. `--connection-string` - PostgreSQL connection string (required)

**Basic Command:**
```bash
python process_local_margin_file.py "C:\tmp\20251113.MFXCMDRCSV.I0004255.CSV" --connection-string "postgresql://user:pass@host:5432/db?sslmode=require"
```

**Windows PowerShell Example:**
```powershell
cd ubs_ops
python process_local_margin_file.py `
  "C:\tmp\20251113.MFXCMDRCSV.I0004255.CSV" `
  --connection-string "postgresql://mikael:Ii89rra137+*@gzcdevserver.postgres.database.azure.com:5432/gzc_platform?sslmode=require"
```

**Windows CMD Example:**
```cmd
cd ubs_ops
python process_local_margin_file.py "C:\tmp\20251113.MFXCMDRCSV.I0004255.CSV" --connection-string "postgresql://user:pass@host:5432/db?sslmode=require"
```

### How It Works

- **Date Extraction**: Automatically extracts date from filename (format: `YYYYMMDD.MFXCMDRCSV.*.CSV`)
- **COB Date Calculation**: Calculates the last workday from the file date (margin files are for the previous workday)
- **Account Extraction**: Extracts account number from filename (e.g., `I0004255` from `20251113.MFXCMDRCSV.I0004255.CSV`)
- **Filename Extraction**: Uses filename from file path for database storage
- **CSV Parsing**: Parses CSV and loads into `ubs.ubs_margin_data` table
- **Summary Calculation**: Automatically calculates and stores daily margin summary
- **Duplicate Detection**: Uses `record_hash` to prevent duplicate inserts
- **Logging**: Logs to `ubs.ubs_file_processing_log` and `ubs_margin_local_processing.log`

### Differences from Jenkins/SFTP Processing

| Feature | Local Processing | Jenkins/SFTP Processing |
|---------|------------------|------------------------|
| File Source | Local filesystem | UBS SFTP server |
| Date Parameter | Extracted from filename | Uses `PROCESS_DATE` env var |
| Connection | Command-line argument | Environment variables |
| Scheduling | Manual execution | Automated (cron) |
| File Discovery | User provides path | Searches SFTP directory |
| Use Case | Testing, reprocessing | Production automation |

## Security Notes

- Never hardcode credentials in scripts
- Use Jenkins Credentials Store for all sensitive data
- Don't commit credentials to Git
- Use SSL/TLS for database connections
