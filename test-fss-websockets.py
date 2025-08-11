#!/usr/bin/env python3
"""
Test script for FSS WebSocket connectivity
"""
import asyncio
import websockets
import json
import sys

FSS_ENDPOINT = "wss://fxspotstream.delightfulground-653e61be.eastus.azurecontainerapps.io"

async def test_websocket(endpoint_name, path):
    """Test a specific WebSocket endpoint"""
    url = f"{FSS_ENDPOINT}{path}"
    print(f"Testing {endpoint_name} at {url}")
    
    try:
        async with websockets.connect(url) as websocket:
            print(f"✅ {endpoint_name}: Connection established")
            
            # Wait for initial message
            try:
                initial_message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"   Initial message: {initial_message}")
            except asyncio.TimeoutError:
                print(f"   No initial message received (timeout)")
            
            # Send a test message
            test_message = json.dumps({"type": "test", "message": f"Hello from {endpoint_name} test"})
            await websocket.send(test_message)
            print(f"   Sent: {test_message}")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"   Response: {response}")
                return True
            except asyncio.TimeoutError:
                print(f"   No response received (timeout)")
                return True  # Connection was still successful
                
    except Exception as e:
        print(f"❌ {endpoint_name}: Connection failed - {e}")
        return False

async def main():
    """Test all FSS WebSocket endpoints"""
    print("🚀 Testing FSS WebSocket Endpoints")
    print("=" * 50)
    
    endpoints = [
        ("ESP WebSocket", "/ws_esp"),
        ("RFS WebSocket", "/ws_rfs"), 
        ("Execution WebSocket", "/ws_execution")
    ]
    
    results = []
    for name, path in endpoints:
        result = await test_websocket(name, path)
        results.append((name, result))
        print()  # Add spacing between tests
    
    print("=" * 50)
    print("📊 Test Summary:")
    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {name}: {status}")
    
    all_passed = all(result for _, result in results)
    if all_passed:
        print("\n🎉 All WebSocket endpoints are accessible!")
        sys.exit(0)
    else:
        print("\n⚠️  Some WebSocket endpoints failed")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())