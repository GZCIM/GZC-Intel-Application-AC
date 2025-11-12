# Jenkins Setup for UBS Margin Data Processing

## Overview
This document describes how to set up Jenkins to run the UBS margin data processing script daily.

## Prerequisites
- Jenkins installed on Windows Server
- Python 3.8+ installed (add to PATH)
- Access to GitHub repository
- SFTP credentials for UBS server
- PostgreSQL connection string
- Git for Windows (if not using Jenkins Git plugin)

## Jenkins Environment Variables

Set the following environment variables in Jenkins (Manage Jenkins → Configure System → Global properties → Environment variables):

### SFTP Configuration
- `UBS_SFTP_HOST` - SFTP server hostname
- `UBS_SFTP_PORT` - SFTP server port (default: 22)
- `UBS_SFTP_USERNAME` - SFTP username
- `UBS_SFTP_PASSWORD` - SFTP password (use Jenkins credentials store for security)
- `UBS_SFTP_REMOTE_DIR` - Remote directory path (default: `/from_UBS`)

### Database Configuration
- `POSTGRES_CONNECTION_STRING` - PostgreSQL connection string
  - Format: `postgresql://username:password@host:port/database?sslmode=require`

### Optional
- None - All logging goes to `ubs.ubs_file_processing_log` table

## Jenkins Pipeline Job

### Option 1: Freestyle Project

1. **Create New Item** → **Freestyle project**

2. **Source Code Management**
   - Select "Git"
   - Repository URL: Your GitHub repository
   - Branch: `*/main` (or your branch)

3. **Build Environment**
   - Check "Use secret text(s) or file(s)"
   - Add bindings for sensitive credentials:
     - `UBS_SFTP_PASSWORD` → Bind to credential
     - `POSTGRES_CONNECTION_STRING` → Bind to credential

4. **Build Steps**
   - Add "Execute Windows batch command" step (for Windows Server):
   ```batch
   @echo off
   REM Install dependencies
   pip install -r requirements_ubs_processing.txt

   REM Run processing script
   python process_ubs_margin_daily.py

   REM Check exit code
   if errorlevel 1 (
       echo Script failed with error code %errorlevel%
       exit /b 1
   )
   ```

   OR use "Execute Python script" if available:
   ```python
   import subprocess
   import sys

   # Install dependencies
   subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements_ubs_processing.txt"])

   # Run script
   subprocess.check_call([sys.executable, "process_ubs_margin_daily.py"])
   ```

5. **Build Triggers**
   - Select "Build periodically"
   - Schedule: `0 2 * * 1-5` (2 AM, Monday-Friday)
   - Note: Jenkins cron format works on Windows too

### Option 2: Pipeline Script

```groovy
pipeline {
    agent any

    environment {
        UBS_SFTP_HOST = credentials('ubs-sftp-host')
        UBS_SFTP_PORT = '22'
        UBS_SFTP_USERNAME = credentials('ubs-sftp-username')
        UBS_SFTP_PASSWORD = credentials('ubs-sftp-password')
        UBS_SFTP_REMOTE_DIR = '/from_UBS'
        POSTGRES_CONNECTION_STRING = credentials('postgres-connection-string')
    }

    triggers {
        cron('0 2 * * 1-5')  // 2 AM, Monday-Friday
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'pip install -r requirements_ubs_processing.txt'
            }
        }

        stage('Process UBS Files') {
            steps {
                bat 'python process_ubs_margin_daily.py'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'ubs_margin_processing.log', allowEmptyArchive: true
        }
        failure {
            emailext (
                subject: "UBS Margin Processing Failed",
                body: "The UBS margin data processing job failed. Check Jenkins logs for details.",
                to: "your-email@example.com"
            )
        }
    }
}
```

## Workflow Logic

The script follows this workflow:

1. **Check Last Workday**
   - Calculates last workday (Monday-Friday, excluding weekends)
   - If today is Monday, processes Friday's data

2. **Check Database**
   - Queries `ubs.ubs_margin_data` for existing records
   - If records exist for account/date/filename → **SKIP**

3. **Connect to SFTP**
   - Connects using Jenkins environment variables
   - Lists files in `from_UBS` directory

4. **Check File Existence**
   - Looks for files matching pattern: `YYYYMMDD.MFXCMDRCSV.*.CSV`
   - If file doesn't exist → **SKIP**

5. **Download and Process**
   - Logs processing start to `ubs.ubs_file_processing_log`
   - Downloads file from SFTP (to memory, not disk)
   - Parses CSV content
   - Loads to `ubs.ubs_margin_data`
   - Calculates and loads to `ubs.ubs_margin_summary_daily`
   - Logs completion/failure to `ubs.ubs_file_processing_log`

## Logging

### File Logging
- Log file: `ubs_margin_processing.log` (in Jenkins workspace)
- Contains detailed processing information

### Database Logging
- All file processing is logged to `ubs.ubs_file_processing_log` table
- Status values: `processing`, `completed`, `failed`
- Tracks file size, record count, start/end times, and error messages
- Each file gets its own log entry

## Error Handling

