import argparse
import csv
import hashlib
import logging
import os
import sys
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from io import BytesIO
from typing import Dict, List, Optional, Tuple

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
    if any(
        isinstance(handler, logging.FileHandler)
        and getattr(handler, "baseFilename", "").endswith("ubs_cash_balance_processing.log")
        for handler in logging.getLogger().handlers
    ):
        return

    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    file_handler = logging.FileHandler("ubs_cash_balance_processing.log")
    file_handler.setFormatter(formatter)
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(stream_handler)


def parse_decimal(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    cleaned = text.replace(",", "")
    negative = cleaned.startswith("(") and cleaned.endswith(")")
    if negative:
        cleaned = cleaned[1:-1]
    try:
        dec = Decimal(cleaned)
        return -dec if negative else dec
    except (InvalidOperation, ValueError):
        return None


def calculate_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def classify_row(row: dict) -> str:
    account_name = (row.get("Account Name") or "").strip()
    account_id = (row.get("Account ID") or "").strip()
    ccy = (row.get("CCY") or "").strip()
    numeric_fields = [
        row.get("TD Cash Balance"),
        row.get("SD Cash Balance"),
        row.get("TD Cash Balance (Base)"),
        row.get("SD Cash Balance (Base)"),
    ]
    numeric_present = any((field or "").strip() for field in numeric_fields)

    if account_name.startswith("SubTotal:") or account_id.startswith("SubTotal:"):
        return "subtotal"
    if not account_name and not account_id and not ccy and numeric_present:
        return "grand_total"
    if not any((row.get(key) or "").strip() for key in row):
        return "empty"
    return "detail"


def extract_fund_account(row: dict, row_type: str) -> Optional[str]:
    account_id = (row.get("Account ID") or "").strip()
    account_name = (row.get("Account Name") or "").strip()

    if row_type == "detail":
        return account_id or None

    if row_type == "subtotal":
        for field in (account_id, account_name):
            if "SubTotal:" in field:
                return field.split("SubTotal:", 1)[1].strip() or None
        return None

    return account_id or None


def calculate_row_hash(record: dict) -> str:
    """Calculate hash for duplicate detection, handling None values"""
    def safe_str(value):
        """Convert value to string, handling None"""
        if value is None:
            return ""
        return str(value)

    key_fields = [
        record["cob_date"].isoformat(),
        safe_str(record.get("file_sequence")),
        safe_str(record.get("line_number")),
        safe_str(record.get("row_type")),
        safe_str(record.get("fund_account")),
        safe_str(record.get("account_name_raw")),
        safe_str(record.get("account_id_raw")),
        safe_str(record.get("ccy")),
        safe_str(record.get("td_cash_balance")),
        safe_str(record.get("sd_cash_balance")),
        safe_str(record.get("fx_rate")),
        safe_str(record.get("td_cash_balance_base")),
        safe_str(record.get("sd_cash_balance_base")),
    ]
    hash_input = "|".join(key_fields)
    return hashlib.sha256(hash_input.encode()).hexdigest()


def parse_cash_balance_csv(
    file_bytes: bytes, cob_date: date, file_sequence: int, source_filename: str
) -> List[Dict]:
    text = file_bytes.decode("utf-8-sig")
    reader = csv.DictReader(text.splitlines())
    records = []

    # Track last seen account information for carry-forward
    last_account_name = None
    last_account_id = None
    last_fund_account = None

    for line_number, row in enumerate(reader, start=1):
        row_type = classify_row(row)
        if row_type == "empty":
            continue

        # Extract account information
        account_name_raw = (row.get("Account Name") or "").strip() or None
        account_id_raw = (row.get("Account ID") or "").strip() or None

        # For detail rows, carry forward account info if missing
        if row_type == "detail":
            # When account info is present, update tracking (handles new account groups)
            # When account info is missing, carry forward from previous detail row
            # This correctly handles transitions like row 19 (subtotal) -> row 20 (new account)
            if account_name_raw:
                # New account info detected - update tracking
                last_account_name = account_name_raw
            elif last_account_name:
                # Carry forward from previous account
                account_name_raw = last_account_name

            if account_id_raw:
                # New account info detected - update tracking
                last_account_id = account_id_raw
                last_fund_account = account_id_raw  # fund_account is typically the account_id for detail rows
            elif last_account_id:
                # Carry forward from previous account
                account_id_raw = last_account_id

            # fund_account for detail rows is the account_id
            fund_account = account_id_raw if account_id_raw else last_fund_account
        else:
            # For subtotal/grand_total rows, extract fund_account from the subtotal text
            fund_account = extract_fund_account(row, row_type)
            # Update last_fund_account for potential use in subsequent detail rows
            if fund_account:
                last_fund_account = fund_account

        record = {
            "cob_date": cob_date,
            "source_filename": source_filename,
            "file_sequence": file_sequence,
            "row_type": row_type,
            "fund_account": fund_account,
            "account_name_raw": account_name_raw,
            "account_id_raw": account_id_raw,
            "ccy": (row.get("CCY") or "").strip() or None,
            "td_cash_balance": parse_decimal(row.get("TD Cash Balance")),
            "sd_cash_balance": parse_decimal(row.get("SD Cash Balance")),
            "fx_rate": parse_decimal(row.get("FX Rate")),
            "td_cash_balance_base": parse_decimal(row.get("TD Cash Balance (Base)")),
            "sd_cash_balance_base": parse_decimal(row.get("SD Cash Balance (Base)")),
            "line_number": line_number,
        }
        record["record_hash"] = calculate_row_hash(record)
        records.append(record)

    return records


def insert_cash_balance_records(conn, records: List[Dict]) -> int:
    if not records:
        return 0

    columns = list(records[0].keys())
    values = [tuple(record[col] for col in columns) for record in records]

    insert_query = sql.SQL(
        """
        INSERT INTO ubs.ubs_cash_balance_data ({})
        VALUES %s
        ON CONFLICT (record_hash)
        DO NOTHING
    """
    ).format(sql.SQL(", ").join(map(sql.Identifier, columns)))

    with conn.cursor() as cur:
        execute_values(cur, insert_query, values, page_size=1000)
        # rowcount is not reliable with execute_values, so fall back to len(records)
    return len(records)


def fetch_existing_file_metadata(conn, cob_date: date) -> Dict[str, object]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT filename, file_hash, processing_status, file_sequence, record_count
            FROM ubs.ubs_file_processing_log
            WHERE cob_date = %s AND file_category = %s
        """,
            (cob_date, "cash_balance"),
        )
        rows = cur.fetchall()

    by_hash = {}
    sequences = set()
    for filename, file_hash, status, file_sequence, record_count in rows:
        if file_sequence:
            sequences.add(file_sequence)
        if file_hash:
            by_hash[file_hash] = {
                "filename": filename,
                "status": status,
                "file_sequence": file_sequence,
                "record_count": record_count,
            }
    return {"by_hash": by_hash, "sequences": sequences}


def process_ubs_cash_balance_daily(process_date=None):
    start_time = datetime.now()
    status = "success"
    return_messages: list[str] = []

    try:
        logger.info("=" * 80)
        logger.info("Starting UBS Cash Balance Daily Processing")
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

        conn = psycopg2.connect(db_connection_string)
        conn.autocommit = False

        existing_metadata = fetch_existing_file_metadata(conn, cob_date)
        existing_hash_map = existing_metadata["by_hash"]
        existing_sequences = existing_metadata["sequences"]
        next_sequence = max(existing_sequences) + 1 if existing_sequences else 1

        sftp, transport = connect_sftp(sftp_host, sftp_port, sftp_username, sftp_password)

        try:
            logger.info("Searching for cash balance files on SFTP...")
            target_prefix = cob_date.strftime("%Y%m%d") + ".CashBalances."
            files = [
                filename
                for filename in sftp.listdir(sftp_remote_dir)
                if filename.startswith(target_prefix) and filename.upper().endswith(".CSV")
            ]
            files.sort()

            if not files:
                message = (
                    f"No cash balance files found matching prefix {target_prefix} in {sftp_remote_dir}"
                )
                logger.warning(message)
                return_messages.append(message)
                status = "skipped"
                return status, "\n".join(return_messages)

            os.makedirs(local_download_dir, exist_ok=True)

            files_processed = 0
            files_duplicate = 0
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

                file_size = sftp.stat(remote_path).st_size
                logger.info("File size: %s bytes", f"{file_size:,}")

                file_obj = BytesIO()
                sftp.getfo(remote_path, file_obj)
                file_bytes = file_obj.getvalue()
                file_obj.close()

                file_hash = calculate_file_hash(file_bytes)
                logger.info("Calculated file hash: %s", file_hash)

                duplicate_info = existing_hash_map.get(file_hash)
                if duplicate_info and duplicate_info.get("status") == "completed":
                    logger.info(
                        "File %s matches previously processed hash; marking as duplicate.",
                        filename,
                    )
                    log_file_processing_start(
                        conn,
                        filename,
                        account=None,
                        cob_date=cob_date,
                        file_size=file_size,
                        file_category="cash_balance",
                        file_hash=file_hash,
                        file_sequence=duplicate_info.get("file_sequence"),
                    )
                    log_file_processing_complete(
                        conn,
                        filename,
                        duplicate_info.get("record_count") or 0,
                        status="duplicate",
                        file_hash=file_hash,
                        file_sequence=duplicate_info.get("file_sequence"),
                    )
                    files_duplicate += 1
                    return_messages.append(f"Duplicate file skipped: {filename}")
                    continue

                file_sequence = next_sequence
                next_sequence += 1

                local_path = os.path.join(local_download_dir, filename)
                with open(local_path, "wb") as local_file:
                    local_file.write(file_bytes)
                logger.info("Saved local copy to %s", local_path)

                log_file_processing_start(
                    conn,
                    filename,
                    account=None,
                    cob_date=cob_date,
                    file_size=file_size,
                    file_category="cash_balance",
                    file_hash=file_hash,
                    file_sequence=file_sequence,
                    local_path=local_path,
                )

                try:
                    records = parse_cash_balance_csv(
                        file_bytes, cob_date, file_sequence, filename
                    )
                    logger.info("Parsed %d records from CSV", len(records))

                    inserted = insert_cash_balance_records(conn, records)
                    conn.commit()
                    logger.info("Inserted %d records into ubs_cash_balance_data", inserted)
                    total_inserted += inserted

                    log_file_processing_complete(
                        conn,
                        filename,
                        inserted,
                        status="completed",
                        file_hash=file_hash,
                        file_sequence=file_sequence,
                        local_path=local_path,
                    )
                    files_processed += 1

                    existing_hash_map[file_hash] = {
                        "filename": filename,
                        "status": "completed",
                        "file_sequence": file_sequence,
                        "record_count": inserted,
                    }
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
                        file_sequence=file_sequence,
                        local_path=local_path,
                    )
                    logger.error("Failed to process %s: %s", filename, error_msg)
                    return_messages.append(f"ERROR processing {filename}: {error_msg}")
                    files_failed += 1
                    continue

            summary_lines = [
                "=" * 80,
                "PROCESSING SUMMARY",
                "=" * 80,
                f"COB date processed: {cob_date}",
                f"Files found: {len(files)}",
                f"Files processed: {files_processed}",
                f"Duplicate files skipped: {files_duplicate}",
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
            elif files_duplicate and not files_processed:
                status = "duplicate"
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
        description="Process UBS cash balance files from SFTP and load to database",
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

    status, message = process_ubs_cash_balance_daily(process_date=process_date_input)
    print(f"Status: {status}")
    print(f"Message: {message}")

    if status in {"failed"}:
        sys.exit(1)


if __name__ == "__main__":
    configure_logging()
    main()
