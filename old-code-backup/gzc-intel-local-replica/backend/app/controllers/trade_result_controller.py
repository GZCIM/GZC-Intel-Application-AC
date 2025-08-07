from flask import Blueprint
from flask_sock import Sock
import json
from flask_cors import CORS

# Create Blueprint
tr_bp = Blueprint("execution", __name__)
CORS(tr_bp)
sock = Sock(tr_bp)

# List of connected WebSocket clients
connected_clients = []


# WebSocket route for execution results
@sock.route("/ws_execution")
def websocket_execution(ws):
    print("Client connected for execution results")
    connected_clients.append(ws)
    ws.send(
        json.dumps({"message": "Connected to execution result feed"})
    )

    while True:
        try:
            data = ws.receive()
            if data:
                print(f"Received from client: {data}")
        except Exception as e:
            print(f"Client disconnected: {e}")
            connected_clients.remove(ws)
            break


# Function to push execution results to all WebSocket clients
def push_execution_result(result):

    for client in connected_clients:
        try:
            client.send(json.dumps(result))
        except Exception as e:
            print(f"Error sending data to client: {e}")
            connected_clients.remove(client)
