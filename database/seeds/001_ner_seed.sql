-- ============================================================
-- GEORAKSHAK — NER Seed Data
-- Demo data for Northeast India
-- ============================================================

-- ─── NER STATES ──────────────────────────────────────────────

INSERT INTO states (name, code) VALUES
    ('Meghalaya', 'ML'),
    ('Assam', 'AS'),
    ('Mizoram', 'MZ'),
    ('Arunachal Pradesh', 'AR'),
    ('Nagaland', 'NL'),
    ('Manipur', 'MN'),
    ('Tripura', 'TR'),
    ('Sikkim', 'SK');

-- ─── DISTRICTS ───────────────────────────────────────────────

INSERT INTO districts (state_id, name, code) VALUES
    (1, 'East Khasi Hills', 'ML-EKH'),
    (1, 'West Khasi Hills', 'ML-WKH'),
    (1, 'Ri-Bhoi', 'ML-RB'),
    (2, 'Kamrup Metropolitan', 'AS-KM'),
    (2, 'Karbi Anglong', 'AS-KA'),
    (3, 'Aizawl', 'MZ-AZ'),
    (4, 'Papum Pare', 'AR-PP'),
    (5, 'Kohima', 'NL-KO');

-- ─── SENSOR STATIONS ────────────────────────────────────────

INSERT INTO sensor_stations (id, name, district_id, latitude, longitude, altitude, status, battery_level, firmware_version, installed_at, geom) VALUES
    ('GR-S001', 'Shillong Peak Station', 1, 25.5788, 91.8933, 1965, 'ONLINE', 92, 'v1.0.0', '2026-06-01', ST_SetSRID(ST_MakePoint(91.8933, 25.5788), 4326)),
    ('GR-S002', 'Sohra (Cherrapunji) Station', 1, 25.2961, 91.7320, 1484, 'ONLINE', 87, 'v1.0.0', '2026-06-01', ST_SetSRID(ST_MakePoint(91.7320, 25.2961), 4326)),
    ('GR-S003', 'Guwahati Hill Station', 4, 26.1445, 91.7362, 55, 'ONLINE', 95, 'v1.0.0', '2026-06-15', ST_SetSRID(ST_MakePoint(91.7362, 26.1445), 4326)),
    ('GR-S004', 'Aizawl Ridge Station', 6, 23.7271, 92.7176, 1132, 'ONLINE', 78, 'v1.0.0', '2026-07-01', ST_SetSRID(ST_MakePoint(92.7176, 23.7271), 4326)),
    ('GR-S005', 'Itanagar Slope Station', 7, 27.0844, 93.6053, 320, 'ONLINE', 83, 'v1.0.0', '2026-07-01', ST_SetSRID(ST_MakePoint(93.6053, 27.0844), 4326)),
    ('GR-S006', 'Kohima Highland Station', 8, 25.6751, 94.1086, 1444, 'OFFLINE', 12, 'v1.0.0', '2026-07-15', ST_SetSRID(ST_MakePoint(94.1086, 25.6751), 4326)),
    ('GR-S007', 'Mawsynram Station', 1, 25.2972, 91.5822, 1401, 'ONLINE', 90, 'v1.0.0', '2026-08-01', ST_SetSRID(ST_MakePoint(91.5822, 25.2972), 4326)),
    ('GR-S008', 'Nongstoin Station', 2, 25.5218, 91.2654, 1300, 'MAINTENANCE', 65, 'v1.0.0', '2026-08-01', ST_SetSRID(ST_MakePoint(91.2654, 25.5218), 4326));

-- ─── RISK ZONES ──────────────────────────────────────────────

