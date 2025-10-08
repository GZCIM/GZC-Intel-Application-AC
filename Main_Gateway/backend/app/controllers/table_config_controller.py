# app/controllers/table_config_controller.py

from fastapi import APIRouter, Depends, Request, HTTPException, status
from app.auth.azure_auth import validate_token
import logging
from typing import Dict, List, Optional
import json

router = APIRouter(prefix="/api/table-config", tags=["Table Configuration"])
logger = logging.getLogger(__name__)


@router.get("/portfolio", status_code=200)
async def get_portfolio_table_config(
    request: Request, current_user: dict = Depends(validate_token)
):
    """
    Get portfolio table configuration for the current user and fund.
    Query params:
      - fundId: integer, fund ID for scoping the config
    """
    try:
        fund_id_param = request.query_params.get("fundId")
        fund_id = None
        if fund_id_param is not None:
            try:
                fund_id = int(fund_id_param)
            except ValueError:
                raise HTTPException(
                    status_code=400, detail="'fundId' must be an integer"
                )

        user_id = current_user.get("oid", "unknown")
        
        # TODO: Replace with actual Cosmos DB query
        # For now, return default configuration
        default_config = {
            "columns": [
                {"key": "trade_type", "label": "Type", "visible": True, "width": 100},
                {"key": "trade_id", "label": "Trade ID", "visible": True, "width": 120},
                {"key": "trade_date", "label": "Trade Date", "visible": True, "width": 120},
                {"key": "maturity_date", "label": "Maturity", "visible": True, "width": 120},
                {"key": "quantity", "label": "Quantity", "visible": True, "width": 120},
                {"key": "trade_price", "label": "Trade Price", "visible": True, "width": 120},
                {"key": "price", "label": "Current Price", "visible": True, "width": 120},
                {"key": "trade_currency", "label": "Trade CCY", "visible": True, "width": 100},
                {"key": "settlement_currency", "label": "Settle CCY", "visible": True, "width": 100},
                {"key": "position", "label": "Position", "visible": True, "width": 100},
                {"key": "counter_party_code", "label": "Counterparty", "visible": True, "width": 120},
                {"key": "eoy_price", "label": "EOY Price", "visible": False, "width": 120},
                {"key": "eom_price", "label": "EOM Price", "visible": False, "width": 120},
                {"key": "eod_price", "label": "EOD Price", "visible": False, "width": 120},
                {"key": "itd_pnl", "label": "ITD P&L", "visible": True, "width": 120},
                {"key": "ytd_pnl", "label": "YTD P&L", "visible": True, "width": 120},
                {"key": "mtd_pnl", "label": "MTD P&L", "visible": True, "width": 120},
                {"key": "dtd_pnl", "label": "DTD P&L", "visible": True, "width": 120},
                {"key": "trader", "label": "Trader", "visible": False, "width": 100},
                {"key": "note", "label": "Note", "visible": False, "width": 200},
            ],
            "sorting": {"column": "maturity_date", "direction": "asc"},
            "grouping": [],
            "filters": {}
        }

        return {"status": "success", "data": default_config}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[TableConfigController] Failed to get portfolio table config")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "type": e.__class__.__name__,
            },
        )


@router.post("/portfolio", status_code=200)
async def save_portfolio_table_config(
    request: Request, current_user: dict = Depends(validate_token)
):
    """
    Save portfolio table configuration for the current user and fund.
    Body should contain:
      - fundId: integer, fund ID for scoping the config
      - config: object with columns, sorting, grouping, filters
    """
    try:
        body = await request.json()
        fund_id = body.get("fundId")
        config = body.get("config")
        
        if fund_id is None:
            raise HTTPException(
                status_code=400, detail="Missing required 'fundId' field"
            )
        if config is None:
            raise HTTPException(
                status_code=400, detail="Missing required 'config' field"
            )

        user_id = current_user.get("oid", "unknown")
        
        # TODO: Replace with actual Cosmos DB upsert
        # For now, just log the configuration
        logger.info(f"Saving table config for user {user_id}, fund {fund_id}: {json.dumps(config, indent=2)}")

        return {"status": "success", "message": "Configuration saved successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[TableConfigController] Failed to save portfolio table config")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "type": e.__class__.__name__,
            },
        )
