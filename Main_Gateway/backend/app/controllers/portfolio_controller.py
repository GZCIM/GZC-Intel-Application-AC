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


def _last_business_day_of_month(d):
    from datetime import date, timedelta

    # Move to first day of next month, then step back to last day, then adjust for weekend
    year = d.year + (1 if d.month == 12 else 0)
    month = 1 if d.month == 12 else d.month + 1
    first_next = date(year, month, 1)
    last_day = first_next - timedelta(days=1)
    return _prev_business_day(
        last_day + timedelta(days=1)
    )  # prev biz from next day of last_day


def _last_business_day_of_year(d):
    from datetime import date

    dec31 = date(d.year - 1 if d.month == 1 and d.day == 1 else d.year, 12, 31)
    # If the selected date is in year Y, we want last business day of previous year (Y-1)
    prev_year_dec31 = date(d.year - 1, 12, 31)
    return _prev_business_day(
        prev_year_dec31 + __import__("datetime").timedelta(days=1)
    )


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
        dtd = _prev_business_day(today)  # end of day previous business day
        eom = _last_business_day_of_month(today)  # end of current month business day
        eoy = _last_business_day_of_year(today)  # last business day of previous year

        # Prepare bulk request to pricer (only for items needing pricing)
        req_items: list[dict] = []
        enriched = []
        for t in data:
            trade_date = t.get("trade_date") or today
            try:
                if isinstance(trade_date, str):
                    trade_date = datetime.fromisoformat(trade_date[:10]).date()
                elif hasattr(trade_date, "date"):
                    trade_date = trade_date.date()
            except Exception:
                trade_date = today

            def use_trade(ref_date):
                return trade_date >= ref_date

            # If pricer is not configured, return 0 for required ref dates; if trade_date >= ref_date use trade price
            # Build pricer request id and fields when needed
            request_id = f"fx-{t.get('trade_id')}"
            need_dates: list[str] = []
            if not use_trade(eoy):
                need_dates.append(eoy.isoformat())
            if not use_trade(eom):
                need_dates.append(eom.isoformat())
            if not use_trade(dtd):
                need_dates.append(dtd.isoformat())
            # Always include today for pricer-based pricing
            need_dates.append(today.isoformat())
            # Always include today for pricer-based pricing
            need_dates.append(today.isoformat())

            if need_dates and PRICER_BASE_URL:
                symbol = f"{str(t.get('trade_currency')).upper()}/{str(t.get('settlement_currency')).upper()}"
                # If tenor is derivable add it; else omit
                req_items.append(
                    {
                        "type": "fx_forward",
                        "id": request_id,
                        "symbol": symbol,
                        "maturityDate": str(t.get("maturity_date"))[:10]
                        if t.get("maturity_date")
                        else None,
                        "dates": need_dates,
                    }
                )

            def price_for(
                ref_date, trade_price_value, fetched: dict[str, float] | None
            ):
                if use_trade(ref_date):
                    return trade_price_value
                if fetched is None:
                    return 0 if not PRICER_BASE_URL else None
                return fetched.get(ref_date.isoformat())

            enriched.append(
                {
                    **t,
                    "eoy_date": eoy.isoformat(),
                    "eom_date": eom.isoformat(),
                    "eod_date": dtd.isoformat(),
                    "today_date": today.isoformat(),
                    # keep DB price intact; store as trade_price for downstream use
                    "trade_price": t.get("price"),
                    "eoy_price": None,
                    "eom_price": None,
                    "eod_price": None,
                }
            )

        # Fetch prices in bulk and populate
        fetched_map = _bulk_price(req_items) if PRICER_BASE_URL else {}
        out = []
        for t in enriched:
            rid = f"fx-{t.get('trade_id')}"
            fetched = fetched_map.get(rid)
            # Use TRADE price as fallback when trade_date >= ref_date
            eoy_price = (
                t["eoy_price"]
                if t["eoy_price"] is not None
                else price_for(eoy, t.get("trade_price"), fetched)
            )
            eom_price = (
                t["eom_price"]
                if t["eom_price"] is not None
                else price_for(eom, t.get("trade_price"), fetched)
            )
            eod_price = (
                t["eod_price"]
                if t["eod_price"] is not None
                else price_for(dtd, t.get("trade_price"), fetched)
            )
            price = (
                fetched.get(t["today_date"])
                if fetched
                else (0 if not PRICER_BASE_URL else None)
            )

            trade_price = t.get("trade_price")
            qty = float(t.get("quantity") or 0)
            side = str(t.get("position") or "").strip().lower()
            dir_factor = 1.0 if side == "buy" else -1.0

            def pnl_since(ref_p):
                if ref_p is None or price is None:
                    return None
                return (float(price) - float(ref_p)) * qty * dir_factor

            # Avoid duplicating DB price field; expose it as trade_price instead
            base = {k: v for k, v in t.items() if k != "price"}
            # Construct identifier columns for frontend grouping
            trade_ccy = str(base.get("trade_currency") or "").upper()
            settle_ccy = str(base.get("settlement_currency") or "").upper()
            maturity = str(base.get("maturity_date") or "")[:10]
            underlying = f"{trade_ccy}-{settle_ccy}" if trade_ccy and settle_ccy else None
            ticker = (
                f"{underlying}-{maturity}" if underlying and maturity else underlying
            )
            out.append(
                {
                    **base,
                    "trade_price": trade_price,
                    "eoy_price": eoy_price,
                    "eom_price": eom_price,
                    "eod_price": eod_price,
                    "price": price,
                    # New columns for portfolio table
                    "underlying": underlying,
                    "ticker": ticker,
                    "eoy_date": t["eoy_date"],
                    "eom_date": t["eom_date"],
                    "eod_date": t["eod_date"],
                    "itd_pnl": pnl_since(trade_price),
                    "ytd_pnl": pnl_since(eoy_price),
                    "mtd_pnl": pnl_since(eom_price),
                    "dtd_pnl": pnl_since(eod_price),
                }
            )

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


