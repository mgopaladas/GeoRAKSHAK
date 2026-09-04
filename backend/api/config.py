"""
GeoRakshak — Configuration
"""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = os.environ.get("DATABASE_URL", "sqlite:///./georakshak.db")

    # Redis
    redis_url: str = "redis://localhost:6379"

    # MQTT
    mqtt_broker_host: str = "localhost"
    mqtt_broker_port: int = 1883

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "*"

    # Security
    secret_key: str = "dev-secret-key-change-in-production"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    # External APIs
    openweather_api_key: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
