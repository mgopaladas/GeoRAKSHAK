"""
GeoRakshak — FastAPI Application
Main entry point for the API gateway.
"""
import json
from datetime import datetime
from typing import List, Optional

import asyncio
from fastapi import FastAPI, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text

from api.config import get_settings
from api.database import get_db, engine
from iot.websocket_manager import manager
from iot.telemetry_ingest import start_ingestion_loop
from api.models import (
    SensorStation, SensorReading, RiskZone, RiskAssessment,
    Alert, LandslideEvent, State, District, SensorHealth
)
from api.schemas import (
    SensorStationOut, SensorReadingOut, SensorReadingIn,
    RiskZoneOut, RiskAssessmentOut, AlertOut, LandslideEventOut,
    DashboardStats, EmergencyPriority, SimulatorEvent
)
from risk.engine import calculate_risk

settings = get_settings()

# ─── APP INIT ─────────────────────────────────────────────────

app = FastAPI(
    title="GeoRakshak API",
    description="AI-Powered Landslide Early Warning & Disaster Intelligence Platform — API Gateway",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── MOUNT PHASE 2 ROUTE MODULES ────────────────────────────
from weather.weather_routes import router as weather_router
from gis.terrain_routes import router as terrain_router
from risk.prediction_routes import router as prediction_router

app.include_router(weather_router)
app.include_router(terrain_router)
app.include_router(prediction_router)


# ─── REAL-TIME WEBSOCKET (Phase 10) ─────────────────────────

@app.on_event("startup")
async def startup_event():
    # Start the continuous IoT telemetry injection background loop
    asyncio.create_task(start_ingestion_loop())

@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Client doesn't need to send anything, they just listen
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ─── HEALTH ───────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "georakshak-api",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat()
    }


# ─── DASHBOARD STATS ─────────────────────────────────────────

@app.get("/api/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Aggregate stats for the overview dashboard."""
    zones = db.query(RiskZone).all()
    sensors = db.query(SensorStation).all()
    active_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").count()
    total_events = db.query(LandslideEvent).count()

    return DashboardStats(
        critical_zones=sum(1 for z in zones if z.current_risk_level == "CRITICAL"),
        high_risk_zones=sum(1 for z in zones if z.current_risk_level == "HIGH"),
        moderate_zones=sum(1 for z in zones if z.current_risk_level == "MODERATE"),
        low_risk_zones=sum(1 for z in zones if z.current_risk_level == "LOW"),
        total_sensors=len(sensors),
        online_sensors=sum(1 for s in sensors if s.status == "ONLINE"),
        offline_sensors=sum(1 for s in sensors if s.status in ("OFFLINE", "FAULT")),
        active_alerts=active_alerts,
        total_landslide_events=total_events,
    )


@app.get("/api/dashboard/priorities", response_model=List[EmergencyPriority])
def get_emergency_priorities(db: Session = Depends(get_db)):
    """Top emergency priorities — highest risk zones."""
    zones = (
        db.query(RiskZone)
        .filter(RiskZone.current_risk_level.in_(["CRITICAL", "HIGH"]))
        .order_by(desc(RiskZone.current_risk_score))
        .limit(10)
        .all()
    )
    priorities = []
    for rank, zone in enumerate(zones, 1):
        desc_text = f"Risk score {zone.current_risk_score}% — Susceptibility {zone.susceptibility_score:.0%}"
        priorities.append(EmergencyPriority(
            rank=rank,
            title=f"Zone {zone.zone_code}" if zone.zone_code else zone.name,
            zone_name=zone.name,
            risk_level=zone.current_risk_level,
            risk_score=zone.current_risk_score,
            description=desc_text,
        ))
    return priorities


# ─── SENSORS ──────────────────────────────────────────────────

@app.get("/api/sensors", response_model=List[SensorStationOut])
def get_sensors(db: Session = Depends(get_db)):
    """All sensor stations with latest readings."""
    stations = db.query(SensorStation).all()
    result = []
    for s in stations:
        # Get latest reading
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.station_id == s.id)
            .order_by(desc(SensorReading.timestamp))
            .first()
        )
        station_out = SensorStationOut(
            id=s.id,
            name=s.name,
            latitude=s.latitude,
            longitude=s.longitude,
            altitude=s.altitude,
            status=s.status,
            battery_level=s.battery_level,
            signal_strength=s.signal_strength,
            firmware_version=s.firmware_version,
            last_seen_at=s.last_seen_at,
            latest_reading=SensorReadingOut.model_validate(latest) if latest else None,
        )
        result.append(station_out)
    return result


