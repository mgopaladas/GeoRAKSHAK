"""
GeoRakshak — SQLAlchemy ORM Models
Maps to the PostGIS schema in database/migrations/001_init.sql
"""
from sqlalchemy import (
    Column, String, Integer, BigInteger, Float, Boolean, DateTime, Text,
    ForeignKey, Enum as SAEnum, JSON, ARRAY
)
import uuid
import os

from api.database import Base

IS_SQLITE = os.environ.get("DATABASE_URL", "sqlite:///./georakshak.db").startswith("sqlite")

if IS_SQLITE:
    UUID_TYPE = String(36)
    JSONB_TYPE = JSON
    def ARRAY_TYPE(*args, **kwargs): return JSON
    def Geometry_TYPE(*args, **kwargs): return Text
else:
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB_TYPE as PG_JSONB, ARRAY as PG_ARRAY
    from geoalchemy2 import Geometry as GEO_Geometry
    UUID_TYPE = PG_UUID_TYPE
    JSONB_TYPE = PG_JSONB
    ARRAY_TYPE = PG_ARRAY
    Geometry_TYPE = GEO_Geometry


# ─── USERS ────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID_TYPE, primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="CITIZEN")
    phone = Column(String(20))
    organization = Column(String(255))
    state = Column(String(100))
    district = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)


# ─── GEOGRAPHY ────────────────────────────────────────────────

class State(Base):
    __tablename__ = "states"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    code = Column(String(10), unique=True, nullable=False)
    geom = Column(Geometry_TYPE("MULTIPOLYGON", srid=4326))
    districts = relationship("District", back_populates="state")


class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True)
    state_id = Column(Integer, ForeignKey("states.id"))
    name = Column(String(100), nullable=False)
    code = Column(String(20))
    geom = Column(Geometry_TYPE("MULTIPOLYGON", srid=4326))
    state = relationship("State", back_populates="districts")


class Village(Base):
    __tablename__ = "villages"

    id = Column(Integer, primary_key=True)
    district_id = Column(Integer, ForeignKey("districts.id"))
    name = Column(String(255), nullable=False)
    population = Column(Integer)
    latitude = Column(Float)
    longitude = Column(Float)
    geom = Column(Geometry_TYPE("POINT", srid=4326))


class Road(Base):
    __tablename__ = "roads"

    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    road_type = Column(String(50))
    importance = Column(Integer, default=1)
    geom = Column(Geometry_TYPE("LINESTRING", srid=4326))


class Infrastructure(Base):
    __tablename__ = "infrastructure"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"))
    latitude = Column(Float)
    longitude = Column(Float)
    geom = Column(Geometry_TYPE("POINT", srid=4326))


# ─── SENSORS ─────────────────────────────────────────────────

class SensorStation(Base):
    __tablename__ = "sensor_stations"

    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float)
    status = Column(String(20), default="OFFLINE")
    battery_level = Column(Float)
    signal_strength = Column(Integer)
    firmware_version = Column(String(50))
    installed_at = Column(DateTime(timezone=True))
    last_seen_at = Column(DateTime(timezone=True))
    geom = Column(Geometry_TYPE("POINT", srid=4326))
    metadata_ = Column("metadata", JSONB_TYPE, default={})
    readings = relationship("SensorReading", back_populates="station")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    station_id = Column(String(50), ForeignKey("sensor_stations.id"))
    timestamp = Column(DateTime(timezone=True), nullable=False)
    rainfall_mm = Column(Float)
    rainfall_1h = Column(Float)
    rainfall_24h = Column(Float)
    soil_moisture = Column(Float)
    tilt_x = Column(Float)
    tilt_y = Column(Float)
    temperature = Column(Float)
    humidity = Column(Float)
    battery = Column(Float)
    signal_strength = Column(Integer)
    is_anomaly = Column(Boolean, default=False)
    raw_data = Column(JSONB_TYPE)
    station = relationship("SensorStation", back_populates="readings")


