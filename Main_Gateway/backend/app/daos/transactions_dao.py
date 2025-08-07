from typing import Optional
import pandas as pd
from datetime import datetime
from sqlalchemy import text
from app.database.connection import engine
from app.util.logger import get_logger

logger = get_logger(__name__)


class TransactionsDAO:
    def __init__(self):
        self.engine = engine

    def get_unmatched_transactions(self, current_date: str | None = None) -> pd.DataFrame:
        try:
            # 🔒 Uncomment this block when the DB table exists
            # if current_date:
            #     query = text("""
            #         SELECT id, symbol, side, quantity, price, tradeDate, status, counterparty, note
            #         FROM transactions
            #         WHERE status = 'unmatched' AND tradeDate = :current_date
            #     """)
            #     return pd.read_sql(query, self.engine, params={"current_date": current_date})
            # else:
            #     query = text("""
            #         SELECT id, symbol, side, quantity, price, tradeDate, status, counterparty, note
            #         FROM transactions
            #         WHERE status = 'unmatched'
            #     """)
            #     return pd.read_sql(query, self.engine)

            # 🧪 Fallback: Sample data with UBS
            logger.info("[TransactionsDAO] Using sample unmatched transaction data.")
            today = datetime.today().strftime("%Y-%m-%d")
            return pd.DataFrame([
                {
                    "id": "TXN-001",
                    "symbol": "EURUSD",
                    "side": "Buy",
                    "quantity": 1_000_000,
                    "price": 1.0945,
                    "tradeDate": today,
                    "status": "unmatched",
                    "counterparty": "UBS",
                    "note": "No matching order yet"
                },
                {
                    "id": "TXN-002",
                    "symbol": "USDJPY",
                    "side": "Sell",
                    "quantity": 500_000,
                    "price": 148.27,
                    "tradeDate": today,
                    "status": "unmatched",
                    "counterparty": "UBS",
                    "note": "Execution delayed"
                },
                {
                    "id": "TXN-003",
                    "symbol": "GBPCHF",
                    "side": "Buy",
                    "quantity": 750_000,
                    "price": 1.1370,
                    "tradeDate": today,
                    "status": "unmatched",
                    "counterparty": "UBS",
                    "note": "Pending allocation"
                }
            ])
        except Exception as e:
            logger.error(f"[TransactionsDAO] Error fetching unmatched transactions: {e}")
            return pd.DataFrame()

    def get_all_transactions(self, current_date: str | None = None) -> pd.DataFrame:
        try:
            # 🔒 Uncomment this block when the DB table exists
            # if current_date:
            #     query = text("""
            #         SELECT id, symbol, side, quantity, price, tradeDate, status, counterparty, note
            #         FROM transactions
            #         WHERE tradeDate = :current_date
            #     """)
            #     return pd.read_sql(query, self.engine, params={"current_date": current_date})
            # else:
            #     query = text("""
            #         SELECT id, symbol, side, quantity, price, tradeDate, status, counterparty, note
            #         FROM transactions
            #     """)
            #     return pd.read_sql(query, self.engine)

            # 🧪 Fallback: reuse sample unmatched as full set
            logger.info("[TransactionsDAO] Using sample all transaction data.")
            return self.get_unmatched_transactions()

        except Exception as e:
            logger.error(f"[TransactionsDAO] Error fetching all transactions: {e}")
            return pd.DataFrame()
