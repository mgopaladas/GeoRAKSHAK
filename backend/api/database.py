"""
GeoRakshak — Database engine & session
"""
from typing import Any
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from api.config import get_settings

settings = get_settings()

engine_kwargs: dict[str, Any] = {}
if settings.database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    # pool parameters are not valid for synchronous SQLite in standard configs usually, but poolclass is fine
else:
    engine_kwargs["pool_size"] = 10

engine = create_engine(settings.database_url, pool_pre_ping=True, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_sqlite_db():
    if not settings.database_url.startswith("sqlite"):
        return
        
    import api.models  # Ensure models are loaded
    from datetime import datetime
    import uuid
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed mock sensors if database is entirely empty
    db = SessionLocal()
    from api.models import SensorStation, RiskZone, SensorReading, District
    if db.query(SensorStation).count() == 0:
        print("Seeding database with default mock sensors...")
        district = db.query(District).first()
        if not district:
            district = District(id=1, name="Karbi Anglong", state_id=1)
            db.add(district)
            db.flush()

        zone = RiskZone(
            id=1,
            zone_code="NER-Z1",
            district_id=district.id,
            name="Karbi Anglong Vulnerable Zone",
            current_risk_level="HIGH",
            current_risk_score=85.0,
            susceptibility_score=0.85
        )
        db.add(zone)
        
        sensors = [
            {"id": "SYN-067", "name": "Diphu Hills Alpha", "lat": 25.84, "lon": 93.43, "rain": 45.2, "sm": 68.0, "tilt": 1.2},
            {"id": "SYN-047", "name": "Shillong Escarpment", "lat": 25.57, "lon": 91.89, "rain": 12.0, "sm": 45.0, "tilt": 0.1},
            {"id": "SYN-065", "name": "Tawang Forward Post", "lat": 27.58, "lon": 91.86, "rain": 89.5, "sm": 92.0, "tilt": 3.4},
            {"id": "SYN-111", "name": "Kohima Ridge Node", "lat": 25.67, "lon": 94.11, "rain": 0.0, "sm": 32.0, "tilt": 0.0},
            {"id": "SYN-022", "name": "Aizawl Periphery", "lat": 23.72, "lon": 92.71, "rain": 115.0, "sm": 88.0, "tilt": 2.5}
        ]
        
        for s in sensors:
            station = SensorStation(
                id=s["id"],
                name=s["name"],
                district_id=district.id,
                latitude=s["lat"],
                longitude=s["lon"],
                status="ONLINE",
                battery_level=95.0,
                last_seen_at=datetime.utcnow()
            )
            db.add(station)
            
            reading = SensorReading(
                station_id=s["id"],
                timestamp=datetime.utcnow(),
                rainfall_1h=s["rain"] / 10,
                rainfall_24h=s["rain"],
                soil_moisture=s["sm"],
                temperature=24.5,
                tilt_x=s["tilt"],
                tilt_y=0.0
            )
            db.add(reading)
            
        db.commit()
    db.close()


def get_db():
    """FastAPI dependency — yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