INSERT INTO risk_zones (name, zone_code, district_id, susceptibility_score, current_risk_level, current_risk_score, geom, properties) VALUES
    ('Shillong Peak Zone', 'RZ-001', 1, 0.72, 'MODERATE', 45,
     ST_SetSRID(ST_GeomFromText('POLYGON((91.87 25.56, 91.91 25.56, 91.91 25.60, 91.87 25.60, 91.87 25.56))'), 4326),
     '{"elevation_avg": 1800, "slope_avg": 32, "vegetation": "moderate", "geology": "quartzite"}'),

    ('Sohra High Risk Zone', 'RZ-002', 1, 0.89, 'HIGH', 72,
     ST_SetSRID(ST_GeomFromText('POLYGON((91.71 25.27, 91.75 25.27, 91.75 25.32, 91.71 25.32, 91.71 25.27))'), 4326),
     '{"elevation_avg": 1400, "slope_avg": 45, "vegetation": "sparse", "geology": "limestone"}'),

    ('Guwahati Hill Zone', 'RZ-003', 4, 0.55, 'LOW', 22,
     ST_SetSRID(ST_GeomFromText('POLYGON((91.72 26.12, 91.76 26.12, 91.76 26.16, 91.72 26.16, 91.72 26.12))'), 4326),
     '{"elevation_avg": 200, "slope_avg": 18, "vegetation": "dense", "geology": "gneiss"}'),

    ('Aizawl Ridge Zone', 'RZ-004', 6, 0.78, 'HIGH', 68,
     ST_SetSRID(ST_GeomFromText('POLYGON((92.70 23.71, 92.74 23.71, 92.74 23.75, 92.70 23.75, 92.70 23.71))'), 4326),
     '{"elevation_avg": 1100, "slope_avg": 38, "vegetation": "moderate", "geology": "shale"}'),

    ('Itanagar Foothills Zone', 'RZ-005', 7, 0.61, 'MODERATE', 41,
     ST_SetSRID(ST_GeomFromText('POLYGON((93.59 27.06, 93.63 27.06, 93.63 27.10, 93.59 27.10, 93.59 27.06))'), 4326),
     '{"elevation_avg": 350, "slope_avg": 25, "vegetation": "dense", "geology": "sandstone"}'),

    ('Kohima Highland Zone', 'RZ-006', 8, 0.82, 'HIGH', 65,
     ST_SetSRID(ST_GeomFromText('POLYGON((94.09 25.65, 94.13 25.65, 94.13 25.69, 94.09 25.69, 94.09 25.65))'), 4326),
     '{"elevation_avg": 1400, "slope_avg": 35, "vegetation": "moderate", "geology": "ophiolite"}'),

    ('Mawsynram Valley Zone', 'RZ-007', 1, 0.91, 'CRITICAL', 88,
     ST_SetSRID(ST_GeomFromText('POLYGON((91.56 25.28, 91.60 25.28, 91.60 25.32, 91.56 25.32, 91.56 25.28))'), 4326),
     '{"elevation_avg": 1350, "slope_avg": 48, "vegetation": "sparse", "geology": "limestone"}'),

    ('NH-6 Corridor Zone', 'RZ-008', 2, 0.67, 'MODERATE', 52,
     ST_SetSRID(ST_GeomFromText('POLYGON((91.24 25.50, 91.28 25.50, 91.28 25.54, 91.24 25.54, 91.24 25.50))'), 4326),
     '{"elevation_avg": 1200, "slope_avg": 28, "vegetation": "moderate", "geology": "granite"}');

-- ─── HISTORICAL LANDSLIDES ───────────────────────────────────

