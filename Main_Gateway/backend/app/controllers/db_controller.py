from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from app.database.connection import engine, DB_NAME, DB_HOST, DB_USER

router = APIRouter(prefix="/api/db", tags=["DB Health"])


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
            rows = (
                conn.execute(
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
                )
                .mappings()
                .all()
            )

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


@router.get("/meta/describe", status_code=200)
def db_describe():
    """Describe structure for gzc_fx_trade and gzc_fx_option_trade across all schemas."""
    try:
        targets = ["gzc_fx_trade", "gzc_fx_option_trade"]
        with engine.connect() as conn:
            # Find schemas and basic table info
            rows = (
                conn.execute(
                    text(
                        """
                    SELECT table_schema, table_name
                    FROM information_schema.tables
                    WHERE table_name IN (:t1, :t2)
                    ORDER BY table_schema, table_name
                    """
                    ),
                    {"t1": targets[0], "t2": targets[1]},
                )
                .mappings()
                .all()
            )

            result = {}
            for r in rows:
                schema = r["table_schema"]
                name = r["table_name"]

                cols = (
                    conn.execute(
                        text(
                            """
                        SELECT 
                          c.column_name,
                          c.data_type,
                          c.is_nullable,
                          c.character_maximum_length,
                          c.numeric_precision,
                          c.numeric_scale,
                          c.column_default
                        FROM information_schema.columns c
                        WHERE c.table_schema = :schema AND c.table_name = :name
                        ORDER BY c.ordinal_position
                        """
                        ),
                        {"schema": schema, "name": name},
                    )
                    .mappings()
                    .all()
                )

                # Primary keys
                pks = (
                    conn.execute(
                        text(
                            """
                        SELECT a.attname as column_name
                        FROM   pg_index i
                        JOIN   pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                        WHERE  i.indrelid = (:schema||'.'||:name)::regclass AND i.indisprimary
                        """
                        ),
                        {"schema": schema, "name": name},
                    )
                    .scalars()
                    .all()
                )

                result[f"{schema}.{name}"] = {
                    "columns": [dict(c) for c in cols],
                    "primary_keys": list(pks),
                }

            return {"status": "ok", "tables": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB describe failed: {e}")
