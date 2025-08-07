import atexit
from datetime import date, datetime
import json
from flask import Blueprint, request, jsonify
from sqlalchemy import create_engine
from app.util.fix_connection import FixConnection
from dotenv import load_dotenv
import os
import logging
from flask_cors import CORS
from app.controllers.trade_result_controller import (
    push_execution_result,
)
from flask_sock import Sock
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
# from app.dao.virtual_fx_trade_dao import VirtiualFxTradeDAO
# from app.dao.trade_inventory_dao import TradeInventoryDAO


# Initialize logger
logger = logging.getLogger("fix_controller")

# Load environment variables
load_dotenv()

# Blueprint for FIX routes
fix_bp = Blueprint("fix", __name__)
CORS(fix_bp)
sock = Sock(fix_bp)
# List to keep track of connected WebSocket clients
connected_clients = []


@sock.route("/ws_rfs")
def websocket(ws):
    print("Client connected - RFS FIX VERSION")
    connected_clients.append(ws)
    
    # FIXED: Send connection status as proper JSON
    connection_msg = {"type": "status", "message": "Connected to RFS price feed", "version": "rfs-fix"}
    ws.send(json.dumps(connection_msg))
    print(f"Sent RFS connection message: {connection_msg}")
    
    while True:
        try:
            data = ws.receive()
            if data:
                print(f"Received from client: {data}")
                # FIXED: Process messages without echoing
                try:
                    msg = json.loads(data)
                    if msg.get("type") == "rfs_request" and msg.get("symbol"):
                        # Handle RFS requests
                        ack_msg = {
                            "type": "rfs_ack",
                            "symbol": msg["symbol"],
                            "status": "request_received"
                        }
                        ws.send(json.dumps(ack_msg))
                        print(f"Sent RFS ack: {ack_msg}")
                except json.JSONDecodeError:
                    print("Received non-JSON message, ignoring")
                    pass  # Ignore non-JSON messages
        except Exception as e:
            print(f"Client disconnected: {e}")
            if ws in connected_clients:
                connected_clients.remove(ws)
            break


def push_prices_to_clients(
    symbol,
    type,
    currency,
    provider,
    quote_req_id,
    bid_price,
    ask_price,
    net_price,
    forward_price,
    spot_price,
    fwd_points,
    order_qty,
    settlement_type,
    side,
    md_entry_type,
    depth,
    timestamp=None,
    quote_id=None,
    value_date=None,
):
    """
    Send price updates to all connected WebSocket clients.
    """
    data = {
        "type": "rfs_quote",  # FIXED: Added type field for frontend parsing
        "symbol": symbol,
        "currency": currency,
        "provider": provider,
        "quote_req_id": quote_req_id,
        "bid_price": bid_price,
        "ask_price": ask_price,
        "net_price": net_price,
        "forward_price": forward_price,
        "spot_price": spot_price,
        "fwd_points": fwd_points,
        "order_qty": order_qty,
        "settlement_type": settlement_type,
        "side": side,
        "md_entry_type": md_entry_type,
        "depth": depth,
        "timestamp": timestamp,
        "quote_id": quote_id,
        "value_date": value_date,
        "quote_type": type,
    }
    print(f"Pushing RFS market data: {data}")
    json_data = json.dumps(data)
    for client in connected_clients:
        try:
            client.send(json_data)
            print(f"Sent RFS quote to client: {symbol} @ {bid_price}/{ask_price}")
        except Exception as e:
            print(f"Error sending data to client: {e}")
            if client in connected_clients:
                connected_clients.remove(client)


fix_connection_stream = FixConnection(
    host=os.getenv("FIX_SOCKET_HOST"),
    port=int(os.getenv("FIX_RFS_STREAMING_PORT", 9100)),
    sender_comp_id=os.getenv("FIX_RFS_SENDER_COMP_ID_MKT"),
    target_comp_id=os.getenv("FIX_TARGET_COMP_ID"),
    tls_cert="192.168.50.103.pem",
    tls_key="192.168.50.103-key.pem",
    log_file="fix_rfs_logs.txt",
    msg_seq_num_file="msg_seq_num.txt",
    quote_type="rfs",
    redis_host=os.getenv("REDIS_HOST", "localhost"),
    redis_port=int(os.getenv("REDIS_PORT", "6379")),
    redis_db=0,
    redis_password=(os.getenv("REDIS_PASSWORD", None)),
    redis_ssl=(os.getenv("REDIS_SSL", "False") == "True"),
)
# Link the FIX connection price update handler to WebSocket
fix_connection_stream.on_price_update = push_prices_to_clients
DB_URL = os.getenv("DB_URL")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DRIVER = os.getenv("DB_DRIVER")