@app.get("/api/sensors/{station_id}/readings", response_model=List[SensorReadingOut])
def get_sensor_readings(
    station_id: str,
    limit: int = Query(default=50, le=500),
    db: Session = Depends(get_db),
):
    """Time-series readings for a sensor station."""
    readings = (
        db.query(SensorReading)
        .filter(SensorReading.station_id == station_id)
        .order_by(desc(SensorReading.timestamp))
        .limit(limit)
        .all()
    )
    return [SensorReadingOut.model_validate(r) for r in readings]


@app.post("/api/sensors/readings")
def ingest_sensor_reading(payload: SensorReadingIn, db: Session = Depends(get_db)):
    """
    Ingest a sensor reading from ESP32 or simulator.
    This is the HTTP endpoint; MQTT ingestion will also write here.
    """
    # Validate station exists
    station = db.query(SensorStation).filter(SensorStation.id == payload.device_id).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"Sensor station {payload.device_id} not found")

    reading = SensorReading(
        station_id=payload.device_id,
        timestamp=payload.timestamp or datetime.utcnow(),
        rainfall_mm=payload.rainfall_mm,
        rainfall_1h=payload.rainfall_1h,
        rainfall_24h=payload.rainfall_24h,
        soil_moisture=payload.soil_moisture,
        tilt_x=payload.tilt_x,
        tilt_y=payload.tilt_y,
        temperature=payload.temperature,
        humidity=payload.humidity,
        battery=payload.battery,
        signal_strength=payload.signal_strength,
        raw_data=payload.model_dump(),
    )
    db.add(reading)

    # Update station status
    station.status = "ONLINE"
    station.last_seen_at = datetime.utcnow()
    if payload.battery is not None:
        station.battery_level = payload.battery

    db.commit()
    db.refresh(reading)

    return {"status": "ok", "reading_id": reading.id}

from pydantic import BaseModel
class TelemetryMeasurements(BaseModel):
    rainfall_1h: float
    rainfall_24h: float
    soil_moisture: float
    tilt_magnitude: float

class TelemetryPayload(BaseModel):
    station_id: str
    measurements: TelemetryMeasurements

@app.post("/v1/telemetry")
async def live_telemetry_webhook(payload: TelemetryPayload, db: Session = Depends(get_db)):
    """Hardware API Webhook for live metrics ingestion and ML Edge-Trigger Evaluation."""
    import asyncio, json
    from iot.websocket_manager import manager
    from risk.engine import calculate_risk
    
    # 1. Simulate finding the station & zone
    station = db.query(SensorStation).filter(SensorStation.id == payload.station_id).first()
    if not station:
        station = db.query(SensorStation).first() # Fallback

    zone = db.query(RiskZone).filter(RiskZone.district_id == station.district_id).first() if station else None
    if not zone:
        zone = db.query(RiskZone).first()

    # 2. Run through ML Engine
    risk_result = calculate_risk(
        susceptibility=zone.susceptibility_score if zone else 0.5,
        rainfall_1h=payload.measurements.rainfall_1h,
        rainfall_24h=payload.measurements.rainfall_24h,
        soil_moisture=payload.measurements.soil_moisture,
        tilt_x=payload.measurements.tilt_magnitude,
        tilt_y=0
    )

    # 3. Broadcast to all connected dashboards
    packet = {
        "type": "TELEMETRY",
        "batch": [{
            "station_id": payload.station_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "measurements": payload.measurements.model_dump(),
            "prediction": {
                "risk_level": risk_result["risk_level"],
                "confidence": risk_result["confidence"]
            }
        }]
    }
    await manager.broadcast(json.dumps(packet))
    
    # If ML triggered danger, broadcast emergency alert
    if risk_result["risk_level"] in ["CRITICAL", "HIGH", "EARLY WARNING (48HR)"]:
        alert_packet = {
            "type": "ALERT",
            "station_id": payload.station_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "severity": risk_result["risk_level"],
            "message": f"ML Edge Trigger — Priority: {risk_result['risk_level']}. Live telemetry anomalies detected.",
            "prediction": {"risk_level": risk_result["risk_level"], "confidence": risk_result["confidence"]}
        }
        await manager.broadcast(json.dumps(alert_packet))
        
    return {"status": "accepted", "risk_level": risk_result["risk_level"]}

