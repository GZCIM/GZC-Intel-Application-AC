#!/usr/bin/env python3
"""
Standalone script to process a local Prime Broker Activity Statement file
No SFTP connection required - just reads from local filesystem
"""

import os
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Optional, Dict, List
from decimal import Decimal, InvalidOperation
import csv
import hashlib
import logging
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("ubs_prime_broker_activity_local_processing.log"),
    ],
)
logger = logging.getLogger(__name__)


def parse_date_ddmmyyyy(date_str: str) -> Optional[date]:
    """Parse date string in DD/MM/YYYY format (UBS Prime Broker Activity format)"""
    if not date_str or not date_str.strip():
        return None
    try:
        return datetime.strptime(date_str.strip(), "%d/%m/%Y").date()
    except ValueError:
        return None


def parse_decimal(value) -> Optional[Decimal]:
    """Parse a string number, handling empty strings, spaces, and parentheses for negatives"""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None

    # Handle negative values in parentheses: (123.45) = -123.45
    negative = text.startswith("(") and text.endswith(")")
    if negative:
        text = text[1:-1]

    cleaned = text.replace(",", "")
    try:
        dec = Decimal(cleaned)
        return -dec if negative else dec
    except (InvalidOperation, ValueError):
        return None


def extract_balance_date(security_description: str) -> Optional[date]:
    """Extract date from 'Opening TD Balance - DD MMM YYYY' or 'Closing TD Balance - DD MMM YYYY'"""
    if not security_description:
        return None

    desc = security_description.strip()
    if "Opening TD Balance -" in desc or "Closing TD Balance -" in desc:
        try:
            # Format: "Opening TD Balance - 03 Nov 2025"
            date_part = desc.split("-", 1)[1].strip()
            return datetime.strptime(date_part, "%d %b %Y").date()
        except (ValueError, IndexError):
            return None
    return None


def classify_row(row: Dict) -> str:
    """Classify the row type based on content"""
    account_name = (row.get("Account Name") or "").strip()
    security_desc = (row.get("Security Description") or "").strip()
    trans_type = (row.get("Trans Type") or "").strip()

    # Check if it's a balance row
    if "Opening TD Balance" in security_desc:
        return "opening_balance"
    if "Closing TD Balance" in security_desc:
        return "closing_balance"

    # Check if it's a subtotal row
    if account_name.startswith("SubTotal:"):
        return "subtotal_account"
    if (row.get("Settle CCY") or "").strip().startswith("SubTotal:"):
        return "subtotal_currency"

    # Check if it's empty
    if not any((row.get(key) or "").strip() for key in row):
        return "empty"

    # Check if it's a transaction
    if trans_type or (row.get("UBS Ref") or "").strip():
        return "transaction"

    return "empty"


def normalize_settle_ccy(value: Optional[str], row_type: str) -> Optional[str]:
    """Normalize settle currency values, handling subtotal rows."""
    if not value:
        return None

    trimmed = value.strip()
    if not trimmed:
        return None

    if row_type == "subtotal_currency" and trimmed.lower().startswith("subtotal:"):
        _, _, suffix = trimmed.partition(":")
        normalized = suffix.strip()
        if normalized:
            return normalized[:10]
        return None

    # Truncate to fit within varchar(10) while preserving actual codes
    return trimmed[:10]


