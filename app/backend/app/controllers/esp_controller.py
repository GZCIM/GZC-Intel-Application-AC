import json
import logging
import os
from dotenv import load_dotenv
from flask import Blueprint, jsonify, request
from flask_sock import Sock
from app.util.fix_connection import FixConnection
from flask_cors import CORS

# Initialize WebSocket Blueprint
ws_bp = Blueprint("websocket", __name__)
CORS(ws_bp)
logger = logging.getLogger("fix_controller")

# Load environment variables
load_dotenv()
# Initialize Sock instance
sock = Sock(ws_bp)

# List to keep track of connected WebSocket clients
connected_clients = []

# Initialize the FIX connection
fix_connection = FixConnection(
    host=os.getenv("FIX_SOCKET_HOST"),
    port=int(os.getenv("FIX_ESP_TRADING_PORT", 9100)),
    sender_comp_id=os.getenv("FIX_ESP_SENDER_COMP_ID_MKT"),
    target_comp_id=os.getenv("FIX_TARGET_COMP_ID"),
    tls_cert=os.getenv("FIX_TLS_CERT", "cert_production_alex@gzcim.com.pem"),
    tls_key=os.getenv("FIX_TLS_KEY", "key_production_alex@gzcim.com.pem"),
    log_file="ws_fix_logs.txt",
    msg_seq_num_file="stream_msg_seq_num.txt",
    quote_type="esp",
    redis_host=os.getenv("REDIS_HOST", "localhost"),
    redis_port=int(os.getenv("REDIS_PORT", "6379")),
    redis_db=0,
    redis_password=(os.getenv("REDIS_PASSWORD", None)),
    redis_ssl=(os.getenv("REDIS_SSL", "False")=="True"),
)


# Handle WebSocket connections
@sock.route("/ws_esp")
def websocket(ws):
    print("Client connected")
    connected_clients.append(ws)

    ws.send("Connected to esp price feed")

    # Try to start FIX connection if not already connected
    # In production without FIX certificates, this will fail gracefully
    try:
        if not fix_connection.connected:
            fix_connection.connect()
            fix_connection.logon(
                username=os.getenv("FIX_USERNAME"),
                password=os.getenv("FIX_PASSWORD"),
            )

        # Request streaming prices for EUR/USD with Full Amount options
        fix_connection.request_esp_prices(
            symbols=[
                "EUR/USD",
                # "USD/JPY",
                # "GBP/USD",
                # "USD/CHF",
                # "AUD/USD",
                # "USD/CAD",
            ],
            settl_types=["M1"],  # Full Amount options: 1M, 5M, 10M
            ndf=False,
        )
        ws.send("FIX connection established, streaming prices...")
    except Exception as e:
        print(f"FIX connection failed (expected in container environment): {e}")
        ws.send("WebSocket connected - FIX gateway not available in container environment")

    # Import Redis DAO here to fetch data
    from app.dao.redis_dao import RedisDAO
    import time
    import threading
    
    # Initialize Redis connection for this client
    redis_dao = RedisDAO(
        quote_type="esp",
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", "6379")),
        password=os.getenv("REDIS_PASSWORD"),
        ssl=os.getenv("REDIS_SSL", "False") == "True"
    )
    
    # Function to send Redis quotes
    def send_redis_quotes():
        symbols = ["EUR/USD", "GBP/USD", "USD/JPY"]
        while ws in connected_clients:
            try:
                for symbol in symbols:
                    # Try to get quote from Redis
                    for side in ["Bid", "Ask"]:
                        for provider in ["JPMC", "BAML", "CITI", "GS"]:
                            try:
                                quote_data = redis_dao.get_exchange_rate(
                                    symbol=symbol,
                                    type="SPOT",
                                    quantity=1000000,
                                    side=side,
                                    settlement="SP",
                                    provider=provider
                                )
                                if quote_data and quote_data.get("rate"):
                                    message = {
                                        "type": "quote",
                                        "symbol": symbol,
                                        "price": quote_data.get("rate"),
                                        "side": side,
                                        "provider": provider,
                                        "timestamp": quote_data.get("timestamp"),
                                        "source": "redis"
                                    }
                                    ws.send(json.dumps(message))
                                    break  # Found a quote, move to next side
                            except:
                                continue
                time.sleep(2)  # Update every 2 seconds
            except Exception as e:
                print(f"Error sending Redis quotes: {e}")
                break
    
    # Start background thread to send Redis quotes
    redis_thread = threading.Thread(target=send_redis_quotes, daemon=True)
    redis_thread.start()
    
    # Continuously listen for messages from the client
    while True:
        try:
            data = ws.receive()
            if data:
                print(f"Received from client: {data}")
                ws.send(f"Echo: {data}")
        except Exception as e:
            print(f"Client disconnected: {e}")
            connected_clients.remove(ws)
            break


@ws_bp.route("/api/subscribe_quote", methods=["POST"])
def request_quote():
    try:
        data = request.get_json()
        symbol = data.get("symbol", "EUR/USD")
        settl_type = data.get("settl_type", ["SP"])
        ndf = data.get("ndf", 'false')
        logger.info(f"Received request for quote: {symbol}")
        
        # Try to connect to FIX gateway, but handle gracefully if not available
        try:
            if not fix_connection.connected:
                fix_connection.connect()
                fix_connection.logon(
                    username=os.getenv("FIX_USERNAME"),
                    password=os.getenv("FIX_PASSWORD"),
                )
            fix_connection.request_esp_prices([symbol], [settl_type],ndf=ndf=='true')
            logger.info(f"Quote request sent for {symbol}")
            return jsonify({"message": f"Quote request sent for {symbol}"})
        except Exception as fix_error:
            logger.warning(f"FIX connection not available: {fix_error}")
            return jsonify({
                "message": f"Quote request received for {symbol} - FIX gateway not available in current environment",
                "symbol": symbol,
                "status": "fix_unavailable"
            })
    except Exception as e:
        logger.error(f"Error processing quote request: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# Push price updates to all connected WebSocket clients
def push_prices_to_clients(
    quote_id,
    symbol,
    settlement_type,
    entry_type,
    price,
    quantity,
    time_stamp,
    originator,
):
    """
    Send price updates to all connected WebSocket clients.
    """
    data = {
        "quote_id": quote_id,
        "symbol": symbol,
        "settlement_type": settlement_type,
        "entry_type": entry_type,
        "price": price,
        "quantity": quantity,
        "time_stamp": time_stamp,
        "originator": originator,
    }
    # print(f"Sending price update: {data}")
    json_data = json.dumps(data)
    for client in connected_clients:
        try:
            client.send(json_data)
        except Exception as e:
            print(f"Error sending data to client: {e}")
            connected_clients.remove(client)


# Link the FIX connection price update handler to WebSocket
fix_connection.on_price_update = push_prices_to_clients
