"""
UBS Margin Data Daily Processing Script
Designed to run from Jenkins with SFTP credentials as environment variables

Workflow:
1. Check if records for last work day already exist → skip if yes
2. Connect to UBS SFTP
3. Check if file exists in from_UBS directory → skip if not
4. Download file if needed
5. Parse and load to ubs_margin_data
6. Calculate and load to ubs_margin_summary_daily
7. Log to chron.job_run_details
"""

import os
import sys
import csv
import hashlib
import logging
from decimal import Decimal, InvalidOperation
from datetime import datetime, date, timedelta
import paramiko
from io import StringIO
import psycopg2
from psycopg2.extras import execute_values
from psycopg2 import sql

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ubs_margin_processing.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def get_last_workday():
    """Get the last workday (Monday-Friday, excluding weekends)"""
    today = date.today()
    # Go back 1 day
    last_day = today - timedelta(days=1)

    # If it's Monday, go back to Friday
    if last_day.weekday() == 6:  # Sunday
        last_day = last_day - timedelta(days=2)
    elif last_day.weekday() == 5:  # Saturday
        last_day = last_day - timedelta(days=1)

    return last_day


def check_records_exist(conn, account, cob_date, filename):
    """Check if records for this account/date/filename already exist"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*)
            FROM ubs.ubs_margin_data
            WHERE account = %s
              AND cob_date = %s
              AND source_filename = %s
        """, (account, cob_date, filename))
        count = cur.fetchone()[0]
        return count > 0


def check_file_already_processed(conn, filename):
    """Check if file was already successfully processed"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT processing_status, record_count
            FROM ubs.ubs_file_processing_log
            WHERE filename = %s
        """, (filename,))
        result = cur.fetchone()
        if result and result[0] == 'completed':
            return True, result[1]
        return False, 0


def parse_number(value):
    """Parse a string number, handling empty strings and spaces"""
    if not value or value.strip() == '':
        return None
    try:
        cleaned = str(value).strip().replace(',', '')
        return Decimal(cleaned)
    except (ValueError, InvalidOperation):
        return None


def parse_date(date_str):
    """Parse date string in MM/DD/YYYY format"""
    if not date_str or date_str.strip() == '':
        return None
    try:
        return datetime.strptime(date_str.strip(), '%m/%d/%Y').date()
    except ValueError:
        return None


def calculate_record_hash(row, filename):
    """Calculate hash for duplicate detection"""
    key_fields = [
        row.get('Account', ''),
        row.get('COB_Date', ''),
        row.get('Margin_Type', ''),
        row.get('Product', ''),
        row.get('Reporting_Group', ''),
        row.get('Security_Description', ''),
        row.get('ISIN_Ticket_Code', ''),
        row.get('Quantity', ''),
        filename
    ]
    hash_string = '|'.join(str(f) for f in key_fields)
    return hashlib.sha256(hash_string.encode()).hexdigest()


def connect_sftp(host, port, username, password):
    """Connect to SFTP server"""
    try:
        transport = paramiko.Transport((host, port))
        transport.connect(username=username, password=password)
        sftp = paramiko.SFTPClient.from_transport(transport)
        logger.info(f"Connected to SFTP server {host}:{port}")
        return sftp, transport
    except Exception as e:
        logger.error(f"Failed to connect to SFTP: {e}")
        raise


def check_file_exists(sftp, remote_path):
    """Check if file exists on SFTP server"""
    try:
        sftp.stat(remote_path)
        return True
    except FileNotFoundError:
        return False
    except Exception as e:
        logger.error(f"Error checking file existence: {e}")
        return False


def download_file(sftp, remote_path, local_path):
    """Download file from SFTP server"""
    try:
        sftp.get(remote_path, local_path)
        logger.info(f"Downloaded {remote_path} to {local_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to download file: {e}")
        raise


def generate_filename_pattern(cob_date):
    """Generate filename pattern for UBS files"""
    # Format: YYYYMMDD.MFXCMDRCSV.I0004255.CSV
    date_str = cob_date.strftime('%Y%m%d')
    return f"{date_str}.MFXCMDRCSV.*.CSV"


def find_files_in_directory(sftp, remote_dir, pattern):
    """Find files matching pattern in remote directory"""
    try:
        files = sftp.listdir(remote_dir)
        matching_files = [f for f in files if pattern.replace('*', '') in f and f.endswith('.CSV')]
        return matching_files
    except Exception as e:
        logger.error(f"Error listing directory: {e}")
        return []