def calculate_record_hash(record: Dict, row_type: str) -> str:
    """Calculate hash for duplicate detection using parsed record values

    Note: This allows refilling missed days - same transaction from different files
    will have the same hash and only be inserted once.
    """

    def safe_str(value):
        if value is None:
            return ""
        return str(value)

    # For transactions, use key fields that uniquely identify the transaction
    # Note: We don't include file_date to allow refilling from later files
    if row_type == "transaction":
        key_fields = [
            safe_str(record.get("account_id")),
            safe_str(record.get("trade_date")),  # Use parsed date
            safe_str(record.get("ubs_ref")),
            safe_str(record.get("trans_type")),
            safe_str(record.get("net_amount")),
            safe_str(record.get("settle_ccy")),
        ]
    # For balance rows, use account_name (or account_id if available), currency, balance date, and balance type
    # Note: account_id may be NULL for first balance row, so we use account_name to ensure uniqueness
    elif row_type in ("opening_balance", "closing_balance"):
        key_fields = [
            safe_str(record.get("account_name") or record.get("account_id")),
            safe_str(record.get("settle_ccy")),
            safe_str(record.get("balance_date")),  # Use parsed balance_date
            row_type,
        ]
    # For subtotals, use account/currency, row type, and file_date (subtotals are file-specific)
    elif row_type in ("subtotal_account", "subtotal_currency"):
        key_fields = [
            safe_str(record.get("account_name") or record.get("settle_ccy")),
            row_type,
            safe_str(record.get("file_date")),
        ]
    else:
        # For other rows, use all fields
        key_fields = [
            safe_str(record.get(key, ""))
            for key in sorted(record.keys())
            if key != "record_hash"
        ]
        key_fields.append(row_type)

    hash_input = "|".join(key_fields)
    return hashlib.sha256(hash_input.encode()).hexdigest()


def parse_prime_broker_activity_csv(
    file_bytes: bytes, file_date: date, source_filename: str
) -> List[Dict]:
    """Parse Prime Broker Activity Statement CSV

    Note: This processes ALL transactions from the file, allowing refilling of missed days.
    The file accumulates monthly history, so later files contain all previous transactions.

    line_number matches the actual CSV file row number (row 1 = header, row 2 = first data row).
    """
    text = file_bytes.decode("utf-8-sig")
    lines = text.splitlines()

    if not lines:
        return []

    # First line is the header
    header = lines[0]
    fieldnames = next(csv.reader([header]))

    records = []

    # Track last seen account information for carry-forward (similar to cash balance)
    last_account_name = None
    last_account_id = None
    last_settle_ccy = None

    # Process each line starting from row 2 (index 1)
    for csv_row_number, line in enumerate(lines[1:], start=2):
        # Skip completely empty lines
        if not line.strip():
            continue

        # Parse this line as CSV
        try:
            row_values = next(csv.reader([line]))
            # Handle case where line has fewer fields than header
            if len(row_values) < len(fieldnames):
                row_values.extend([""] * (len(fieldnames) - len(row_values)))
            row_dict = dict(zip(fieldnames, row_values))
        except Exception as e:
            logger.warning(f"Error parsing CSV row {csv_row_number}: {e}")
            continue

        row_type = classify_row(row_dict)
        if row_type == "empty":
            continue

        # Extract account information with carry-forward logic
        account_name_raw = (row_dict.get("Account Name") or "").strip() or None
        account_id_raw = (row_dict.get("Account ID") or "").strip() or None
        settle_ccy_raw = (row_dict.get("Settle CCY") or "").strip() or None

        # For transaction and balance rows, carry forward account info if missing
        if row_type in ("transaction", "opening_balance", "closing_balance"):
            # When account info is present, update tracking (handles new account groups)
            # When account info is missing, carry forward from previous row
            if account_name_raw:
                last_account_name = account_name_raw
            elif last_account_name:
                account_name_raw = last_account_name

            if account_id_raw:
                last_account_id = account_id_raw
            elif last_account_id:
                account_id_raw = last_account_id

            if settle_ccy_raw:
                last_settle_ccy = settle_ccy_raw
            elif last_settle_ccy:
                settle_ccy_raw = last_settle_ccy

        # Extract dates (CSV uses DD/MM/YYYY format)
        entry_date = parse_date_ddmmyyyy(row_dict.get("Entry Date"))
        trade_date = parse_date_ddmmyyyy(row_dict.get("Trade Date"))
        settle_date = parse_date_ddmmyyyy(row_dict.get("Settle Date"))

        # Extract balance information if applicable
        balance_date = None
        balance_amount = None
        balance_type = None
        security_desc = (row_dict.get("Security Description") or "").strip()

        if row_type == "opening_balance":
            balance_date = extract_balance_date(security_desc)
            balance_amount = parse_decimal(row_dict.get("Net Amount"))
            balance_type = "opening"
        elif row_type == "closing_balance":
            balance_date = extract_balance_date(security_desc)
            balance_amount = parse_decimal(row_dict.get("Net Amount"))
            balance_type = "closing"

        settle_ccy = normalize_settle_ccy(settle_ccy_raw, row_type)

        record = {
            "source_filename": source_filename,
            "file_date": file_date,
            "row_type": row_type,
            "account_name": account_name_raw,
            "account_id": account_id_raw,
            "settle_ccy": settle_ccy,
            "entry_date": entry_date,
            "trade_date": trade_date,
            "settle_date": settle_date,
            "trans_type": (row_dict.get("Trans Type") or "").strip() or None,
            "cancel": (row_dict.get("Cancel") or "").strip() or None,
            "isin": (row_dict.get("ISIN") or "").strip() or None,
            "security_description": security_desc or None,
            "ubs_ref": (row_dict.get("UBS Ref") or "").strip() or None,
            "client_ref": (row_dict.get("Client Ref") or "").strip() or None,
            "exec_broker": (row_dict.get("Exec Broker") or "").strip() or None,
            "quantity": parse_decimal(row_dict.get("Quantity")),
            "price": parse_decimal(row_dict.get("Price")),
            "comm": parse_decimal(row_dict.get("Comm")),
            "net_amount": parse_decimal(row_dict.get("Net Amount")),
            "balance_date": balance_date,
            "balance_amount": balance_amount,
            "balance_type": balance_type,
            "line_number": csv_row_number,  # Use actual CSV file row number
        }

        # Calculate hash after all fields are set (using parsed values)
        record["record_hash"] = calculate_record_hash(record, row_type)
        records.append(record)

    return records


