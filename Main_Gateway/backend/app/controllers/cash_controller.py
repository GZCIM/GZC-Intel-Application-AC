from fastapi import APIRouter, Depends, Request, HTTPException
from app.auth.azure_auth import validate_token
from app.daos.cash_dao import CashDAO
import logging

router = APIRouter(prefix="/api/cash", tags=["Cash"])
logger = logging.getLogger(__name__)

@router.get("/transactions", status_code=200)
async def list_cash_transactions(
    request: Request,
    current_user: dict = Depends(validate_token),
):
    """
    Return raw cash transactions from public.gzc_cash_transactions.
    """
    try:
        limit_param = request.query_params.get("limit")
        offset_param = request.query_params.get("offset")
        try:
            limit = int(limit_param) if limit_param is not None else 5000
            offset = int(offset_param) if offset_param is not None else 0
        except ValueError:
            raise HTTPException(
                status_code=400, detail="'limit' and 'offset' must be integers"
            )

        data = CashDAO().list_cash_transactions(limit=limit, offset=offset)
        return {"status": "success", "count": len(data), "data": data}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[CashController] Failed to fetch cash transactions")
        raise HTTPException(
            status_code=500, detail={"error": str(e), "type": e.__class__.__name__}
        )
