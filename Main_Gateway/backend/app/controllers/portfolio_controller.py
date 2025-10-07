# app/controllers/portfolio_controller.py

from fastapi import APIRouter, Depends, Request, HTTPException, status
import os
import requests
from app.auth.azure_auth import validate_token
from app.daos.portfolio_dao import PortfolioDAO
import logging

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio"])
logger = logging.getLogger(__name__)

# External pricer microservice configuration (inside VPN)
# Configure via environment variables:
#  - PRICER_BASE_URL: base URL to the pricer service (e.g., https://pricer.internal:8443)
#  - PRICER_TIMEOUT_MS: optional HTTP timeout in milliseconds (default 5000)
PRICER_BASE_URL = os.getenv("PRICER_BASE_URL", "")
try:
    PRICER_TIMEOUT_MS = int(os.getenv("PRICER_TIMEOUT_MS", "5000"))
except Exception:
    PRICER_TIMEOUT_MS = 5000


def _get_pricer_url(path: str) -> str:
    base = (PRICER_BASE_URL or "").rstrip("/")
    p = path.lstrip("/")
    return f"{base}/{p}" if base else ""


def _prev_business_day(d):
    from datetime import timedelta

    # Simple weekend-only logic; holidays can be added later
    dtd = d - timedelta(days=1)
    wd = dtd.weekday()
    if wd == 6:  # Sunday -> Friday
        dtd = dtd - timedelta(days=2)
    elif wd == 5:  # Saturday -> Friday
        dtd = dtd - timedelta(days=1)
    return dtd


