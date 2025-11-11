from app.database.connection import engine
from sqlalchemy import text
import pandas as pd
from app.util.logger import get_logger
from datetime import datetime, timedelta
import random

logger = get_logger(__name__)


class CashDAO:
    """Handles database operations for cash using raw SQL.
    This mirrors PortfolioDAO structure to keep API behavior aligned."""

    def __init__(self):
        self.engine = engine

    def get_virtual_portfolio(self, current_date=None):
        """Fetch all virtual portfolios from the database (mocked; parity with portfolio DAO)."""
        logger.debug(f"[CashDAO] Returning mock portfolio data for date: {current_date}")

        # Generate mock portfolio data (kept in sync with PortfolioDAO for now)
        mock_data = []
        symbols = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF", "USD/CAD"]
        traders = ["Alex", "Sarah", "Mike", "Emma", "David"]
        sides = ["BUY", "SELL"]

        for i in range(10):
            symbol = random.choice(symbols)
            base_currency = symbol.split("/")[0]
            quote_currency = symbol.split("/")[1]
            side = random.choice(sides)
            quantity = random.randint(100000, 5000000)
            price = round(random.uniform(0.8, 1.8), 5)

            mock_position = {
                "ExecutionID": f"EXE_{i + 1:06d}",
                "OrderID": f"ORD_{i + 1:06d}",
                "Symbol": symbol,
                "Side": side,
                "OrderQty": quantity,
                "Price": price,
                "Currency": quote_currency,
                "CounterpartyID": f"CP_{random.randint(1, 5):03d}",
                "Note": f"Mock trade {i + 1}",
                "Id": i + 1,
                "TradeID": f"TRD_{i + 1:06d}",
                "TradeDate": (
                    datetime.now() - timedelta(days=random.randint(0, 30))
                ).strftime("%Y-%m-%d"),
                "TradeType": "Virtual FX",
                "BaseCurrency": base_currency,
                "QuoteCurrency": quote_currency,
                "QuoteType": "SPOT",
                "ExpirationOrMaturityDate": (
                    datetime.now() + timedelta(days=random.randint(1, 90))
                ).strftime("%Y-%m-%d"),
                "OriginalId": f"ORIG_{i + 1:06d}",
                "TradeEvent": "NEW",
                "Fund": f"FUND_{random.randint(1, 3)}",
                "Position": quantity if side == "BUY" else -quantity,
                "Trader": random.choice(traders),
                "ModUser": random.choice(traders),
                "ModTimestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
            mock_data.append(mock_position)

        df = pd.DataFrame(mock_data)
        logger.info(f"[CashDAO] Generated {len(df)} mock portfolio positions")
        return df

    def get_fx_positions(
        self,
        selected_date: str,
        fund_id: int | None = None,
        limit: int = 5000,
        offset: int = 0,
    ):
        """
        Return FX forward positions from public.gzc_fx_trade where maturity_date >= selected_date.
        If fund_id is provided and not 0, also filter by fund_id.
        Mirrors PortfolioDAO.get_fx_positions for cash API parity.
        """
        base_sql = """
            SELECT
                t.*,
                ln.id AS lineage_id,
                ln.operation AS lineage_operation,
                ln.operation_timestamp AS lineage_operation_timestamp,
                ln.original_trade_id AS lineage_original_trade_id,
                ln.parent_lineage_id AS lineage_parent_lineage_id,
                ot.trade_id AS original_trade_id,
                ot.price AS original_trade_price,
                ot.quantity AS original_trade_quantity,
                pt.trade_id AS parent_trade_id,
                pt.price AS parent_trade_price,
                pt.quantity AS parent_trade_quantity
            FROM public.gzc_fx_trade t
            LEFT JOIN LATERAL (
                SELECT l.*
                FROM public.gzc_fx_trade_lineage l
                WHERE l.current_trade_id = t.trade_id
                ORDER BY l.operation_timestamp DESC, l.id DESC
                LIMIT 1
            ) ln ON TRUE
            LEFT JOIN public.gzc_fx_trade ot
                ON ot.trade_id = ln.original_trade_id
            LEFT JOIN public.gzc_fx_trade_lineage pln
                ON pln.id = ln.parent_lineage_id
            LEFT JOIN public.gzc_fx_trade pt
                ON pt.trade_id = pln.current_trade_id
            WHERE t.maturity_date::date >= (:selected_date)::date
              AND t.trade_date::date    <= (:selected_date)::date
        """
        params: dict[str, object] = {
            "selected_date": selected_date,
            "limit": limit,
            "offset": offset,
        }
        if fund_id is not None and fund_id != 0:
            base_sql += " AND t.fund_id = :fund_id"
            params["fund_id"] = fund_id
        base_sql += (
            " ORDER BY t.maturity_date ASC, t.trade_id DESC LIMIT :limit OFFSET :offset"
        )
        query = text(base_sql)
        with self.engine.connect() as conn:
            rows = conn.execute(query, params).mappings().all()
            return [dict(r) for r in rows]

    def get_fx_option_positions(
        self,
        selected_date: str,
        fund_id: int | None = None,
        limit: int = 5000,
        offset: int = 0,
    ):
        """
        Return FX option positions from public.gzc_fx_option_trade where maturity_date >= selected_date.
        If fund_id is provided and not 0, also filter by fund_id.
        Mirrors PortfolioDAO.get_fx_option_positions.
        """
        base_sql = """
            SELECT
                t.*,
                ln.id AS lineage_id,
                ln.operation AS lineage_operation,
                ln.operation_timestamp AS lineage_operation_timestamp,
                ln.original_trade_id AS lineage_original_trade_id,
                ln.parent_lineage_id AS lineage_parent_lineage_id,
                ot.trade_id AS original_trade_id,
                ot.premium AS original_trade_price,
                ot.quantity AS original_trade_quantity,
                pt.trade_id AS parent_trade_id,
                pt.premium AS parent_trade_price,
                pt.quantity AS parent_trade_quantity
            FROM public.gzc_fx_option_trade t
            LEFT JOIN LATERAL (
                SELECT l.*
                FROM public.gzc_fx_option_trade_lineage l
                WHERE l.current_trade_id = t.trade_id
                ORDER BY l.operation_timestamp DESC, l.id DESC
                LIMIT 1
            ) ln ON TRUE
            LEFT JOIN public.gzc_fx_option_trade ot
                ON ot.trade_id = ln.original_trade_id
            LEFT JOIN public.gzc_fx_option_trade_lineage pln
                ON pln.id = ln.parent_lineage_id
            LEFT JOIN public.gzc_fx_option_trade pt
                ON pt.trade_id = pln.current_trade_id
            WHERE t.maturity_date::date >= (:selected_date)::date
              AND t.trade_date::date    <= (:selected_date)::date
        """
        params: dict[str, object] = {
            "selected_date": selected_date,
            "limit": limit,
            "offset": offset,
        }
        if fund_id is not None and fund_id != 0:
            base_sql += " AND t.fund_id = :fund_id"
            params["fund_id"] = fund_id
        base_sql += (
            " ORDER BY t.maturity_date ASC, t.trade_id DESC LIMIT :limit OFFSET :offset"
        )
        query = text(base_sql)
        with self.engine.connect() as conn:
            rows = conn.execute(query, params).mappings().all()
            return [dict(r) for r in rows]

    def get_trade_lineage(self, original_trade_id: int, fund_id: int | None = None):
        """
        Return all trade lineage records for a given original_trade_id.
        If fund_id is provided and not 0, filter by fund_id.
        Mirrors PortfolioDAO.get_trade_lineage.
        """
        params: dict[str, object] = {"original_trade_id": original_trade_id}

        if fund_id is not None and fund_id != 0:
            query = text("""
                SELECT
                    l.id,
                    l.current_trade_id,
                    l.parent_lineage_id,
                    l.original_trade_id,
                    l.operation,
                    l.operation_timestamp,
                    l.quantity_delta,
                    l.notes,
                    l.fund_id,
                    l.mod_user,
                    l.mod_timestamp,
                    f."FundNameShort" AS fund_short_name
                FROM public.gzc_fx_trade_lineage l
                LEFT JOIN public.gzc_fund f ON f."Id" = l.fund_id
                WHERE l.original_trade_id = :original_trade_id
                  AND l.fund_id = :fund_id
                ORDER BY l.current_trade_id DESC, l.id DESC
            """)
            params["fund_id"] = fund_id
        else:
            query = text("""
                SELECT
                    l.id,
                    l.current_trade_id,
                    l.parent_lineage_id,
                    l.original_trade_id,
                    l.operation,
                    l.operation_timestamp,
                    l.quantity_delta,
                    l.notes,
                    l.fund_id,
                    l.mod_user,
                    l.mod_timestamp,
                    f."FundNameShort" AS fund_short_name
                FROM public.gzc_fx_trade_lineage l
                LEFT JOIN public.gzc_fund f ON f."Id" = l.fund_id
                WHERE l.original_trade_id = :original_trade_id
                ORDER BY l.current_trade_id DESC, l.id DESC
            """)

        with self.engine.connect() as conn:
            rows = conn.execute(query, params).mappings().all()
            return [dict(r) for r in rows]

    def list_cash_transactions(
        self,
        limit: int = 5000,
        offset: int = 0,
    ):
        """
        Return raw cash transactions from public.gzc_cash_transactions.
        Keeping selection generic (SELECT *) to avoid schema coupling.
        """
        query = text("""
            SELECT *
            FROM public.gzc_cash_transactions
            ORDER BY id DESC
            LIMIT :limit OFFSET :offset
        """)
        params = {"limit": limit, "offset": offset}
        with self.engine.connect() as conn:
            rows = conn.execute(query, params).mappings().all()
            return [dict(r) for r in rows]


