"""
GeoRakshak — Terrain & GIS Routes
"""
from fastapi import APIRouter, HTTPException

from gis.terrain_service import (
    get_zone_terrain, calculate_susceptibility_from_terrain,
    get_all_terrain, ZONE_TERRAIN,
)
from landslide.landslide_data import (
    get_all_events, get_events_by_state, get_events_by_severity,
    calculate_landslide_density,
)

router = APIRouter(prefix="/api", tags=["terrain", "landslides"])


# ─── TERRAIN ──────────────────────────────────────────────────

@router.get("/terrain")
def get_all_zones_terrain():
    """Terrain profiles for all risk zones."""
    return {"zones": get_all_terrain()}


@router.get("/terrain/{zone_code}")
def get_terrain_profile(zone_code: str):
    """Terrain profile for a specific risk zone."""
    if zone_code not in ZONE_TERRAIN:
        raise HTTPException(status_code=404, detail=f"Zone {zone_code} not found")
    return get_zone_terrain(zone_code)


@router.get("/terrain/{zone_code}/susceptibility")
def get_susceptibility(zone_code: str):
    """
    Compute terrain-based susceptibility with factor breakdown.
    Shows how each geomorphological factor contributes to the score.
    """
    if zone_code not in ZONE_TERRAIN:
        raise HTTPException(status_code=404, detail=f"Zone {zone_code} not found")
    return calculate_susceptibility_from_terrain(zone_code)


# ─── LANDSLIDE HISTORY ────────────────────────────────────────

@router.get("/landslides/verified")
def get_verified_landslides(state: str = None, severity: str = None):
    """
    Verified historical landslide events with source attribution.
    All events are from documented public records (GSI, NDMA, SDMA).
    """
    events = get_all_events()
    if state:
        events = [e for e in events if e["state"].lower() == state.lower()]
    if severity:
        events = [e for e in events if e["severity"].upper() == severity.upper()]

    # Convert to GeoJSON
    features = []
    for e in events:
        features.append({
            "type": "Feature",
            "properties": {k: v for k, v in e.items() if k not in ("latitude", "longitude")},
            "geometry": {"type": "Point", "coordinates": [e["longitude"], e["latitude"]]},
        })
    
    return {
        "type": "FeatureCollection",
        "total_events": len(features),
        "source_note": "Documented events from GSI, NDMA, SDMA, and verified media reports",
        "features": features,
    }


@router.get("/landslides/density")
def get_landslide_density_at(lat: float, lon: float, radius_km: float = 50):
    """
    Calculate historical landslide density around a point.
    Returns density score (0–100) used as a feature in the risk engine.
    """
    return calculate_landslide_density(lat, lon, radius_km)


@router.get("/landslides/stats")
def get_landslide_stats():
    """Aggregate statistics of documented NER landslide events."""
    events = get_all_events()
    states = {}
    for e in events:
        s = e["state"]
        if s not in states:
            states[s] = {"events": 0, "fatalities": 0, "injuries": 0, "severities": {}}
        states[s]["events"] += 1
        states[s]["fatalities"] += e.get("fatalities", 0)
        states[s]["injuries"] += e.get("injuries", 0)
        sev = e.get("severity", "UNKNOWN")
        states[s]["severities"][sev] = states[s]["severities"].get(sev, 0) + 1

    return {
        "total_events": len(events),
        "total_fatalities": sum(e.get("fatalities", 0) for e in events),
        "total_injuries": sum(e.get("injuries", 0) for e in events),
        "by_state": states,
        "source_note": "Compiled from GSI, NDMA, state SDMA records, and verified reports",
    }
