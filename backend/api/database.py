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
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