def insert_prime_broker_activity_records(conn, records: List[Dict]) -> int:
    """Insert records into database, skipping duplicates"""
    if not records:
        return 0

    columns = list(records[0].keys())
    values = [tuple(record[col] for col in columns) for record in records]

    insert_query = sql.SQL(
        """
        INSERT INTO ubs.ubs_prime_broker_activity ({})
        VALUES %s
        ON CONFLICT (record_hash)
        DO NOTHING
    """
    ).format(sql.SQL(", ").join(map(sql.Identifier, columns)))

    with conn.cursor() as cur:
        execute_values(cur, insert_query, values, page_size=1000)
        inserted_count = cur.rowcount

    return inserted_count


def log_file_processing_start(
    conn,
    filename: str,
    file_date: date,
    file_size: int,
    file_category: str = "prime_broker_activity",
    file_hash: str = None,
    local_path: str = None,
):
    """Log file processing start to ubs_file_processing_log"""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ubs.ubs_file_processing_log
            (filename, cob_date, file_size_bytes, file_category, file_hash, local_path, processing_status, started_at)
            VALUES (%s, %s, %s, %s, %s, %s, 'processing', CURRENT_TIMESTAMP)
            ON CONFLICT (filename)
            DO UPDATE SET
                processing_status = 'processing',
                started_at = CURRENT_TIMESTAMP,
                error_message = NULL,
                cob_date = EXCLUDED.cob_date,
                file_size_bytes = EXCLUDED.file_size_bytes,
                file_category = COALESCE(EXCLUDED.file_category, ubs_file_processing_log.file_category),
                file_hash = COALESCE(EXCLUDED.file_hash, ubs_file_processing_log.file_hash),
                local_path = COALESCE(EXCLUDED.local_path, ubs_file_processing_log.local_path)
            """,
            (filename, file_date, file_size, file_category, file_hash, local_path),
        )


def log_file_processing_complete(
    conn,
    filename: str,
    record_count: int,
    status: str = "completed",
    error_message: Optional[str] = None,
    file_hash: str = None,
    local_path: str = None,
):
    """Log file processing completion to ubs_file_processing_log"""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE ubs.ubs_file_processing_log
            SET processing_status = %s,
                record_count = %s,
                completed_at = CURRENT_TIMESTAMP,
                error_message = %s,
                file_hash = COALESCE(%s, file_hash),
                local_path = COALESCE(%s, local_path)
            WHERE filename = %s
            """,
            (status, record_count, error_message, file_hash, local_path, filename),
        )


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
    file_path: str, file_date: date = None, connection_string: str = None
):
    """Process a local Prime Broker Activity Statement file

    Args:
        file_path: Path to the CSV file to process
        file_date: Date of the file (extracted from filename if not provided)
        connection_string: PostgreSQL connection string (optional, will use environment variables if not provided)
    """

    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    # Extract file date from filename if not provided
    if file_date is None:
        filename = file_path.name
        # Format: YYYYMMDD.PrimeBrokerActivityStatement.*.CSV
        if len(filename) >= 8:
            try:
                file_date = datetime.strptime(filename[:8], "%Y%m%d").date()
            except ValueError:
                file_date = date.today()
        else:
            file_date = date.today()

    logger.info(f"Processing local file: {file_path}")
    logger.info(f"File date: {file_date}")

    # Read file
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    file_size = len(file_bytes)
    logger.info(f"File size: {file_size:,} bytes")

    # Connect to database
    conn = get_db_connection(connection_string)
    conn.autocommit = False

    try:
        source_filename = file_path.name
        local_path = str(file_path)

        # Calculate file hash
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        # Log file processing start
        log_file_processing_start(
            conn,
            source_filename,
            file_date,
            file_size,
            file_category="prime_broker_activity",
            file_hash=file_hash,
            local_path=local_path,
        )
        conn.commit()

        # Parse CSV
        logger.info("Parsing CSV file...")
        records = parse_prime_broker_activity_csv(
            file_bytes, file_date, source_filename
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
        inserted_count = insert_prime_broker_activity_records(conn, records)
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
            local_path=local_path,
        )
        conn.commit()

        logger.info("=" * 80)
        logger.info("PROCESSING SUMMARY")
        logger.info("=" * 80)
        logger.info(f"File: {source_filename}")
        logger.info(f"File date: {file_date}")
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
        description="Process a local Prime Broker Activity Statement CSV file",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Using connection string from command line:
  python process_local_prime_broker_file.py file.csv --connection-string "postgresql://user:pass@host:5432/db?sslmode=require"

  # Using environment variables:
  export POSTGRES_CONNECTION_STRING="postgresql://user:pass@host:5432/db?sslmode=require"
  python process_local_prime_broker_file.py file.csv

  # Or using individual environment variables:
  export POSTGRES_PLATFORM_HOST=host
  export POSTGRES_PLATFORM_PORT=5432
  export POSTGRES_PLATFORM_DB=db
  export POSTGRES_PLATFORM_USER=user
  export POSTGRES_PLATFORM_PASSWORD=pass
  python process_local_prime_broker_file.py file.csv
        """,
    )

    parser.add_argument(
        "file_path", help="Path to the Prime Broker Activity Statement CSV file"
    )

    parser.add_argument(
        "--file-date",
        type=str,
        help="File date in YYYY-MM-DD format (extracted from filename if not provided)",
    )

    parser.add_argument(
        "--connection-string",
        type=str,
        help="PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/db?sslmode=require)",
    )

    args = parser.parse_args()

    file_date = None
    if args.file_date:
        try:
            file_date = datetime.strptime(args.file_date, "%Y-%m-%d").date()
        except ValueError:
            logger.warning(
                f"Invalid date format: {args.file_date}. Using date from filename."
            )

    try:
        process_local_file(args.file_path, file_date, args.connection_string)
        print("SUCCESS: File processed successfully")
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {e}")
        logger.exception("Processing failed")
        sys.exit(1)
