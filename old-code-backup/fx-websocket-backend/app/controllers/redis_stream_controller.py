"""Redis streaming controller to serve quotes directly from Redis"""
import json
import threading
import time
from flask import Blueprint
from flask_sock import Sock
import redis
import os
import logging

logger = logging.getLogger(__name__)

# Blueprint for Redis streaming
redis_bp = Blueprint("redis_stream", __name__)
sock = Sock(redis_bp)

# Connected clients
redis_clients = []

# Redis connection
r = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    password=os.getenv('REDIS_PASSWORD'),
    ssl=os.getenv('REDIS_SSL', 'False') == 'True',
    decode_responses=True
)

def stream_redis_quotes():
    """Background thread to stream quotes from Redis"""
    symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY']
    
    while True:
        try:
            if redis_clients:  # Only query if clients connected
                for symbol in symbols:
                    # Get latest ESP quotes
                    pattern = f'exchange_rate:esp:{symbol}:SPOT:*:SP:*'
                    keys = r.keys(pattern)[:2]  # Get 2 providers
                    
                    for key in keys:
                        try:
                            data = r.get(key)
                            if data:
                                quote_data = json.loads(data)
                                parts = key.split(':')
                                
                                # Format as ESP quote message
                                msg = {
                                    "type": "esp_quote",
                                    "symbol": parts[2],
                                    "quote_type": parts[3],
                                    "amount": parts[4],
                                    "side": parts[5],
                                    "provider": parts[7],
                                    "bid": quote_data['rate'] if parts[5] == 'Bid' else None,
                                    "ask": quote_data['rate'] if parts[5] == 'Ask' else None,
                                    "timestamp": quote_data['timestamp']
                                }
                                
                                # Send to all connected clients
                                disconnected = []
                                for client in redis_clients:
                                    try:
                                        client.send(json.dumps(msg))
                                    except:
                                        disconnected.append(client)
                                
                                # Remove disconnected clients
                                for client in disconnected:
                                    if client in redis_clients:
                                        redis_clients.remove(client)
                                        
                        except Exception as e:
                            logger.error(f"Error processing quote: {e}")
            
            time.sleep(1)  # Poll every second
            
        except Exception as e:
            logger.error(f"Redis streaming error: {e}")
            time.sleep(5)

@sock.route("/ws_redis_stream")
def redis_websocket(ws):
    """WebSocket endpoint for Redis quote streaming"""
    print("Client connected to Redis stream")
    redis_clients.append(ws)
    
    # Send initial connection message
    ws.send(json.dumps({
        "type": "status",
        "message": "Connected to Redis quote stream"
    }))
    
    # Keep connection alive
    try:
        while True:
            message = ws.receive()
            if message:
                # Handle ping/pong
                data = json.loads(message)
                if data.get("type") == "ping":
                    ws.send(json.dumps({"type": "pong"}))
    except:
        pass
    finally:
        if ws in redis_clients:
            redis_clients.remove(ws)
        print("Client disconnected from Redis stream")

# Start background streaming thread
threading.Thread(target=stream_redis_quotes, daemon=True).start()
print("Redis streaming controller initialized")