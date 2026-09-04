"""
GeoRakshak — Risk Engine (Phase 1)

Rule-based risk scoring that combines terrain susceptibility with real-time
trigger conditions. This will be replaced/augmented by ML models in Phase 3.

Architecture:
  Susceptibility (static terrain) + Trigger (dynamic conditions) → Risk Fusion → Score + Reasons
"""
from typing import Optional
from datetime import datetime


def _normalize(value: float, low: float, high: float) -> float:
    """Clamp and scale a value to 0–100."""
    if value <= low:
        return 0.0
    if value >= high:
        return 100.0
    return ((value - low) / (high - low)) * 100.0


def calculate_rainfall_score(rainfall_1h: float = 0, rainfall_24h: float = 0) -> float:
    """
    Score rainfall trigger condition 0–100.

    Thresholds are configurable placeholders, NOT universally validated cutoffs.
    They are calibrated for NER monsoon conditions and should be validated
    with local meteorological data.
    """
    score_1h = _normalize(rainfall_1h, low=5, high=50)      # mm in 1 hour
    score_24h = _normalize(rainfall_24h, low=30, high=200)   # mm in 24 hours
    return max(score_1h, score_24h)


def calculate_soil_score(soil_moisture: float = 0) -> float:
    """Score soil moisture condition 0–100."""
    return _normalize(soil_moisture, low=30, high=90)  # percentage


def calculate_movement_score(tilt_x: float = 0, tilt_y: float = 0) -> float:
    """Score ground movement from IMU/tilt readings 0–100."""
    magnitude = (tilt_x ** 2 + tilt_y ** 2) ** 0.5
    return _normalize(magnitude, low=0.3, high=5.0)  # degrees


def calculate_risk(
    susceptibility: float = 50.0,
    rainfall_1h: float = 0,
    rainfall_24h: float = 0,
    soil_moisture: float = 0,
    tilt_x: float = 0,
    tilt_y: float = 0,
    historical_density: float = 50.0,
) -> dict:
    """
    Risk fusion engine (Phase 1 — rule-based).

    Combines terrain susceptibility with dynamic trigger signals to produce
    a composite risk score with contributing factors.

    Returns:
        dict with risk_score, risk_level, confidence, and factor breakdown.

    NOTE: This is a decision-support tool. The output is an advisory risk
    assessment, not a definitive prediction. Government authorities remain
    responsible for final operational decisions.
    """
    # Compute individual factor scores (0–100)
    terrain_score = susceptibility * 100  # already 0–1 in DB
    rainfall_score = calculate_rainfall_score(rainfall_1h, rainfall_24h)
    soil_score = calculate_soil_score(soil_moisture)
    movement_score = calculate_movement_score(tilt_x, tilt_y)
    historical_score = historical_density  # already 0–100

    # Weighted fusion
    # Weights reflect relative importance — these are configurable, not universal
    weights = {
        "terrain": 0.25,
        "rainfall": 0.30,
        "soil": 0.20,
        "movement": 0.15,
        "historical": 0.10,
    }

    risk_score = (
        weights["terrain"] * terrain_score
        + weights["rainfall"] * rainfall_score
        + weights["soil"] * soil_score
        + weights["movement"] * movement_score
        + weights["historical"] * historical_score
    )

    # Ground movement is a strong independent warning signal
    # If significant movement is detected, ensure minimum risk floor
    if movement_score > 60:
        risk_score = max(risk_score, 65)
    if movement_score > 80:
        risk_score = max(risk_score, 80)

    risk_score = min(risk_score, 100)

    # Determine level
    if risk_score >= 80:
        risk_level = "CRITICAL"
    elif risk_score >= 60:
        risk_level = "HIGH"
    elif risk_score >= 40:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"

    # Confidence — based on data availability and consistency
    data_points = sum([
        1 for v in [rainfall_1h, rainfall_24h, soil_moisture, tilt_x, tilt_y]
        if v is not None and v > 0
    ])
    confidence = min(0.5 + (data_points * 0.1), 0.95)

    # Contributing factors — sorted by impact
    factors_detail = [
        {"factor": "Rainfall", "score": round(rainfall_score, 1),
         "level": _level_label(rainfall_score), "weight": weights["rainfall"]},
        {"factor": "Terrain Susceptibility", "score": round(terrain_score, 1),
         "level": _level_label(terrain_score), "weight": weights["terrain"]},
        {"factor": "Soil Moisture", "score": round(soil_score, 1),
         "level": _level_label(soil_score), "weight": weights["soil"]},
        {"factor": "Ground Movement", "score": round(movement_score, 1),
         "level": _level_label(movement_score), "weight": weights["movement"]},
        {"factor": "Historical Risk", "score": round(historical_score, 1),
         "level": _level_label(historical_score), "weight": weights["historical"]},
    ]
    factors_detail.sort(key=lambda x: x["score"], reverse=True)

    # Build reason strings
    reasons = []
    if rainfall_score > 60:
        reasons.append("High cumulative rainfall detected")
    if soil_score > 60:
        reasons.append("Elevated soil moisture")
    if terrain_score > 60:
        reasons.append("High terrain susceptibility")
    if movement_score > 30:
        reasons.append("Ground movement detected")
    if historical_score > 60:
        reasons.append("Area has significant landslide history")
    if not reasons:
        reasons.append("Current conditions within normal parameters")

    return {
        "risk_score": round(risk_score, 1),
        "risk_level": risk_level,
        "confidence": round(confidence, 2),
        "terrain_score": round(terrain_score, 1),
        "rainfall_score": round(rainfall_score, 1),
        "soil_score": round(soil_score, 1),
        "movement_score": round(movement_score, 1),
        "historical_score": round(historical_score, 1),
        "factors": factors_detail,
        "reasons": reasons,
        "model_version": "rule-based-v1",
        "timestamp": datetime.utcnow().isoformat(),
    }


def _level_label(score: float) -> str:
    if score >= 80:
        return "Very High"
    if score >= 60:
        return "High"
    if score >= 40:
        return "Moderate"
    if score >= 20:
        return "Low"
    return "Very Low"
