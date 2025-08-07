#!/usr/bin/env python3
"""
Check Redis quote structure to understand available data
"""
import redis
import json
import os

# Redis connection details
REDIS_HOST = "GZCRedis.redis.cache.windows.net"
REDIS_PORT = 6380
REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", "")
REDIS_SSL = True

def analyze_redis_quotes():
    """Analyze Redis quote structure"""
    try:
        # Validate environment variable
        if not REDIS_PASSWORD:
            print("❌ REDIS_PASSWORD environment variable is required")
            print("Set it with: export REDIS_PASSWORD='your-redis-password'")
            return False
        # Connect to Redis
        r = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD,
            ssl=REDIS_SSL,
            decode_responses=True
        )
        
        print("Analyzing Redis quote structure...\n")
        
        # Get all exchange rate keys
        keys = r.keys("exchange_rate:*")[:20]  # Sample first 20
        
        # Parse key structure
        structures = {}
        for key in keys:
            parts = key.split(":")
            if len(parts) >= 7:
                quote_type = parts[1]  # esp or rfs
                symbol = parts[2]
                rate_type = parts[3]  # SPOT, FORWARD, etc
                quantity = parts[4]
                side = parts[5]  # Bid or Ask
                settlement = parts[6]
                provider = parts[7] if len(parts) > 7 else "Unknown"
                
                structure = f"{quote_type}:{symbol}:{rate_type}:{side}:{settlement}:{provider}"
                if structure not in structures:
                    structures[structure] = []
                structures[structure].append(quantity)
        
        print("Found quote patterns:")
        for pattern, quantities in structures.items():
            print(f"\n{pattern}")
            unique_quantities = list(set(quantities))[:5]
            print(f"  Quantities: {', '.join(unique_quantities)}")
            
        # Get a few actual values
        print("\n\nSample quote values:")
        for i, key in enumerate(keys[:5]):
            value = r.get(key)
            if value:
                quote = json.loads(value)
                print(f"\n{key}")
                print(f"  Rate: {quote.get('rate')}")
                print(f"  Timestamp: {quote.get('timestamp')}")
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    analyze_redis_quotes()