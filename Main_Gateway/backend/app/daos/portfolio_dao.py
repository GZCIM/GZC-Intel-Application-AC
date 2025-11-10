from app.database.connection import engine
from sqlalchemy import text
import pandas as pd
from app.util.logger import get_logger
from datetime import datetime, timedelta
import random

logger = get_logger(__name__)


class PortfolioDAO:
    """Handles database operations for portfolios using raw SQL."""

    def __init__(self):
        self.engine = engine

    def get_virtual_portfolio(self, current_date=None):
        """Fetch all virtual portfolios from the database."""

        # COMMENTED OUT - SQL Query for real database
        """
        query = text(
            f'''
            WITH VirtualTrades AS (
                SELECT
                    inv.Id,
                    inv.TradeID,
                    CONVERT(VARCHAR, inv.TradeDate, 23) AS TradeDate,
                    inv.TradeType,
                    inv.BaseCurrency,
                    inv.QuoteCurrency,
                    inv.QuoteType,
                    CONVERT(VARCHAR, inv.ExpirationOrMaturityDate, 23)
                    AS ExpirationOrMaturityDate,
                    inv.OriginalId,
                    inv.TradeEvent,
                    inv.Fund,
                    inv.Position,
                    inv.Trader,
                    inv.ModUser,
                    CONVERT(VARCHAR, inv.ModTimestamp, 120) AS ModTimestamp
                FROM PFL.Tbl_Trade_Inventory inv
                WHERE TradeType IN (
                    SELECT id FROM PFL.Tbl_Trade_Type WHERE Name = 'Virtual FX'
                )
                {f"AND TradeDate <= '{current_date}'" if current_date else ""}
            )
            SELECT
                fx.ExecutionID,
                fx.OrderID,
                fx.Symbol,
                fx.Side,
                fx.OrderQty,
                fx.Price,
                fx.Currency,
                fx.CounterpartyID,
                fx.Note,
                vt.*
            FROM VRT.Tbl_FX_Trade fx
            JOIN VirtualTrades vt ON fx.Id = vt.TradeId;
            '''
        )

        logger.debug(
            f"Executing portfolio query for date: {current_date}"
        )
        df = pd.read_sql(query, self.engine)
        return df
        """

        # MOCK DATA - Replace with real SQL query above when database is available
        logger.debug(f"Returning mock portfolio data for date: {current_date}")

        # Generate mock portfolio data
        mock_data = []
        symbols = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF", "USD/CAD"]
        traders = ["Alex", "Sarah", "Mike", "Emma", "David"]
        sides = ["BUY", "SELL"]

        for i in range(10):  # Generate 10 mock positions
            symbol = random.choice(symbols)
            base_currency = symbol.split("/")[0]
            quote_currency = symbol.split("/")[1]
            side = random.choice(sides)
            quantity = random.randint(100000, 5000000)  # 100K to 5M
            price = round(random.uniform(0.8, 1.8), 5)  # Random FX rate

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
                # Trade Inventory fields
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

        # Convert to DataFrame to match expected return type
        df = pd.DataFrame(mock_data)
        logger.info(f"Generated {len(df)} mock portfolio positions")
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
            -- Latest lineage row for this trade (if any) by current_trade_id
            LEFT JOIN LATERAL (
                SELECT l.*
                FROM public.gzc_fx_trade_lineage l
                WHERE l.current_trade_id = t.trade_id
                ORDER BY l.operation_timestamp DESC, l.id DESC
                LIMIT 1
            ) ln ON TRUE
            -- Original trade referenced by lineage (if present)
            LEFT JOIN public.gzc_fx_trade ot
                ON ot.trade_id = ln.original_trade_id
            -- Parent lineage -> parent current trade (if present)
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

    # Removed ref price extraction per request. Calculation engine will supply DTD/MTD/YTD; DB returns trade price only.

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
            -- Latest lineage row for this option trade (if any) by current_trade_id
            LEFT JOIN LATERAL (
                SELECT l.*
                FROM public.gzc_fx_option_trade_lineage l
                WHERE l.current_trade_id = t.trade_id
                ORDER BY l.operation_timestamp DESC, l.id DESC
                LIMIT 1
            ) ln ON TRUE
            -- Original option trade referenced by lineage (if present)
            LEFT JOIN public.gzc_fx_option_trade ot
                ON ot.trade_id = ln.original_trade_id
            -- Parent lineage -> parent current option trade (if present)
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

    # Removed ref price extraction per request. Calculation engine will supply DTD/MTD/YTD; DB returns trade-side fields only.

    def get_trade_lineage(self, original_trade_id: int, fund_id: int | None = None):
        """
        Return all trade lineage records for a given original_trade_id.
        If fund_id is provided and not 0, filter by fund_id.
        Results are sorted by operation_timestamp DESC (latest first).
        """
        params: dict[str, object] = {"original_trade_id": original_trade_id}

        # Filter by fund_id if provided and not 0 (0 means "all funds")
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