# Construct the database URI
DATABASE_URL = (
    f"""mssql+pyodbc://{DB_USER}:{DB_PASSWORD}@{DB_URL}/{DB_NAME}?driver={DB_DRIVER}"""
)

fix_connection_trade = FixConnection(
    host=os.getenv("FIX_SOCKET_HOST"),
    port=int(os.getenv("FIX_RFS_TRADING_PORT", 9100)),
    sender_comp_id=os.getenv("FIX_RFS_SENDER_COMP_ID_TRD"),
    target_comp_id=os.getenv("FIX_TARGET_COMP_ID"),
    tls_cert="192.168.50.103.pem",
    tls_key="192.168.50.103-key.pem",
    log_file="fix_logs.txt",
    msg_seq_num_file="trade_rfs_msg_seq_num.txt",
    db_url=DATABASE_URL,
)

# Initialize DAOs
# con = create_engine(DATABASE_URL, pool_pre_ping=True)
# virtual_fx_trade_dao = VirtiualFxTradeDAO(con)
# trade_inventory_dao = TradeInventoryDAO(con)


@atexit.register
def close_fix_connection():
    logger.info("Closing FIX connection on app shutdown.")
    fix_connection_stream.logout()
    fix_connection_stream.disconnect()
    fix_connection_trade.logout()
    fix_connection_trade.disconnect()


