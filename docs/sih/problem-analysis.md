# GeoRakshak — SIH Problem Analysis

## Problem Statement: SIH26001

**Title**: AI-Based Early Warning and Landslide Risk Monitoring System in NER

**Organization**: Ministry of Development of North Eastern Region (MDoNER)

**Theme**: Disaster Management

**Category**: Software

## Key Requirements (from PS)

1. ✅ Rainfall data integration
2. ✅ Soil moisture monitoring
3. ✅ Satellite imagery analysis
4. ✅ Terrain/slope data processing
5. ✅ Historical landslide data
6. ✅ AI/ML prediction engine
7. ✅ GIS visualization
8. ✅ Geo-tagged field reports
9. ✅ Alert generation system
10. ✅ Dashboard for government
11. ✅ Multilingual support (planned)
12. ✅ Offline/low-network operation

## Innovation Points

1. **Multi-layer AI** — Not a single model; separate susceptibility, trigger, image, and fusion layers
2. **Explainable AI** — Every risk score shows contributing factors and confidence
3. **Hardware integration** — Physical sensor node as data acquisition layer
4. **End-to-end pipeline** — Sensor → AI → GIS → Alert → Response
5. **Real-time simulation** — SIH demo showing normal → heavy rain → ground movement → critical → alert
6. **Sensor health monitoring** — System detects faulty sensors instead of misinterpreting bad data
7. **Offline-first** — Both sensor nodes and mobile app buffer data when disconnected

## Anticipated Jury Questions

| Question | Answer |
|----------|--------|
| "Why hardware for a software PS?" | The sensor node is the physical data acquisition layer of our software system. It doesn't replace the platform — it feeds real-time ground observations into the AI engine. |
| "What data did you train on?" | Phase 1 uses rule-based fusion. Phase 3 will use GSI/NDMA historical events + IMD rainfall + ISRO terrain. We clearly distinguish real vs synthetic data. |
| "How accurate is your model?" | We don't claim specific accuracy yet. We report precision/recall/F1 with proper validation. We optimize for low false negatives — missing a dangerous event is worse than extra warnings. |
| "Can this predict landslides?" | This is a decision-support system, not an autonomous prediction system. It assesses risk probability and provides evidence-based advisories. Final decisions are by authorities. |
| "How does it work offline?" | Both ESP32 nodes and the mobile app buffer data locally and sync when connectivity returns. Prevents data loss in remote NER terrain. |
| "Is this scalable beyond NER?" | Yes — the database schema is India-wide by design. Phase 1 seeds NER data only. Other regions can be added without schema changes. |

## Impact Metrics

- Population in NER at landslide risk: ~46 million across 8 states
- Average annual landslide fatalities in NER: 100+
- Road km potentially disrupted: thousands of km during monsoon
- Economic loss from landslide damage: ₹hundreds of crores annually
- **GeoRakshak goal**: Reduce response time from hours/days to minutes through real-time monitoring + automated alerting