INSERT INTO landslide_events (event_date, latitude, longitude, state, district, location_name, landslide_type, severity, fatalities, trigger, source, geom) VALUES
    ('2024-06-15', 25.5700, 91.8800, 'Meghalaya', 'East Khasi Hills', 'Shillong Bypass Road', 'Debris flow', 'HIGH', 0, 'Heavy rainfall', 'GSI', ST_SetSRID(ST_MakePoint(91.8800, 25.5700), 4326)),
    ('2024-07-20', 25.2900, 91.7300, 'Meghalaya', 'East Khasi Hills', 'Sohra-Shella Road', 'Rockfall', 'CRITICAL', 3, 'Heavy rainfall', 'NDMA', ST_SetSRID(ST_MakePoint(91.7300, 25.2900), 4326)),
    ('2024-08-05', 26.1500, 91.7400, 'Assam', 'Kamrup', 'Guwahati Kharghuli', 'Shallow slide', 'HIGH', 5, 'Heavy rainfall', 'SDMA', ST_SetSRID(ST_MakePoint(91.7400, 26.1500), 4326)),
    ('2024-09-12', 23.7300, 92.7200, 'Mizoram', 'Aizawl', 'Aizawl-Lunglei Road', 'Debris slide', 'HIGH', 0, 'Heavy rainfall', 'GSI', ST_SetSRID(ST_MakePoint(92.7200, 23.7300), 4326)),
    ('2023-06-30', 27.0900, 93.6100, 'Arunachal Pradesh', 'Papum Pare', 'Itanagar NH-415', 'Mudslide', 'CRITICAL', 2, 'Heavy rainfall', 'GSI', ST_SetSRID(ST_MakePoint(93.6100, 27.0900), 4326)),
    ('2023-07-18', 25.6800, 94.1100, 'Nagaland', 'Kohima', 'Kohima-Dimapur Road', 'Rock slide', 'HIGH', 1, 'Heavy rainfall', 'NDMA', ST_SetSRID(ST_MakePoint(94.1100, 25.6800), 4326)),
    ('2023-08-22', 25.3000, 91.5900, 'Meghalaya', 'East Khasi Hills', 'Mawsynram', 'Debris flow', 'CRITICAL', 4, 'Extreme rainfall', 'NDMA', ST_SetSRID(ST_MakePoint(91.5900, 25.3000), 4326)),
    ('2023-09-10', 25.5300, 91.2700, 'Meghalaya', 'West Khasi Hills', 'Nongstoin Road', 'Shallow slide', 'MODERATE', 0, 'Heavy rainfall', 'GSI', ST_SetSRID(ST_MakePoint(91.2700, 25.5300), 4326)),
    ('2022-06-25', 25.5750, 91.8850, 'Meghalaya', 'East Khasi Hills', 'Upper Shillong', 'Debris slide', 'HIGH', 1, 'Heavy rainfall', 'GSI', ST_SetSRID(ST_MakePoint(91.8850, 25.5750), 4326)),
    ('2022-07-14', 25.2950, 91.7350, 'Meghalaya', 'East Khasi Hills', 'Sohra Market', 'Rockfall', 'HIGH', 0, 'Heavy rainfall', 'SDMA', ST_SetSRID(ST_MakePoint(91.7350, 25.2950), 4326)),
    ('2022-08-03', 26.1600, 91.7500, 'Assam', 'Kamrup', 'Guwahati Nilachal', 'Mudslide', 'CRITICAL', 7, 'Heavy rainfall', 'NDMA', ST_SetSRID(ST_MakePoint(91.7500, 26.1600), 4326)),
    ('2022-09-01', 23.7200, 92.7100, 'Mizoram', 'Aizawl', 'Aizawl City', 'Debris flow', 'HIGH', 2, 'Heavy rainfall', 'GSI', ST_SetSRID(ST_MakePoint(92.7100, 23.7200), 4326)),
    ('2021-07-05', 25.5800, 91.8900, 'Meghalaya', 'East Khasi Hills', 'Shillong Peak Road', 'Rock slide', 'MODERATE', 0, 'Moderate rainfall', 'GSI', ST_SetSRID(ST_MakePoint(91.8900, 25.5800), 4326)),
    ('2021-08-19', 27.0800, 93.6000, 'Arunachal Pradesh', 'Papum Pare', 'Itanagar Hill', 'Shallow slide', 'HIGH', 0, 'Heavy rainfall', 'SDMA', ST_SetSRID(ST_MakePoint(93.6000, 27.0800), 4326)),
    ('2021-09-28', 25.6700, 94.1000, 'Nagaland', 'Kohima', 'Kohima Town', 'Debris slide', 'MODERATE', 0, 'Moderate rainfall', 'GSI', ST_SetSRID(ST_MakePoint(94.1000, 25.6700), 4326));

-- ─── SAMPLE SENSOR READINGS ─────────────────────────────────

INSERT INTO sensor_readings (station_id, timestamp, rainfall_mm, rainfall_1h, rainfall_24h, soil_moisture, tilt_x, tilt_y, temperature, humidity, battery) VALUES
    ('GR-S001', NOW() - INTERVAL '1 hour', 2.4, 2.4, 18.6, 42.3, 0.12, 0.08, 22.1, 78, 92),
    ('GR-S001', NOW() - INTERVAL '30 minutes', 3.1, 5.5, 21.7, 44.8, 0.14, 0.09, 22.0, 80, 92),
    ('GR-S001', NOW(), 1.8, 7.3, 23.5, 46.1, 0.13, 0.08, 21.9, 81, 91),
    ('GR-S002', NOW() - INTERVAL '1 hour', 8.2, 8.2, 82.4, 78.1, 0.42, 0.31, 18.4, 94, 87),
    ('GR-S002', NOW() - INTERVAL '30 minutes', 12.6, 20.8, 94.6, 81.3, 0.48, 0.35, 18.2, 96, 87),
    ('GR-S002', NOW(), 9.4, 30.2, 104.0, 83.7, 0.51, 0.38, 18.1, 97, 86),
    ('GR-S003', NOW(), 0.8, 0.8, 6.2, 28.4, 0.05, 0.03, 28.6, 72, 95),
    ('GR-S004', NOW(), 5.6, 5.6, 48.3, 62.1, 0.28, 0.19, 20.3, 88, 78),
    ('GR-S005', NOW(), 3.2, 3.2, 32.1, 51.8, 0.18, 0.12, 26.4, 82, 83),
    ('GR-S007', NOW(), 15.8, 15.8, 142.6, 91.2, 0.82, 0.64, 17.8, 99, 90);

