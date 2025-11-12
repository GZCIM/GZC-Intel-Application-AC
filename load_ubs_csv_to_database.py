"""
Load UBS Margin CSV files into PostgreSQL database
Handles filename tracking to prevent duplicate processing
"""

import csv
import os
import hashlib
import sys
from decimal import Decimal, InvalidOperation
from datetime import datetime
import psycopg2
from psycopg2.extras import execute_values
from psycopg2 import sql

def parse_number(value):
    """Parse a string number, handling empty strings and spaces"""
    if not value or value.strip() == '':
        return None
    try:
        # Remove commas and convert to Decimal
        cleaned = str(value).strip().replace(',', '')
        return Decimal(cleaned)
    except (ValueError, InvalidOperation):
        return None

def parse_date(date_str):
    """Parse date string in MM/DD/YYYY format"""
    if not date_str or date_str.strip() == '':
        return None
    try:
        # Handle MM/DD/YYYY format
        return datetime.strptime(date_str.strip(), '%m/%d/%Y').date()
    except ValueError:
        return None

def calculate_record_hash(row, filename):
    """Calculate hash for duplicate detection"""
    # Use key fields to create unique hash
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

def check_file_processed(conn, filename):
    """Check if file has already been processed"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT processing_status, record_count
            FROM ubs_file_processing_log
            WHERE filename = %s
        """, (filename,))
        result = cur.fetchone()
        return result

def log_file_processing_start(conn, filename, account, cob_date, file_size):
    """Log file processing start"""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO ubs_file_processing_log
            (filename, account, cob_date, file_size_bytes, processing_status, started_at)
            VALUES (%s, %s, %s, %s, 'processing', CURRENT_TIMESTAMP)
            ON CONFLICT (filename)
            DO UPDATE SET
                processing_status = 'processing',
                started_at = CURRENT_TIMESTAMP,
                error_message = NULL
        """, (filename, account, cob_date, file_size))

def log_file_processing_complete(conn, filename, record_count, success=True, error_msg=None):
    """Log file processing completion"""
    with conn.cursor() as cur:
        status = 'completed' if success else 'failed'
        cur.execute("""
            UPDATE ubs_file_processing_log
            SET processing_status = %s,
                record_count = %s,
                completed_at = CURRENT_TIMESTAMP,
                error_message = %s
            WHERE filename = %s
        """, (status, record_count, error_msg, filename))

def load_csv_to_database(csv_file, db_connection_string, skip_duplicates=True):
    """
    Load CSV file into database

    Args:
        csv_file: Path to CSV file
        db_connection_string: PostgreSQL connection string
        skip_duplicates: If True, skip records that already exist
    """
    filename = os.path.basename(csv_file)
    file_size = os.path.getsize(csv_file)

    print(f"Processing file: {filename}")
    print(f"File size: {file_size:,} bytes")

    # Connect to database
    try:
        conn = psycopg2.connect(db_connection_string)
        conn.autocommit = False
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return False

    try:
        # Check if file already processed
        existing = check_file_processed(conn, filename)
        if existing and existing[0] == 'completed':
            print(f"File {filename} has already been processed successfully.")
            response = input("Do you want to reprocess it? (yes/no): ")
            if response.lower() != 'yes':
                print("Skipping file.")
                return True

        # Read CSV and prepare data
        records = []
        account = None
        cob_date = None

        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row in reader:
                # Extract account and date from first row
                if account is None:
                    account = row.get('Account', '').strip()
                    cob_date_str = row.get('COB_Date', '').strip()
                    cob_date = parse_date(cob_date_str)

                # Calculate record hash
                record_hash = calculate_record_hash(row, filename)

                # Prepare record for insertion
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
                    'fx_rate': parse_number(row.get('FX-Rate', '')),  # Note: CSV has "FX-Rate"
                    'quantity': parse_number(row.get('Quantity', '')),
                    'mv_rollup': parse_number(row.get('MV_Rollup', '')),
                    'margin_rollup': parse_number(row.get('Margin_Rollup', '')),
                    'req_percent': parse_number(row.get('Req_Percent', '')),
                    'ric_code': row.get('RIC_Code', '').strip() or None,
                    'account_name': row.get('Account_Name', '').strip() or None,
                    'run_id': row.get('Run_ID', '').strip() or None,
                    'file_processed_date': datetime.now().date(),
                    'record_hash': record_hash
                }
                records.append(record)

        print(f"Read {len(records)} records from CSV")

        # Log processing start
        log_file_processing_start(conn, filename, account, cob_date, file_size)

        # Insert records
        if records:
            columns = list(records[0].keys())
            values = [tuple(record[col] for col in columns) for record in records]

            insert_query = sql.SQL("""
                INSERT INTO ubs_margin_data ({})
                VALUES %s
                ON CONFLICT (record_hash)
                DO NOTHING
            """).format(
                sql.SQL(', ').join(map(sql.Identifier, columns))
            )

            with conn.cursor() as cur:
                execute_values(cur, insert_query, values, page_size=1000)
                inserted_count = cur.rowcount

            print(f"Inserted {inserted_count} new records (skipped {len(records) - inserted_count} duplicates)")

            # Calculate and store daily summary
            if account and cob_date:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT calculate_daily_margin_summary(%s, %s, %s)
                    """, (account, cob_date, filename))
                print("Daily summary calculated and stored")

        # Commit transaction
        conn.commit()

        # Log completion
        log_file_processing_complete(conn, filename, len(records), success=True)
        conn.commit()

        print(f"Successfully processed {filename}")
        return True

    except Exception as e:
        conn.rollback()
        error_msg = str(e)
        print(f"Error processing file: {error_msg}")
        log_file_processing_complete(conn, filename, 0, success=False, error_msg=error_msg)
        conn.commit()
        return False

    finally:
        conn.close()

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python load_ubs_csv_to_database.py <csv_file> [connection_string]")
        print("\nExample:")
        print("  python load_ubs_csv_to_database.py c:\\tmp\\20251110.MFXCMDRCSV.I0004255.CSV")
        print("\nOr with connection string:")
        print("  python load_ubs_csv_to_database.py file.csv 'postgresql://user:pass@host:port/db'")
        sys.exit(1)

    csv_file = sys.argv[1]

    # Get connection string from argument or environment variable
    if len(sys.argv) > 2:
        db_connection_string = sys.argv[2]
    else:
        db_connection_string = os.getenv('POSTGRES_CONNECTION_STRING')
        if not db_connection_string:
            print("Error: Database connection string not provided.")
            print("Either pass it as second argument or set POSTGRES_CONNECTION_STRING environment variable")
            sys.exit(1)

    if not os.path.exists(csv_file):
        print(f"Error: File not found: {csv_file}")
        sys.exit(1)

    success = load_csv_to_database(csv_file, db_connection_string)
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()

