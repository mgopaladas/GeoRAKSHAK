# GeoRakshak — AI Methodology

## Model Architecture

GeoRakshak uses **four separate intelligence layers**, not a single black-box model.

### Layer 1 — Susceptibility (Static)
- **Question**: Where is landslide risk structurally higher?
- **Features**: Elevation, slope, aspect, land cover, vegetation, historical landslide density, terrain characteristics
- **Output**: Susceptibility score (0–1)
- **Model**: Random Forest / XGBoost (Phase 3)
- **Update frequency**: Monthly or when new terrain data is available

### Layer 2 — Trigger Risk (Dynamic)
- **Question**: Are current conditions increasing short-term risk?
- **Features**: Rainfall (1h/6h/24h/3d/7d), soil moisture, rainfall intensity, ground movement, weather forecast
- **Output**: Trigger score (0–100)
- **Model**: Gradient boosting with time-series features (Phase 3)
- **Update frequency**: Real-time (every sensor reading)

### Layer 3 — Image Intelligence
- **Question**: Does a field photograph show signs of instability?
- **Categories**: Cracks, slope deformation, exposed soil, rockfall, road blockage
- **Model**: CNN-based classifier (Phase 3)
- **Note**: Image AI is one signal in risk fusion, not an autonomous diagnosis

### Layer 4 — Risk Fusion
- **Combines**: Susceptibility + trigger + ground movement + image evidence + historical + sensor confidence
- **Output**: Risk score (0–100), risk level (LOW/MODERATE/HIGH/CRITICAL), confidence, contributing factors
- **Phase 1**: Rule-based weighted fusion
- **Phase 3**: ML-based fusion with learned weights

## Phase 1 Implementation

Currently uses a **rule-based weighted fusion**:

| Factor | Weight |
|--------|--------|
| Terrain Susceptibility | 0.25 |
| Rainfall | 0.30 |
| Soil Moisture | 0.20 |
| Ground Movement | 0.15 |
| Historical Risk | 0.10 |

**Important**: These weights are configurable placeholders, not universally validated cutoffs.

## Data Requirements

### Training Data (Phase 3)
- Historical landslide events with location + date
- Rainfall records (IMD, station-level)
- Terrain data (DEM from SRTM/ASTER)
- Land cover (LULC from ISRO)
- Soil data (NBSS&LUP)

### Potential Data Sources
| Source | Data | Coverage |
|--------|------|----------|
| GSI Landslide Atlas | Historical events | India |
| NDMA | Disaster events | India |
| IMD | Rainfall | India |
| ISRO Bhuvan | DEM, LULC | India |
| NASA SRTM | Elevation | Global |
| Sentinel-2 | Satellite imagery | Global |

### Known Limitations
- NER-specific training data may be limited
- Historical records may be incomplete
- Negative samples (no-landslide) don't mean "confirmed safe"
- Model performance depends on data quality and representativeness

## Evaluation Protocol

- **Metrics**: Precision, Recall, F1, ROC-AUC, PR-AUC, Confusion Matrix
- **Priority**: Minimize false negatives (missing a dangerous event is worse than extra warnings)
- **Validation**: Time-aware and spatially-aware splits to prevent leakage
- **Versioning**: All models tracked with metrics in `model_versions` table
