"""
GeoRakshak — Terrain Analysis Service

Provides elevation, slope, aspect, and terrain classification for risk zones.
Phase 2 uses pre-computed terrain metadata stored in zone properties.
Phase 3 will integrate with SRTM/ASTER DEM data.

Data Sources:
  - SRTM 30m DEM (NASA) — global coverage
  - ASTER GDEM v3 — 30m resolution
  - ISRO CartoDEM — India-specific
"""

# ─── NER Terrain Profiles ─────────────────────────────────────
#
# Pre-computed terrain characteristics for each risk zone.
# These approximate the real geomorphological conditions at each
# demo sensor location based on known terrain data.
#
# Methodology: Values are based on published literature, GSI terrain
# classifications, and approximate DEM-derived parameters for the
# respective localities.

ZONE_TERRAIN = {
    "RZ-001": {  # Shillong Peak
        "elevation_m": 1965,
        "slope_deg": 28,
        "aspect": "NE",
        "relief_m": 450,
        "geology": "Shillong Series — Quartzite, Schist",
        "soil_type": "Red lateritic",
        "land_cover": "Mixed forest / grass",
        "drainage_density": "Medium",
        "terrain_class": "Moderately dissected plateau",
        "vegetation_index": 0.65,
        "curvature": "Convex",
        "twi": 4.2,  # Topographic Wetness Index
        "spi": 2.1,  # Stream Power Index
    },
    "RZ-002": {  # Sohra (Cherrapunji)
        "elevation_m": 1484,
        "slope_deg": 42,
        "aspect": "S",
        "relief_m": 800,
        "geology": "Limestone, Sandstone (Eocene)",
        "soil_type": "Thin lateritic over limestone",
        "land_cover": "Sparse vegetation / grassland",
        "drainage_density": "High",
        "terrain_class": "Steep escarpment",
        "vegetation_index": 0.35,
        "curvature": "Concave",
        "twi": 6.8,
        "spi": 5.4,
    },
    "RZ-003": {  # Guwahati Hill
        "elevation_m": 55,
        "slope_deg": 15,
        "aspect": "W",
        "relief_m": 120,
        "geology": "Gneiss, Granite (Precambrian)",
        "soil_type": "Alluvial / lateritic",
        "land_cover": "Urban / mixed vegetation",
        "drainage_density": "Low",
        "terrain_class": "Low hills / floodplain margin",
        "vegetation_index": 0.45,
        "curvature": "Planar",
        "twi": 8.1,
        "spi": 1.3,
    },
    "RZ-004": {  # Aizawl Ridge
        "elevation_m": 1132,
        "slope_deg": 38,
        "aspect": "W",
        "relief_m": 600,
        "geology": "Barail Group — Shale, Siltstone",
        "soil_type": "Sandy loam over shale",
        "land_cover": "Jhum (shifting cultivation) / secondary forest",
        "drainage_density": "High",
        "terrain_class": "Steep ridge and valley",
        "vegetation_index": 0.52,
        "curvature": "Convex",
        "twi": 5.5,
        "spi": 4.2,
    },
    "RZ-005": {  # Itanagar Foothills
        "elevation_m": 320,
        "slope_deg": 22,
        "aspect": "S",
        "relief_m": 280,
        "geology": "Siwalik Group — Sandstone, Conglomerate",
        "soil_type": "Sandy loam",
        "land_cover": "Dense sub-tropical forest",
        "drainage_density": "Medium",
        "terrain_class": "Foothill zone",
        "vegetation_index": 0.72,
        "curvature": "Concave",
        "twi": 5.8,
        "spi": 2.8,
    },
    "RZ-006": {  # Kohima Highland
        "elevation_m": 1444,
        "slope_deg": 35,
        "aspect": "E",
        "relief_m": 550,
        "geology": "Disang Group — Shale, Phyllite",
        "soil_type": "Clayey lateritic",
        "land_cover": "Secondary growth / jhum patches",
        "drainage_density": "High",
        "terrain_class": "Steep dissected terrain",
        "vegetation_index": 0.48,
        "curvature": "Convex",
        "twi": 5.1,
        "spi": 3.9,
    },
    "RZ-007": {  # Mawsynram
        "elevation_m": 1401,
        "slope_deg": 45,
        "aspect": "SW",
        "relief_m": 900,
        "geology": "Limestone, Sandstone (Cretaceous-Eocene)",
        "soil_type": "Thin organic over limestone",
        "land_cover": "Sparse grassland / exposed rock",
        "drainage_density": "Very High",
        "terrain_class": "Karst escarpment — highest annual rainfall zone",
        "vegetation_index": 0.28,
        "curvature": "Concave",
        "twi": 7.5,
        "spi": 6.8,
    },
    "RZ-008": {  # Nongstoin
        "elevation_m": 1300,
        "slope_deg": 30,
        "aspect": "N",
        "relief_m": 380,
        "geology": "Gneiss, Granite with laterite cap",
        "soil_type": "Red lateritic / forest soil",
        "land_cover": "Mixed deciduous forest",
        "drainage_density": "Medium",
        "terrain_class": "Undulating plateau",
        "vegetation_index": 0.62,
        "curvature": "Planar",
        "twi": 4.9,
        "spi": 2.4,
    },
}


