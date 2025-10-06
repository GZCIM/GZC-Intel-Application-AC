from sqlalchemy import text
from app.database.connection import engine


class FXTradesDAO:
    def list_fx_trades(self, limit: int = 1000, offset: int = 0):
        query = text(
            """
            SELECT * FROM public.gzc_fx_trade
            ORDER BY trade_date DESC, trade_id DESC
            LIMIT :limit OFFSET :offset
            """
        )
        with engine.connect() as conn:
            rows = (
                conn.execute(query, {"limit": limit, "offset": offset}).mappings().all()
            )
            return [dict(r) for r in rows]

    def list_fx_option_trades(self, limit: int = 1000, offset: int = 0):
        query = text(
            """
            SELECT * FROM public.gzc_fx_option_trade
            ORDER BY trade_date DESC, trade_id DESC
            LIMIT :limit OFFSET :offset
            """
        )
        with engine.connect() as conn:
            rows = (
                conn.execute(query, {"limit": limit, "offset": offset}).mappings().all()
            )
            return [dict(r) for r in rows]

    def list_fx_trades_positions(
        self,
        selected_date: str,
        fund_id: int | None = None,
        limit: int = 5000,
        offset: int = 0,
    ):
        """
        Return FX trades where maturity_date >= selected_date.
        If fund_id is provided and not 0, filter by fund_id as well.
        """
        base_sql = """
            SELECT *
            FROM public.gzc_fx_trade
            WHERE maturity_date >= :selected_date
        """
        params: dict[str, object] = {
            "selected_date": selected_date,
            "limit": limit,
            "offset": offset,
        }
        if fund_id is not None and fund_id != 0:
            base_sql += " AND fund_id = :fund_id"
            params["fund_id"] = fund_id
        base_sql += (
            " ORDER BY maturity_date ASC, trade_id DESC LIMIT :limit OFFSET :offset"
        )
        query = text(base_sql)
        with engine.connect() as conn:
            rows = conn.execute(query, params).mappings().all()
            return [dict(r) for r in rows]

    def list_fx_option_trades_positions(
        self,
        selected_date: str,
        fund_id: int | None = None,
        limit: int = 5000,
        offset: int = 0,
    ):
        """
        Return FX option trades where maturity_date >= selected_date.
        If fund_id is provided and not 0, filter by fund_id as well.
        """
        base_sql = """
            SELECT *
            FROM public.gzc_fx_option_trade
            WHERE maturity_date >= :selected_date
        """
        params: dict[str, object] = {
            "selected_date": selected_date,
            "limit": limit,
            "offset": offset,
        }
        if fund_id is not None and fund_id != 0:
            base_sql += " AND fund_id = :fund_id"
            params["fund_id"] = fund_id
        base_sql += (
            " ORDER BY maturity_date ASC, trade_id DESC LIMIT :limit OFFSET :offset"
        )
        query = text(base_sql)
        with engine.connect() as conn:
            rows = conn.execute(query, params).mappings().all()
            return [dict(r) for r in rows]