# New: Notional summary (per-CCY) for FX and FX Options
@router.get("/notional-summary", status_code=200)
async def get_notional_summary(
    request: Request, current_user: dict = Depends(validate_token)
):
    """
    Return notional exposure per currency for FX and FX Options, and USD conversions.
    Query params:
      - date: ISO date (YYYY-MM-DD)
      - fundId: integer, 0 = ALL (no fund filter)
    Notes:
      - If PRICER is configured, uses today's price as conversion rate to USD (for non-USD CCYs).
      - If PRICER is not configured, USD conversion for non-USD CCYs will be 0 (frontend can still display native notionals).
    """
    try:
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

        dao = PortfolioDAO()
        fx = dao.get_fx_positions(selected_date=selected_date, fund_id=fund_id)
        fxopt = dao.get_fx_option_positions(selected_date=selected_date, fund_id=fund_id)

        # Build pricer requests (today only) when available
        from datetime import datetime

        today = datetime.strptime(selected_date, "%Y-%m-%d").date()
        need_prices: list[dict] = []
        # Also collect unique currencies to fetch CCY/USD ladders for robust USD conversion
        unique_ccys: set[str] = set()

        def add_fx_req(t):
            symbol = f"{str(t.get('trade_currency')).upper()}/{str(t.get('settlement_currency')).upper()}"
            need_prices.append({
                "type": "fx_forward",
                "id": f"fx-{t.get('trade_id')}",
                "symbol": symbol,
                "maturityDate": str(t.get("maturity_date"))[:10] if t.get("maturity_date") else None,
                "dates": [today.isoformat()],
            })
            unique_ccys.add(str(t.get('trade_currency')).upper())
            unique_ccys.add(str(t.get('settlement_currency')).upper())

        def add_fxopt_req(t):
            underlying = f"{str(t.get('underlying_trade_currency')).upper()}/{str(t.get('underlying_settlement_currency')).upper()}"
            need_prices.append({
                "type": "fx_option",
                "id": f"fxopt-{t.get('trade_id')}",
                "underlying": underlying,
                "maturityDate": str(t.get("maturity_date"))[:10] if t.get("maturity_date") else None,
                "dates": [today.isoformat()],
            })
            unique_ccys.add(str(t.get('underlying_trade_currency')).upper())
            unique_ccys.add(str(t.get('underlying_settlement_currency')).upper())

        if PRICER_BASE_URL:
            for t in fx:
                add_fx_req(t)
            for t in fxopt:
                add_fxopt_req(t)

        # Add currency ladders to USD for robust conversion
        if PRICER_BASE_URL and unique_ccys:
            for ccy in unique_ccys:
                if not ccy or ccy == "USD":
                    continue
                need_prices.append({
                    "type": "fx_forward",
                    "id": f"rate-{ccy}-USD",
                    "symbol": f"{ccy}/USD",
                    "dates": [today.isoformat()],
                })
                need_prices.append({
                    "type": "fx_forward",
                    "id": f"rate-USD-{ccy}",
                    "symbol": f"USD/{ccy}",
                    "dates": [today.isoformat()],
                })

        fetched = _bulk_price(need_prices) if PRICER_BASE_URL else {}

        # Aggregate notionals
        from collections import defaultdict

        def _rate_ccy_to_usd(ccy: str) -> float | None:
            if ccy == "USD":
                return 1.0
            today_key = today.isoformat()
            # Prefer direct CCY/USD
            direct = fetched.get(f"rate-{ccy}-USD")
            if direct and today_key in direct:
                try:
                    return float(direct[today_key])
                except Exception:
                    pass
            # Fallback to invert USD/CCY
            inv = fetched.get(f"rate-USD-{ccy}")
            if inv and today_key in inv:
                try:
                    val = float(inv[today_key])
                    return 1.0 / val if val else None
                except Exception:
                    return None
            return None

        debug_ccy = (request.query_params.get("debugCcy") or "").upper()
        debug_details: list[dict] = []

        def agg_rows(rows, is_option: bool):
            bucket = "FXOptions" if is_option else "FX"
            by_ccy = defaultdict(lambda: {"notional": 0.0, "notional_usd": 0.0})
            for t in rows:
                def add(ccy: str, amt_native: float):
                    c = (ccy or "").upper()
                    if not c:
                        return
                    try:
                        if c == "USD":
                            r = 1.0
                        else:
                            r = _rate_ccy_to_usd(c) if PRICER_BASE_URL else None
                    except Exception:
                        r = None
                    usd_val = amt_native * r if (r is not None) else 0.0
                    by_ccy[c]["notional"] += amt_native
                    by_ccy[c]["notional_usd"] += usd_val
                    if debug_ccy and c == debug_ccy:
                        debug_details.append({
                            "bucket": bucket,
                            "trade_id": t.get("trade_id"),
                            "side": t.get("position"),
                            "qty": t.get("quantity"),
                            "price": t.get("price"),
                            "strike": t.get("strike"),
                            "trade_currency": t.get("trade_currency") or t.get("underlying_trade_currency"),
                            "settlement_currency": t.get("settlement_currency") or t.get("underlying_settlement_currency"),
                            "ccy": c,
                            "amt_native": amt_native,
                            "amt_usd": usd_val,
                        })

                qty = float(t.get("quantity") or 0)
                side = str(t.get("position") or "").strip().lower()
                sign = 1.0 if side == "buy" else -1.0

                if not is_option:
                    trade_ccy = str(t.get("trade_currency") or "")
                    sett_ccy = str(t.get("settlement_currency") or "")
                    price = float(t.get("price") or 0)
                    # Aggregate BOTH sides: +trade_ccy, -settlement for buys
                    add(trade_ccy, qty * sign)
                    add(sett_ccy, qty * price * (-sign))
                else:
                    # FX Options: aggregate BOTH sides using underlying currencies
                    # + underlying trade currency (quantity * sign)
                    # - underlying settlement currency (quantity * strike * sign inverted)
                    u_trade_ccy = str(t.get("underlying_trade_currency") or "")
                    u_settle_ccy = str(t.get("underlying_settlement_currency") or "")
                    strike = float(t.get("strike") or 0)
                    add(u_trade_ccy, qty * sign)
                    add(u_settle_ccy, qty * strike * (-sign))
            rows_out = [
                {"bucket": bucket, "ccy": k, "notional": v["notional"], "notional_usd": v["notional_usd"]}
                for k, v in by_ccy.items()
            ]
            rows_out.sort(key=lambda r: r["ccy"])  # stable order
            totals = {
                "notional": sum(r["notional"] for r in rows_out),
                "notional_usd": sum(r["notional_usd"] for r in rows_out),
            }
            return rows_out, totals

        fx_rows, fx_totals = agg_rows(fx, is_option=False)
        fxopt_rows, fxopt_totals = agg_rows(fxopt, is_option=True)

        return {
            "status": "success",
            "date": today.isoformat(),
            "fundId": fund_id,
            "data": {
                "FX": fx_rows,
                "FXOptions": fxopt_rows,
                "totals": {
                    "FX": fx_totals,
                    "FXOptions": fxopt_totals,
                },
                **({"debug": {"ccy": debug_ccy, "rows": debug_details}} if debug_ccy else {}),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[PortfolioController] Failed to compute notional summary")
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
        eom = _last_business_day_of_month(today)
        eoy = _last_business_day_of_year(today)

        req_items: list[dict] = []
        enriched = []
        for t in data:
            trade_date = t.get("trade_date") or today
            try:
                if isinstance(trade_date, str):
                    trade_date = datetime.fromisoformat(trade_date[:10]).date()
                elif hasattr(trade_date, "date"):
                    trade_date = trade_date.date()
            except Exception:
                trade_date = today

            def use_trade(ref_date):
                return trade_date >= ref_date

            request_id = f"fxopt-{t.get('trade_id')}"
            need_dates: list[str] = []
            if not use_trade(eoy):
                need_dates.append(eoy.isoformat())
            if not use_trade(eom):
                need_dates.append(eom.isoformat())
            if not use_trade(dtd):
                need_dates.append(dtd.isoformat())

            if need_dates and PRICER_BASE_URL:
                underlying = f"{str(t.get('underlying_trade_currency')).upper()}/{str(t.get('underlying_settlement_currency')).upper()}"
                req_items.append(
                    {
                        "type": "fx_option",
                        "id": request_id,
                        "underlying": underlying,
                        "optionType": t.get("option_type"),
                        "style": t.get("option_style"),
                        "strike": t.get("strike"),
                        "strikeCurrency": t.get("strike_currency"),
                        "maturityDate": str(t.get("maturity_date"))[:10]
                        if t.get("maturity_date")
                        else None,
                        "cut": t.get("cut"),
                        "dates": need_dates,
                    }
                )

            def price_for(
                ref_date, trade_price_value, fetched: dict[str, float] | None
            ):
                if use_trade(ref_date):
                    return trade_price_value
                if fetched is None:
                    return 0 if not PRICER_BASE_URL else None
                return fetched.get(ref_date.isoformat())

            enriched.append(
                {
                    **t,
                    "eoy_date": eoy.isoformat(),
                    "eom_date": eom.isoformat(),
                    "eod_date": dtd.isoformat(),
                    "today_date": today.isoformat(),
                    # keep DB premium intact; store as trade_price for downstream use
                    "trade_price": t.get("premium"),
                    "eoy_price": None,
                    "eom_price": None,
                    "eod_price": None,
                }
            )

        fetched_map = _bulk_price(req_items) if PRICER_BASE_URL else {}
        out = []
        for t in enriched:
            rid = f"fxopt-{t.get('trade_id')}"
            fetched = fetched_map.get(rid)
            # Use TRADE premium as fallback when trade_date >= ref_date
            eoy_price = (
                t["eoy_price"]
                if t["eoy_price"] is not None
                else price_for(eoy, t.get("trade_price"), fetched)
            )
            eom_price = (
                t["eom_price"]
                if t["eom_price"] is not None
                else price_for(eom, t.get("trade_price"), fetched)
            )
            eod_price = (
                t["eod_price"]
                if t["eod_price"] is not None
                else price_for(dtd, t.get("trade_price"), fetched)
            )
            price = (
                fetched.get(t["today_date"])
                if fetched
                else (0 if not PRICER_BASE_URL else None)
            )

            trade_price = t.get("trade_price")
            qty = float(t.get("quantity") or 0)
            side = str(t.get("position") or "").strip().lower()
            dir_factor = 1.0 if side == "buy" else -1.0

            def pnl_since(ref_p):
                if ref_p is None or price is None:
                    return None
                return (float(price) - float(ref_p)) * qty * dir_factor

            # Avoid duplicating DB premium field; expose it as trade_price instead
            base = {k: v for k, v in t.items() if k != "premium"}
            # Construct identifier columns for frontend grouping (use underlying CCYs)
            u_trade_ccy = str(base.get("underlying_trade_currency") or "").upper()
            u_settle_ccy = str(base.get("underlying_settlement_currency") or "").upper()
            maturity = str(base.get("maturity_date") or "")[:10]
            underlying = f"{u_trade_ccy}-{u_settle_ccy}" if u_trade_ccy and u_settle_ccy else None
            # FX Option ticker format: TRADE-SETTLE-<P|C>-<strike:8dp>-YYYY-MM-DD
            opt_type_raw = str(base.get("option_type") or base.get("optionType") or "").strip().upper()
            opt_code = ("P" if opt_type_raw.startswith("P") else ("C" if opt_type_raw.startswith("C") else (opt_type_raw[:1] if opt_type_raw else None)))
            strike_val = base.get("strike")
            strike_fmt = None
            try:
                if strike_val is not None and strike_val != "":
                    strike_fmt = f"{float(strike_val):.8f}"
            except Exception:
                strike_fmt = None
            ticker = None
            if underlying and opt_code and strike_fmt and maturity:
                ticker = f"{underlying}-{opt_code}-{strike_fmt}-{maturity}"
            elif underlying and maturity:
                ticker = f"{underlying}-{maturity}"
            else:
                ticker = underlying
            out.append(
                {
                    **base,
                    "trade_price": trade_price,
                    "eoy_price": eoy_price,
                    "eom_price": eom_price,
                    "eod_price": eod_price,
                    "price": price,
                    # New columns for portfolio table
                    "underlying": underlying,
                    "ticker": ticker,
                    "itd_pnl": pnl_since(trade_price),
                    "ytd_pnl": pnl_since(eoy_price),
                    "mtd_pnl": pnl_since(eom_price),
                    "dtd_pnl": pnl_since(eod_price),
                }
            )

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
