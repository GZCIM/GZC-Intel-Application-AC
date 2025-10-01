from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from app.database.connection import engine, DB_NAME, DB_HOST, DB_USER

router = APIRouter(prefix="/db", tags=["DB Health"])


@router.get("/health", status_code=200)
def db_health():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            return {
                "status": "ok" if result == 1 else "unknown",
                "database": DB_NAME,
                "host": DB_HOST,
                "user": DB_USER,
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB health check failed: {e}")


@router.get("/meta/tables", status_code=200)
def db_tables():
    try:
        target_tables = ["gzc_fx_trade", "gzc_fx_option_trade"]
        placeholders = ",".join([":t" + str(i) for i in range(len(target_tables))])
        params = {"t" + str(i): name for i, name in enumerate(target_tables)}
        with engine.connect() as conn:
            rows = conn.execute(
                text(
                    f"""
                    SELECT table_schema, table_name
                    FROM information_schema.tables
                    WHERE table_schema IN ('public')
                    AND table_name IN ({placeholders})
                    ORDER BY table_name
                    """
                ),
                params,
            ).mappings().all()

            found = [dict(r) for r in rows]

            counts = {}
            for name in target_tables:
                try:
                    cnt = conn.execute(text(f"SELECT COUNT(*) FROM {name}")).scalar()
                    counts[name] = int(cnt)
                except Exception:
                    counts[name] = None

            return {"status": "ok", "found": found, "counts": counts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB table check failed: {e}")


