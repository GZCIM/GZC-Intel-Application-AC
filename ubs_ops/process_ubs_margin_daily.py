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
"""

import argparse
import csv
import hashlib
import logging
import os
import sys
from datetime import datetime, date, timedelta
from decimal import Decimal, InvalidOperation
from io import BytesIO, StringIO

import paramiko
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("ubs_margin_processing.log"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


def get_last_workday(reference_date=None):
    """Get the last workday (Monday-Friday, excluding weekends)

    Args:
        reference_date: Optional date to use as reference (defaults to today)
                        Can be a date object or string in YYYY-MM-DD format

    Returns:
        date: The last workday before the reference date
    """
    if reference_date is None:
        reference_date = date.today()
    elif isinstance(reference_date, str):
        # Parse string date in YYYY-MM-DD format
        try:
            reference_date = datetime.strptime(reference_date, "%Y-%m-%d").date()
        except ValueError as exc:
            raise ValueError(
                f"Invalid date format: {reference_date}. Expected YYYY-MM-DD"
            ) from exc
    elif isinstance(reference_date, date):
        pass
    else:
        raise ValueError(f"Invalid date type: {type(reference_date)}")

    # Go back 1 day
    last_day = reference_date - timedelta(days=1)

    # If it's Monday, go back to Friday
    if last_day.weekday() == 6:  # Sunday
        last_day = last_day - timedelta(days=2)
    elif last_day.weekday() == 5:  # Saturday
        last_day = last_day - timedelta(days=1)

    return last_day


def check_records_exist(conn, account, cob_date, filename):
    """Check if records for this account/date/filename already exist"""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*)
            FROM ubs.ubs_margin_data
            WHERE account = %s
              AND cob_date = %s
              AND source_filename = %s
        """,
            (account, cob_date, filename),
        )
        count = cur.fetchone()[0]
        return count > 0


def check_file_already_processed(conn, filename):
    """Check if file was already successfully processed"""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT processing_status, record_count
            FROM ubs.ubs_file_processing_log
            WHERE filename = %s
        """,
            (filename,),
        )
        result = cur.fetchone()
        if result and result[0] == "completed":
            return True, result[1]
        return False, 0


def parse_number(value):
    """Parse a string number, handling empty strings and spaces"""
    if not value or value.strip() == "":
        return None
    try:
        cleaned = str(value).strip().replace(",", "")
        return Decimal(cleaned)
    except (ValueError, InvalidOperation):
        return None


def parse_date(date_str):
    """Parse date string in MM/DD/YYYY format"""
    if not date_str or date_str.strip() == "":
        return None
    try:
        return datetime.strptime(date_str.strip(), "%m/%d/%Y").date()
    except ValueError:
        return None


def calculate_record_hash(row, filename):
    """Calculate hash for duplicate detection"""
    key_fields = [
        row.get("Account", ""),
        row.get("COB_Date", ""),
        row.get("Margin_Type", ""),
        row.get("Product", ""),
        row.get("Reporting_Group", ""),
        row.get("Security_Description", ""),
        row.get("ISIN_Ticket_Code", ""),
        row.get("Quantity", ""),
        filename,
    ]
    hash_string = "|".join(str(f) for f in key_fields)
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
    date_str = cob_date.strftime("%Y%m%d")
    return f"{date_str}.MFXCMDRCSV.*.CSV"


def find_files_in_directory(sftp, remote_dir, pattern):
    """Find files matching pattern in remote directory"""
    try:
        files = sftp.listdir(remote_dir)
        matching_files = [
            f for f in files if pattern.replace("*", "") in f and f.endswith(".CSV")
        ]
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
            account = row.get("Account", "").strip()
            cob_date_str = row.get("COB_Date", "").strip()
            cob_date = parse_date(cob_date_str)

        record_hash = calculate_record_hash(row, filename)

        record = {
            "source_filename": filename,
            "account": row.get("Account", "").strip(),
            "cob_date": parse_date(row.get("COB_Date", "")),
            "roll_ccy": row.get("Roll_Ccy", "").strip() or None,
            "margin_type": row.get("Margin_Type", "").strip() or None,
            "product": row.get("Product", "").strip() or None,
            "reporting_group": row.get("Reporting_Group", "").strip() or None,
            "security_description": row.get("Security_Description", "").strip() or None,
            "sec_type": row.get("Sec_Type", "").strip() or None,
            "isin_ticket_code": row.get("ISIN_Ticket_Code", "").strip() or None,
            "strategy": row.get("Strategy", "").strip() or None,
            "rating_cat_scenario": row.get("Rating_Cat_Scenario", "").strip() or None,
            "cnv_ratio": row.get("Cnv_Ratio", "").strip() or None,
            "contract_multiplier": row.get("Contract_Multiplier", "").strip() or None,
            "duration": row.get("Duration", "").strip() or None,
            "trade_date": row.get("Trade_Date", "").strip() or None,
            "pos_dv01_roll": parse_number(row.get("Pos_DV01_Roll", "")),
            "delta": row.get("Delta", "").strip() or None,
            "ccy": row.get("CCY", "").strip() or None,
            "ccy_price": parse_number(row.get("CCY_Price", "")),
            "fx_rate": parse_number(row.get("FX-Rate", "")),
            "quantity": parse_number(row.get("Quantity", "")),
            "mv_rollup": parse_number(row.get("MV_Rollup", "")),
            "margin_rollup": parse_number(row.get("Margin_Rollup", "")),
            "req_percent": parse_number(row.get("Req_Percent", "")),
            "ric_code": row.get("RIC_Code", "").strip() or None,
            "account_name": row.get("Account_Name", "").strip() or None,
            "run_id": row.get("Run_ID", "").strip() or None,
            "file_processed_date": date.today(),
            "record_hash": record_hash,
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
    """).format(sql.SQL(", ").join(map(sql.Identifier, columns)))

    with conn.cursor() as cur:
        execute_values(cur, insert_query, values, page_size=1000)
        inserted_count = cur.rowcount

    logger.info(
        f"Inserted {inserted_count} new records (skipped {len(records) - inserted_count} duplicates)"
    )

    # Calculate and store daily summary
    if account and cob_date:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ubs.calculate_daily_margin_summary(%s, %s, %s)
            """,
                (account, cob_date, filename),
            )
        logger.info("Daily summary calculated and stored")

    return inserted_count


def log_file_processing_start(conn, filename, account, cob_date, file_size):
    """Log file processing start to ubs_file_processing_log"""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
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
            """,
                (filename, account, cob_date, file_size),
            )
        conn.commit()
        logger.info(f"Logged file processing start: {filename}")
    except Exception as e:
        logger.error(f"Failed to log file processing start: {e}")
        conn.rollback()