# ─── RISK ZONES ───────────────────────────────────────────────

@app.get("/api/risk-zones")
def get_risk_zones(db: Session = Depends(get_db)):
    """All risk zones as GeoJSON FeatureCollection."""
    zones = db.query(RiskZone).all()
    features = []
    for z in zones:
        # Convert PostGIS geometry to GeoJSON
        geojson = None
        if z.geom is not None:
            result = db.execute(
                text("SELECT ST_AsGeoJSON(geom) FROM risk_zones WHERE id = :id"),
                {"id": z.id}
            ).fetchone()
            if result and result[0]:
                geojson = json.loads(result[0])

        features.append({
            "type": "Feature",
            "properties": {
                "id": z.id,
                "name": z.name,
                "zone_code": z.zone_code,
                "susceptibility_score": z.susceptibility_score,
                "risk_level": z.current_risk_level,
                "risk_score": z.current_risk_score,
                **(z.properties or {}),
            },
            "geometry": geojson,
        })

    return {"type": "FeatureCollection", "features": features}


@app.get("/api/risk-zones/{zone_id}/assessment", response_model=RiskAssessmentOut)
def get_zone_assessment(zone_id: int, db: Session = Depends(get_db)):
    """Latest risk assessment for a zone with explainability."""
    assessment = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.zone_id == zone_id)
        .order_by(desc(RiskAssessment.timestamp))
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="No assessment found")

    zone = db.query(RiskZone).filter(RiskZone.id == zone_id).first()

    return RiskAssessmentOut(
        id=assessment.id,
        zone_id=assessment.zone_id,
        zone_name=zone.name if zone else None,
        timestamp=assessment.timestamp,
        risk_score=assessment.risk_score,
        risk_level=assessment.risk_level,
        confidence=assessment.confidence,
        factors=assessment.factors,
        terrain_score=assessment.terrain_score,
        rainfall_score=assessment.rainfall_score,
        soil_score=assessment.soil_score,
        movement_score=assessment.movement_score,
        historical_score=assessment.historical_score,
        is_simulated=assessment.is_simulated,
    )


# ─── ALERTS ───────────────────────────────────────────────────

@app.get("/api/alerts", response_model=List[AlertOut])
def get_alerts(
    status: Optional[str] = None,
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
):
    """Active alerts, sorted by severity and time."""
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    else:
        query = query.filter(Alert.status == "ACTIVE")

    alerts = query.order_by(desc(Alert.created_at)).limit(limit).all()
    result = []
    for a in alerts:
        zone = db.query(RiskZone).filter(RiskZone.id == a.zone_id).first()
        result.append(AlertOut(
            id=a.id,
            zone_id=a.zone_id,
            zone_name=zone.name if zone else None,
            severity=a.severity,
            title=a.title,
            description=a.description,
            status=a.status,
            escalation_level=a.escalation_level,
            created_at=a.created_at,
        ))
    return result


# ─── LANDSLIDE EVENTS ────────────────────────────────────────

@app.get("/api/landslides")
def get_landslide_events(db: Session = Depends(get_db)):
    """Historical landslide events as GeoJSON."""
    events = db.query(LandslideEvent).all()
    features = []
    for e in events:
        features.append({
            "type": "Feature",
            "properties": {
                "id": e.id,
                "event_date": e.event_date.isoformat() if e.event_date else None,
                "location_name": e.location_name,
                "landslide_type": e.landslide_type,
                "severity": e.severity,
                "fatalities": e.fatalities,
                "trigger": e.trigger,
                "source": e.source,
                "state": e.state,
                "district": e.district,
            },
            "geometry": {
                "type": "Point",
                "coordinates": [e.longitude, e.latitude],
            },
        })
    return {"type": "FeatureCollection", "features": features}


