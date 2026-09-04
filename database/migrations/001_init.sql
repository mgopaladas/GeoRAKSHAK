-- ============================================================
-- GEORAKSHAK — Database Schema
-- PostgreSQL 16 + PostGIS 3.4
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ───────────────────────────────────────────────────

CREATE TYPE risk_level AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
CREATE TYPE alert_severity AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
CREATE TYPE alert_status AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'EXPIRED');
CREATE TYPE sensor_status AS ENUM ('ONLINE', 'OFFLINE', 'FAULT', 'MAINTENANCE');
CREATE TYPE report_category AS ENUM ('CRACK', 'ROCKFALL', 'SLOPE_FAILURE', 'DEBRIS', 'ROAD_BLOCKAGE', 'FLOODING', 'OTHER');
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'DISASTER_OFFICER', 'FIELD_OFFICER', 'CITIZEN');

-- ─── USERS ───────────────────────────────────────────────────

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CITIZEN',
    phone VARCHAR(20),
    organization VARCHAR(255),
    state VARCHAR(100),
    district VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── GEOGRAPHIC ENTITIES ─────────────────────────────────────

CREATE TABLE states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    geom GEOMETRY(MultiPolygon, 4326)
);

CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    state_id INTEGER REFERENCES states(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    geom GEOMETRY(MultiPolygon, 4326)
);

CREATE TABLE villages (
    id SERIAL PRIMARY KEY,
    district_id INTEGER REFERENCES districts(id),
    name VARCHAR(255) NOT NULL,
    population INTEGER,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geom GEOMETRY(Point, 4326)
);

CREATE TABLE roads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    road_type VARCHAR(50),  -- NH, SH, district, village
    importance INTEGER DEFAULT 1,  -- 1-5
    geom GEOMETRY(LineString, 4326)
);

CREATE TABLE infrastructure (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- bridge, school, hospital, dam
    district_id INTEGER REFERENCES districts(id),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geom GEOMETRY(Point, 4326)
);

-- ─── SENSOR NETWORK ──────────────────────────────────────────

