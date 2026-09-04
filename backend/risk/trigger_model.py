"""
GeoRakshak — Trigger Risk Prediction Model

Gradient Boosted model for real-time landslide trigger assessment.
Combines weather, sensor, and terrain data to predict imminent risk.

Model Architecture:
    Input:  8 features (susceptibility, rainfall_1h, rainfall_24h, soil_moisture,
            tilt_magnitude, humidity, antecedent_rain_3d, antecedent_rain_7d)
    Output: Trigger probability [0, 1] + risk level + contributing factors

This model answers: "Given current conditions, how likely is a landslide
to be triggered in the next 1-6 hours?"
"""
import numpy as np
from typing import Dict, List, Optional


class GradientBoostedTrigger:
    """
    Gradient Boosted Decision Stumps for trigger prediction.
    
    Simplified GBM implementation suitable for SIH demo.
    Production would use XGBoost/LightGBM with proper hyperparameter tuning.
    """
    
    def __init__(self, n_estimators: int = 50, learning_rate: float = 0.1,
                 max_depth: int = 3, seed: int = 42):
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.seed = seed
        self.stumps: List = []
        self.base_prediction = 0.0
        self.feature_names = [
            "susceptibility", "slope_deg", "rainfall_1h", "rainfall_24h", "soil_moisture",
            "tilt_magnitude", "humidity", "antecedent_3d", "antecedent_7d", "forecast_48h"
        ]
        self.feature_importances_: Optional[np.ndarray] = None
        self.is_fitted = False
        self.metrics: Dict = {}
    
    def _sigmoid(self, x: np.ndarray) -> np.ndarray:
        """Numerically stable sigmoid."""
        return np.where(x >= 0, 1 / (1 + np.exp(-x)), np.exp(x) / (1 + np.exp(x)))
    
    def _encode_conditions(self, susceptibility: float, slope_deg: float, rainfall_1h: float,
                           rainfall_24h: float, soil_moisture: float,
                           tilt_magnitude: float, humidity: float,
                           antecedent_3d: float = 0, antecedent_7d: float = 0, forecast_48h: float = 0) -> np.ndarray:
        """Normalize input conditions to [0, 1] feature vector."""
        return np.array([
            min(susceptibility, 1.0),
            min(slope_deg / 60, 1.0),         # 60 deg ~ extreme sheer face
            min(rainfall_1h / 80, 1.0),      # 80mm/h ~ extreme
            min(rainfall_24h / 250, 1.0),     # 250mm/24h ~ extreme
            min(soil_moisture / 100, 1.0),
            min(tilt_magnitude / 5.0, 1.0),   # 5° ~ critical
            min(humidity / 100, 1.0),
            min(antecedent_3d / 200, 1.0),    # 200mm/3d ~ extreme
            min(antecedent_7d / 500, 1.0),    # 500mm/7d ~ extreme
            min(forecast_48h / 200, 1.0),     # 200mm/48h ~ extreme advanced warning
        ])
    
    def fit(self, X: np.ndarray, y: np.ndarray) -> "GradientBoostedTrigger":
        """
        Train GBM on feature matrix X and binary labels y.
        Uses gradient descent on log-loss.
        """
        np.random.seed(self.seed)
        n_samples, n_features = X.shape
        
        # Initialize with log-odds
        pos_rate = np.clip(y.mean(), 0.01, 0.99)
        self.base_prediction = float(np.log(pos_rate / (1 - pos_rate)))
        
        F = np.full(n_samples, self.base_prediction)
        self.stumps = []
        importance_accum = np.zeros(n_features)
        
        for t in range(self.n_estimators):
            # Compute pseudo-residuals (negative gradient of log-loss)
            probs = self._sigmoid(F)
            residuals = y - probs
            
            # Fit decision stump to residuals
            stump = self._fit_stump(X, residuals, n_features)
            self.stumps.append(stump)
            
            # Update predictions
            for i in range(n_samples):
                F[i] += self.learning_rate * self._predict_stump(stump, X[i])
            
            # Track importance
            importance_accum[stump["feature"]] += abs(stump.get("gain", 0.01))
        
        # Normalize importances
        total = importance_accum.sum()
        self.feature_importances_ = importance_accum / total if total > 0 else np.ones(n_features) / n_features
        self.is_fitted = True
        
        # Compute metrics
        y_pred_proba = self._sigmoid(F)
        y_pred = (y_pred_proba >= 0.5).astype(int)
        
        tp = ((y_pred == 1) & (y == 1)).sum()
        fp = ((y_pred == 1) & (y == 0)).sum()
        fn = ((y_pred == 0) & (y == 1)).sum()
        tn = ((y_pred == 0) & (y == 0)).sum()
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        
        self.metrics = {
            "accuracy": float(np.mean(y_pred == y)),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "auc_roc_approx": round(float(self._approx_auc(y, y_pred_proba)), 4),
            "confusion_matrix": {"tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn)},
            "n_samples": int(n_samples),
            "n_estimators": self.n_estimators,
            "learning_rate": self.learning_rate,
            "feature_importances": {
                name: round(float(imp), 4)
                for name, imp in zip(self.feature_names, self.feature_importances_)
            },
        }
        
        return self
    
    def _fit_stump(self, X: np.ndarray, residuals: np.ndarray, n_features: int) -> dict:
        """Find best single-split stump for residuals."""
        best_gain = -1
        best = {"feature": 0, "threshold": 0.5, "left_val": 0, "right_val": 0, "gain": 0}
        
        for f in range(n_features):
            thresholds = np.percentile(X[:, f], [20, 40, 60, 80])
            for thresh in thresholds:
                left_mask = X[:, f] <= thresh
                right_mask = ~left_mask
                if left_mask.sum() < 2 or right_mask.sum() < 2:
                    continue
                
                left_val = residuals[left_mask].mean()
                right_val = residuals[right_mask].mean()
                
                # Gain = variance reduction
                gain = (left_mask.sum() * left_val**2 + right_mask.sum() * right_val**2)
                
                if gain > best_gain:
                    best_gain = gain
                    best = {
                        "feature": f,
                        "threshold": float(thresh),
                        "left_val": float(left_val),
                        "right_val": float(right_val),
                        "gain": float(gain),
                    }
        
        return best
    
    def _predict_stump(self, stump: dict, x: np.ndarray) -> float:
        """Predict with a single stump."""
        if x[stump["feature"]] <= stump["threshold"]:
            return stump["left_val"]
        return stump["right_val"]
    
    def _approx_auc(self, y_true: np.ndarray, y_score: np.ndarray) -> float:
        """Approximate AUC-ROC using trapezoidal rule."""
        sorted_idx = np.argsort(-y_score)
        y_sorted = y_true[sorted_idx]
        
        n_pos = y_true.sum()
        n_neg = len(y_true) - n_pos
        if n_pos == 0 or n_neg == 0:
            return 0.5
        
        tpr_prev, fpr_prev = 0.0, 0.0
        auc = 0.0
        tp, fp = 0, 0
        
        for i in range(len(y_sorted)):
            if y_sorted[i] == 1:
                tp += 1
            else:
                fp += 1
            tpr = tp / n_pos
            fpr = fp / n_neg
            auc += (fpr - fpr_prev) * (tpr + tpr_prev) / 2
            tpr_prev, fpr_prev = tpr, fpr
        
        return auc
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Predict trigger probabilities."""
        if not self.is_fitted:
            raise RuntimeError("Model not fitted")
        
        F = np.full(len(X), self.base_prediction)
        for stump in self.stumps:
            for i in range(len(X)):
                F[i] += self.learning_rate * self._predict_stump(stump, X[i])
        return self._sigmoid(F)
    
    def predict_conditions(self, susceptibility: float, slope_deg: float, rainfall_1h: float,
                          rainfall_24h: float, soil_moisture: float,
                          tilt_magnitude: float, humidity: float,
                          antecedent_3d: float = 0, antecedent_7d: float = 0, forecast_48h: float = 0) -> dict:
        """
        Predict trigger risk from current conditions.
        Returns probability, risk level, and contributing factors.
        """
        features = self._encode_conditions(
            susceptibility, slope_deg, rainfall_1h, rainfall_24h, soil_moisture,
            tilt_magnitude, humidity, antecedent_3d, antecedent_7d, forecast_48h
        )
        prob = float(self.predict_proba(features.reshape(1, -1))[0])
        
        # Override risk if intense forecasting predicts early disaster
        if forecast_48h > 120 and prob < 0.75:
            risk_level = "EARLY WARNING (48HR)"
            prob = max(prob, 0.85)  # Spike the confidence of alert
        elif prob >= 0.75:
            risk_level = "CRITICAL"
        elif prob >= 0.50:
            risk_level = "HIGH"
        elif prob >= 0.25:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"
        
        # Build reason list
        reasons = []
        raw_vals = {
            "rainfall_1h": rainfall_1h, "rainfall_24h": rainfall_24h,
            "soil_moisture": soil_moisture, "tilt_magnitude": tilt_magnitude,
            "humidity": humidity, "antecedent_3d": antecedent_3d,
            "forecast_48h": forecast_48h, "slope_deg": slope_deg
        }
        
        if forecast_48h > 120:
            reasons.append(f"Severe forecasted rainfall approaching ({forecast_48h:.0f}mm/48h)")
            
        if slope_deg > 35:
            reasons.append(f"Critical steep slope multiplier ({slope_deg:.1f}°)")

        if rainfall_1h > 30:
            reasons.append(f"Extreme hourly rainfall ({rainfall_1h:.0f}mm/h)")
        elif rainfall_1h > 15:
            reasons.append(f"Heavy hourly rainfall ({rainfall_1h:.0f}mm/h)")
        
        if rainfall_24h > 100:
            reasons.append(f"Very high cumulative rainfall ({rainfall_24h:.0f}mm/24h)")
        
        if soil_moisture > 80:
            reasons.append(f"Near-saturated soil ({soil_moisture:.0f}%)")
        elif soil_moisture > 60:
            reasons.append(f"Elevated soil moisture ({soil_moisture:.0f}%)")
        
        if tilt_magnitude > 1.0:
            reasons.append(f"Significant ground movement ({tilt_magnitude:.2f}°)")
        
        if susceptibility > 0.7:
            reasons.append(f"High terrain susceptibility ({susceptibility:.0%})")
        
        if antecedent_3d > 100:
            reasons.append(f"Heavy antecedent rainfall ({antecedent_3d:.0f}mm/3d)")
        
        if not reasons:
            reasons.append("Normal conditions — no significant triggers")
        
        # Feature contributions
        contributions = []
        if self.feature_importances_ is not None:
            for i, (name, imp) in enumerate(zip(self.feature_names, self.feature_importances_)):
                contributions.append({
                    "feature": name,
                    "value": round(float(features[i]), 3),
                    "importance": round(float(imp), 4),
                    "contribution": round(float(features[i] * imp), 4),
                })
            contributions.sort(key=lambda x: x["contribution"], reverse=True)
        
        return {
            "trigger_probability": round(prob, 4),
            "risk_level": risk_level,
            "confidence": round(min(0.95, 0.55 + abs(prob - 0.5) * 0.7), 3),
            "model": "GradientBoosted",
            "reasons": reasons,
            "contributions": contributions[:5],  # Top 5
        }
    
    def to_dict(self) -> dict:
        """Serialize."""
        return {
            "n_estimators": self.n_estimators,
            "learning_rate": self.learning_rate,
            "max_depth": self.max_depth,
            "seed": self.seed,
            "base_prediction": self.base_prediction,
            "stumps": self.stumps,
            "feature_importances": self.feature_importances_.tolist() if self.feature_importances_ is not None else None,
            "metrics": self.metrics,
            "is_fitted": self.is_fitted,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "GradientBoostedTrigger":
        """Load from dict."""
        model = cls(
            n_estimators=data["n_estimators"],
            learning_rate=data["learning_rate"],
            max_depth=data["max_depth"],
            seed=data["seed"],
        )
        model.base_prediction = data["base_prediction"]
        model.stumps = data["stumps"]
        model.feature_importances_ = np.array(data["feature_importances"]) if data["feature_importances"] else None
        model.metrics = data.get("metrics", {})
        model.is_fitted = data["is_fitted"]
        return model
