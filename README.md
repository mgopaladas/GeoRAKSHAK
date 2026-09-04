# 🌏 GeoRakshak

**AI-Powered Landslide Early Warning & Disaster Intelligence Platform**

> SIH26001 — AI-Based Early Warning and Landslide Risk Monitoring System in NER  
> Ministry of Development of North Eastern Region (MDoNER)

---

## Overview

GeoRakshak is an end-to-end landslide risk monitoring and early warning system that combines IoT sensor hardware, real-time data ingestion, AI/ML risk assessment, GIS visualization, and government alerting for the North Eastern Region (NER) of India.

**This is a decision-support and early-warning system.** AI provides risk scores, probability assessments, and explainable contributing factors. Government authorities remain responsible for final operational decisions.

## Architecture

```
ESP32 Sensors → MQTT → FastAPI → PostgreSQL/PostGIS → AI Risk Engine → GIS Dashboard → Alerts
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS, Leaflet |
| Backend | Python, FastAPI, SQLAlchemy, GeoAlchemy2 |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Messaging | MQTT (Mosquitto) |
| Cache | Redis |
| AI/ML | scikit-learn, XGBoost *(Phase 3)* |
| IoT | ESP32, PlatformIO *(Phase 4)* |
| Mobile | React Native, Expo *(Phase 5)* |
| DevOps | Docker, Docker Compose |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+

### 1. Start Infrastructure
```bash
docker compose up postgres redis mqtt -d
```

### 2. Start Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

### 3. Start Dashboard
```bash
cd apps/government-dashboard
npm install
npm run dev
```

### 4. Run Sensor Simulator *(optional)*
```bash
cd iot/simulator
pip install -r requirements.txt
python simulator.py --scenario HEAVY_RAIN
```

Open **http://localhost:3000** to view the dashboard.

## Project Structure

```
georakshak/
├── apps/government-dashboard/  # Next.js GIS Dashboard
├── backend/                    # FastAPI API Gateway
├── ai/                         # ML Models (Phase 3)
├── iot/simulator/              # Sensor Simulator
├── hardware/                   # ESP32 Firmware (Phase 4)
├── database/                   # SQL Migrations & Seeds
├── infrastructure/             # Docker, Nginx, Monitoring
├── docs/                       # Architecture & API Docs
└── tests/                      # Test Suites
```

## Data Disclaimer

Seed data includes **synthetic demo sensor stations** placed at representative NER locations (Shillong, Sohra, Guwahati, Aizawl, Itanagar, Kohima, Mawsynram, Nongstoin). Historical landslide event data is representative and sourced from public records (GSI, NDMA, SDMA). Sensor readings and risk assessments in the demo are **simulated**.

## License

MIT
