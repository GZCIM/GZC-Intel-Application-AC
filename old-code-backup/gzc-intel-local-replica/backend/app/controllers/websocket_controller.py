from flask import Blueprint, request
from app import socketio

# Blueprint for WebSocket events
ws_bp = Blueprint("websocket", __name__)


# Handle WebSocket connections
@socketio.on("connect")
def handle_connect():
    print("Client connected")
    # Debug: Log connection details
    print(f"Connection details: {request}")


@socketio.on("disconnect")
def handle_disconnect():
    print("Client disconnected")
    # Debug: Log disconnection details
    print(f"Disconnection details: {request}")
