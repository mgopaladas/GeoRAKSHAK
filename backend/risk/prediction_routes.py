"""
GeoRakshak — ML Prediction API Routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from gis.terrain_service import ZONE_TERRAIN, get_zone_terrain
from risk.training import load_models

router = APIRouter(prefix="/api/predict", tags=["predictions"])

# Load models at startup
_susc_model, _trig_model = None, None


def _get_models():
    """Lazy-load models."""
    global _susc_model, _trig_model
    if _susc_model is None or _trig_model is None:
        _susc_model, _trig_model = load_models()
    return _susc_model, _trig_model


class RiskPredictionRequest(BaseModel):
    zone_code: str
    rainfall_1h: float = 0
    rainfall_24h: float = 0
    soil_moisture: float = 30
    tilt_x: float = 0
    tilt_y: float = 0
    humidity: float = 70
    antecedent_3d: float = 0
    antecedent_7d: float = 0


@router.post("/risk")
def predict_risk(req: RiskPredictionRequest):
    """
    Real-time ML risk prediction for a zone.
    Combines susceptibility model + trigger model.
    """
    susc_model, trig_model = _get_models()

    terrain = ZONE_TERRAIN.get(req.zone_code)
    if not terrain:
        raise HTTPException(status_code=404, detail=f"Zone {req.zone_code} not found")

    # Step 1: ML susceptibility
    if susc_model and susc_model.is_fitted:
        susc_result = susc_model.predict_terrain(terrain)
        susceptibility = susc_result["susceptibility"]
    else:
        # Fallback to rule-based
        from gis.terrain_service import calculate_susceptibility_from_terrain
        fb = calculate_susceptibility_from_terrain(req.zone_code)
        susceptibility = fb["susceptibility"]
        susc_result = {"susceptibility": susceptibility, "class": "RULE-BASED", "contributions": []}

    # Step 2: ML trigger
    tilt_mag = (req.tilt_x ** 2 + req.tilt_y ** 2) ** 0.5

    if trig_model and trig_model.is_fitted:
        trig_result = trig_model.predict_conditions(
            susceptibility=susceptibility,
            rainfall_1h=req.rainfall_1h,
            rainfall_24h=req.rainfall_24h,
            soil_moisture=req.soil_moisture,
            tilt_magnitude=tilt_mag,
            humidity=req.humidity,
            antecedent_3d=req.antecedent_3d,
            antecedent_7d=req.antecedent_7d,
        )
    else:
        # Minimal fallback
        from risk.engine import calculate_risk
        fb = calculate_risk(
            susceptibility=susceptibility * 100,
            rainfall_1h=req.rainfall_1h,
            rainfall_24h=req.rainfall_24h,
            soil_moisture=req.soil_moisture,
            tilt_x=req.tilt_x,
            tilt_y=req.tilt_y,
        )
        trig_result = {
            "trigger_probability": fb["risk_score"] / 100,
            "risk_level": fb["risk_level"],
            "reasons": fb["reasons"],
            "model": "rule-based-fallback",
        }

    # Step 3: Composite score
    composite = round(susceptibility * 0.4 + trig_result["trigger_probability"] * 0.6, 4)
    
    return {
        "zone_code": req.zone_code,
        "terrain_class": terrain.get("terrain_class", ""),
        "susceptibility": susc_result,
        "trigger": trig_result,
        "composite_risk": composite,
        "composite_level": (
            "CRITICAL" if composite >= 0.75 else
            "HIGH" if composite >= 0.50 else
            "MODERATE" if composite >= 0.25 else "LOW"
        ),
        "model_version": "ml-v1",
        "note": "ML-powered prediction — models trained on NER terrain + weather data",
    }


@router.get("/susceptibility/{zone_code}")
def predict_susceptibility(zone_code: str):
    """ML susceptibility prediction with feature importance."""
    susc_model, _ = _get_models()
    
    terrain = ZONE_TERRAIN.get(zone_code)
    if not terrain:
        raise HTTPException(status_code=404, detail=f"Zone {zone_code} not found")
    
    if susc_model and susc_model.is_fitted:
        result = susc_model.predict_terrain(terrain)
        return {
            "zone_code": zone_code,
            "terrain_class": terrain.get("terrain_class", ""),
            "geology": terrain.get("geology", ""),
            **result,
            "model_version": "rf-v1",
        }
    else:
        from gis.terrain_service import calculate_susceptibility_from_terrain
        return calculate_susceptibility_from_terrain(zone_code)


@router.get("/model-info")
def get_model_info():
    """Active model metadata and performance metrics."""
    susc_model, trig_model = _get_models()
    
    return {
        "susceptibility_model": {
            "name": "RandomForest Susceptibility",
            "version": "rf-v1",
            "status": "active" if (susc_model and susc_model.is_fitted) else "not_trained",
            "metrics": susc_model.metrics if susc_model else {},
        },
        "trigger_model": {
            "name": "GradientBoosted Trigger",
            "version": "gb-v1",
            "status": "active" if (trig_model and trig_model.is_fitted) else "not_trained",
            "metrics": trig_model.metrics if trig_model else {},
        },
        "methodology": "Phase 3 ML — terrain susceptibility + real-time trigger prediction",
        "data_source": "NER terrain profiles + calibrated synthetic training data",
    }


@router.get("/all-zones")
def predict_all_zones():
    """ML susceptibility predictions for all 8 NER zones."""
    susc_model, _ = _get_models()
    
    results = []
    for zone_code, terrain in ZONE_TERRAIN.items():
        if susc_model and susc_model.is_fitted:
            pred = susc_model.predict_terrain(terrain)
        else:
            pred = {"susceptibility": 0.5, "class": "NOT_TRAINED", "contributions": []}
        
        results.append({
            "zone_code": zone_code,
            "terrain_class": terrain.get("terrain_class", ""),
            "elevation_m": terrain.get("elevation_m", 0),
            "slope_deg": terrain.get("slope_deg", 0),
            "susceptibility": pred["susceptibility"],
            "class": pred["class"],
            "top_factor": pred["contributions"][0]["feature"] if pred.get("contributions") else "N/A",
        })
    
    results.sort(key=lambda x: x["susceptibility"], reverse=True)
    return {"zones": results, "model": "RandomForest rf-v1"}