def log_file_processing_complete(
    conn, filename, record_count, success=True, error_msg=None
):
    """Log file processing completion to ubs_file_processing_log"""
    try:
        status = "completed" if success else "failed"
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE ubs.ubs_file_processing_log
                SET processing_status = %s,
                    record_count = %s,
                    completed_at = CURRENT_TIMESTAMP,
                    error_message = %s
                WHERE filename = %s
            """,
                (status, record_count, error_msg, filename),
            )
        conn.commit()
        logger.info(f"Logged file processing completion: {filename}, status={status}")
    except Exception as e:
        logger.error(f"Failed to log file processing completion: {e}")
        conn.rollback()


def process_ubs_margin_daily(process_date=None):
    """Main processing function

    Args:
        process_date: Optional date to process (YYYY-MM-DD format or date object).
                     If None, uses today's date to calculate last workday.
                     If provided, calculates last workday relative to that date.
    """
    start_time = datetime.now()
    status = "success"
    return_message = []

    try:
        logger.info("=" * 80)
        logger.info("Starting UBS Margin Data Daily Processing")
        logger.info(f"Start time: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 80)

        # Get SFTP credentials from Jenkins environment variables
        logger.info("Reading environment variables...")
        sftp_host = os.getenv("UBS_SFTP_HOST")
        sftp_port = int(os.getenv("UBS_SFTP_PORT", "22"))
        sftp_username = os.getenv("UBS_SFTP_USERNAME")
        sftp_password = os.getenv("UBS_SFTP_PASSWORD")
        sftp_remote_dir = os.getenv("UBS_SFTP_REMOTE_DIR", "/from_UBS")

        # Get database connection string
        db_connection_string = os.getenv("POSTGRES_CONNECTION_STRING")

        # Log configuration (without sensitive data)
        logger.info(f"SFTP Host: {sftp_host}")
        logger.info(f"SFTP Port: {sftp_port}")
        logger.info(f"SFTP Username: {sftp_username}")
        logger.info(f"SFTP Remote Directory: {sftp_remote_dir}")
        logger.info(
            f"Database connection configured: {'Yes' if db_connection_string else 'No'}"
        )

        if not all([sftp_host, sftp_username, sftp_password, db_connection_string]):
            missing = []
            if not sftp_host:
                missing.append("UBS_SFTP_HOST")
            if not sftp_username:
                missing.append("UBS_SFTP_USERNAME")
            if not sftp_password:
                missing.append("UBS_SFTP_PASSWORD")
            if not db_connection_string:
                missing.append("POSTGRES_CONNECTION_STRING")
            error_msg = f"Missing required environment variables: {', '.join(missing)}"
            logger.error(error_msg)
            raise ValueError(error_msg)

        # Get last workday (using provided date or today)
        if process_date:
            logger.info(
                f"Processing date input (from function parameter): {process_date}"
            )
        else:
            logger.info(
                "Processing date not explicitly provided as function parameter; checking environment..."
            )

        current_process_date = os.getenv("PROCESS_DATE")
        if current_process_date:
            logger.info(f"Environment PROCESS_DATE value: {current_process_date}")
            # If process_date was not provided as parameter, use environment variable
            if not process_date:
                process_date = current_process_date
                logger.info(f"Using PROCESS_DATE from environment: {process_date}")
        else:
            logger.info("PROCESS_DATE environment variable not set")

        # If still no date, use today
        if not process_date:
            process_date = date.today().strftime("%Y-%m-%d")
            logger.info(f"No date provided, defaulting to today: {process_date}")

        last_workday = get_last_workday(process_date)
        logger.info(
            f"Last workday calculated (based on process date {process_date}): {last_workday}"
        )

        # Connect to database
        logger.info("Connecting to PostgreSQL database...")
        conn = psycopg2.connect(db_connection_string)
        conn.autocommit = False
        logger.info("Database connection established successfully")

        try:
            # Generate filename pattern
            date_str = last_workday.strftime("%Y%m%d")
            pattern = f"{date_str}.MFXCMDRCSV"
            logger.info(f"Generated filename pattern: {pattern}")

            # Check existing records for informational purposes (but don't skip processing)
            logger.info(
                f"Checking database for existing records for date: {last_workday}"
            )
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT DISTINCT source_filename, account, COUNT(*) as record_count
                    FROM ubs.ubs_margin_data
                    WHERE cob_date = %s
                    GROUP BY source_filename, account
                    ORDER BY source_filename
                """,
                    (last_workday,),
                )
                existing_records = cur.fetchall()

            if existing_records:
                logger.info(
                    f"Found {len(existing_records)} existing file(s) in database for {last_workday}"
                )
                total_existing_records = sum(count for _, _, count in existing_records)
                logger.info(
                    f"Total existing records in database: {total_existing_records}"
                )
                for filename, account, count in existing_records:
                    message = f"Records already exist: {filename} (account: {account}, records: {count})"
                    return_message.append(message)
                    logger.info(f"  - {message}")
                logger.info(
                    "Note: Will still check SFTP for any unprocessed files for this date"
                )
            else:
                logger.info("No existing records found in database for this date")

            # Always connect to SFTP to check for files (even if some records exist)
            # This allows processing of files that haven't been processed yet
            logger.info(f"Connecting to SFTP server: {sftp_host}:{sftp_port}")
            sftp, transport = connect_sftp(
                sftp_host, sftp_port, sftp_username, sftp_password
            )
            logger.info(
                f"SFTP connection established successfully to {sftp_host}:{sftp_port}"
            )

            try:
                # Find matching files in remote directory
                logger.info(f"Searching for files in SFTP directory: {sftp_remote_dir}")
                logger.info(f"Looking for files matching pattern: {pattern}")
                files = find_files_in_directory(sftp, sftp_remote_dir, pattern)

                if not files:
                    logger.warning(
                        f"No files found matching pattern {pattern} in {sftp_remote_dir}"
                    )
                    # List all files in directory for debugging
                    try:
                        all_files = sftp.listdir(sftp_remote_dir)
                        csv_files = [f for f in all_files if f.endswith(".CSV")]
                        logger.info(
                            f"Total files in {sftp_remote_dir}: {len(all_files)}"
                        )
                        logger.info(f"CSV files in directory: {len(csv_files)}")
                        if csv_files:
                            logger.info(f"Sample CSV files found: {csv_files[:5]}")
                    except Exception as e:
                        logger.warning(f"Could not list directory contents: {e}")

                    if existing_records:
                        message = f"No new files found matching pattern {pattern} in {sftp_remote_dir}. Existing records in database will remain."
                        logger.info(message)
                        return_message.append(message)
                        status = "skipped"
                    else:
                        message = f"No files found matching pattern {pattern} in {sftp_remote_dir} and no existing records in database for {last_workday}"
                        logger.info(message)
                        return_message.append(message)
                        status = "skipped"
                else:
                    logger.info(f"Found {len(files)} file(s) matching pattern: {files}")
                    return_message.append(f"Files to process: {', '.join(files)}")

                    total_inserted = 0
                    files_processed = 0
                    files_failed = 0
                    files_skipped = 0

                    for idx, filename in enumerate(files, 1):
                        logger.info("-" * 80)
                        logger.info(f"Processing file {idx}/{len(files)}: {filename}")
                        file_start_time = datetime.now()

                        # Extract account from filename (e.g., I0004255 from 20251110.MFXCMDRCSV.I0004255.CSV)
                        parts = filename.split(".")
                        if len(parts) >= 3:
                            account = parts[2]
                            logger.info(f"Extracted account: {account} from filename")
                        else:
                            logger.warning(
                                f"Could not extract account from filename: {filename} (parts: {parts})"
                            )
                            files_skipped += 1
                            continue

                        # Check if file exists on SFTP
                        remote_path = f"{sftp_remote_dir}/{filename}"
                        logger.info(f"Checking if file exists on SFTP: {remote_path}")
                        if not check_file_exists(sftp, remote_path):
                            message = (
                                f"File {remote_path} does not exist on SFTP - skipping"
                            )
                            logger.warning(message)
                            return_message.append(message)
                            files_skipped += 1
                            continue
                        logger.info(f"File confirmed to exist on SFTP server")

                        # Check if file was already successfully processed
                        logger.info(
                            f"Checking if file was already processed: {filename}"
                        )
                        already_processed, record_count = check_file_already_processed(
                            conn, filename
                        )
                        if already_processed:
                            message = f"File {filename} already processed successfully ({record_count} records) - skipping"
                            logger.info(message)
                            return_message.append(message)
                            files_skipped += 1
                            continue

                        # Double-check: records might have been inserted by another process
                        logger.info(
                            f"Double-checking database for existing records: account={account}, date={last_workday}, filename={filename}"
                        )
                        if check_records_exist(conn, account, last_workday, filename):
                            message = f"Records already exist for {account} on {last_workday} from {filename} - skipping"
                            logger.info(message)
                            return_message.append(message)
                            files_skipped += 1
                            continue

                        # Get file size before downloading
                        logger.info(f"Getting file metadata from SFTP...")
                        file_size = sftp.stat(remote_path).st_size
                        logger.info(
                            f"File size: {file_size:,} bytes ({file_size / 1024:.2f} KB)"
                        )

                        # Log processing start
                        logger.info(f"Logging file processing start to database...")
                        log_file_processing_start(
                            conn, filename, account, last_workday, file_size
                        )

                        try:
                            # Download file to memory (COPY only - files remain on SFTP server, not moved or deleted)
                            download_start = datetime.now()
                            logger.info(f"Downloading file from SFTP: {remote_path}")
                            file_obj = BytesIO()
                            sftp.getfo(remote_path, file_obj)
                            # Get bytes content
                            file_bytes = file_obj.getvalue()
                            file_obj.close()
                            download_time = (
                                datetime.now() - download_start
                            ).total_seconds()
                            logger.info(
                                f"Download completed in {download_time:.2f} seconds ({len(file_bytes):,} bytes)"
                            )

                            # Decode bytes to string (try UTF-8 first, fallback to latin-1)
                            decode_start = datetime.now()
                            try:
                                csv_content = file_bytes.decode("utf-8")
                                logger.info("File decoded as UTF-8")
                            except UnicodeDecodeError:
                                logger.warning(
                                    f"UTF-8 decode failed for {filename}, trying latin-1"
                                )
                                csv_content = file_bytes.decode("latin-1")
                                logger.info("File decoded as latin-1")
                            decode_time = (
                                datetime.now() - decode_start
                            ).total_seconds()
                            logger.info(
                                f"Decoding completed in {decode_time:.2f} seconds"
                            )

                            # Count lines in CSV
                            line_count = csv_content.count("\n")
                            logger.info(
                                f"CSV file contains approximately {line_count} lines"
                            )

                            # Load to database
                            db_start = datetime.now()
                            logger.info(f"Loading CSV data into database...")
                            inserted = load_csv_to_database(
                                conn, csv_content, filename, account, last_workday
                            )
                            db_time = (datetime.now() - db_start).total_seconds()
                            logger.info(
                                f"Database insertion completed in {db_time:.2f} seconds"
                            )
                            total_inserted += inserted

                            # Log successful completion
                            log_file_processing_complete(
                                conn, filename, inserted, success=True
                            )

                            file_time = (
                                datetime.now() - file_start_time
                            ).total_seconds()
                            message = f"✓ Processed {filename}: {inserted} records inserted in {file_time:.2f} seconds"
                            return_message.append(message)
                            logger.info(message)
                            files_processed += 1
                        except Exception as file_error:
                            # Log failure but continue processing other files
                            error_msg = str(file_error)
                            log_file_processing_complete(
                                conn,
                                filename,
                                0,
                                success=False,
                                error_msg=error_msg,
                            )
                            logger.error(f"Failed to process {filename}: {error_msg}")
                            return_message.append(
                                f"ERROR processing {filename}: {error_msg}"
                            )
                            files_failed += 1
                            # Continue to next file instead of raising
                            continue

                    conn.commit()
                    logger.info("Database transaction committed successfully")

                    processing_time = (datetime.now() - start_time).total_seconds()
                    return_message.append("=" * 80)
                    return_message.append("PROCESSING SUMMARY")
                    return_message.append("=" * 80)
                    return_message.append(f"Total files found: {len(files)}")
                    return_message.append(
                        f"Files processed successfully: {files_processed}"
                    )
                    return_message.append(f"Files skipped: {files_skipped}")
                    return_message.append(f"Files failed: {files_failed}")
                    return_message.append(f"Total records inserted: {total_inserted:,}")
                    return_message.append(
                        f"Total processing time: {processing_time:.2f} seconds"
                    )
                    return_message.append("=" * 80)

                    logger.info("=" * 80)
                    logger.info("PROCESSING SUMMARY")
                    logger.info("=" * 80)
                    logger.info(f"Total files found: {len(files)}")
                    logger.info(f"Files processed successfully: {files_processed}")
                    logger.info(f"Files skipped: {files_skipped}")
                    logger.info(f"Files failed: {files_failed}")
                    logger.info(f"Total records inserted: {total_inserted:,}")
                    logger.info(f"Total processing time: {processing_time:.2f} seconds")
                    logger.info("=" * 80)

                    # Set status based on results
                    if files_failed > 0:
                        if files_processed > 0:
                            status = "partial_success"
                        else:
                            status = "failed"
                    elif files_processed > 0:
                        status = "success"
                    else:
                        status = "skipped"

            finally:
                logger.info("Closing SFTP connection...")
                sftp.close()
                transport.close()
                logger.info("SFTP connection closed")

        finally:
            logger.info("Closing database connection...")
            conn.close()
            logger.info("Database connection closed")

    except Exception as e:
        status = "failed"
        error_msg = str(e)
        logger.error(f"Processing failed: {error_msg}")
        return_message.append(f"ERROR: {error_msg}")
        raise

    finally:
        end_time = datetime.now()
        total_time = (end_time - start_time).total_seconds()
        return_message_str = "\n".join(return_message)
        logger.info("=" * 80)
        logger.info(f"Job completed with status: {status}")
        logger.info(f"Start time: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"End time: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(
            f"Total execution time: {total_time:.2f} seconds ({total_time / 60:.2f} minutes)"
        )
        logger.info("=" * 80)

    return status, return_message_str


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Process UBS margin data files from SFTP and load to database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Use default (today's date to calculate last workday)
  python process_ubs_margin_daily.py

  # Process for a specific date (calculates last workday relative to that date)
  python process_ubs_margin_daily.py --date 2025-11-12

  # Process for a specific date (alternative format)
  python process_ubs_margin_daily.py -d 2025-11-12
        """,
    )
    parser.add_argument(
        "--date",
        "-d",
        type=str,
        default=None,
        help="Date to process (YYYY-MM-DD format). Defaults to today's date. "
        "The script will calculate the last workday relative to this date.",
    )

    args = parser.parse_args()

    # Determine processing date (command-line arg > environment variable > today)
    cli_process_date = args.date.strip() if args.date else None
    env_process_date_raw = os.getenv("PROCESS_DATE")
    env_process_date = env_process_date_raw.strip() if env_process_date_raw else None

    if cli_process_date:
        process_date_input = cli_process_date
        os.environ["PROCESS_DATE"] = process_date_input
        logger.info(f"Using process date from command line: {process_date_input}")
    elif env_process_date:
        process_date_input = env_process_date
        logger.info(
            f"Using process date from environment variable PROCESS_DATE: "
            f"{process_date_input}"
        )
    else:
        process_date_input = date.today().strftime("%Y-%m-%d")
        os.environ["PROCESS_DATE"] = process_date_input
        logger.info(
            "PROCESS_DATE not provided via command line or environment. "
            f"Defaulting to today's date: {process_date_input}"
        )

    try:
        status, message = process_ubs_margin_daily(process_date=process_date_input)
        print(f"Status: {status}")
        print(f"Message: {message}")
        # Exit with 0 (success) if any files were processed successfully, or if skipped
        # Exit with 1 (failure) only if all files failed or there was a fatal error
        sys.exit(0 if status in ["success", "partial_success", "skipped"] else 1)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
