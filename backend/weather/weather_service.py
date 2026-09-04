"""
GeoRakshak — Weather Service

Fetches current weather + 5-day forecast from OpenWeatherMap for NER sensor stations.
Falls back to synthetic data generation when API key is not configured.

Data Source: OpenWeatherMap API (https://openweathermap.org/api)
License: Free tier — 60 calls/min, 1M calls/month
"""
import asyncio
import random
import math
from datetime import datetime, timedelta
from typing import Optional

import httpx

# ─── NER Station Locations ────────────────────────────────────

STATION_COORDS = {
    "GR-S001": {"name": "Shillong Peak", "lat": 25.5788, "lon": 91.8933},
    "GR-S002": {"name": "Sohra (Cherrapunji)", "lat": 25.2961, "lon": 91.7320},
    "GR-S003": {"name": "Guwahati Hill", "lat": 26.1445, "lon": 91.7362},
    "GR-S004": {"name": "Aizawl Ridge", "lat": 23.7271, "lon": 92.7176},
    "GR-S005": {"name": "Itanagar Slope", "lat": 27.0844, "lon": 93.6053},
    "GR-S006": {"name": "Kohima Highland", "lat": 25.6751, "lon": 94.1086},
    "GR-S007": {"name": "Mawsynram", "lat": 25.2972, "lon": 91.5822},
    "GR-S008": {"name": "Nongstoin", "lat": 25.5218, "lon": 91.2654},
}

OWM_BASE = "https://api.openweathermap.org/data/2.5"


# ─── OpenWeatherMap Adapter ───────────────────────────────────

async def fetch_current_weather(api_key: str, lat: float, lon: float) -> dict:
    """Fetch current weather from OpenWeatherMap."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{OWM_BASE}/weather",
            params={"lat": lat, "lon": lon, "appid": api_key, "units": "metric"},
        )
        resp.raise_for_status()
        data = resp.json()

    return {
        "temperature": data["main"]["temp"],
        "feels_like": data["main"]["feels_like"],
        "humidity": data["main"]["humidity"],
        "pressure": data["main"]["pressure"],
        "wind_speed": data.get("wind", {}).get("speed", 0),
        "wind_direction": data.get("wind", {}).get("deg", 0),
        "clouds": data.get("clouds", {}).get("all", 0),
        "visibility": data.get("visibility", 10000),
        "description": data["weather"][0]["description"] if data.get("weather") else "",
        "icon": data["weather"][0]["icon"] if data.get("weather") else "",
        "rainfall_1h": data.get("rain", {}).get("1h", 0),
        "rainfall_3h": data.get("rain", {}).get("3h", 0),
        "timestamp": datetime.utcfromtimestamp(data["dt"]).isoformat(),
        "source": "OpenWeatherMap",
    }


async def fetch_forecast(api_key: str, lat: float, lon: float) -> list:
    """Fetch 5-day/3-hour forecast from OpenWeatherMap."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{OWM_BASE}/forecast",
            params={"lat": lat, "lon": lon, "appid": api_key, "units": "metric"},
        )
        resp.raise_for_status()
        data = resp.json()

    forecasts = []
    for item in data.get("list", []):
        forecasts.append({
            "timestamp": item["dt_txt"],
            "temperature": item["main"]["temp"],
            "humidity": item["main"]["humidity"],
            "pressure": item["main"]["pressure"],
            "wind_speed": item.get("wind", {}).get("speed", 0),
            "clouds": item.get("clouds", {}).get("all", 0),
            "rainfall_3h": item.get("rain", {}).get("3h", 0),
            "description": item["weather"][0]["description"] if item.get("weather") else "",
            "icon": item["weather"][0]["icon"] if item.get("weather") else "",
            "pop": item.get("pop", 0),  # Probability of precipitation
        })
    return forecasts


