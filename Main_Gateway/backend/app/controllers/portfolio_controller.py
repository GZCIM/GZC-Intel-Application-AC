# app/controllers/portfolio_controller.py

from fastapi import APIRouter, Depends, Request, HTTPException, status
from app.auth.azure_auth import validate_token
from app.daos.portfolio_dao import PortfolioDAO
import logging

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])
logger = logging.getLogger(__name__)

@router.get("/", status_code=200)
async def get_portfolio(request: Request, current_user: dict = Depends(validate_token)):
    """
    Fetch all virtual portfolios with optional `currentDate` query param.
    """
    try:
        current_date = request.query_params.get("currentDate", None)
        dao = PortfolioDAO()
        portfolio_df = dao.get_virtual_portfolio(current_date)

        return {
            "status": "success",
            "data": portfolio_df.to_dict(orient="records")
        }

    except Exception as e:
        logger.exception("[PortfolioController] Failed to fetch portfolio")
        raise HTTPException(status_code=500, detail=str(e))
