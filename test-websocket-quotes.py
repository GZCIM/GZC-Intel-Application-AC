import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:5100/ws_esp"
    print(f"Connecting to {uri}")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected\!")
            
            # Listen for first 10 messages
            for i in range(10):
                message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"Message {i+1}: {message}")
                
                # Try to parse as JSON if it looks like JSON
                if message.startswith('{'):
                    try:
                        data = json.loads(message)
                        print(f"  Parsed: {json.dumps(data, indent=2)}")
                    except:
                        pass
                        
    except asyncio.TimeoutError:
        print("Timeout waiting for messages")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test_websocket())
