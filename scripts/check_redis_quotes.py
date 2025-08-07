#!/usr/bin/env python3
"""
Check Redis for existing quote information
"""
import redis
import json
import sys
import os

# Redis connection details
REDIS_HOST = "GZCRedis.redis.cache.windows.net"
REDIS_PORT = 6380
REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", "")
REDIS_SSL = True

def check_redis_quotes():
    """Connect to Redis and retrieve existing quote information"""
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
        
        # Check connection
        print(f"Connecting to Redis at {REDIS_HOST}:{REDIS_PORT}...")
        r.ping()
        print("✅ Successfully connected to Redis!")
        
        # Check for existing exchange rate keys
        print("\nSearching for exchange rate keys...")
        keys = r.keys("exchange_rate:*")
        
        if keys:
            print(f"Found {len(keys)} exchange rate keys:")
            # Show first 5 keys as examples
            for i, key in enumerate(keys[:5]):
                value = r.get(key)
                if value:
                    quote_info = json.loads(value)
                    print(f"  {i+1}. {key}")
                    print(f"     Rate: {quote_info.get('rate', 'N/A')}, Time: {quote_info.get('timestamp', 'N/A')}")
            
            if len(keys) > 5:
                print(f"  ... and {len(keys) - 5} more keys")
        else:
            print("No exchange rate keys found in Redis")
            
        # Check for any keys at all
        all_keys = r.keys("*")
        print(f"\nTotal keys in Redis: {len(all_keys)}")
        
        # Show key patterns
        if all_keys:
            patterns = {}
            for key in all_keys[:100]:  # Sample first 100
                prefix = key.split(":")[0] if ":" in key else key
                patterns[prefix] = patterns.get(prefix, 0) + 1
            
            print("\nKey patterns found:")
            for pattern, count in sorted(patterns.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"  {pattern}: {count} keys")
        
        return True
        
    except redis.ConnectionError as e:
        print(f"❌ Failed to connect to Redis: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = check_redis_quotes()
    sys.exit(0 if success else 1)