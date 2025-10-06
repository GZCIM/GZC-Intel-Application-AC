from app.database.connection import engine
from sqlalchemy import text


class FundsDAO:
    def __init__(self):
        self.engine = engine

    def list_funds(self):
        """Return list of funds from public.gzc_fund."""
        sql = text(
            """
            SELECT "Id" AS id,
                   "FundNameShort" AS short_name,
                   "FundNameFull" AS full_name
            FROM public.gzc_fund
            ORDER BY "Id"
            """
        )
        with self.engine.connect() as conn:
            rows = conn.execute(sql).mappings().all()
            return [dict(r) for r in rows]