@fix_bp.route("/api/start", methods=["POST"])
def start_fix():
    try:
        logger.info("Received request to start FIX connection.")
        fix_connection_stream.connect()
        fix_connection_stream.logon(
            username=os.getenv("FIX_USERNAME"),
            password=os.getenv("FIX_PASSWORD"),
        )
        logger.info("Successfully started FIX connection rfs.")
        return jsonify({"message": "FIX connection started"})
    except Exception as e:
        logger.error(f"Error starting FIX connection: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

def calculate_near_fixing_settlments_dates_from_settlement(settlement_type: str):
    """
    For NDF/NDS quotes, compute:
    - near_settl_date: based on tenor from trade date
    - near_fixing_date: usually 2 business days before settlement
    """
    try:
        tenor_map = {
            "SP": 0,
            "TOM": 1,
            "TD": 0,
            "ON": 0,
            "TN": 1,
            "SN": 2,
            "M1": 1,
            "M3": 3,
            "M6": 6,
            "Y1": 12,
        }

        today = datetime.utcnow().date()
        spot = today + timedelta(days=2)  # T+2 for spot

        # Use M1 = 1 month, M3 = 3 months, etc.
        near_settl_date = spot + relativedelta(months=tenor_map.get(settlement_type, 0))

        # Default fixing = 2 days before settlement
        near_fixing_date = near_settl_date - timedelta(days=2)

        return near_fixing_date.strftime("%Y%m%d"), near_settl_date.strftime("%Y%m%d")

    except Exception as e:
        raise ValueError(f"Failed to calculate near fixing/settlement dates for '{settlement_type}': {e}")

@fix_bp.route("/api/request_quote", methods=["POST"])
def request_quote():
    try:
        data = request.get_json()
        symbol = data.get("symbol", "EUR/USD")
        quantity = data.get("quantity", "1000000")
        side = data.get("side", "1")  # 1 for buy, 2 for sell
        settl_type = data.get("settl_type", "SP")
        currency = data.get("currency", "USD")
        is_swap = data.get("is_swap", False)
        second_settl_type = data.get("second_settl_type")
        ndf = data.get("ndf", False)  # NDF flag

        logger.info(
            f"Received request for quote: {symbol}, NDF: {ndf}, Swap: {is_swap}"
        )

        if not fix_connection_stream.connected:
            fix_connection_stream.connect()
            fix_connection_stream.logon(
                username=os.getenv("FIX_USERNAME"),
                password=os.getenv("FIX_PASSWORD"),
            )
        # If it's a swap quote, calculate near/far dates
        if is_swap:
            # For swap quotes, pass NDF flag to the swap quote method
            if ndf:
                near_fixing_date,near_settl_date = calculate_near_fixing_settlments_dates_from_settlement(settl_type)


            quote_req_id = fix_connection_stream.request_swap_quote(
                symbol,
                quantity,
                settl_type,
                second_settl_type,
                side,
                currency,
                None,
                ndf,
                near_settl_date=near_settl_date if ndf else None,  # Optional: can be passed if needed
                near_fixing_date=near_fixing_date if ndf else None,  # Optional: can be passed if needed
            )
            logger.info(
                f"Swap quote request sent for {symbol} {quantity} {settl_type} {second_settl_type} {side} {currency}, NDF: {ndf}"
            )
        else:
            # For regular quotes, pass NDF flag to the request_quote method
            quote_req_id = fix_connection_stream.request_quote(
                symbol, quantity, settl_type, side, currency, ndf
            )
            logger.info(
                f"{'NDF' if ndf else 'Spot/Forward'} quote request sent for {symbol} {quantity}, Settlement: {settl_type}"
            )

        return jsonify(
            {
                "message": f"Quote request sent for {symbol} ({'NDF' if ndf else 'Regular'})",
                "quote_req_id": quote_req_id,
                "ndf": ndf,
            }
        )
    except Exception as e:
        logger.error(f"Error sending quote request: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@fix_bp.route("/api/get_market_data", methods=["GET"])
def request_market_data():
    try:
        symbol = request.args.get("symbol", "EUR/USD")
        logger.info(f"Received request for market data: {symbol}")
        market_data = fix_connection_stream.get_quotes_df(symbol)
        logger.info(f"Market data received for {symbol}: {market_data}")
        return jsonify({"market_data": market_data.to_dict(orient="records")})
    except Exception as e:
        logger.error(f"Error getting market data: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@fix_bp.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "up"})


@fix_bp.route("/api/stop", methods=["POST"])
def stop_fix():
    try:
        logger.info("Received request to stop FIX connection.")
        fix_connection_stream.logout()
        fix_connection_stream.disconnect()
        logger.info("Successfully stopped FIX connection.")
        return jsonify({"message": "FIX connection stopped"})
    except Exception as e:
        logger.error(f"Error stopping FIX connection: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@fix_bp.route("/api/request_trade_rfs", methods=["POST"])
def request_trade():
    # {'symbol': 'EUR/USD', 'currency': 'EUR', 'provider': 'JPMC', 'quote_req_id': '01bbe8e4-13aa-4ac1-93d5-843e8243744b', 'bid_price': '1.18545', 'ask_price': 'N/A', 'net_price': '1.18108', 'order_qty': '1000000', 'settlement_type': 'SP', 'side': '2', 'md_entry_type': 'H', 'depth': 'N/A', 'timestamp': '20250205-13:59:45.556', 'quote_id': '62awuVfEx.1M-', 'value_date': '20250207'}
    try:
        data = request.get_json()
        symbol = data.get("symbol", "EUR/USD")
        type = data.get("type", "SPOT")
        currency = data.get("currency", "EUR")
        quote_req_id = data.get("quote_req_id")
        side = data.get("side")
        price = data.get("bid_price") if side == "1" else data.get("ask_price")
        order_qty = data.get("order_qty")
        settlement_type = data.get("settlement_type")
        provider = data.get("provider")
        quote_id = data.get("quote_id")
        value_date = data.get("value_date")
        logger.info(
            f"Received request for trade: {symbol} {side} {order_qty} {price} {currency} {settlement_type} {value_date} {quote_id} {quote_req_id}"
        )
        virtual = data.get("virtual", False)
        if virtual:
            # TEMPORARILY DISABLED: Database manipulations
            logger.info(
                "DB operations temporarily disabled - would have inserted virtual trade"
            )
            logger.info(
                f"Virtual trade data: symbol={symbol}, side={side}, qty={order_qty}, price={price}"
            )

            # TODO: Re-enable when needed
            # trade = virtual_fx_trade_dao.insert_virtual_fx_trade(
            #     execution_id=None,
            #     order_id=quote_id,
            #     symbol=symbol,
            #     side=int(side),
            #     order_qty=int(order_qty),
            #     price=float(price),
            #     trade_date=date.today(),
            #     settl_date=datetime.strptime(
            #         value_date, "%Y%m%d"
            #     ).date(),
            #     currency=currency,
            #     counterparty_id=provider,
            #     fund_id=7,  # Test
            #     trader="Test",
            #     note="Test",
            #     mod_user="GZC",
            # )
            # inventory_record = (
            #     trade_inventory_dao.insert_virtual_trade_to_inventory(
            #         trade_id=int(trade["Id"][0]),
            #         trade_date=date.today(),
            #         symbol=symbol,
            #         expiration_or_maturity_date=datetime.strptime(
            #             value_date, "%Y%m%d"
            #         ).date(),
            #         original_id=int(trade["Id"][0]),
            #         trade_event=1,  # New Trade
            #         fund=7,  # Test
            #         position="Buy" if side == "1" else "Sell",
            #         trader="MT",
            #         mod_user="GZC",
            #     )
            # )
        else:
            if not fix_connection_trade.connected:
                fix_connection_trade.connect()
            fix_connection_trade.logon(
                username=os.getenv("FIX_USERNAME"),
                password=os.getenv("FIX_PASSWORD"),
            )

            fix_connection_trade.request_rfs_trade(
                symbol,
                side,
                order_qty,
                price,
                currency,
                settlement_type,
                value_date,
                quote_id,
                quote_req_id,
                None,
                "1",
                type,
            )
            logger.info(
                f"Trade request sent for {symbol} {side} {order_qty} {price} {currency} {settlement_type} {value_date} {quote_id} {quote_req_id}"
            )
        return jsonify(
            {"message": f"Trade request sent for {symbol} {side} {order_qty}"}
        )
    except Exception as e:
        logger.error(f"Error requesting trade: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


def calculate_swap_dates_from_settlement(settlement_type, settlement_type2):
    """Parse compound settlement type like 'M1_M3' into near/far dates."""
    try:
        # Basic tenor map
        tenor_map = {
            "SP": 0,
            "TOM": 1,
            "TD": 0,
            "ON": 0,
            "TN": 1,
            "SN": 2,
            "M1": 1,
            "M3": 3,
            "M6": 6,
            "Y1": 12,
        }


        t0 = datetime.utcnow().date()
        spot = t0 + timedelta(days=2)  # Standard T+2 spot convention

        near_date = spot + relativedelta(months=tenor_map.get(settlement_type, 0))
        far_date = spot + relativedelta(months=tenor_map.get(settlement_type2, 0))

        return near_date.strftime("%Y%m%d"), far_date.strftime("%Y%m%d")
    except Exception as e:
        raise ValueError(f"Failed to parse settlement string '{settlement_type}': {e}")


@fix_bp.route("/api/request_swap_trade_rfs", methods=["POST"])
def request_swap_trade():
    try:
        data = request.get_json()
        symbol = data.get("symbol", "EUR/USD")
        currency = data.get("currency", "EUR")
        quote_req_id = data.get("quote_req_id")
        side = data.get("side")
        order_qty = data.get("order_qty")
        spot_price = (
            data.get("bid_price")
            if data.get("bid_price") != "N/A"
            else data.get("ask_price")
        ) if data.get("type") == "SWAP" else data.get("spot_rate")
        forward_price = data.get("forward_price")
        if data.get("type") == "NDS":
            spot_price = data.get("spot_price")
            forward_price = (
                data.get("bid_price")
                if data.get("bid_price") != "N/A"
                else data.get("ask_price")
            )

        settlement_type = data.get("settlement_type", "M1_M3")
        quote_id = data.get("quote_id")
        trade_request_id = data.get("trade_request_id")
        trade_request_side = data.get("trade_request_side", "1")
        allocations = data.get("allocations", [])
        type = data.get("type", "SWAP")
        value_date = data.get("value_date")  # typically tag 64 (far)
        near_leg_date = data.get("near_leg_date")  # optional: tag 6203 if present

        if value_date and near_leg_date:
            near_date, far_date = near_leg_date, value_date
        else:
            # spit setlment type _
            settlement_type_parts = settlement_type.split("_")
            if len(settlement_type_parts) == 2:
                settlement_type, settlement_type2 = settlement_type_parts
            else:
                settlement_type2 = settlement_type
            near_date, far_date = calculate_swap_dates_from_settlement(settlement_type, settlement_type2)

        logger.info(
            f"Swap trade request: {symbol} {side} {order_qty} SPOT={spot_price} FWD={forward_price} {settlement_type} NEAR={near_date} FAR={far_date}"
        )

        if not fix_connection_trade.connected:
            fix_connection_trade.connect()
        fix_connection_trade.logon(
            username=os.getenv("FIX_USERNAME"),
            password=os.getenv("FIX_PASSWORD"),
        )

        fix_connection_trade.request_rfs_swap_trade(
            symbol=symbol,
            side=side,
            total_quantity=order_qty,
            spot_price=spot_price,
            forward_price=forward_price,
            near_date=near_date,
            far_date=far_date,
            quote_id=quote_id,
            quote_req_id=quote_req_id,
            trade_request_id=trade_request_id,
            trade_request_side=trade_request_side,
            currency=currency,
            settlement_type=settlement_type,
            type=type,
        )

        return jsonify({"message": f"Swap trade request sent for {symbol}"})
    except Exception as e:
        logger.error(f"Error requesting swap trade: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

print("RFS Controller loaded - RFS FIX VERSION with JSON messages")