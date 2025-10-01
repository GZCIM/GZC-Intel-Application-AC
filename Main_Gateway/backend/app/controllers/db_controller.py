from fastapi import APIRouter, HTTPException
from app.daos.db_diagnostics_dao import DBDiagnosticsDAO

router = APIRouter(prefix="/api/db", tags=["DB Health"])


@router.get("/health", status_code=200)
def db_health():
    try:
        return DBDiagnosticsDAO().health()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB health check failed: {e}")


@router.get("/meta/tables", status_code=200)
def db_tables():
    try:
        data = DBDiagnosticsDAO().list_target_tables()
        return {"status": "ok", **data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB table check failed: {e}")


@router.get("/meta/describe", status_code=200)
def db_describe():
    """Describe structure for gzc_fx_trade and gzc_fx_option_trade across all schemas."""
    try:
        tables = DBDiagnosticsDAO().describe_targets()
        return {"status": "ok", "tables": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB describe failed: {e}")