CREATE TABLE sensor_stations (
    id VARCHAR(50) PRIMARY KEY,  -- e.g. GR-SENSOR-001
    name VARCHAR(255) NOT NULL,
    district_id INTEGER REFERENCES districts(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION,
    status sensor_status DEFAULT 'OFFLINE',
    battery_level DOUBLE PRECISION,
    signal_strength INTEGER,
    firmware_version VARCHAR(50),
    installed_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    geom GEOMETRY(Point, 4326),
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(50) REFERENCES sensor_stations(id),
    timestamp TIMESTAMPTZ NOT NULL,
    rainfall_mm DOUBLE PRECISION,
    rainfall_1h DOUBLE PRECISION,
    rainfall_24h DOUBLE PRECISION,
    soil_moisture DOUBLE PRECISION,
    tilt_x DOUBLE PRECISION,
    tilt_y DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    battery DOUBLE PRECISION,
    signal_strength INTEGER,
    is_anomaly BOOLEAN DEFAULT false,
    raw_data JSONB
);

CREATE INDEX idx_readings_station_time ON sensor_readings(station_id, timestamp DESC);
CREATE INDEX idx_readings_timestamp ON sensor_readings(timestamp DESC);

CREATE TABLE sensor_health (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(50) REFERENCES sensor_stations(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    rain_gauge_ok BOOLEAN DEFAULT true,
    soil_sensor_ok BOOLEAN DEFAULT true,
    imu_ok BOOLEAN DEFAULT true,
    gps_ok BOOLEAN DEFAULT true,
    battery_ok BOOLEAN DEFAULT true,
    network_ok BOOLEAN DEFAULT true,
    details JSONB
);

-- ─── RISK ASSESSMENT ─────────────────────────────────────────

CREATE TABLE risk_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    zone_code VARCHAR(50) UNIQUE,
    district_id INTEGER REFERENCES districts(id),
    susceptibility_score DOUBLE PRECISION DEFAULT 0,
    current_risk_level risk_level DEFAULT 'LOW',
    current_risk_score DOUBLE PRECISION DEFAULT 0,
    last_assessed_at TIMESTAMPTZ,
    geom GEOMETRY(Polygon, 4326),
    properties JSONB DEFAULT '{}'
);

CREATE INDEX idx_risk_zones_geom ON risk_zones USING GIST(geom);

CREATE TABLE risk_assessments (
    id BIGSERIAL PRIMARY KEY,
    zone_id INTEGER REFERENCES risk_zones(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    risk_score DOUBLE PRECISION NOT NULL,
    risk_level risk_level NOT NULL,
    confidence DOUBLE PRECISION,
    factors JSONB NOT NULL,
    -- Factor breakdown
    terrain_score DOUBLE PRECISION,
    rainfall_score DOUBLE PRECISION,
    soil_score DOUBLE PRECISION,
    movement_score DOUBLE PRECISION,
    historical_score DOUBLE PRECISION,
    model_version VARCHAR(50),
    is_simulated BOOLEAN DEFAULT false
);

CREATE INDEX idx_assessments_zone_time ON risk_assessments(zone_id, timestamp DESC);

-- ─── HISTORICAL LANDSLIDES ───────────────────────────────────

CREATE TABLE landslide_events (
    id SERIAL PRIMARY KEY,
    event_date DATE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    state VARCHAR(100),
    district VARCHAR(100),
    location_name VARCHAR(255),
    landslide_type VARCHAR(100),
    severity VARCHAR(50),
    fatalities INTEGER DEFAULT 0,
    injuries INTEGER DEFAULT 0,
    trigger VARCHAR(100), -- rainfall, earthquake, etc.
    source VARCHAR(255),
    description TEXT,
    geom GEOMETRY(Point, 4326)
);

CREATE INDEX idx_landslides_geom ON landslide_events USING GIST(geom);

-- ─── WEATHER ─────────────────────────────────────────────────

CREATE TABLE weather_observations (
    id BIGSERIAL PRIMARY KEY,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    timestamp TIMESTAMPTZ NOT NULL,
    rainfall_mm DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    wind_speed DOUBLE PRECISION,
    pressure DOUBLE PRECISION,
    source VARCHAR(100),
    geom GEOMETRY(Point, 4326)
);

-- ─── FIELD REPORTS ───────────────────────────────────────────

CREATE TABLE field_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    category report_category NOT NULL,
    description TEXT,
    severity VARCHAR(50),
    media_urls TEXT[],
    status VARCHAR(50) DEFAULT 'SUBMITTED',
    verified BOOLEAN DEFAULT false,
    zone_id INTEGER REFERENCES risk_zones(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ,
    geom GEOMETRY(Point, 4326)
);

-- ─── ALERTS ──────────────────────────────────────────────────

CREATE TABLE alerts (
    id BIGSERIAL PRIMARY KEY,
    zone_id INTEGER REFERENCES risk_zones(id),
    assessment_id BIGINT REFERENCES risk_assessments(id),
    severity alert_severity NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status alert_status DEFAULT 'ACTIVE',
    escalation_level INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE alert_deliveries (
    id BIGSERIAL PRIMARY KEY,
    alert_id BIGINT REFERENCES alerts(id),
    channel VARCHAR(50) NOT NULL,  -- sms, push, email, dashboard
    recipient_id UUID REFERENCES users(id),
    recipient_contact VARCHAR(255),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'PENDING'
);

-- ─── EMERGENCY RESPONSE ─────────────────────────────────────

CREATE TABLE emergency_tasks (
    id BIGSERIAL PRIMARY KEY,
    alert_id BIGINT REFERENCES alerts(id),
    zone_id INTEGER REFERENCES risk_zones(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL,  -- 1=highest
    assigned_to UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'PENDING',
    affected_population INTEGER,
    affected_roads TEXT[],
    affected_infrastructure TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- ─── AI MODEL TRACKING ──────────────────────────────────────

CREATE TABLE model_versions (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    metrics JSONB,
    file_path VARCHAR(500),
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AUDIT LOG ───────────────────────────────────────────────

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
