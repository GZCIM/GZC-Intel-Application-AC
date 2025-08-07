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
    port=int(os.getenv("FIX_ESP_STREAMING_PORT", 9100)),  # Fixed: Use STREAMING port
    sender_comp_id=os.getenv("FIX_ESP_SENDER_COMP_ID_MKT"),
    target_comp_id=os.getenv("FIX_TARGET_COMP_ID"),
    tls_cert="192.168.50.103.pem",
    tls_key="192.168.50.103-key.pem",
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
    print("Client connected - FSS FIX VERSION")
    connected_clients.append(ws)

    # FIXED: Send connection status as proper JSON
    connection_msg = {"type": "status", "message": "Connected to ESP price feed", "version": "fss-fix"}
    ws.send(json.dumps(connection_msg))
    print(f"Sent connection message: {connection_msg}")

    # Start FIX connection if not already connected
    if not fix_connection.connected:
        print("Connecting to FIX gateway...")
        fix_connection.connect()
        fix_connection.logon(
            username=os.getenv("FIX_USERNAME"),
            password=os.getenv("FIX_PASSWORD"),
        )
        fix_msg = {"type": "status", "message": "FIX connection established", "connected": True}
        ws.send(json.dumps(fix_msg))
        print(f"Sent FIX status: {fix_msg}")

    # FIXED: Request streaming prices with correct settlement types
    print("Requesting ESP prices with SP settlement type...")
    fix_connection.request_esp_prices(
        symbols=[
            "EUR/USD",
            "USD/JPY", 
            "GBP/USD",
        ],
        settl_types=["SP"],  # FIXED: Use standard "SP" for Spot instead of "M1"
        ndf=False,
    )

    # Continuously listen for messages from the client
    while True:
        try:
            data = ws.receive()
            if data:
                print(f"Received from client: {data}")
                # FIXED: Process subscription requests without echoing
                try:
                    msg = json.loads(data)
                    if msg.get("type") == "subscribe" and msg.get("symbol"):
                        # Subscribe to the requested symbol
                        print(f"Subscribing to {msg['symbol']}")
                        fix_connection.request_esp_prices(
                            symbols=[msg["symbol"]],
                            settl_types=["SP"],
                            ndf=False
                        )
                        ack_msg = {
                            "type": "subscription_ack",
                            "symbol": msg["symbol"],
                            "status": "subscribed"
                        }
                        ws.send(json.dumps(ack_msg))
                        print(f"Sent subscription ack: {ack_msg}")
                except json.JSONDecodeError:
                    print("Received non-JSON message, ignoring")
                    pass  # Ignore non-JSON messages
        except Exception as e:
            print(f"Client disconnected: {e}")
            if ws in connected_clients:
                connected_clients.remove(ws)
            break


@ws_bp.route("/api/subscribe_quote", methods=["POST"])
def request_quote():
    try:
        data = request.get_json()
        symbol = data.get("symbol", "EUR/USD")
        settl_type = data.get("settl_type", "SP")  # FIXED: Default to "SP"
        ndf = data.get("ndf", 'false')
        logger.info(f"Received request for quote: {symbol}")
        if not fix_connection.connected:
            fix_connection.connect()
            fix_connection.logon(
                username=os.getenv("FIX_USERNAME"),
                password=os.getenv("FIX_PASSWORD"),
            )
        # FIXED: Ensure settl_type is a list
        if isinstance(settl_type, str):
            settl_type = [settl_type]
        fix_connection.request_esp_prices([symbol], settl_type, ndf=ndf=='true')
        logger.info(f"Quote request sent for {symbol}")
        return jsonify({"message": f"Quote request sent for {symbol}"})
    except Exception as e:
        logger.error(f"Error sending quote request: {e}", exc_info=True)
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
        "type": "quote",  # FIXED: Added type field for frontend parsing
        "quote_id": quote_id,
        "symbol": symbol,
        "settlement_type": settlement_type,
        "entry_type": entry_type,
        "price": price,
        "quantity": quantity,
        "time_stamp": time_stamp,
        "originator": originator,
    }
    print(f"Pushing market data: {data}")
    json_data = json.dumps(data)
    for client in connected_clients:
        try:
            client.send(json_data)
            print(f"Sent quote to client: {symbol} @ {price}")
        except Exception as e:
            print(f"Error sending data to client: {e}")
            if client in connected_clients:
                connected_clients.remove(client)


# Link the FIX connection price update handler to WebSocket
fix_connection.on_price_update = push_prices_to_clients

print("ESP Controller loaded - FSS FIX VERSION with JSON messages")