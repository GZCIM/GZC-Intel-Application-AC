#!/usr/bin/env python3
"""
Standalone script to process a local Cash Balance CSV file
No SFTP connection required - just reads from local filesystem
"""

import os
import sys
from datetime import date, datetime
from pathlib import Path
import hashlib
import logging
import psycopg2

# Import functions from the daily processing script
from process_ubs_cash_balance_daily import (
    parse_cash_balance_csv,
    insert_cash_balance_records,
    fetch_existing_file_metadata,
    calculate_row_hash,
)
from process_ubs_margin_daily import (
    log_file_processing_start,
    log_file_processing_complete,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("ubs_cash_balance_local_processing.log"),
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
    """Process a local Cash Balance CSV file

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
    # Format: YYYYMMDD.CashBalances.*.CSV
    if len(filename_for_date) >= 8:
        try:
            cob_date = datetime.strptime(filename_for_date[:8], "%Y%m%d").date()
        except ValueError:
            cob_date = date.today()
    else:
        cob_date = date.today()

    logger.info(f"Processing local file: {file_path}")
    logger.info(f"COB date: {cob_date}")

    # Read file
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    file_size = len(file_bytes)
    logger.info(f"File size: {file_size:,} bytes")

    # Connect to database
    conn = get_db_connection(connection_string)
    conn.autocommit = False

    try:
        # Use filename from file_path
        source_filename = file_path.name
        local_path = str(file_path.resolve())

        # Calculate file hash
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        # Determine file sequence (check existing files for this date)
        existing_metadata = fetch_existing_file_metadata(conn, cob_date)
        if file_hash in existing_metadata["by_hash"]:
            logger.warning(f"File with hash {file_hash} already processed. Skipping.")
            return 0

        # Determine next sequence number
        max_sequence = max(existing_metadata["sequences"], default=0)
        file_sequence = max_sequence + 1

        # Log file processing start
        log_file_processing_start(
            conn,
            source_filename,
            cob_date,
            file_size,
            file_category="cash_balance",
            file_hash=file_hash,
            file_sequence=file_sequence,
            local_path=local_path,
        )
        conn.commit()

        # Parse CSV
        logger.info("Parsing CSV file...")
        records = parse_cash_balance_csv(
            file_bytes, cob_date, file_sequence, source_filename
        )
        logger.info(f"Parsed {len(records)} records from CSV")

        # Count by row type
        row_type_counts = {}
        for record in records:
            row_type = record.get("row_type", "unknown")
            row_type_counts[row_type] = row_type_counts.get(row_type, 0) + 1
        logger.info(f"Row type breakdown: {row_type_counts}")

        # Insert records
        logger.info("Inserting records into database...")
        inserted_count = insert_cash_balance_records(conn, records)
        conn.commit()

        logger.info(
            f"Inserted {inserted_count} new records (skipped {len(records) - inserted_count} duplicates)"
        )

        # Log file processing complete
        log_file_processing_complete(
            conn,
            source_filename,
            record_count=inserted_count,
            status="completed",
            error_message=None,
            file_hash=file_hash,
            file_sequence=file_sequence,
            local_path=local_path,
        )
        conn.commit()

        logger.info("=" * 80)
        logger.info("PROCESSING SUMMARY")
        logger.info("=" * 80)
        logger.info(f"File: {source_filename}")
        logger.info(f"COB date: {cob_date}")
        logger.info(f"Records parsed: {len(records)}")
        logger.info(f"Records inserted: {inserted_count}")
        logger.info(f"Records skipped (duplicates): {len(records) - inserted_count}")
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
        description="Process a local Cash Balance CSV file",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage (date and filename extracted from file_path):
  python process_local_cash_balance_file.py "C:\\tmp\\20251113.CashBalances.GRPGZCAP.818292019.CSV" --connection-string "postgresql://user:pass@host:5432/db?sslmode=require"
        """,
    )

    parser.add_argument(
        "file_path",
        help="Path to the Cash Balance CSV file (required; full path including filename)",
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