# ─── SIMULATOR ────────────────────────────────────────────────

@app.post("/api/simulator/event")
def trigger_simulation(event: SimulatorEvent, db: Session = Depends(get_db)):
    """
    Trigger a simulation scenario. This injects simulated sensor data and
    recalculates risk for affected zones.

    Scenarios: NORMAL, HEAVY_RAIN, GROUND_MOVEMENT, CRITICAL, SENSOR_FAILURE
    """
    import random

    # Configure scenario parameters
    scenarios = {
        "NORMAL": {
            "rainfall_1h": lambda i: random.uniform(1, 8) * i,
            "rainfall_24h": lambda i: random.uniform(5, 25) * i,
            "soil_moisture": lambda i: random.uniform(25, 40) * min(i, 1.5),
            "tilt_x": lambda i: random.uniform(0.05, 0.2),
            "tilt_y": lambda i: random.uniform(0.03, 0.15),
        },
        "HEAVY_RAIN": {
            "rainfall_1h": lambda i: random.uniform(30, 60) * i,
            "rainfall_24h": lambda i: random.uniform(80, 150) * i,
            "soil_moisture": lambda i: random.uniform(65, 85) * min(i, 1.2),
            "tilt_x": lambda i: random.uniform(0.2, 0.8),
            "tilt_y": lambda i: random.uniform(0.1, 0.5),
        },
        "GROUND_MOVEMENT": {
            "rainfall_1h": lambda i: random.uniform(15, 35) * i,
            "rainfall_24h": lambda i: random.uniform(60, 110) * i,
            "soil_moisture": lambda i: random.uniform(70, 88) * min(i, 1.2),
            "tilt_x": lambda i: random.uniform(1.5, 3.5) * i,
            "tilt_y": lambda i: random.uniform(1.0, 2.8) * i,
        },
        "CRITICAL": {
            "rainfall_1h": lambda i: random.uniform(45, 80) * i,
            "rainfall_24h": lambda i: random.uniform(120, 200) * i,
            "soil_moisture": lambda i: min(random.uniform(82, 95) * min(i, 1.1), 99),
            "tilt_x": lambda i: random.uniform(2.5, 5.0) * i,
            "tilt_y": lambda i: random.uniform(2.0, 4.0) * i,
        },
    }

    scenario_params = scenarios.get(event.scenario, scenarios["NORMAL"])

    # Get target stations
    if event.station_id:
        stations = db.query(SensorStation).filter(SensorStation.id == event.station_id).all()
    else:
        stations = db.query(SensorStation).filter(SensorStation.status != "MAINTENANCE").all()

    if not stations:
        raise HTTPException(status_code=404, detail="No stations found")

    results = []
    intensity = event.intensity

    for station in stations:
        if event.scenario == "SENSOR_FAILURE":
            station.status = "FAULT"
            db.commit()
            results.append({
                "station_id": station.id,
                "status": "FAULT",
                "message": "Sensor failure simulated"
            })
            continue

        # Generate simulated reading
        reading = SensorReading(
            station_id=station.id,
            timestamp=datetime.utcnow(),
            rainfall_1h=scenario_params["rainfall_1h"](intensity),
            rainfall_24h=scenario_params["rainfall_24h"](intensity),
            soil_moisture=scenario_params["soil_moisture"](intensity),
            tilt_x=scenario_params["tilt_x"](intensity),
            tilt_y=scenario_params["tilt_y"](intensity),
            temperature=random.uniform(18, 28),
            humidity=random.uniform(75, 99),
            battery=station.battery_level or 85,
            is_anomaly=event.scenario in ("GROUND_MOVEMENT", "CRITICAL"),
        )
        db.add(reading)
        station.status = "ONLINE"
        station.last_seen_at = datetime.utcnow()
        db.flush()

        # Recalculate risk for associated zone
        zone = (
            db.query(RiskZone)
            .filter(RiskZone.district_id == station.district_id)
            .first()
        )
        if zone:
            risk_result = calculate_risk(
                susceptibility=zone.susceptibility_score,
                rainfall_1h=reading.rainfall_1h or 0,
                rainfall_24h=reading.rainfall_24h or 0,
                soil_moisture=reading.soil_moisture or 0,
                tilt_x=reading.tilt_x or 0,
                tilt_y=reading.tilt_y or 0,
            )

            import asyncio
            from iot.websocket_manager import manager
            import json

            # Update zone
            zone.current_risk_score = risk_result["risk_score"]
            zone.current_risk_level = risk_result["risk_level"]
            zone.last_assessed_at = datetime.utcnow()
            
            # Broadcast anomalous payload directly to React WebSocket
            packet = {
                "type": "TELEMETRY",
                "batch": [{
                    "station_id": station.id,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "measurements": {
                        "rainfall_1h": reading.rainfall_1h,
                        "rainfall_24h": reading.rainfall_24h,
                        "soil_moisture": reading.soil_moisture,
                        "tilt_magnitude": reading.tilt_x,
                        "forecast_48h": reading.rainfall_24h * 4,
                    },
                    "prediction": {
                        "risk_level": risk_result["risk_level"],
                        "confidence": risk_result["confidence"]
                    }
                }]
            }
            asyncio.create_task(manager.broadcast(json.dumps(packet)))
            
            if risk_result["risk_level"] in ["CRITICAL", "HIGH"]:
                alert_packet = {
                    "type": "ALERT",
                    "station_id": station.id,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "severity": risk_result["risk_level"],
                    "message": f"SIH DEMO ({event.scenario}) — {risk_result['risk_level']} alert forced by manual jury simulation trigger.",
                    "prediction": {"risk_level": risk_result["risk_level"], "confidence": risk_result["confidence"]}
                }
                asyncio.create_task(manager.broadcast(json.dumps(alert_packet)))

            # Store assessment
            assessment = RiskAssessment(
                zone_id=zone.id,
                risk_score=risk_result["risk_score"],
                risk_level=risk_result["risk_level"],
                confidence=risk_result["confidence"],
                terrain_score=risk_result["terrain_score"],
                rainfall_score=risk_result["rainfall_score"],
                soil_score=risk_result["soil_score"],
                movement_score=risk_result["movement_score"],
                historical_score=risk_result["historical_score"],
                factors=risk_result,
                is_simulated=True,
                model_version="rule-based-v1",
            )
            db.add(assessment)
            db.flush()

            # Generate alert if HIGH or CRITICAL
            if risk_result["risk_level"] in ("HIGH", "CRITICAL"):
                alert = Alert(
                    zone_id=zone.id,
                    assessment_id=assessment.id,
                    severity=risk_result["risk_level"],
                    title=f"{risk_result['risk_level']}: {zone.name} — Landslide Risk Alert (Simulated)",
                    description=". ".join(risk_result["reasons"]),
                    status="ACTIVE",
                )
                db.add(alert)

            results.append({
                "station_id": station.id,
                "zone": zone.name,
                "risk_score": risk_result["risk_score"],
                "risk_level": risk_result["risk_level"],
                "confidence": risk_result["confidence"],
                "reasons": risk_result["reasons"],
            })

    db.commit()

    return {
        "scenario": event.scenario,
        "stations_affected": len(results),
        "results": results,
        "timestamp": datetime.utcnow().isoformat(),
        "note": "SIMULATED — This data is synthetic and generated for demonstration purposes.",
    }


# ─── GEOGRAPHIC ───────────────────────────────────────────────

@app.get("/api/states")
def get_states(db: Session = Depends(get_db)):
    """List all states."""
    states = db.query(State).all()
    return [{"id": s.id, "name": s.name, "code": s.code} for s in states]


@app.get("/api/districts")
def get_districts(state_id: Optional[int] = None, db: Session = Depends(get_db)):
    """List districts, optionally filtered by state."""
    query = db.query(District)
    if state_id:
        query = query.filter(District.state_id == state_id)
    districts = query.all()
    return [{"id": d.id, "name": d.name, "code": d.code, "state_id": d.state_id} for d in districts]
