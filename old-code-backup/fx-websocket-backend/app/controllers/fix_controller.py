from flask import Blueprint, request, jsonify
from app.util.fix_connection import FixConnection
from dotenv import load_dotenv
import os
import logging

# Initialize logger
logger = logging.getLogger("fix_controller")

# Load environment variables
load_dotenv()

# Blueprint for FIX routes
fix_bp = Blueprint("fix", __name__)

# Initialize FIX connections
fix_connection = FixConnection(
    host=os.getenv("FIX_SOCKET_HOST"),
    port=int(os.getenv("FIX_TRADING_PORT", 9110)),
    sender_comp_id=os.getenv("FIX_SENDER_COMP_ID"),
    target_comp_id=os.getenv("FIX_TARGET_COMP_ID"),
)


@fix_bp.route("/start", methods=["POST"])
def start_fix():
    try:
        logger.info("Received request to start FIX connection.")
        # fix_connection.disconnect()
        fix_connection.connect()
        fix_connection.logon(
            username=os.getenv("FIX_USERNAME"),
            password=os.getenv("FIX_PASSWORD"),
        )
        logger.info("Successfully started FIX connection.")
        return jsonify({"message": "FIX connection started"})
    except Exception as e:
        logger.error(
            f"Error starting FIX connection: {e}", exc_info=True
        )
        return jsonify({"error": str(e)}), 500


@fix_bp.route("/get_quote", methods=["POST"])
def get_quote():
    try:
        data = request.get_json()
        symbol = data.get("symbol", "EUR/USD")
        logger.info(f"Received request for quote: {symbol}")
        fix_connection.request_quote(symbol)
        logger.info(f"Quote request sent for {symbol}")
        return jsonify({"message": f"Quote request sent for {symbol}"})
    except Exception as e:
        logger.error(f"Error sending quote request: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@fix_bp.route("/stop", methods=["POST"])
def stop_fix():
    try:
        logger.info("Received request to stop FIX connection.")
        fix_connection.disconnect()
        logger.info("Successfully stopped FIX connection.")
        return jsonify({"message": "FIX connection stopped"})
    except Exception as e:
        logger.error(
            f"Error stopping FIX connection: {e}", exc_info=True
        )
        return jsonify({"error": str(e)}), 500
