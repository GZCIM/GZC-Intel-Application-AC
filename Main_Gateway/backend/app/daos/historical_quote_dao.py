from app.database.connection import engine
from sqlalchemy import text
import pandas as pd
from app.util.logger import  get_logger
logger = get_logger(__name__)


class HistoricalQuoteDAO:
    """Handles database operations for portfolios using raw SQL."""

    def __init__(self):
        """Initialize DAO with a database session."""

        self.engine = engine
        # try:
        #     with self.engine.connect() as connection:
        #         logger.debug("✅ Successfully connected to the database!")
        # except OperationalError as e:
        #     logger.error("❌ Database connection failed:", e)

    def get_eod_price(
        self, symbol, trade_date, expiration_date, side, valuation_date
    ):
        # if trade_date >= valuation_date:
        #     valuation_date = trade_date
        # if expiration_date < valuation_date:
        #     valuation_date = expiration_date

        # if side == "BUY":
        #     side = "ask"
        # else:
        #     side = "bid"

        # query = text(
        #     """
        #     SELECT price
        #     FROM historical_quotes
        #     WHERE symbol = :symbol
        #     AND valuation_date = :valuation_date
        #     AND expiration_date = :expiration_date
        #     AND side = :side"""
        # )

        # try:
        #     with self.engine.connect() as connection:
        #         result = connection.execute(
        #             query,
        #             {
        #                 "symbol": symbol,
        #                 "trade_date": trade_date,
        #                 "expiration_date": expiration_date,
        #                 "side": side,
        #             },
        #         )
        #         price = result.fetchone()
        #         if price:
        #             return price[0]
        #         else:
        #             return None
        # except Exception as e:
        #     logger.error(f"Error fetching EOD price: {e}")
        #     return None
        return 1 # Placeholder for actual SQL query execution
