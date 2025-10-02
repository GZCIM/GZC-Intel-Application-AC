# app/controllers/transactions_controller.py

from fastapi import APIRouter, Depends, Request, HTTPException, Query
from app.auth.azure_auth import validate_token
from app.daos.transactions_dao import TransactionsDAO
from app.daos.fx_trades_dao import FXTradesDAO
import logging

router = APIRouter(prefix="/transactions", tags=["Transactions"])
logger = logging.getLogger(__name__)


@router.get("/unmatched", status_code=200)
async def get_unmatched_transactions(
    request: Request, current_user: dict = Depends(validate_token)
):
    """
    Fetch all unmatched transactions, optionally filtered by `currentDate`.
    """
    try:
        current_date = request.query_params.get("currentDate")
        dao = TransactionsDAO()
        unmatched_df = dao.get_unmatched_transactions(current_date)
        return {"status": "success", "data": unmatched_df.to_dict(orient="records")}
    except Exception as e:
        logger.exception(
            "[TransactionsController] Failed to fetch unmatched transactions"
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all", status_code=200)
async def get_all_transactions(
    request: Request, current_user: dict = Depends(validate_token)
):
    """
    Fetch all transactions, optionally filtered by `currentDate`.
    """
    try:
        current_date = request.query_params.get("currentDate")
        dao = TransactionsDAO()
        all_df = dao.get_all_transactions(current_date)
        return {"status": "success", "data": all_df.to_dict(orient="records")}
    except Exception as e:
        logger.exception("[TransactionsController] Failed to fetch all transactions")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fx-trades", status_code=200)
async def get_fx_trades(
    request: Request,
    current_user: dict = Depends(validate_token),
    limit: int = Query(100, ge=1, le=5000),
    offset: int = Query(0, ge=0),
):
    try:
        data = FXTradesDAO().list_fx_trades(limit=limit, offset=offset)
        return {"status": "success", "count": len(data), "data": data}
    except Exception as e:
        logger.exception("[TransactionsController] Failed to fetch fx trades")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fx-option-trades", status_code=200)
async def get_fx_option_trades(
    request: Request,
    current_user: dict = Depends(validate_token),
    limit: int = Query(100, ge=1, le=5000),
    offset: int = Query(0, ge=0),
):
    try:
        data = FXTradesDAO().list_fx_option_trades(limit=limit, offset=offset)
        return {"status": "success", "count": len(data), "data": data}
    except Exception as e:
        logger.exception("[TransactionsController] Failed to fetch fx option trades")
        raise HTTPException(status_code=500, detail=str(e))
