"""
GeoRakshak — Weather API Routes
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.config import get_settings
from api.database import get_db
from weather.weather_service import (
    fetch_current_weather, fetch_forecast, fetch_all_stations_weather,
    generate_synthetic_weather, generate_synthetic_forecast,
    get_all_synthetic_weather, STATION_COORDS,
)

router = APIRouter(prefix="/api/weather", tags=["weather"])
settings = get_settings()


@router.get("/current")
async def get_current_weather():
    """
    Current weather for all NER sensor stations.
    Uses OpenWeatherMap if API key is configured, otherwise synthetic data.
    """
    api_key = getattr(settings, "openweather_api_key", None) or ""
    if api_key and api_key != "your-openweathermap-api-key":
        try:
            data = await fetch_all_stations_weather(api_key)
            return {"source": "OpenWeatherMap", "stations": data}
        except Exception as e:
            # Fallback to synthetic
            data = get_all_synthetic_weather()
            return {"source": "Synthetic (API error)", "error": str(e), "stations": data}
    else:
        data = get_all_synthetic_weather()
        return {"source": "Synthetic (no API key)", "stations": data}


@router.get("/forecast/{station_id}")
async def get_weather_forecast(station_id: str):
    """
    5-day/3-hour forecast for a specific station.
    """
    if station_id not in STATION_COORDS:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found")

    coords = STATION_COORDS[station_id]
    api_key = getattr(settings, "openweather_api_key", None) or ""

    if api_key and api_key != "your-openweathermap-api-key":
        try:
            forecasts = await fetch_forecast(api_key, coords["lat"], coords["lon"])
            return {
                "station_id": station_id,
                "station_name": coords["name"],
                "source": "OpenWeatherMap",
                "forecasts": forecasts,
            }
        except Exception:
            pass

    forecasts = generate_synthetic_forecast(station_id)
    return {
        "station_id": station_id,
        "station_name": coords["name"],
        "source": "Synthetic",
        "forecasts": forecasts,
    }


@router.get("/rainfall-summary")
async def get_rainfall_summary():
    """
    Rainfall summary across all stations — useful for risk assessment.
    Returns current rainfall intensity and 24h cumulative estimate.
    """
    api_key = getattr(settings, "openweather_api_key", None) or ""
    
    if api_key and api_key != "your-openweathermap-api-key":
        try:
            weather = await fetch_all_stations_weather(api_key)
        except Exception:
            weather = get_all_synthetic_weather()
    else:
        weather = get_all_synthetic_weather()

    summary = []
    for sid, data in weather.items():
        if "error" in data:
            continue
        rain_1h = data.get("rainfall_1h", 0)
        summary.append({
            "station_id": sid,
            "station_name": data.get("station_name", ""),
            "rainfall_1h": rain_1h,
            "rainfall_3h": data.get("rainfall_3h", 0),
            "rainfall_24h_est": round(rain_1h * 8, 1),  # rough estimate
            "humidity": data.get("humidity", 0),
            "intensity": (
                "EXTREME" if rain_1h > 50 else
                "HEAVY" if rain_1h > 20 else
                "MODERATE" if rain_1h > 7 else
                "LIGHT" if rain_1h > 1 else "NONE"
            ),
        })

    summary.sort(key=lambda x: x["rainfall_1h"], reverse=True)
    return {"timestamp": datetime.utcnow().isoformat(), "stations": summary}
