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

