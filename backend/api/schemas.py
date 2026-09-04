"""
GeoRakshak — Pydantic Schemas (API request/response models)
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# ─── SENSOR SCHEMAS ───────────────────────────────────────────

class SensorStationOut(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    status: str
    battery_level: Optional[float] = None
    signal_strength: Optional[int] = None
    firmware_version: Optional[str] = None
    last_seen_at: Optional[datetime] = None
    latest_reading: Optional["SensorReadingOut"] = None

    class Config:
        from_attributes = True


class SensorReadingOut(BaseModel):
    id: int
    station_id: str
    timestamp: datetime
    rainfall_mm: Optional[float] = None
    rainfall_1h: Optional[float] = None
    rainfall_24h: Optional[float] = None
    soil_moisture: Optional[float] = None
    tilt_x: Optional[float] = None
    tilt_y: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    battery: Optional[float] = None
    is_anomaly: bool = False

    class Config:
        from_attributes = True


class SensorReadingIn(BaseModel):
    """Payload from ESP32 or simulator."""
    device_id: str
    timestamp: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rainfall_mm: Optional[float] = None
    rainfall_1h: Optional[float] = None
    rainfall_24h: Optional[float] = None
    soil_moisture: Optional[float] = None
    tilt_x: Optional[float] = None
    tilt_y: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    battery: Optional[float] = None
    signal_strength: Optional[int] = None


# ─── RISK SCHEMAS ─────────────────────────────────────────────

class RiskZoneOut(BaseModel):
    id: int
    name: str
    zone_code: Optional[str] = None
    susceptibility_score: float
    current_risk_level: str
    current_risk_score: float
    last_assessed_at: Optional[datetime] = None
    properties: Optional[dict] = None
    geojson: Optional[dict] = None  # populated at API level

    class Config:
        from_attributes = True


class RiskAssessmentOut(BaseModel):
    id: int
    zone_id: int
    zone_name: Optional[str] = None
    timestamp: datetime
    risk_score: float
    risk_level: str
    confidence: Optional[float] = None
    factors: dict
    terrain_score: Optional[float] = None
    rainfall_score: Optional[float] = None
    soil_score: Optional[float] = None
    movement_score: Optional[float] = None
    historical_score: Optional[float] = None
    is_simulated: bool = False

    class Config:
        from_attributes = True


# ─── ALERT SCHEMAS ────────────────────────────────────────────

class AlertOut(BaseModel):
    id: int
    zone_id: Optional[int] = None
    zone_name: Optional[str] = None
    severity: str
    title: str
    description: Optional[str] = None
    status: str
    escalation_level: int = 1
    created_at: datetime

    class Config:
        from_attributes = True


# ─── LANDSLIDE SCHEMAS ────────────────────────────────────────

class LandslideEventOut(BaseModel):
    id: int
    event_date: Optional[datetime] = None
    latitude: float
    longitude: float
    state: Optional[str] = None
    district: Optional[str] = None
    location_name: Optional[str] = None
    landslide_type: Optional[str] = None
    severity: Optional[str] = None
    fatalities: int = 0
    trigger: Optional[str] = None
    source: Optional[str] = None

    class Config:
        from_attributes = True


# ─── DASHBOARD SCHEMAS ────────────────────────────────────────

class DashboardStats(BaseModel):
    critical_zones: int = 0
    high_risk_zones: int = 0
    moderate_zones: int = 0
    low_risk_zones: int = 0
    total_sensors: int = 0
    online_sensors: int = 0
    offline_sensors: int = 0
    active_alerts: int = 0
    total_landslide_events: int = 0


class EmergencyPriority(BaseModel):
    rank: int
    title: str
    zone_name: str
    risk_level: str
    risk_score: float
    description: str


# ─── SIMULATOR SCHEMAS ────────────────────────────────────────

class SimulatorEvent(BaseModel):
    scenario: str = Field(
        ...,
        description="One of: NORMAL, HEAVY_RAIN, GROUND_MOVEMENT, CRITICAL, SENSOR_FAILURE"
    )
    station_id: Optional[str] = None
    duration_seconds: int = 60
    intensity: float = Field(default=1.0, ge=0.1, le=3.0)


# Update forward refs
SensorStationOut.model_rebuild()
