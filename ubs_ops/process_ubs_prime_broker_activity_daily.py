import argparse
import csv
import hashlib
import logging
import os
import sys
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from io import BytesIO
from typing import Dict, List, Optional

import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values

from process_ubs_margin_daily import (
    get_last_workday,
    parse_process_date,
    connect_sftp,
    check_file_exists,
    log_file_processing_start,
    log_file_processing_complete,
)


DEFAULT_LOCAL_DOWNLOAD_DIR = r"C:\\tmpubs"
logger = logging.getLogger(__name__)


def configure_logging():
    """Configure logging for the script"""
    if any(
        isinstance(handler, logging.FileHandler)
        and getattr(handler, "baseFilename", "").endswith("ubs_prime_broker_activity_processing.log")
        for handler in logging.getLogger().handlers
    ):
        return

    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    file_handler = logging.FileHandler("ubs_prime_broker_activity_processing.log")
    file_handler.setFormatter(formatter)
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(stream_handler)


def parse_date_mmddyyyy(date_str: str) -> Optional[date]:
    """Parse date string in MM/DD/YYYY format"""
    if not date_str or not date_str.strip():
        return None
    try:
        return datetime.strptime(date_str.strip(), "%m/%d/%Y").date()
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


def calculate_record_hash(row: Dict, row_type: str, file_date: date) -> str:
    """Calculate hash for duplicate detection"""
    def safe_str(value):
        if value is None:
            return ""
        return str(value)
    
    # For transactions, use key fields that uniquely identify the transaction
    if row_type == "transaction":
        key_fields = [
            safe_str(row.get("Account ID")),
            safe_str(row.get("Trade Date")),
            safe_str(row.get("UBS Ref")),
            safe_str(row.get("Trans Type")),
            safe_str(row.get("Net Amount")),
            safe_str(row.get("Settle CCY")),
        ]
    # For balance rows, use account, currency, balance date, and balance type
    elif row_type in ("opening_balance", "closing_balance"):
        security_desc = (row.get("Security Description") or "").strip()
        balance_date = extract_balance_date(security_desc)
        key_fields = [
            safe_str(row.get("Account ID")),
            safe_str(row.get("Settle CCY")),
            safe_str(balance_date) if balance_date else "",
            row_type,
        ]
    # For subtotals, use account/currency and row type
    elif row_type in ("subtotal_account", "subtotal_currency"):
        key_fields = [
            safe_str(row.get("Account Name") or row.get("Settle CCY")),
            row_type,
            safe_str(file_date),
        ]
    else:
        # For other rows, use all fields
        key_fields = [safe_str(row.get(key, "")) for key in sorted(row.keys())]
        key_fields.append(row_type)
        key_fields.append(safe_str(file_date))
    
    hash_input = "|".join(key_fields)
    return hashlib.sha256(hash_input.encode()).hexdigest()


def parse_prime_broker_activity_csv(
    file_bytes: bytes, file_date: date, source_filename: str
) -> List[Dict]:
    """Parse Prime Broker Activity Statement CSV"""
    text = file_bytes.decode("utf-8-sig")
    reader = csv.DictReader(text.splitlines())
    records = []
    
    for line_number, row in enumerate(reader, start=1):
        row_type = classify_row(row)
        if row_type == "empty":
            continue
        
        # Extract dates
        entry_date = parse_date_mmddyyyy(row.get("Entry Date"))
        trade_date = parse_date_mmddyyyy(row.get("Trade Date"))
        settle_date = parse_date_mmddyyyy(row.get("Settle Date"))
        
        # Extract balance information if applicable
        balance_date = None
        balance_amount = None
        balance_type = None
        security_desc = (row.get("Security Description") or "").strip()
        
        if row_type == "opening_balance":
            balance_date = extract_balance_date(security_desc)
            balance_amount = parse_decimal(row.get("Net Amount"))
            balance_type = "opening"
        elif row_type == "closing_balance":
            balance_date = extract_balance_date(security_desc)
            balance_amount = parse_decimal(row.get("Net Amount"))
            balance_type = "closing"
        
        record = {
            "source_filename": source_filename,
            "file_date": file_date,
            "row_type": row_type,
            "account_name": (row.get("Account Name") or "").strip() or None,
            "account_id": (row.get("Account ID") or "").strip() or None,
            "settle_ccy": (row.get("Settle CCY") or "").strip() or None,
            "entry_date": entry_date,
            "trade_date": trade_date,
            "settle_date": settle_date,
            "trans_type": (row.get("Trans Type") or "").strip() or None,
            "cancel": (row.get("Cancel") or "").strip() or None,
            "isin": (row.get("ISIN") or "").strip() or None,
            "security_description": security_desc or None,
            "ubs_ref": (row.get("UBS Ref") or "").strip() or None,
            "client_ref": (row.get("Client Ref") or "").strip() or None,
            "exec_broker": (row.get("Exec Broker") or "").strip() or None,
            "quantity": parse_decimal(row.get("Quantity")),
            "price": parse_decimal(row.get("Price")),
            "comm": parse_decimal(row.get("Comm")),
            "net_amount": parse_decimal(row.get("Net Amount")),
            "balance_date": balance_date,
            "balance_amount": balance_amount,
            "balance_type": balance_type,
            "line_number": line_number,
        }
        
        record["record_hash"] = calculate_record_hash(row, row_type, file_date)
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


