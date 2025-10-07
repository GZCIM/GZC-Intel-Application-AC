# app/controllers/portfolio_controller.py

from fastapi import APIRouter, Depends, Request, HTTPException, status
from app.auth.azure_auth import validate_token
from app.daos.portfolio_dao import PortfolioDAO
import logging

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio"])
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

        return {"status": "success", "data": portfolio_df.to_dict(orient="records")}

    except Exception as e:
        logger.exception("[PortfolioController] Failed to fetch portfolio")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fx-positions", status_code=200)
async def get_fx_positions(
    request: Request, current_user: dict = Depends(validate_token)
):
    """
    Return FX forward positions as JSON where maturity_date >= selected date.
    If fundId is provided and not 0, also filter by fund.
    Query params:
      - date: ISO date (YYYY-MM-DD)
      - fundId: integer, 0 = ALL (no fund filter)
    """
    try:
        # Debug: verify Authorization header presence and length
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if not auth_header:
            logger.warning("[PortfolioController] Missing Authorization header on /fx-positions request")
        else:
            logger.info(
                f"[PortfolioController] Authorization header present (len={len(auth_header)}), scheme={auth_header.split(' ')[0]}"
            )
        selected_date = request.query_params.get("date")
        if not selected_date:
            raise HTTPException(
                status_code=400, detail="Missing required 'date' query parameter"
            )

        fund_id_param = request.query_params.get("fundId")
        fund_id = None
        if fund_id_param is not None:
            try:
                fund_id = int(fund_id_param)
            except ValueError:
                raise HTTPException(
                    status_code=400, detail="'fundId' must be an integer"
                )

        # Per requirement: calculation engine will supply DTD/MTD/YTD. Return DB trade records only.
        data = PortfolioDAO().get_fx_positions(
            selected_date=selected_date, fund_id=fund_id
        )
        return {"status": "success", "count": len(data), "data": data}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[PortfolioController] Failed to fetch FX positions")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fx-option-positions", status_code=200)
async def get_fx_option_positions(
    request: Request, current_user: dict = Depends(validate_token)
):
    """
    Return FX option positions as JSON where maturity_date >= selected date.
    If fundId is provided and not 0, also filter by fund.
    Query params:
      - date: ISO date (YYYY-MM-DD)
      - fundId: integer, 0 = ALL (no fund filter)
    """
    try:
        # Debug: verify Authorization header presence and length
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if not auth_header:
            logger.warning("[PortfolioController] Missing Authorization header on /fx-option-positions request")
        else:
            logger.info(
                f"[PortfolioController] Authorization header present (len={len(auth_header)}), scheme={auth_header.split(' ')[0]}"
            )
        selected_date = request.query_params.get("date")
        if not selected_date:
            raise HTTPException(
                status_code=400, detail="Missing required 'date' query parameter"
            )

        fund_id_param = request.query_params.get("fundId")
        fund_id = None
        if fund_id_param is not None:
            try:
                fund_id = int(fund_id_param)
            except ValueError:
                raise HTTPException(
                    status_code=400, detail="'fundId' must be an integer"
                )

        # Per requirement: calculation engine will supply DTD/MTD/YTD. Return DB trade records only.
        data = PortfolioDAO().get_fx_option_positions(
            selected_date=selected_date, fund_id=fund_id
        )
        return {"status": "success", "count": len(data), "data": data}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[PortfolioController] Failed to fetch FX option positions")
        raise HTTPException(status_code=500, detail=str(e))
