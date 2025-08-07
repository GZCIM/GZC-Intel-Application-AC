from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict
from datetime import datetime
from starlette.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from starlette.concurrency import run_in_threadpool

from app.auth.azure_auth import validate_token
from app.daos.historical_quote_dao import HistoricalQuoteDAO

import logging

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/historical_quote", tags=["Historical Quotes"]
)


class QuoteRequest(BaseModel):
    symbol: str = Field(..., description="Symbol")
    entryType: str = Field(
        ..., description="Entry Type (e.g., BUY, SELL)"
    )
    tradeDate: str = Field(..., description="Trade Date (YYYY-MM-DD)")
    expirationDate: str = Field(
        ..., description="Expiration Date (YYYY-MM-DD)"
    )


@router.post("/")
async def get_eod_history(
    quotes: List[QuoteRequest] = Body(..., embed=True),
    currentDate: str = Body(...),
    user=Depends(validate_token),
):
    try:
        if not quotes or not currentDate:
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail="Missing required parameters",
            )

        current_date = datetime.strptime(currentDate, "%Y-%m-%d").date()
        result: Dict[str, Dict[str, Dict[str, float]]] = {}
        dao = HistoricalQuoteDAO()

        for quote in quotes:
            symbol = quote.symbol
            side = quote.entryType
            trade_date = datetime.strptime(
                quote.tradeDate, "%Y-%m-%d"
            ).date()
            expiration_date = datetime.strptime(
                quote.expirationDate, "%Y-%m-%d"
            ).date()

            ytd_date = current_date.replace(month=1, day=1)
            mtd_date = current_date.replace(day=1)
            dtd_date = current_date

            entry = {}
            entry["ytd"] = await run_in_threadpool(
                dao.get_eod_price,
                symbol,
                trade_date,
                expiration_date,
                side,
                ytd_date,
            )
            entry["mtd"] = await run_in_threadpool(
                dao.get_eod_price,
                symbol,
                trade_date,
                expiration_date,
                side,
                mtd_date,
            )
            entry["dtd"] = await run_in_threadpool(
                dao.get_eod_price,
                symbol,
                trade_date,
                expiration_date,
                side,
                dtd_date,
            )

            if symbol not in result:
                result[symbol] = {}
            result[symbol][side] = entry

        return result

    except Exception as e:
        logger.error(f"[historical_quote] Error in EOD history: {e}")
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
