#!/usr/bin/env python3
import redis
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')

# Get Redis configuration
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD')
REDIS_SSL = os.getenv('REDIS_SSL', 'False').lower() == 'true'

print(f"Connecting to Redis at {REDIS_HOST}:{REDIS_PORT} (SSL: {REDIS_SSL})")

try:
    # Connect to Redis
    r = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        ssl=REDIS_SSL,
        decode_responses=True
    )
    
    # Test connection
    r.ping()
    print("✅ Connected to Redis successfully!")
    
    # Check for any FX quotes
    keys = r.keys('exchange_rate:*EUR/USD*')
    print(f"\nFound {len(keys)} EUR/USD related keys")
    
    if keys:
        for key in keys[:5]:  # Show first 5
            value = r.get(key)
            print(f"  {key}: {value}")
    
except Exception as e:
    print(f"❌ Redis connection failed: {e}")