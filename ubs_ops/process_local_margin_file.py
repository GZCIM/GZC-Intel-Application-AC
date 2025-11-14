#!/usr/bin/env python3
"""
Standalone script to process a local Margin Data CSV file
No SFTP connection required - just reads from local filesystem
"""

import os
import sys
from datetime import date, datetime
from pathlib import Path
from io import StringIO
import hashlib
import logging
import psycopg2

# Import functions from the daily processing script
from process_ubs_margin_daily import (
    load_csv_to_database,
    log_file_processing_start,
    log_file_processing_complete,
    get_last_workday,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("ubs_margin_local_processing.log"),
    ],
)
logger = logging.getLogger(__name__)


def get_db_connection(connection_string: str = None):
    """Get database connection using provided connection string or environment variables

    Args:
        connection_string: PostgreSQL connection string. If not provided, will try
            POSTGRES_CONNECTION_STRING environment variable, or build from individual
            environment variables (POSTGRES_PLATFORM_HOST, POSTGRES_PLATFORM_PORT, etc.)

    Returns:
        psycopg2 connection object

    Raises:
        ValueError: If no connection information is provided
    """
    # Priority 1: Use provided connection string
    if connection_string:
        return psycopg2.connect(connection_string)

    # Priority 2: Check for full connection string in environment
    connection_string = os.getenv("POSTGRES_CONNECTION_STRING")
    if connection_string:
        return psycopg2.connect(connection_string)

    # Priority 3: Build from individual environment variables
    db_host = os.getenv("POSTGRES_PLATFORM_HOST")
    db_port = os.getenv("POSTGRES_PLATFORM_PORT")
    db_name = os.getenv("POSTGRES_PLATFORM_DB")
    db_user = os.getenv("POSTGRES_PLATFORM_USER")
    db_password = os.getenv("POSTGRES_PLATFORM_PASSWORD")

    if not all([db_host, db_port, db_name, db_user, db_password]):
        raise ValueError(
            "Database connection information required. Provide either:\n"
            "  - POSTGRES_CONNECTION_STRING environment variable, or\n"
            "  - All of: POSTGRES_PLATFORM_HOST, POSTGRES_PLATFORM_PORT, "
            "POSTGRES_PLATFORM_DB, POSTGRES_PLATFORM_USER, POSTGRES_PLATFORM_PASSWORD, or\n"
            "  - --connection-string command line argument"
        )

    # Build connection string from components
    conn_string = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}?sslmode=require"
    return psycopg2.connect(conn_string)


def process_local_file(
    file_path: str,
    connection_string: str,
):
    """Process a local Margin Data CSV file

    Args:
        file_path: Path to the CSV file to process (full path including filename, required)
        connection_string: PostgreSQL connection string (required)
    """
    if not file_path:
        raise ValueError("file_path is required")

    if not connection_string:
        raise ValueError("connection_string is required")

    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    # Extract file date from filename
    filename_for_date = file_path.name
    file_date = None
    # Format: YYYYMMDD.MFXCMDRCSV.*.CSV
    if len(filename_for_date) >= 8:
        try:
            file_date = datetime.strptime(filename_for_date[:8], "%Y%m%d").date()
            # Calculate last workday (margin files are for the previous workday)
            cob_date = get_last_workday(file_date)
        except ValueError:
            cob_date = get_last_workday(date.today())
    else:
        cob_date = get_last_workday(date.today())

    logger.info(f"Processing local file: {file_path}")
    logger.info(f"File date: {file_date if file_date else 'unknown'}")
    logger.info(f"COB date: {cob_date}")

    # Read file
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    file_size = len(file_bytes)
    logger.info(f"File size: {file_size:,} bytes")

    # Decode file content
    try:
        csv_content = file_bytes.decode("utf-8")
        logger.info("File decoded as UTF-8")
    except UnicodeDecodeError:
        logger.warning("UTF-8 decode failed, trying latin-1")
        csv_content = file_bytes.decode("latin-1")
        logger.info("File decoded as latin-1")

    # Connect to database
    conn = get_db_connection(connection_string)
    conn.autocommit = False

    try:
        # Use filename from file_path
        source_filename = file_path.name
        local_path = str(file_path.resolve())

        # Calculate file hash
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        # Extract account from filename (e.g., I0004255 from 20251113.MFXCMDRCSV.I0004255.CSV)
        account = None
        if ".MFXCMDRCSV." in source_filename:
            parts = source_filename.split(".MFXCMDRCSV.")
            if len(parts) > 1:
                account = parts[1].split(".")[0]

        # Log file processing start
        log_file_processing_start(
            conn,
            source_filename,
            account,
            cob_date,
            file_size,
            file_category="margin",
            file_hash=file_hash,
            local_path=local_path,
        )
        conn.commit()

        # Load CSV to database (this also calculates the summary)
        logger.info("Loading CSV data into database...")
        inserted_count = load_csv_to_database(
            conn, csv_content, source_filename, account, cob_date
        )
        conn.commit()

        logger.info(f"Inserted {inserted_count} new records")

        # Log file processing complete
        log_file_processing_complete(
            conn,
            source_filename,
            record_count=inserted_count,
            status="completed",
            error_message=None,
            file_hash=file_hash,
            local_path=local_path,
        )
        conn.commit()

        logger.info("=" * 80)
        logger.info("PROCESSING SUMMARY")
        logger.info("=" * 80)
        logger.info(f"File: {source_filename}")
        logger.info(f"Account: {account}")
        logger.info(f"COB date: {cob_date}")
        logger.info(f"Records inserted: {inserted_count}")
        logger.info("=" * 80)

        return inserted_count

    except Exception as e:
        conn.rollback()
        logger.error(f"Error processing file: {e}", exc_info=True)

        # Log failure
        try:
            log_file_processing_complete(
                conn,
                source_filename,
                record_count=0,
                status="failed",
                error_message=str(e),
            )
            conn.commit()
        except:
            pass

        raise
    finally:
        conn.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Process a local Margin Data CSV file",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage (date and filename extracted from file_path):
  python process_local_margin_file.py "C:\\tmp\\20251113.MFXCMDRCSV.I0004255.CSV" --connection-string "postgresql://user:pass@host:5432/db?sslmode=require"
        """,
    )

    parser.add_argument(
        "file_path",
        help="Path to the Margin Data CSV file (required; full path including filename)",
    )

    parser.add_argument(
        "--connection-string",
        type=str,
        required=True,
        help="PostgreSQL connection string (required; e.g., postgresql://user:pass@host:5432/db?sslmode=require)",
    )

    args = parser.parse_args()

    try:
        process_local_file(args.file_path, args.connection_string)
        print("SUCCESS: File processed successfully")
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {e}")
        logger.exception("Processing failed")
        sys.exit(1)