-- ─── SAMPLE RISK ASSESSMENTS ─────────────────────────────────

INSERT INTO risk_assessments (zone_id, risk_score, risk_level, confidence, terrain_score, rainfall_score, soil_score, movement_score, historical_score, factors) VALUES
    (1, 45, 'MODERATE', 0.78, 72, 35, 42, 12, 55, '{"primary": "Moderate terrain susceptibility", "details": ["Steep slopes present", "Moderate rainfall", "Historical events nearby"]}'),
    (2, 72, 'HIGH', 0.85, 89, 78, 81, 18, 82, '{"primary": "High rainfall on highly susceptible terrain", "details": ["Very steep slopes", "Heavy recent rainfall", "High soil moisture", "Multiple historical events"]}'),
    (3, 22, 'LOW', 0.82, 55, 12, 28, 5, 35, '{"primary": "Low current trigger conditions", "details": ["Moderate terrain risk", "Low rainfall", "Low soil moisture"]}'),
    (4, 68, 'HIGH', 0.80, 78, 62, 65, 22, 72, '{"primary": "Elevated risk from sustained rainfall", "details": ["High terrain susceptibility", "Significant rainfall accumulation", "Elevated soil moisture"]}'),
    (5, 41, 'MODERATE', 0.75, 61, 38, 52, 15, 48, '{"primary": "Moderate conditions on vulnerable terrain", "details": ["Moderate slopes", "Moderate rainfall", "Rising soil moisture"]}'),
    (6, 65, 'HIGH', 0.77, 82, 55, 58, 20, 68, '{"primary": "High terrain risk with moderate triggers", "details": ["Steep terrain", "Moderate rainfall", "Historical slide area"]}'),
    (7, 88, 'CRITICAL', 0.91, 91, 92, 91, 42, 88, '{"primary": "Critical: extreme rainfall on highly vulnerable terrain", "details": ["Extremely steep slopes", "Record rainfall levels", "Near-saturation soil", "Ground movement detected", "Multiple historical events"]}'),
    (8, 52, 'MODERATE', 0.74, 67, 48, 55, 14, 52, '{"primary": "Moderate overall risk", "details": ["Moderate terrain susceptibility", "Moderate rainfall", "Road corridor vulnerability"]}');

-- ─── SAMPLE ALERTS ───────────────────────────────────────────

INSERT INTO alerts (zone_id, assessment_id, severity, title, description, status) VALUES
    (7, 7, 'CRITICAL', 'CRITICAL: Mawsynram Valley — Extreme Landslide Risk',
     'Extreme rainfall (142mm/24h) on highly susceptible terrain with ground movement detected. Immediate field verification recommended. Nearby villages and roads at risk.',
     'ACTIVE'),
    (2, 2, 'HIGH', 'HIGH: Sohra Zone — Heavy Rainfall Warning',
     'Heavy sustained rainfall with high soil moisture on steep limestone terrain. Historical slide area. Monitor closely.',
     'ACTIVE'),
    (4, 4, 'HIGH', 'HIGH: Aizawl Ridge — Elevated Landslide Risk',
     'Sustained rainfall accumulation on shale terrain with rising soil moisture. Road connectivity at risk.',
     'ACTIVE'),
    (6, 6, 'HIGH', 'HIGH: Kohima Highlands — Monitoring Required',
     'Steep terrain with moderate rainfall activity. Sensor station offline — field verification recommended.',
     'ACTIVE');

-- ─── DEFAULT ADMIN USER ──────────────────────────────────────

INSERT INTO users (email, password_hash, full_name, role, organization, state) VALUES
    ('admin@georakshak.gov.in', '$2b$12$placeholder_hash_change_me', 'System Administrator', 'SUPER_ADMIN', 'MDoNER', 'Meghalaya');
