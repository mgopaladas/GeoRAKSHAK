from fastapi import WebSocket
from typing import List

class WebSocketManager:
    """
    Manages active WebSocket connections for real-time telemetry and alerts.
    Utilizes a generic pub/sub model to broadcast per-second data to all active government dashboards.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """
        Broadcast a message to all connected clients.
        Failed connections are automatically dropped to prevent lag.
        """
        stale_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                # Connection dropped or invalid
                stale_connections.append(connection)
        
        # Cleanup
        for stale in stale_connections:
            self.disconnect(stale)

# Singleton instance exported for use across the FastAPI application
manager = WebSocketManager()