def load_csv_to_database(conn, csv_content, filename, account, cob_date):
    """Load CSV content into database"""
    records = []

    # Parse CSV from string content
    reader = csv.DictReader(StringIO(csv_content))

    for row in reader:
        if account is None:
            account = row.get('Account', '').strip()
            cob_date_str = row.get('COB_Date', '').strip()
            cob_date = parse_date(cob_date_str)

        record_hash = calculate_record_hash(row, filename)

        record = {
            'source_filename': filename,
            'account': row.get('Account', '').strip(),
            'cob_date': parse_date(row.get('COB_Date', '')),
            'roll_ccy': row.get('Roll_Ccy', '').strip() or None,
            'margin_type': row.get('Margin_Type', '').strip() or None,
            'product': row.get('Product', '').strip() or None,
            'reporting_group': row.get('Reporting_Group', '').strip() or None,
            'security_description': row.get('Security_Description', '').strip() or None,
            'sec_type': row.get('Sec_Type', '').strip() or None,
            'isin_ticket_code': row.get('ISIN_Ticket_Code', '').strip() or None,
            'strategy': row.get('Strategy', '').strip() or None,
            'rating_cat_scenario': row.get('Rating_Cat_Scenario', '').strip() or None,
            'cnv_ratio': row.get('Cnv_Ratio', '').strip() or None,
            'contract_multiplier': row.get('Contract_Multiplier', '').strip() or None,
            'duration': row.get('Duration', '').strip() or None,
            'trade_date': row.get('Trade_Date', '').strip() or None,
            'pos_dv01_roll': parse_number(row.get('Pos_DV01_Roll', '')),
            'delta': row.get('Delta', '').strip() or None,
            'ccy': row.get('CCY', '').strip() or None,
            'ccy_price': parse_number(row.get('CCY_Price', '')),
            'fx_rate': parse_number(row.get('FX-Rate', '')),
            'quantity': parse_number(row.get('Quantity', '')),
            'mv_rollup': parse_number(row.get('MV_Rollup', '')),
            'margin_rollup': parse_number(row.get('Margin_Rollup', '')),
            'req_percent': parse_number(row.get('Req_Percent', '')),
            'ric_code': row.get('RIC_Code', '').strip() or None,
            'account_name': row.get('Account_Name', '').strip() or None,
            'run_id': row.get('Run_ID', '').strip() or None,
            'file_processed_date': date.today(),
            'record_hash': record_hash
        }
        records.append(record)

    if not records:
        logger.warning("No records found in CSV")
        return 0

    # Insert records
    columns = list(records[0].keys())
    values = [tuple(record[col] for col in columns) for record in records]

    insert_query = sql.SQL("""
        INSERT INTO ubs.ubs_margin_data ({})
        VALUES %s
        ON CONFLICT (record_hash)
        DO NOTHING
    """).format(
        sql.SQL(', ').join(map(sql.Identifier, columns))
    )

    with conn.cursor() as cur:
        execute_values(cur, insert_query, values, page_size=1000)
        inserted_count = cur.rowcount

    logger.info(f"Inserted {inserted_count} new records (skipped {len(records) - inserted_count} duplicates)")

    # Calculate and store daily summary
    if account and cob_date:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT ubs.calculate_daily_margin_summary(%s, %s, %s)
            """, (account, cob_date, filename))
        logger.info("Daily summary calculated and stored")

    return inserted_count


def log_file_processing_start(conn, filename, account, cob_date, file_size):
    """Log file processing start to ubs_file_processing_log"""
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO ubs.ubs_file_processing_log
                (filename, account, cob_date, file_size_bytes, processing_status, started_at)
                VALUES (%s, %s, %s, %s, 'processing', CURRENT_TIMESTAMP)
                ON CONFLICT (filename)
                DO UPDATE SET
                    processing_status = 'processing',
                    started_at = CURRENT_TIMESTAMP,
                    error_message = NULL,
                    account = EXCLUDED.account,
                    cob_date = EXCLUDED.cob_date,
                    file_size_bytes = EXCLUDED.file_size_bytes
            """, (filename, account, cob_date, file_size))
        conn.commit()
        logger.info(f"Logged file processing start: {filename}")
    except Exception as e:
        logger.error(f"Failed to log file processing start: {e}")
        conn.rollback()


