import asyncio
import random
import json
import os
import numpy as np
from datetime import datetime
from api.database import SessionLocal
from api.models import RiskZone, SensorStation
from iot.websocket_manager import manager
from risk.trigger_model import GradientBoostedTrigger

class TelemetryIngestor:
    def __init__(self):
        self.model = GradientBoostedTrigger()
        self.is_running = False
        self.stations_cache = []

    def _refresh_cache(self):
        # We fetch active stations deployed via seed data statically to avoid needing Postgres
        # To keep the demo fast, we'll cache the zone susceptibility as well
        self.stations_cache = []
        for i in range(120):
            sid = f"SYN-{str(i).zfill(3)}"
            self.stations_cache.append({
                "station_id": sid,
                "zone_id": i + 1,
                "susceptibility": random.uniform(0.1, 0.95),
                "slope_deg": random.uniform(15.0, 45.0),
                "metadata": {
                    "name": f"Station {sid}",
                    "latitude": 25.0 + random.uniform(-2, 5),
                    "longitude": 90.0 + random.uniform(-2, 5)
                },
                "current": {
                    "rainfall_1h": random.uniform(0, 1) if i % 15 != 0 else random.uniform(5, 12),
                    "rainfall_24h": random.uniform(0, 8) if i % 15 != 0 else random.uniform(20, 60),
                    "soil_moisture": random.uniform(20, 50),
                    "tilt": random.uniform(0.01, 0.05),
                }
            })

    def _init_model(self):
        """Pre-fit the model using synthetic data to allow real-time predictions without crashing"""
        print("Initializing Edge AI Trigger model...")
        X_dummy = np.random.rand(1000, 10)
        # Create a realistic correlation: High Rainfall (col 2,3) + High Slope (col 1) = Landslide
        y_dummy = ((X_dummy[:, 2] > 0.7) & (X_dummy[:, 4] > 0.6)).astype(int)
        self.model.fit(X_dummy, y_dummy)
        print("Model initialized and fitted successfully.")

    def _retrain_from_lake(self, filepath):
        """Periodically retrains the model on the newly gathered JSON lines."""
        if not os.path.exists(filepath): return False
        
        try:
            with open(filepath, 'r') as f:
                lines = f.readlines()
            
            if len(lines) < 20:
                return False
                
            X_new = []
            y_new = []
            
            for line in lines[-200:]: # Train on latest 200 ticks
                data = json.loads(line.strip())
                m = data.get("measurements", {})
                px = [
                    m.get("susceptibility", 0.5), m.get("slope_deg", 25.0),
                    m.get("rainfall_1h", 0), m.get("rainfall_24h", 0),
                    m.get("soil_moisture", 0), m.get("tilt_magnitude", 0),
                    m.get("humidity", 50), m.get("antecedent_3d", 0),
                    m.get("antecedent_7d", 0), m.get("forecast_48h", 0)
                ]
                X_new.append(px)
                # Pseudo ground-truth for unsupervised thresholding
                y_new.append(1 if m.get("rainfall_1h", 0) > 5 or m.get("tilt_magnitude", 0) > 0.05 else 0)
                
            if len(X_new) > 0:
                self.model.fit(np.array(X_new), np.array(y_new))
                print(f"Hot-swapped model weights based on {len(X_new)} new live JSON records.")
                return len(X_new)
        except Exception as e:
            print(f"Error during auto-retraining: {e}")
        return False

    async def run_loop(self):
        self.is_running = True
        self._refresh_cache()
        self._init_model()
        
        # Open data lake file in append mode
        data_lake_path = os.path.join(os.path.dirname(__file__), "..", "data", "live_telemetry_dump.jsonl")
        os.makedirs(os.path.dirname(data_lake_path), exist_ok=True)
        
        loop_counter = 0

        while self.is_running:
            # Send continuous stream of live data (1 tick per second)
            await asyncio.sleep(1.0)
            loop_counter += 1
            
            updates = []
            alerts = []
            
            # Update a subset of stations every tick to simulate real IoT streaming
            subset = random.sample(self.stations_cache, min(10, len(self.stations_cache)))
            
            for station in subset:
                # Add random walk noise to telemetry with natural baseline decay to prevent runaway saturation over time
                c = station["current"]
                # Drift back towards 0 for rainfall if it gets too high, or bounded random walk
                c["rainfall_1h"] = max(0, min(150, c["rainfall_1h"] * 0.95 + random.uniform(-1.0, 1.5)))
                c["rainfall_24h"] = max(0, min(300, c["rainfall_24h"] * 0.98 + random.uniform(-2.0, 3.0)))
                c["soil_moisture"] = max(0, min(100, c["soil_moisture"] * 0.99 + random.uniform(-0.5, 1.0)))
                c["tilt"] = max(0, min(20.0, c["tilt"] + random.uniform(-0.01, 0.02)))
                
                # Perform instant Edge AI ML inference using the active TriggerModel
                features = {
                    "susceptibility": station["susceptibility"],
                    "slope_deg": station["slope_deg"],
                    "rainfall_1h": c["rainfall_1h"],
                    "rainfall_24h": c["rainfall_24h"],
                    "soil_moisture": c["soil_moisture"],
                    "tilt_magnitude": c["tilt"],
                    "humidity": 50.0,
                    "antecedent_3d": 0.0,
                    "antecedent_7d": 0.0,
                    "forecast_48h": c["rainfall_24h"] * 1.5 if c["rainfall_24h"] < 10 else random.uniform(80, 150) # Only heavy rain zones get massive 48h forecasts
                }
                
                prediction = self.model.predict_conditions(**features)
                risk_level = prediction["risk_level"]
                confidence = prediction["confidence"]
                
                packet = {
                    "type": "TELEMETRY",
                    "station_id": station["station_id"],
                    "timestamp": datetime.utcnow().isoformat(),
                    "measurements": features,
                    "prediction": {
                        "risk_level": risk_level,
                        "confidence": confidence
                    }
                }
                updates.append(packet)
                
                # If prediction detects a trigger threshold crossing, generate high priority alert
                if risk_level in ["HIGH", "CRITICAL", "EARLY WARNING (48HR)"]:
                    alerts.append({
                        "type": "ALERT",
                        "severity": risk_level,
                        "station_id": station["station_id"],
                        "confidence": confidence,
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": f"ML Model detected {risk_level} trigger condition with {confidence:.1%} confidence."
                    })
            
            # Broadcast the live batches out to connected Next.js dashboard sockets
            if updates:
                await manager.broadcast({"batch": updates})
                # Flush to Data Lake File for background MLOps training processing
                with open(data_lake_path, "a") as f:
                    for pkt in updates:
                        f.write(json.dumps(pkt) + "\n")
            
            # Execute Continuous Auto-Retraining every 25 ticks
            if loop_counter % 25 == 0:
                records_used = self._retrain_from_lake(data_lake_path)
                if records_used:
                    alerts.append({
                        "type": "ALERT",
                        "severity": "INFO",
                        "station_id": "MLOps-Core",
                        "confidence": 1.0,
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": f"[System] Edge auto-retrained and model hot-swapped using last {records_used} JSON ticks from stream."
                    })

            if alerts:
                for alert in alerts:
                    await manager.broadcast(alert)

ingestor = TelemetryIngestor()

async def start_ingestion_loop():
    await ingestor.run_loop()
