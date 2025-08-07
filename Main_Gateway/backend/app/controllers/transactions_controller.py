# app/controllers/transactions_controller.py

from fastapi import APIRouter, Depends, Request, HTTPException
from app.auth.azure_auth import validate_token
from app.daos.transactions_dao import TransactionsDAO
import logging

router = APIRouter(prefix="/transactions", tags=["Transactions"])
logger = logging.getLogger(__name__)


@router.get("/unmatched", status_code=200)
async def get_unmatched_transactions(request: Request, current_user: dict = Depends(validate_token)):
    """
    Fetch all unmatched transactions, optionally filtered by `currentDate`.
    """
    try:
        current_date = request.query_params.get("currentDate")
        dao = TransactionsDAO()
        unmatched_df = dao.get_unmatched_transactions(current_date)
        return {"status": "success", "data": unmatched_df.to_dict(orient="records")}
    except Exception as e:
        logger.exception("[TransactionsController] Failed to fetch unmatched transactions")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all", status_code=200)
async def get_all_transactions(request: Request, current_user: dict = Depends(validate_token)):
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
