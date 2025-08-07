#!/usr/bin/env python3
"""Script to push Redis quotes to WebSocket clients"""
import json
import time
import os
import redis
from app.controllers.esp_controller import connected_clients
from app.dao.redis_dao import RedisDAO

def send_redis_quotes_to_websocket():
    """Fetch quotes from Redis and send to WebSocket clients"""
    
    # Initialize Redis connection from environment variables
    redis_dao = RedisDAO(
        quote_type="esp",
        host=os.getenv('REDIS_HOST', 'GZCRedis.redis.cache.windows.net'),
        port=int(os.getenv('REDIS_PORT', 6380)),
        password=os.getenv('REDIS_PASSWORD', ''),  # Set via environment variable
        ssl=os.getenv('REDIS_SSL', 'True').lower() == 'true'
    )
    
    symbols = ["EUR/USD", "GBP/USD", "USD/JPY"]
    
    while True:
        for symbol in symbols:
            try:
                # Get latest quote from Redis
                quote_data = redis_dao.get_exchange_rate(
                    symbol=symbol,
                    type="SPOT",
                    quantity=1000000,
                    side="Bid",
                    settlement="SP",
                    provider="JPMC"
                )
                
                if quote_data:
                    # Format as WebSocket message
                    message = {
                        "type": "quote",
                        "symbol": symbol,
                        "bid": quote_data.get("rate"),
                        "ask": quote_data.get("rate"),  # In real app, get actual ask
                        "timestamp": quote_data.get("timestamp"),
                        "source": "redis"
                    }
                    
                    # Send to all connected clients
                    for client in connected_clients:
                        try:
                            client.send(json.dumps(message))
                        except:
                            # Remove disconnected clients
                            connected_clients.remove(client)
                            
            except Exception as e:
                print(f"Error fetching quote for {symbol}: {e}")
                
        time.sleep(1)  # Update every second

if __name__ == "__main__":
    send_redis_quotes_to_websocket()