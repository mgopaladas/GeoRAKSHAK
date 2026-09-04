"""
GeoRakshak — Database engine & session
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from api.config import get_settings

settings = get_settings()

engine_kwargs = {}
if settings.database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    # pool parameters are not valid for synchronous SQLite in standard configs usually, but poolclass is fine
else:
    engine_kwargs["pool_size"] = 10

engine = create_engine(settings.database_url, pool_pre_ping=True, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Auto-create tables for SQLite environments (Render deployment fix)
if settings.database_url.startswith("sqlite"):
    import api.models  # Ensure models are loaded
    from datetime import datetime
    import uuid
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed mock sensors if database is entirely empty
    db = SessionLocal()
    try:
        from api.models import SensorStation, RiskZone, TelemetryReading
        if db.query(SensorStation).count() == 0:
            print("Seeding database with default mock sensors...")
            zone_id = str(uuid.uuid4())
            zone = RiskZone(
                id=zone_id,
                zone_code="NER-Z1",
                district_id="dist-001",
                name="Karbi Anglong Vulnerable Zone",
                risk_level="HIGH",
                risk_score=85.0,
                susceptibility_score=0.85
            )
            db.add(zone)
            
            sensors = [
                {"name": "Diphu Hills Alpha", "lat": 25.84, "lon": 93.43, "rain": 45.2, "sm": 68.0, "tilt": 1.2},
                {"name": "Shillong Escarpment", "lat": 25.57, "lon": 91.89, "rain": 12.0, "sm": 45.0, "tilt": 0.1},
                {"name": "Tawang Forward Post", "lat": 27.58, "lon": 91.86, "rain": 89.5, "sm": 92.0, "tilt": 3.4},
                {"name": "Kohima Ridge Node", "lat": 25.67, "lon": 94.11, "rain": 0.0, "sm": 32.0, "tilt": 0.0},
                {"name": "Aizawl Periphery", "lat": 23.72, "lon": 92.71, "rain": 115.0, "sm": 88.0, "tilt": 2.5}
            ]
            
            for s in sensors:
                st_id = str(uuid.uuid4())
                station = SensorStation(
                    id=st_id,
                    name=s["name"],
                    district_id="dist-001",
                    latitude=s["lat"],
                    longitude=s["lon"],
                    status="ONLINE",
                    battery_level=95.0,
                    last_communication=datetime.utcnow()
                )
                db.add(station)
                
                reading = TelemetryReading(
                    id=str(uuid.uuid4()),
                    station_id=st_id,
                    timestamp=datetime.utcnow(),
                    rainfall_1h=s["rain"] / 10,
                    rainfall_24h=s["rain"],
                    soil_moisture=s["sm"],
                    temperature=24.5,
                    tilt_x=s["tilt"],
                    tilt_y=0.0,
                    prediction_risk_level="MODERATE"
                )
                db.add(reading)
                
            db.commit()
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        print(f"Error seeding database: {e}")
    finally:
        db.close()


def get_db():
    """FastAPI dependency — yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