def get_zone_terrain(zone_code: str) -> dict:
    """Get terrain profile for a risk zone."""
    terrain = ZONE_TERRAIN.get(zone_code)
    if not terrain:
        return {"error": f"No terrain data for zone {zone_code}"}
    return {"zone_code": zone_code, **terrain}


def calculate_susceptibility_from_terrain(zone_code: str) -> dict:
    """
    Compute terrain-based susceptibility score from geomorphological factors.

    Factors (weights are configurable, not universally validated):
      Slope        × 0.30 — Steeper = more susceptible
      Relief       × 0.15 — Greater local relief = more energy
      TWI          × 0.15 — Higher wetness index = more saturation
      SPI          × 0.10 — Higher stream power = more erosion
      Vegetation   × 0.15 — Less vegetation = less root cohesion
      Curvature    × 0.05 — Concave collects water
      Drainage     × 0.10 — Higher density = more water pathways
    """
    terrain = ZONE_TERRAIN.get(zone_code)
    if not terrain:
        return {"zone_code": zone_code, "susceptibility": 0.5, "error": "No terrain data"}

    # Normalize factors to 0–1
    slope_score = min(1.0, terrain["slope_deg"] / 50)
    relief_score = min(1.0, terrain["relief_m"] / 1000)
    twi_score = min(1.0, terrain["twi"] / 10)
    spi_score = min(1.0, terrain["spi"] / 8)
    veg_score = 1 - terrain["vegetation_index"]  # Less vegetation = higher risk
    curv_score = {"Concave": 0.8, "Planar": 0.4, "Convex": 0.6}.get(terrain["curvature"], 0.5)
    drain_map = {"Very High": 0.95, "High": 0.75, "Medium": 0.5, "Low": 0.25}
    drain_score = drain_map.get(terrain["drainage_density"], 0.5)

    weights = {
        "slope": 0.30, "relief": 0.15, "twi": 0.15, "spi": 0.10,
        "vegetation": 0.15, "curvature": 0.05, "drainage": 0.10,
    }

    susceptibility = (
        weights["slope"] * slope_score +
        weights["relief"] * relief_score +
        weights["twi"] * twi_score +
        weights["spi"] * spi_score +
        weights["vegetation"] * veg_score +
        weights["curvature"] * curv_score +
        weights["drainage"] * drain_score
    )

    factor_breakdown = [
        {"factor": "Slope", "value": terrain["slope_deg"], "unit": "°", "score": round(slope_score, 2), "weight": weights["slope"]},
        {"factor": "Relief", "value": terrain["relief_m"], "unit": "m", "score": round(relief_score, 2), "weight": weights["relief"]},
        {"factor": "TWI", "value": terrain["twi"], "unit": "", "score": round(twi_score, 2), "weight": weights["twi"]},
        {"factor": "SPI", "value": terrain["spi"], "unit": "", "score": round(spi_score, 2), "weight": weights["spi"]},
        {"factor": "Vegetation", "value": terrain["vegetation_index"], "unit": "NDVI", "score": round(veg_score, 2), "weight": weights["vegetation"]},
        {"factor": "Curvature", "value": terrain["curvature"], "unit": "", "score": round(curv_score, 2), "weight": weights["curvature"]},
        {"factor": "Drainage Density", "value": terrain["drainage_density"], "unit": "", "score": round(drain_score, 2), "weight": weights["drainage"]},
    ]
    factor_breakdown.sort(key=lambda x: x["score"] * x["weight"], reverse=True)

    return {
        "zone_code": zone_code,
        "susceptibility": round(susceptibility, 3),
        "terrain_class": terrain["terrain_class"],
        "geology": terrain["geology"],
        "factors": factor_breakdown,
    }


def get_all_terrain() -> dict:
    """All zone terrain profiles."""
    return {zc: get_zone_terrain(zc) for zc in ZONE_TERRAIN}