def calculate_file_hash(file_bytes: bytes) -> str:
    """Calculate SHA-256 hash of file contents"""
    return hashlib.sha256(file_bytes).hexdigest()


def process_ubs_prime_broker_activity_daily(process_date=None):
    """Main processing function"""
    start_time = datetime.now()
    status = "success"
    return_messages: List[str] = []
    
    try:
        logger.info("=" * 80)
        logger.info("Starting UBS Prime Broker Activity Daily Processing")
        logger.info(f"Start time: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 80)
        
        logger.info("Reading environment variables...")
        sftp_host = os.getenv("UBS_SFTP_HOST")
        sftp_port = int(os.getenv("UBS_SFTP_PORT", "22"))
        sftp_username = os.getenv("UBS_SFTP_USERNAME")
        sftp_password = os.getenv("UBS_SFTP_PASSWORD")
        sftp_remote_dir = os.getenv("UBS_SFTP_REMOTE_DIR", "/from_UBS")
        db_connection_string = os.getenv("POSTGRES_CONNECTION_STRING")
        local_download_dir = os.getenv("UBS_LOCAL_DOWNLOAD_DIR", DEFAULT_LOCAL_DOWNLOAD_DIR)
        
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
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        
        logger.info(f"SFTP Host: {sftp_host}")
        logger.info(f"SFTP Port: {sftp_port}")
        logger.info(f"SFTP Username: {sftp_username}")
        logger.info(f"SFTP Remote Directory: {sftp_remote_dir}")
        logger.info(f"Local download directory: {local_download_dir}")
        
        # Calculate COB date (last workday)
        reference_date = parse_process_date(process_date)
        if reference_date:
            logger.info(
                "Reference date provided (PROCESS_DATE): %s. Calculating last workday relative to this date.",
                reference_date,
            )
        else:
            reference_date = date.today()
            logger.info(
                "No reference date provided; using today's date (%s) as reference.",
                reference_date,
            )
        
        cob_date = get_last_workday(reference_date)
        logger.info("Last workday calculated from reference date %s: %s", reference_date, cob_date)
        
        # Connect to database
        conn = psycopg2.connect(db_connection_string)
        conn.autocommit = False
        
        # Connect to SFTP
        sftp, transport = connect_sftp(sftp_host, sftp_port, sftp_username, sftp_password)
        
        try:
            logger.info("Searching for Prime Broker Activity Statement files on SFTP...")
            target_prefix = cob_date.strftime("%Y%m%d") + ".PrimeBrokerActivityStatement."
            files = [
                filename
                for filename in sftp.listdir(sftp_remote_dir)
                if filename.startswith(target_prefix) and filename.upper().endswith(".CSV")
            ]
            files.sort()
            
            if not files:
                message = (
                    f"No Prime Broker Activity Statement files found matching prefix {target_prefix} in {sftp_remote_dir}"
                )
                logger.warning(message)
                return_messages.append(message)
                status = "skipped"
                return status, "\n".join(return_messages)
            
            logger.info(f"Found {len(files)} file(s) to process")
            
            os.makedirs(local_download_dir, exist_ok=True)
            
            files_processed = 0
            files_failed = 0
            total_inserted = 0
            
            for filename in files:
                logger.info("-" * 80)
                logger.info("Processing file: %s", filename)
                remote_path = f"{sftp_remote_dir}/{filename}"
                
                if not check_file_exists(sftp, remote_path):
                    message = f"File {remote_path} not found on SFTP - skipping"
                    logger.warning(message)
                    return_messages.append(message)
                    files_failed += 1
                    continue
                
                # Extract file date from filename (YYYYMMDD)
                try:
                    file_date_str = filename[:8]  # First 8 characters: YYYYMMDD
                    file_date = datetime.strptime(file_date_str, "%Y%m%d").date()
                except ValueError:
                    logger.error("Cannot extract date from filename: %s", filename)
                    files_failed += 1
                    continue
                
                file_size = sftp.stat(remote_path).st_size
                logger.info("File size: %s bytes", f"{file_size:,}")
                logger.info("File date (from filename): %s", file_date)
                
                # Download file
                file_obj = BytesIO()
                sftp.getfo(remote_path, file_obj)
                file_bytes = file_obj.getvalue()
                file_obj.close()
                
                file_hash = calculate_file_hash(file_bytes)
                logger.info("Calculated file hash: %s", file_hash)
                
                # Save local copy
                local_path = os.path.join(local_download_dir, filename)
                with open(local_path, "wb") as local_file:
                    local_file.write(file_bytes)
                logger.info("Saved local copy to %s", local_path)
                
                # Log processing start
                log_file_processing_start(
                    conn,
                    filename,
                    account=None,
                    cob_date=file_date,
                    file_size=file_size,
                    file_category="prime_broker_activity",
                    file_hash=file_hash,
                    file_sequence=None,
                    local_path=local_path,
                )
                
                try:
                    # Parse CSV
                    records = parse_prime_broker_activity_csv(file_bytes, file_date, filename)
                    logger.info("Parsed %d records from CSV", len(records))
                    
                    # Count by row type
                    row_type_counts = {}
                    for record in records:
                        rt = record.get("row_type", "unknown")
                        row_type_counts[rt] = row_type_counts.get(rt, 0) + 1
                    logger.info("Row type breakdown: %s", row_type_counts)
                    
                    # Insert records
                    inserted = insert_prime_broker_activity_records(conn, records)
                    conn.commit()
                    logger.info("Inserted %d new records (skipped %d duplicates)", inserted, len(records) - inserted)
                    total_inserted += inserted
                    
                    # Log completion
                    log_file_processing_complete(
                        conn,
                        filename,
                        inserted,
                        status="completed",
                        file_hash=file_hash,
                        file_sequence=None,
                        local_path=local_path,
                    )
                    files_processed += 1
                    
                except Exception as file_error:
                    conn.rollback()
                    error_msg = str(file_error)
                    log_file_processing_complete(
                        conn,
                        filename,
                        0,
                        status="failed",
                        error_msg=error_msg,
                        file_hash=file_hash,
                        file_sequence=None,
                        local_path=local_path,
                    )
                    logger.error("Failed to process %s: %s", filename, error_msg)
                    return_messages.append(f"ERROR processing {filename}: {error_msg}")
                    files_failed += 1
                    continue
            
            # Summary
            summary_lines = [
                "=" * 80,
                "PROCESSING SUMMARY",
                "=" * 80,
                f"COB date processed: {cob_date}",
                f"Files found: {len(files)}",
                f"Files processed: {files_processed}",
                f"Files failed: {files_failed}",
                f"Total records inserted: {total_inserted}",
                "=" * 80,
            ]
            for line in summary_lines:
                logger.info(line)
            return_messages.extend(summary_lines)
            
            if files_failed and not files_processed:
                status = "failed"
            elif files_failed:
                status = "partial_success"
            else:
                status = "success"
        
        finally:
            logger.info("Closing SFTP connection...")
            sftp.close()
            transport.close()
            logger.info("SFTP connection closed")
    
    except Exception as exc:
        status = "failed"
        error_message = f"Fatal error: {exc}"
        logger.error(error_message)
        return_messages.append(error_message)
    
    finally:
        try:
            if 'conn' in locals() and conn:
                conn.close()
                logger.info("Database connection closed")
        except Exception as close_err:
            logger.warning("Error closing database connection: %s", close_err)
        
        end_time = datetime.now()
        total_time = (end_time - start_time).total_seconds()
        logger.info("=" * 80)
        logger.info("Job completed with status: %s", status)
        logger.info("Start time: %s", start_time.strftime("%Y-%m-%d %H:%M:%S"))
        logger.info("End time: %s", end_time.strftime("%Y-%m-%d %H:%M:%S"))
        logger.info("Total execution time: %.2f seconds (%.2f minutes)", total_time, total_time / 60)
        logger.info("=" * 80)
    
    return status, "\n".join(return_messages)


def main():
    parser = argparse.ArgumentParser(
        description="Process UBS Prime Broker Activity Statement files from SFTP and load to database",
    )
    parser.add_argument(
        "--date",
        "-d",
        type=str,
        default=None,
        help="Reference date (YYYY-MM-DD). Script will process last workday prior to this date.",
    )
    args = parser.parse_args()
    
    process_date_input = args.date.strip() if args.date else None
    
    if process_date_input:
        logger.info("Using reference date from command line: %s", process_date_input)
    else:
        logger.info("Reference date not provided on command line; relying on environment variables or default.")
    
    status, message = process_ubs_prime_broker_activity_daily(process_date=process_date_input)
    print(f"Status: {status}")
    print(f"Message: {message}")
    
    if status == "failed":
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    configure_logging()
    main()