class SensorHealth(Base):
    __tablename__ = "sensor_health"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    station_id = Column(String(50), ForeignKey("sensor_stations.id"))
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    rain_gauge_ok = Column(Boolean, default=True)
    soil_sensor_ok = Column(Boolean, default=True)
    imu_ok = Column(Boolean, default=True)
    gps_ok = Column(Boolean, default=True)
    battery_ok = Column(Boolean, default=True)
    network_ok = Column(Boolean, default=True)
    details = Column(JSONB_TYPE)


# ─── RISK ─────────────────────────────────────────────────────

class RiskZone(Base):
    __tablename__ = "risk_zones"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    zone_code = Column(String(50), unique=True)
    district_id = Column(Integer, ForeignKey("districts.id"))
    susceptibility_score = Column(Float, default=0)
    current_risk_level = Column(String(20), default="LOW")
    current_risk_score = Column(Float, default=0)
    last_assessed_at = Column(DateTime(timezone=True))
    geom = Column(Geometry_TYPE("POLYGON", srid=4326))
    properties = Column(JSONB_TYPE, default={})
    assessments = relationship("RiskAssessment", back_populates="zone")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    zone_id = Column(Integer, ForeignKey("risk_zones.id"))
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)
    confidence = Column(Float)
    factors = Column(JSONB_TYPE, nullable=False)
    terrain_score = Column(Float)
    rainfall_score = Column(Float)
    soil_score = Column(Float)
    movement_score = Column(Float)
    historical_score = Column(Float)
    model_version = Column(String(50))
    is_simulated = Column(Boolean, default=False)
    zone = relationship("RiskZone", back_populates="assessments")


# ─── HISTORICAL LANDSLIDES ───────────────────────────────────

class LandslideEvent(Base):
    __tablename__ = "landslide_events"

    id = Column(Integer, primary_key=True)
    event_date = Column(DateTime)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    state = Column(String(100))
    district = Column(String(100))
    location_name = Column(String(255))
    landslide_type = Column(String(100))
    severity = Column(String(50))
    fatalities = Column(Integer, default=0)
    injuries = Column(Integer, default=0)
    trigger = Column(String(100))
    source = Column(String(255))
    description = Column(Text)
    geom = Column(Geometry_TYPE("POINT", srid=4326))


# ─── ALERTS ───────────────────────────────────────────────────

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    zone_id = Column(Integer, ForeignKey("risk_zones.id"))
    assessment_id = Column(BigInteger, ForeignKey("risk_assessments.id"))
    severity = Column(String(20), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    status = Column(String(20), default="ACTIVE")
    escalation_level = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    acknowledged_at = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))
    metadata_ = Column("metadata", JSONB_TYPE, default={})


# ─── FIELD REPORTS ────────────────────────────────────────────

class FieldReport(Base):
    __tablename__ = "field_reports"

    id = Column(UUID_TYPE, primary_key=True, default=uuid.uuid4)
    reporter_id = Column(UUID_TYPE, ForeignKey("users.id"))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(Text)
    severity = Column(String(50))
    media_urls = Column(ARRAY_TYPE(Text))
    status = Column(String(50), default="SUBMITTED")
    verified = Column(Boolean, default=False)
    zone_id = Column(Integer, ForeignKey("risk_zones.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    synced_at = Column(DateTime(timezone=True))
    geom = Column(Geometry_TYPE("POINT", srid=4326))


# ─── EMERGENCY ────────────────────────────────────────────────

class EmergencyTask(Base):
    __tablename__ = "emergency_tasks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    alert_id = Column(BigInteger, ForeignKey("alerts.id"))
    zone_id = Column(Integer, ForeignKey("risk_zones.id"))
    title = Column(String(500), nullable=False)
    description = Column(Text)
    priority = Column(Integer, nullable=False)
    assigned_to = Column(UUID_TYPE, ForeignKey("users.id"))
    status = Column(String(50), default="PENDING")
    affected_population = Column(Integer)
    affected_roads = Column(ARRAY_TYPE(Text))
    affected_infrastructure = Column(ARRAY_TYPE(Text))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    acknowledged_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