- **Missing Environment Variables**: Script exits with error
- **SFTP Connection Failure**: Logs error and exits
- **File Not Found**: Skips file and continues
- **Database Errors**: Rolls back transaction and logs error
- **Duplicate Records**: Skips duplicates (handled by unique constraint)

## Testing

### Manual Test on Windows

**Using Command Prompt (CMD):**
```cmd
REM Set environment variables
set UBS_SFTP_HOST=sftp.example.com
set UBS_SFTP_PORT=22
set UBS_SFTP_USERNAME=username
set UBS_SFTP_PASSWORD=password
set UBS_SFTP_REMOTE_DIR=/from_UBS
set POSTGRES_CONNECTION_STRING=postgresql://user:pass@host:port/db

REM Run script
python process_ubs_margin_daily.py
```

**Using PowerShell:**
```powershell
# Set environment variables
$env:UBS_SFTP_HOST = "sftp.example.com"
$env:UBS_SFTP_PORT = "22"
$env:UBS_SFTP_USERNAME = "username"
$env:UBS_SFTP_PASSWORD = "password"
$env:UBS_SFTP_REMOTE_DIR = "/from_UBS"
$env:POSTGRES_CONNECTION_STRING = "postgresql://user:pass@host:port/db"

# Run script
python process_ubs_margin_daily.py
```

### Test Processing
```bash
# No special setup needed - script logs to ubs_file_processing_log automatically
python process_ubs_margin_daily.py
```

## Monitoring

### Check File Processing Status
```sql
SELECT * FROM ubs.ubs_file_processing_log
WHERE cob_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY started_at DESC
LIMIT 20;
```

### Check Failed Files
```sql
SELECT
    filename,
    account,
    cob_date,
    processing_status,
    error_message,
    started_at,
    completed_at
FROM ubs.ubs_file_processing_log
WHERE processing_status = 'failed'
  AND cob_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY started_at DESC;
```

### Check Processing Statistics
```sql
SELECT
    cob_date,
    COUNT(*) as total_files,
    SUM(CASE WHEN processing_status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN processing_status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN processing_status = 'processing' THEN 1 ELSE 0 END) as processing,
    SUM(record_count) as total_records
FROM ubs.ubs_file_processing_log
WHERE cob_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY cob_date
ORDER BY cob_date DESC;
```

### Check Processed Files
```sql
SELECT DISTINCT
    source_filename,
    account,
    cob_date,
    COUNT(*) as record_count,
    MAX(created_at) as last_updated
FROM ubs.ubs_margin_data
WHERE cob_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY source_filename, account, cob_date
ORDER BY cob_date DESC;
```

### Check Daily Summaries
```sql
SELECT
    account,
    cob_date,
    source_filename,
    total_market_value,
    total_margin,
    excess,
    calculation_timestamp
FROM ubs.ubs_margin_summary_daily
WHERE cob_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY cob_date DESC, account;
```

## Troubleshooting

### Script fails to connect to SFTP
- Verify SFTP credentials in Jenkins
- Check network connectivity
- Verify SFTP server is accessible

### No files found
- Check if files exist on SFTP server
- Verify `UBS_SFTP_REMOTE_DIR` is correct
- Check file naming pattern matches expected format

### Database connection errors
- Verify `POSTGRES_CONNECTION_STRING` is correct
- Check database is accessible from Jenkins server
- Verify user has INSERT permissions on `ubs` schema

### Duplicate records
- This is expected behavior - script skips duplicates
- Check `record_hash` unique constraint is working

## Security Best Practices

1. **Use Jenkins Credentials Store**
   - Store SFTP password and database connection string as secrets
   - Never hardcode credentials in scripts

2. **File Permissions**
   - Ensure log files have appropriate permissions
   - Don't commit credentials to Git

3. **Network Security**
   - Use VPN or secure network for SFTP connection
   - Use SSL/TLS for database connections

## Schedule Recommendations

- **Recommended Time**: 2-3 AM (after UBS files are generated)
- **Frequency**: Daily (Monday-Friday)
- **Cron Expression**: `0 2 * * 1-5` (2 AM, weekdays only)
- **Windows Note**: Jenkins cron format works on Windows, but ensure Jenkins service is running 24/7

## Windows-Specific Considerations

### Python Installation
- Ensure Python is added to Windows PATH
- Verify with: `python --version` in Jenkins build step
- If Python is not found, use full path: `C:\Python39\python.exe`

### File Paths
- Script uses relative paths which work on Windows
- Log file `ubs_margin_processing.log` will be created in Jenkins workspace
- Use forward slashes `/` in SFTP paths (works on Windows too)

### Environment Variables
- Jenkins on Windows can set environment variables normally
- Use Jenkins "Inject environment variables" plugin if needed
- Or set in Jenkins → Configure System → Global properties

### Service Account
- Ensure Jenkins service runs under an account with:
  - Network access to SFTP server
  - Network access to PostgreSQL database
  - Permissions to write log files in workspace

### Testing on Windows
```cmd
REM Test Python and dependencies
python --version
pip list | findstr paramiko
pip list | findstr psycopg2

REM Test script with verbose output
python -u process_ubs_margin_daily.py
```