def _bulk_price(request_items: list[dict]) -> dict[str, dict[str, float]]:
    """
    Call external pricer in bulk. Returns mapping: id -> { date -> price }.
    If PRICER_BASE_URL is not configured or request fails, returns empty dict.
    """
    if not PRICER_BASE_URL or not request_items:
        return {}
    url = _get_pricer_url("api/price/bulk")
    if not url:
        return {}
    try:
        resp = requests.post(
            url,
            json={"requests": request_items},
            timeout=max(1, PRICER_TIMEOUT_MS // 1000),
        )
        resp.raise_for_status()
        data = resp.json() or {}
        results = data.get("results") or []
        out: dict[str, dict[str, float]] = {}
        for r in results:
            rid = str(r.get("id"))
            prices = r.get("prices") or {}
            # Normalize keys to ISO strings
            norm = {str(k): v for k, v in prices.items()}
            out[rid] = norm
        return out
    except Exception:
        return {}


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
        auth_header = request.headers.get("authorization") or request.headers.get(
            "Authorization"
        )
        if not auth_header:
            logger.warning(
                "[PortfolioController] Missing Authorization header on /fx-positions request"
            )
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

        # Baseline: DB trade records only
        data = PortfolioDAO().get_fx_positions(
            selected_date=selected_date, fund_id=fund_id
        )

        # Compute ref dates and attach placeholders; pricing integration will fill later
        from datetime import datetime

        today = datetime.strptime(selected_date, "%Y-%m-%d").date()
        dtd = _prev_business_day(today)
        mtd = today.replace(day=1)
        ytd = today.replace(month=1, day=1)

        # Prepare bulk request to pricer (only for items needing pricing)
        req_items: list[dict] = []
        enriched = []
        for t in data:
            trade_date = t.get("trade_date") or today
            try:
                if isinstance(trade_date, str):
                    trade_date = datetime.fromisoformat(trade_date[:10]).date()
            except Exception:
                trade_date = today

            def use_trade(ref_date):
                return trade_date >= ref_date

            # If pricer is not configured, return 0 for required ref dates; if trade_date >= ref_date use trade price
            # Build pricer request id and fields when needed
            request_id = f"fx-{t.get('trade_id')}"
            need_dates: list[str] = []
            if not use_trade(ytd):
                need_dates.append(ytd.isoformat())
            if not use_trade(mtd):
                need_dates.append(mtd.isoformat())
            if not use_trade(dtd):
                need_dates.append(dtd.isoformat())
            # Today price is taken from trade; if you want live pricer, include today too
            # need_dates.append(today.isoformat())

            if need_dates and PRICER_BASE_URL:
                symbol = f"{str(t.get('trade_currency')).upper()}/{str(t.get('settlement_currency')).upper()}"
                # If tenor is derivable add it; else omit
                req_items.append({
                    "type": "fx_forward",
                    "id": request_id,
                    "symbol": symbol,
                    "maturityDate": str(t.get("maturity_date"))[:10] if t.get("maturity_date") else None,
                    "dates": need_dates,
                })

            def price_for(ref_date, trade_price_value, fetched: dict[str, float] | None):
                if use_trade(ref_date):
                    return trade_price_value
                if fetched is None:
                    return 0 if not PRICER_BASE_URL else None
                return fetched.get(ref_date.isoformat())

            enriched.append(
                {
                    **t,
                    "ytd_date": ytd.isoformat(),
                    "mtd_date": mtd.isoformat(),
                    "dtd_date": dtd.isoformat(),
                    "today_date": today.isoformat(),
                    # placeholders; will fill after pricer call
                    "ytd_price": None,
                    "mtd_price": None,
                    "dtd_price": None,
                    "today_price": t.get("price"),
                }
            )

        # Fetch prices in bulk and populate
        fetched_map = _bulk_price(req_items) if PRICER_BASE_URL else {}
        out = []
        for t in enriched:
            rid = f"fx-{t.get('trade_id')}"
            fetched = fetched_map.get(rid)
            out.append({
                **t,
                "ytd_price": t["ytd_price"] if t["ytd_price"] is not None else price_for(ytd, t.get("today_price"), fetched),
                "mtd_price": t["mtd_price"] if t["mtd_price"] is not None else price_for(mtd, t.get("today_price"), fetched),
                "dtd_price": t["dtd_price"] if t["dtd_price"] is not None else price_for(dtd, t.get("today_price"), fetched),
            })

        return {"status": "success", "count": len(out), "data": out}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[PortfolioController] Failed to fetch FX positions")
        # Return structured error details so frontend console can display the root cause
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "type": e.__class__.__name__,
            },
        )


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
        auth_header = request.headers.get("authorization") or request.headers.get(
            "Authorization"
        )
        if not auth_header:
            logger.warning(
                "[PortfolioController] Missing Authorization header on /fx-option-positions request"
            )
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

        data = PortfolioDAO().get_fx_option_positions(
            selected_date=selected_date, fund_id=fund_id
        )

        from datetime import datetime

        today = datetime.strptime(selected_date, "%Y-%m-%d").date()
        dtd = _prev_business_day(today)
        mtd = today.replace(day=1)
        ytd = today.replace(month=1, day=1)

        req_items: list[dict] = []
        enriched = []
        for t in data:
            trade_date = t.get("trade_date") or today
            try:
                if isinstance(trade_date, str):
                    trade_date = datetime.fromisoformat(trade_date[:10]).date()
            except Exception:
                trade_date = today

            def use_trade(ref_date):
                return trade_date >= ref_date

            request_id = f"fxopt-{t.get('trade_id')}"
            need_dates: list[str] = []
            if not use_trade(ytd):
                need_dates.append(ytd.isoformat())
            if not use_trade(mtd):
                need_dates.append(mtd.isoformat())
            if not use_trade(dtd):
                need_dates.append(dtd.isoformat())

            if need_dates and PRICER_BASE_URL:
                underlying = f"{str(t.get('underlying_trade_currency')).upper()}/{str(t.get('underlying_settlement_currency')).upper()}"
                req_items.append({
                    "type": "fx_option",
                    "id": request_id,
                    "underlying": underlying,
                    "optionType": t.get("option_type"),
                    "style": t.get("option_style"),
                    "strike": t.get("strike"),
                    "strikeCurrency": t.get("strike_currency"),
                    "maturityDate": str(t.get("maturity_date"))[:10] if t.get("maturity_date") else None,
                    "cut": t.get("cut"),
                    "dates": need_dates,
                })

            def price_for(ref_date, trade_price_value, fetched: dict[str, float] | None):
                if use_trade(ref_date):
                    return trade_price_value
                if fetched is None:
                    return 0 if not PRICER_BASE_URL else None
                return fetched.get(ref_date.isoformat())

            enriched.append(
                {
                    **t,
                    "ytd_date": ytd.isoformat(),
                    "mtd_date": mtd.isoformat(),
                    "dtd_date": dtd.isoformat(),
                    "today_date": today.isoformat(),
                    "ytd_price": None,
                    "mtd_price": None,
                    "dtd_price": None,
                    "today_price": t.get("premium"),
                }
            )

        fetched_map = _bulk_price(req_items) if PRICER_BASE_URL else {}
        out = []
        for t in enriched:
            rid = f"fxopt-{t.get('trade_id')}"
            fetched = fetched_map.get(rid)
            out.append({
                **t,
                "ytd_price": t["ytd_price"] if t["ytd_price"] is not None else price_for(ytd, t.get("today_price"), fetched),
                "mtd_price": t["mtd_price"] if t["mtd_price"] is not None else price_for(mtd, t.get("today_price"), fetched),
                "dtd_price": t["dtd_price"] if t["dtd_price"] is not None else price_for(dtd, t.get("today_price"), fetched),
            })

        return {"status": "success", "count": len(out), "data": out}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[PortfolioController] Failed to fetch FX option positions")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "type": e.__class__.__name__,
            },
        )