async def fetch_all_stations_weather(api_key: str) -> dict:
    """Fetch current weather for all NER stations."""
    results = {}
    for station_id, coords in STATION_COORDS.items():
        try:
            weather = await fetch_current_weather(api_key, coords["lat"], coords["lon"])
            weather["station_id"] = station_id
            weather["station_name"] = coords["name"]
            weather["latitude"] = coords["lat"]
            weather["longitude"] = coords["lon"]
            results[station_id] = weather
        except Exception as e:
            results[station_id] = {
                "station_id": station_id,
                "station_name": coords["name"],
                "error": str(e),
            }
    return results


# ─── Synthetic Weather (fallback) ─────────────────────────────

def generate_synthetic_weather(station_id: str) -> dict:
    """Generate realistic NER monsoon weather when API is unavailable."""
    coords = STATION_COORDS.get(station_id, {"name": "Unknown", "lat": 25.5, "lon": 92.0})
    hour = datetime.utcnow().hour
    
    # Simulate monsoon diurnal patterns
    rain_base = random.uniform(0, 15)
    # Higher altitude = more rain, afternoon peak
    alt_factor = 1.0
    if station_id in ("GR-S002", "GR-S007"):  # Sohra/Mawsynram — wettest
        alt_factor = 3.5
        rain_base = random.uniform(5, 40)
    elif station_id in ("GR-S001", "GR-S006"):  # High altitude
        alt_factor = 1.8
    
    # Afternoon rainfall peak
    diurnal = 1 + 0.6 * math.sin((hour - 6) * math.pi / 12) if 6 <= hour <= 18 else 0.5

    rainfall = rain_base * diurnal * alt_factor
    
    return {
        "station_id": station_id,
        "station_name": coords["name"],
        "latitude": coords["lat"],
        "longitude": coords["lon"],
        "temperature": round(random.uniform(16, 28) - (alt_factor * 2), 1),
        "feels_like": round(random.uniform(15, 27) - (alt_factor * 2), 1),
        "humidity": round(random.uniform(72, 98), 0),
        "pressure": round(random.uniform(990, 1015), 1),
        "wind_speed": round(random.uniform(1, 12), 1),
        "wind_direction": random.randint(90, 270),
        "clouds": random.randint(40, 100),
        "visibility": random.randint(2000, 10000),
        "description": random.choice([
            "light rain", "moderate rain", "heavy intensity rain",
            "overcast clouds", "broken clouds", "thunderstorm with rain",
        ]),
        "icon": "10d" if rainfall > 5 else "04d",
        "rainfall_1h": round(rainfall, 1),
        "rainfall_3h": round(rainfall * 2.5, 1),
        "timestamp": datetime.utcnow().isoformat(),
        "source": "Synthetic (demo)",
    }


def generate_synthetic_forecast(station_id: str) -> list:
    """Generate 5-day/3-hour synthetic forecast."""
    now = datetime.utcnow()
    forecasts = []
    for i in range(40):  # 40 × 3h = 5 days
        t = now + timedelta(hours=i * 3)
        hour = t.hour
        day_factor = 1 + 0.5 * math.sin((hour - 6) * math.pi / 12)
        
        rain_intensity = random.uniform(0, 20) * day_factor
        if station_id in ("GR-S002", "GR-S007"):
            rain_intensity *= 3
        
        # Add monsoon pattern — heavier mid-week
        week_factor = 1 + 0.3 * math.sin(i * math.pi / 20)
        rain_intensity *= week_factor
        
        forecasts.append({
            "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
            "temperature": round(random.uniform(16, 26) + 3 * math.sin(hour * math.pi / 12), 1),
            "humidity": round(min(99, random.uniform(70, 95) + rain_intensity), 0),
            "pressure": round(random.uniform(995, 1012), 1),
            "wind_speed": round(random.uniform(1, 15), 1),
            "clouds": min(100, int(40 + rain_intensity * 3)),
            "rainfall_3h": round(max(0, rain_intensity), 1),
            "description": "rain" if rain_intensity > 5 else "clouds",
            "icon": "10d" if rain_intensity > 5 else "04d",
            "pop": round(min(1.0, rain_intensity / 25), 2),
        })
    return forecasts


def get_all_synthetic_weather() -> dict:
    """All stations — synthetic fallback."""
    return {sid: generate_synthetic_weather(sid) for sid in STATION_COORDS}
