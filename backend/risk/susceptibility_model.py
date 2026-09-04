"""
GeoRakshak — Landslide Susceptibility Model

Random Forest classifier that predicts landslide susceptibility from
terrain geomorphological features. Trained on NER terrain profiles
cross-referenced with historical landslide density.

Model Architecture:
    Input:  7 terrain features (slope, relief, TWI, SPI, vegetation, curvature, drainage)
    Output: Susceptibility probability [0, 1] + feature importance ranking

Reference: Methodology follows established LSM approaches:
    - Hong, H. et al. (2018). "Landslide susceptibility mapping using RF"
    - Merghadi, A. et al. (2020). "ML methods for landslide susceptibility"
"""
import numpy as np
from typing import Dict, List, Tuple, Optional
import json
import os

# We use sklearn-compatible approach but implement from scratch
# to avoid hard dependency for demo purposes

class RandomForestSusceptibility:
    """
    Random Forest model for terrain-based landslide susceptibility.
    
    Uses an ensemble of decision stumps with bootstrap aggregation.
    Simplified implementation suitable for SIH demo — production would
    use sklearn.ensemble.RandomForestClassifier with proper CV.
    """
    
    def __init__(self, n_estimators: int = 100, max_depth: int = 5, seed: int = 42):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.seed = seed
        self.trees: List = []
        self.feature_names = [
            "slope_deg", "relief_m", "twi", "spi",
            "vegetation_index", "curvature_score", "drainage_score"
        ]
        self.feature_importances_: Optional[np.ndarray] = None
        self.is_fitted = False
        self.metrics: Dict = {}
    
    def _encode_terrain(self, terrain: dict) -> np.ndarray:
        """Convert terrain profile dict to feature vector."""
        curvature_map = {"Concave": 0.8, "Planar": 0.4, "Convex": 0.6}
        drainage_map = {"Very High": 0.95, "High": 0.75, "Medium": 0.5, "Low": 0.25}
        
        return np.array([
            min(terrain.get("slope_deg", 20) / 50, 1.0),
            min(terrain.get("relief_m", 300) / 1000, 1.0),
            min(terrain.get("twi", 5) / 10, 1.0),
            min(terrain.get("spi", 3) / 8, 1.0),
            1 - terrain.get("vegetation_index", 0.5),  # Less veg = higher risk
            curvature_map.get(terrain.get("curvature", "Planar"), 0.5),
            drainage_map.get(terrain.get("drainage_density", "Medium"), 0.5),
        ])
    
    def fit(self, X: np.ndarray, y: np.ndarray) -> "RandomForestSusceptibility":
        """
        Train the Random Forest on terrain feature matrix X and labels y.
        
        Uses bootstrap aggregation with random feature subsets.
        Each tree is a simplified decision tree (series of splits).
        """
        np.random.seed(self.seed)
        n_samples, n_features = X.shape
        self.trees = []
        importance_accum = np.zeros(n_features)
        
        for t in range(self.n_estimators):
            # Bootstrap sample
            idx = np.random.choice(n_samples, size=n_samples, replace=True)
            X_boot, y_boot = X[idx], y[idx]
            
            # Random feature subset (sqrt(n) features)
            n_sub = max(2, int(np.sqrt(n_features)))
            feat_idx = np.random.choice(n_features, size=n_sub, replace=False)
            
            # Build simplified tree (find best split per feature)
            tree = self._build_tree(X_boot[:, feat_idx], y_boot, feat_idx, depth=0)
            self.trees.append(tree)
            
            # Track feature usage for importance
            self._accumulate_importance(tree, importance_accum)
        
        # Normalize importances
        self.feature_importances_ = importance_accum / importance_accum.sum()
        self.is_fitted = True
        
        # Calculate training metrics
        y_pred = self.predict_proba(X)
        y_pred_class = (y_pred >= 0.5).astype(int)
        self.metrics = {
            "accuracy": float(np.mean(y_pred_class == y)),
            "n_samples": int(n_samples),
            "n_estimators": self.n_estimators,
            "feature_importances": {
                name: round(float(imp), 4) 
                for name, imp in zip(self.feature_names, self.feature_importances_)
            },
        }
        
        return self
    
    def _build_tree(self, X: np.ndarray, y: np.ndarray, feat_idx: np.ndarray, depth: int) -> dict:
        """Build a decision tree node recursively."""
        if depth >= self.max_depth or len(y) < 5 or len(np.unique(y)) == 1:
            return {"leaf": True, "value": float(np.mean(y)), "n": len(y)}
        
        best_gain = -1
        best_split = None
        
        for i in range(X.shape[1]):
            thresholds = np.percentile(X[:, i], [25, 50, 75])
            for thresh in thresholds:
                left_mask = X[:, i] <= thresh
                right_mask = ~left_mask
                if left_mask.sum() < 2 or right_mask.sum() < 2:
                    continue
                
                # Gini impurity reduction
                p_left = y[left_mask].mean()
                p_right = y[right_mask].mean()
                gini_left = 2 * p_left * (1 - p_left)
                gini_right = 2 * p_right * (1 - p_right)
                n_left = left_mask.sum()
                n_right = right_mask.sum()
                gini_parent = 2 * y.mean() * (1 - y.mean())
                
                gain = gini_parent - (n_left * gini_left + n_right * gini_right) / len(y)
                
                if gain > best_gain:
                    best_gain = gain
                    best_split = {
                        "feature_local": i,
                        "feature_global": int(feat_idx[i]),
                        "threshold": float(thresh),
                        "gain": float(gain),
                    }
        
        if best_split is None or best_gain < 0.001:
            return {"leaf": True, "value": float(np.mean(y)), "n": len(y)}
        
        mask = X[:, best_split["feature_local"]] <= best_split["threshold"]
        return {
            "leaf": False,
            **best_split,
            "left": self._build_tree(X[mask], y[mask], feat_idx, depth + 1),
            "right": self._build_tree(X[~mask], y[~mask], feat_idx, depth + 1),
        }
    
    def _predict_tree(self, tree: dict, x: np.ndarray) -> float:
        """Predict with a single tree."""
        if tree["leaf"]:
            return tree["value"]
        if x[tree["feature_global"]] <= tree["threshold"]:
            return self._predict_tree(tree["left"], x)
        return self._predict_tree(tree["right"], x)
    
    def _accumulate_importance(self, tree: dict, importance: np.ndarray):
        """Accumulate feature importance from tree splits."""
        if tree["leaf"]:
            return
        importance[tree["feature_global"]] += tree.get("gain", 0)
        self._accumulate_importance(tree["left"], importance)
        self._accumulate_importance(tree["right"], importance)
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Predict susceptibility probability for each sample."""
        if not self.is_fitted:
            raise RuntimeError("Model not fitted. Call fit() first.")
        
        predictions = np.zeros(len(X))
        for tree in self.trees:
            for i, x in enumerate(X):
                predictions[i] += self._predict_tree(tree, x)
        predictions /= self.n_estimators
        return predictions
    
    def predict_terrain(self, terrain: dict) -> dict:
        """
        Predict susceptibility from a terrain profile dictionary.
        Returns probability, class, and feature contributions.
        """
        features = self._encode_terrain(terrain)
        prob = float(self.predict_proba(features.reshape(1, -1))[0])
        
        # Calculate feature contributions (approximate SHAP-style)
        contributions = []
        if self.feature_importances_ is not None:
            for i, (name, importance) in enumerate(zip(self.feature_names, self.feature_importances_)):
                contributions.append({
                    "feature": name,
                    "value": round(float(features[i]), 3),
                    "importance": round(float(importance), 4),
                    "contribution": round(float(features[i] * importance), 4),
                })
            contributions.sort(key=lambda x: x["contribution"], reverse=True)
        
        return {
            "susceptibility": round(prob, 4),
            "class": "HIGH" if prob >= 0.7 else "MODERATE" if prob >= 0.4 else "LOW",
            "confidence": round(min(0.95, 0.6 + prob * 0.3), 3),
            "model": "RandomForest",
            "n_estimators": self.n_estimators,
            "contributions": contributions,
        }
    
    def to_dict(self) -> dict:
        """Serialize model state to dictionary."""
        return {
            "n_estimators": self.n_estimators,
            "max_depth": self.max_depth,
            "seed": self.seed,
            "trees": self.trees,
            "feature_importances": self.feature_importances_.tolist() if self.feature_importances_ is not None else None,
            "metrics": self.metrics,
            "is_fitted": self.is_fitted,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "RandomForestSusceptibility":
        """Load model from dictionary."""
        model = cls(
            n_estimators=data["n_estimators"],
            max_depth=data["max_depth"],
            seed=data["seed"],
        )
        model.trees = data["trees"]
        model.feature_importances_ = np.array(data["feature_importances"]) if data["feature_importances"] else None
        model.metrics = data.get("metrics", {})
        model.is_fitted = data["is_fitted"]
        return model
