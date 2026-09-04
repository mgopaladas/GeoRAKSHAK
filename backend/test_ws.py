import asyncio
import websockets
import json

async def test_ws():
    uri = "ws://127.0.0.1:8000/ws/telemetry"
    print(f"Connecting to {uri}")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected successfully!")
            print("Waiting for first payload...")
            msg = await websocket.recv()
            data = json.loads(msg)
            print("Success! Received:", list(data.keys()))
    except Exception as e:
        print("FAILED TO CONNECT OR RECV:", e)

if __name__ == "__main__":
    asyncio.run(test_ws())
