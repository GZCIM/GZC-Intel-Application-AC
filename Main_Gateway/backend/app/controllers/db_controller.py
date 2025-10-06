from fastapi import APIRouter, HTTPException, Query, Depends
from app.auth.azure_auth import validate_token
from app.daos.db_diagnostics_dao import DBDiagnosticsDAO
from app.daos.fx_trades_dao import FXTradesDAO

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


# FX data endpoints (read-only) under /api/db to keep consistent shape with meta endpoints
@router.get("/fx/trades", status_code=200)
def db_fx_trades(
    limit: int = Query(100, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(validate_token),
):
    try:
        data = FXTradesDAO().list_fx_trades(limit=limit, offset=offset)
        return {"status": "ok", "count": len(data), "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fx/options", status_code=200)
def db_fx_option_trades(
    limit: int = Query(100, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(validate_token),
):
    try:
        data = FXTradesDAO().list_fx_option_trades(limit=limit, offset=offset)
        return {"status": "ok", "count": len(data), "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