def log_file_processing_complete(conn, filename, record_count, success=True, error_msg=None):
    """Log file processing completion to ubs_file_processing_log"""
    try:
        status = 'completed' if success else 'failed'
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE ubs.ubs_file_processing_log
                SET processing_status = %s,
                    record_count = %s,
                    completed_at = CURRENT_TIMESTAMP,
                    error_message = %s
                WHERE filename = %s
            """, (status, record_count, error_msg, filename))
        conn.commit()
        logger.info(f"Logged file processing completion: {filename}, status={status}")
    except Exception as e:
        logger.error(f"Failed to log file processing completion: {e}")
        conn.rollback()


def process_ubs_margin_daily():
    """Main processing function"""
    start_time = datetime.now()
    status = 'success'
    return_message = []

    try:
        # Get SFTP credentials from Jenkins environment variables
        sftp_host = os.getenv('UBS_SFTP_HOST')
        sftp_port = int(os.getenv('UBS_SFTP_PORT', '22'))
        sftp_username = os.getenv('UBS_SFTP_USERNAME')
        sftp_password = os.getenv('UBS_SFTP_PASSWORD')
        sftp_remote_dir = os.getenv('UBS_SFTP_REMOTE_DIR', '/from_UBS')

        # Get database connection string
        db_connection_string = os.getenv('POSTGRES_CONNECTION_STRING')

        if not all([sftp_host, sftp_username, sftp_password, db_connection_string]):
            raise ValueError("Missing required environment variables: UBS_SFTP_HOST, UBS_SFTP_USERNAME, UBS_SFTP_PASSWORD, POSTGRES_CONNECTION_STRING")

        # Get last workday
        last_workday = get_last_workday()
        logger.info(f"Processing files for last workday: {last_workday}")

        # Connect to database
        conn = psycopg2.connect(db_connection_string)
        conn.autocommit = False

        try:
            # Generate filename pattern
            date_str = last_workday.strftime('%Y%m%d')
            pattern = f"{date_str}.MFXCMDRCSV"

            # First, check database for any existing records for this date
            # This avoids connecting to SFTP if we already have the data
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT DISTINCT source_filename, account
                    FROM ubs.ubs_margin_data
                    WHERE cob_date = %s
                """, (last_workday,))
                existing_files = {row[0]: row[1] for row in cur.fetchall()}

            if existing_files:
                logger.info(f"Found {len(existing_files)} existing file(s) in database for {last_workday}")
                return_message.append(f"Records already exist for {last_workday} - skipping download")
                status = 'skipped'
            else:
                # Connect to SFTP
                sftp, transport = connect_sftp(sftp_host, sftp_port, sftp_username, sftp_password)

                try:
                    # Find matching files in remote directory
                    files = find_files_in_directory(sftp, sftp_remote_dir, pattern)

                    if not files:
                        message = f"No files found matching pattern {pattern} in {sftp_remote_dir}"
                        logger.info(message)
                        return_message.append(message)
                        status = 'skipped'
                    else:
                        logger.info(f"Found {len(files)} file(s) to process")

                        total_inserted = 0
                        for filename in files:
                            logger.info(f"Processing file: {filename}")

                            # Extract account from filename (e.g., I0004255 from 20251110.MFXCMDRCSV.I0004255.CSV)
                            parts = filename.split('.')
                            if len(parts) >= 3:
                                account = parts[2]
                            else:
                                logger.warning(f"Could not extract account from filename: {filename}")
                                continue

                            # Check if file exists on SFTP
                            remote_path = f"{sftp_remote_dir}/{filename}"
                            if not check_file_exists(sftp, remote_path):
                                message = f"File {remote_path} does not exist on SFTP - skipping"
                                logger.info(message)
                                return_message.append(message)
                                continue

                            # Check if file was already successfully processed
                            already_processed, record_count = check_file_already_processed(conn, filename)
                            if already_processed:
                                message = f"File {filename} already processed successfully ({record_count} records) - skipping"
                                logger.info(message)
                                return_message.append(message)
                                continue

                            # Double-check: records might have been inserted by another process
                            if check_records_exist(conn, account, last_workday, filename):
                                message = f"Records already exist for {account} on {last_workday} from {filename} - skipping"
                                logger.info(message)
                                return_message.append(message)
                                continue

                            # Get file size before downloading
                            file_size = sftp.stat(remote_path).st_size

                            # Log processing start
                            log_file_processing_start(conn, filename, account, last_workday, file_size)

                            try:
                                # Download file to memory
                                logger.info(f"Downloading {remote_path}")
                                file_obj = StringIO()
                                sftp.getfo(remote_path, file_obj)
                                csv_content = file_obj.getvalue()
                                file_obj.close()

                                # Load to database
                                inserted = load_csv_to_database(conn, csv_content, filename, account, last_workday)
                                total_inserted += inserted

                                # Log successful completion
                                log_file_processing_complete(conn, filename, inserted, success=True)

                                return_message.append(f"Processed {filename}: {inserted} records inserted")
                            except Exception as file_error:
                                # Log failure
                                error_msg = str(file_error)
                                log_file_processing_complete(conn, filename, 0, success=False, error_msg=error_msg)
                                logger.error(f"Failed to process {filename}: {error_msg}")
                                return_message.append(f"ERROR processing {filename}: {error_msg}")
                                raise

                        conn.commit()
                        return_message.append(f"Total records inserted: {total_inserted}")
                        logger.info(f"Processing complete: {total_inserted} total records inserted")

                finally:
                    sftp.close()
                    transport.close()

        finally:
            conn.close()

    except Exception as e:
        status = 'failed'
        error_msg = str(e)
        logger.error(f"Processing failed: {error_msg}")
        return_message.append(f"ERROR: {error_msg}")
        raise

    finally:
        end_time = datetime.now()
        return_message_str = '\n'.join(return_message)
        logger.info(f"Job completed with status: {status}")

    return status, return_message_str


def main():
    """Main entry point"""
    try:
        status, message = process_ubs_margin_daily()
        print(f"Status: {status}")
        print(f"Message: {message}")
        sys.exit(0 if status == 'success' or status == 'skipped' else 1)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()

