/**
 * GeoRakshak — API Service
 * Centralized API client for the government dashboard.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://georakshak-backend.onrender.com';
import { HOTSPOTS } from '@/lib/hotspotsData';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });
    if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

// ─── Types ───────────────────────────────────────────────────

export interface DashboardStats {
    critical_zones: number;
    high_risk_zones: number;
    moderate_zones: number;
    low_risk_zones: number;
    total_sensors: number;
    online_sensors: number;
    offline_sensors: number;
    active_alerts: number;
    total_landslide_events: number;
}

export interface EmergencyPriority {
    rank: number;
    title: string;
    zone_name: string;
    risk_level: string;
    risk_score: number;
    description: string;
}

export interface SensorStation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    altitude?: number;
    status: string;
    battery_level?: number;
    signal_strength?: number;
    firmware_version?: string;
    last_seen_at?: string;
    latest_reading?: SensorReading;
}

export interface SensorReading {
    id: number;
    station_id: string;
    timestamp: string;
    rainfall_mm?: number;
    rainfall_1h?: number;
    rainfall_24h?: number;
    soil_moisture?: number;
    tilt_x?: number;
    tilt_y?: number;
    temperature?: number;
    humidity?: number;
    battery?: number;
    is_anomaly: boolean;
}

export interface Alert {
    id: number;
    zone_id?: number;
    zone_name?: string;
    severity: string;
    title: string;
    description?: string;
    status: string;
    escalation_level: number;
    created_at: string;
}

export interface RiskZoneFeature {
    type: 'Feature';
    properties: {
        id: number;
        name: string;
        zone_code: string;
        susceptibility_score: number;
        risk_level: string;
        risk_score: number;
        [key: string]: any;
    };
    geometry: any;
}

export interface GeoJSONCollection {
    type: 'FeatureCollection';
    features: RiskZoneFeature[];
}

export interface SimulatorResult {
    scenario: string;
    stations_affected: number;
    results: Array<{
        station_id: string;
        zone?: string;
        risk_score?: number;
        risk_level?: string;
        confidence?: number;
        reasons?: string[];
    }>;
    timestamp: string;
    note: string;
}

// ─── API Functions ───────────────────────────────────────────

export const api = {
    getStats: () => fetchAPI<DashboardStats>('/api/dashboard/stats'),
    getPriorities: () => fetchAPI<EmergencyPriority[]>('/api/dashboard/priorities'),
    getSensors: () => fetchAPI<SensorStation[]>('/api/sensors'),
    getSensorReadings: (id: string, limit = 50) =>
        fetchAPI<SensorReading[]>(`/api/sensors/${id}/readings?limit=${limit}`),
    getRiskZones: () => fetchAPI<GeoJSONCollection>('/api/risk-zones'),
    getAlerts: () => fetchAPI<Alert[]>('/api/alerts'),
    getLandslides: () => fetchAPI<GeoJSONCollection>('/api/landslides'),
    getBoundaries: (level: number) => fetchAPI<GeoJSONCollection>(`/api/boundaries?level=${level}`),
    triggerSimulation: (scenario: string, intensity = 1.0) =>
        fetchAPI<SimulatorResult>('/api/simulator/event', {
            method: 'POST',
            body: JSON.stringify({ scenario, intensity }),
        }),
};

// ─── Dynamic Data Integration (Fallback to Real Dataset) ───────

export const MOCK_SENSORS: SensorStation[] = HOTSPOTS.map((h, i) => {
    const isHigh = h.priority_for_screening === 'high';
    const isMedium = h.priority_for_screening === 'medium';
    return {
        id: h.id,
        name: h.hotspot_name,
        latitude: h.latitude + (i % 3 === 0 ? 0.05 : (i % 2 === 0 ? -0.03 : 0.02)),
        longitude: h.longitude + (i % 4 === 0 ? 0.06 : (i % 5 === 0 ? -0.04 : 0.03)),
        altitude: 1000 + (i * 10),
        status: isHigh ? 'ONLINE' : (isMedium && i % 3 === 0 ? 'MAINTENANCE' : (i % 7 === 0 ? 'OFFLINE' : 'ONLINE')),
        battery_level: 50 + (i % 50),
        latest_reading: {
            id: i,
            station_id: h.id,
            timestamp: new Date().toISOString(),
            rainfall_1h: isHigh ? 5 + (i % 25) : 0 + (i % 5),
            rainfall_24h: isHigh ? 50 + (i % 100) : 10 + (i % 30),
            soil_moisture: isHigh ? 75 + (i % 20) : 40 + (i % 30),
            tilt_x: isHigh ? 0.3 + (i % 5) / 10 : 0.05,
            tilt_y: isHigh ? 0.2 + (i % 5) / 10 : 0.02,
            temperature: 18 + (i % 10),
            humidity: 60 + (i % 30),
            battery: 50 + (i % 50),
            is_anomaly: isHigh && (i % 2 === 0)
        }
    }
});

export const MOCK_STATS: DashboardStats = {
    critical_zones: 0,
    high_risk_zones: 0,
    moderate_zones: 0,
    low_risk_zones: HOTSPOTS.length,
    total_sensors: HOTSPOTS.length,
    online_sensors: MOCK_SENSORS.filter((s) => s.status === 'ONLINE').length,
    offline_sensors: MOCK_SENSORS.filter((s) => s.status !== 'ONLINE').length,
    active_alerts: 0,
    total_landslide_events: HOTSPOTS.length,
};

export const MOCK_PRIORITIES: EmergencyPriority[] = HOTSPOTS
    .filter(h => h.priority_for_screening === 'high')
    .slice(0, 10)
    .map((h, i) => ({
        rank: i + 1,
        title: h.id,
        zone_name: `${h.hotspot_name} Zone`,
        risk_level: i < 3 ? 'CRITICAL' : 'HIGH',
        risk_score: 95 - i * 2,
        description: `Risk score ${95 - i * 2}% — ${h.hotspot_type.replace('_', ' ')} identified in ${h.district}, ${h.state_ut}`
    }));

export const MOCK_ALERTS: Alert[] = HOTSPOTS
    .filter(h => h.priority_for_screening === 'high' && h.hotspot_name)
    .slice(0, 8)
    .map((h, i) => ({
        id: i + 1,
        zone_name: h.hotspot_name,
        severity: i < 2 ? 'CRITICAL' : 'HIGH',
        title: `${i < 2 ? 'CRITICAL' : 'HIGH'}: ${h.hotspot_name} — High Risk Warning`,
        description: `Persistent risk flagged at ${h.hotspot_type} in ${h.district}. Trigger signals active.`,
        status: i < 3 ? 'ACTIVE' : 'INVESTIGATING',
        escalation_level: i < 2 ? 3 : 2,
        created_at: new Date(Date.now() - (i * 3600000)).toISOString()
    }));

export const MOCK_RISK_ZONES: GeoJSONCollection = {
    type: 'FeatureCollection',
    features: [
        { type: 'Feature', properties: { id: 1, name: 'Shillong Peak Zone', zone_code: 'RZ-001', susceptibility_score: 0.72, risk_level: 'MODERATE', risk_score: 45 }, geometry: { type: 'Polygon', coordinates: [[[91.87, 25.56], [91.91, 25.56], [91.91, 25.60], [91.87, 25.60], [91.87, 25.56]]] } },
        { type: 'Feature', properties: { id: 2, name: 'Sohra High Risk Zone', zone_code: 'RZ-002', susceptibility_score: 0.89, risk_level: 'HIGH', risk_score: 72 }, geometry: { type: 'Polygon', coordinates: [[[91.71, 25.27], [91.75, 25.27], [91.75, 25.32], [91.71, 25.32], [91.71, 25.27]]] } },
        { type: 'Feature', properties: { id: 3, name: 'Guwahati Hill Zone', zone_code: 'RZ-003', susceptibility_score: 0.55, risk_level: 'LOW', risk_score: 22 }, geometry: { type: 'Polygon', coordinates: [[[91.72, 26.12], [91.76, 26.12], [91.76, 26.16], [91.72, 26.16], [91.72, 26.12]]] } },
        { type: 'Feature', properties: { id: 4, name: 'Aizawl Ridge Zone', zone_code: 'RZ-004', susceptibility_score: 0.78, risk_level: 'HIGH', risk_score: 68 }, geometry: { type: 'Polygon', coordinates: [[[92.70, 23.71], [92.74, 23.71], [92.74, 23.75], [92.70, 23.75], [92.70, 23.71]]] } },
        { type: 'Feature', properties: { id: 5, name: 'Itanagar Foothills Zone', zone_code: 'RZ-005', susceptibility_score: 0.61, risk_level: 'MODERATE', risk_score: 41 }, geometry: { type: 'Polygon', coordinates: [[[93.59, 27.06], [93.63, 27.06], [93.63, 27.10], [93.59, 27.10], [93.59, 27.06]]] } },
        { type: 'Feature', properties: { id: 6, name: 'Kohima Highland Zone', zone_code: 'RZ-006', susceptibility_score: 0.82, risk_level: 'HIGH', risk_score: 65 }, geometry: { type: 'Polygon', coordinates: [[[94.09, 25.65], [94.13, 25.65], [94.13, 25.69], [94.09, 25.69], [94.09, 25.65]]] } },
        { type: 'Feature', properties: { id: 7, name: 'Mawsynram Valley Zone', zone_code: 'RZ-007', susceptibility_score: 0.91, risk_level: 'CRITICAL', risk_score: 88 }, geometry: { type: 'Polygon', coordinates: [[[91.56, 25.28], [91.60, 25.28], [91.60, 25.32], [91.56, 25.32], [91.56, 25.28]]] } },
        { type: 'Feature', properties: { id: 8, name: 'NH-6 Corridor Zone', zone_code: 'RZ-008', susceptibility_score: 0.67, risk_level: 'MODERATE', risk_score: 52 }, geometry: { type: 'Polygon', coordinates: [[[91.24, 25.50], [91.28, 25.50], [91.28, 25.54], [91.24, 25.54], [91.24, 25.50]]] } },
    ],
};

// ─── Phase 2 Types ───────────────────────────────────────────

export interface WeatherStation {
    station_id: string;
    station_name: string;
    latitude: number;
    longitude: number;
    temperature: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    wind_direction: number;
    clouds: number;
    visibility: number;
    description: string;
    icon: string;
    rainfall_1h: number;
    rainfall_3h: number;
    timestamp: string;
    source: string;
}

export interface WeatherForecast {
    timestamp: string;
    temperature: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    clouds: number;
    rainfall_3h: number;
    description: string;
    icon: string;
    pop: number;
}

export interface RainfallSummary {
    station_id: string;
    station_name: string;
    rainfall_1h: number;
    rainfall_3h: number;
    rainfall_24h_est: number;
    humidity: number;
    intensity: string;
}

export interface TerrainProfile {
    zone_code: string;
    elevation_m: number;
    slope_deg: number;
    aspect: string;
    relief_m: number;
    geology: string;
    soil_type: string;
    land_cover: string;
    drainage_density: string;
    terrain_class: string;
    vegetation_index: number;
}

export interface LandslideEvent {
    event_date: string;
    latitude: number;
    longitude: number;
    state: string;
    district: string;
    location_name: string;
    landslide_type: string;
    severity: string;
    fatalities: number;
    injuries: number;
    trigger: string;
    source: string;
    description: string;
}

export interface LandslideStats {
    total_events: number;
    total_fatalities: number;
    total_injuries: number;
    by_state: Record<string, { events: number; fatalities: number; injuries: number }>;
}

// ─── Phase 2 API Functions ───────────────────────────────────

export const weatherApi = {
    getCurrent: () => fetchAPI<{ source: string; stations: Record<string, WeatherStation> }>('/api/weather/current'),
    getForecast: (stationId: string) => fetchAPI<{ station_id: string; station_name: string; source: string; forecasts: WeatherForecast[] }>(`/api/weather/forecast/${stationId}`),
    getRainfallSummary: () => fetchAPI<{ timestamp: string; stations: RainfallSummary[] }>('/api/weather/rainfall-summary'),
};

export const terrainApi = {
    getAll: () => fetchAPI<{ zones: Record<string, TerrainProfile> }>('/api/terrain'),
    getZone: (zoneCode: string) => fetchAPI<TerrainProfile>(`/api/terrain/${zoneCode}`),
    getSusceptibility: (zoneCode: string) => fetchAPI<any>(`/api/terrain/${zoneCode}/susceptibility`),
};

export const landslideApi = {
    getVerified: (state?: string) => fetchAPI<GeoJSONCollection & { total_events: number }>(`/api/landslides/verified${state ? `?state=${state}` : ''}`),
    getStats: () => fetchAPI<LandslideStats>('/api/landslides/stats'),
    getDensity: (lat: number, lon: number) => fetchAPI<any>(`/api/landslides/density?lat=${lat}&lon=${lon}`),
};

// ─── Phase 2 Mock Data ──────────────────────────────────────

export const MOCK_WEATHER: Record<string, WeatherStation> = {
    'GR-S001': { station_id: 'GR-S001', station_name: 'Shillong Peak', latitude: 25.5788, longitude: 91.8933, temperature: 18.4, feels_like: 17.2, humidity: 85, pressure: 1008, wind_speed: 6.2, wind_direction: 180, clouds: 75, visibility: 6000, description: 'light rain', icon: '10d', rainfall_1h: 4.2, rainfall_3h: 11.8, timestamp: new Date().toISOString(), source: 'Synthetic (demo)' },
    'GR-S002': { station_id: 'GR-S002', station_name: 'Sohra (Cherrapunji)', latitude: 25.2961, longitude: 91.732, temperature: 16.1, feels_like: 15.0, humidity: 97, pressure: 1003, wind_speed: 8.5, wind_direction: 210, clouds: 100, visibility: 2000, description: 'heavy intensity rain', icon: '10d', rainfall_1h: 28.6, rainfall_3h: 72.4, timestamp: new Date().toISOString(), source: 'Synthetic (demo)' },
    'GR-S003': { station_id: 'GR-S003', station_name: 'Guwahati Hill', latitude: 26.1445, longitude: 91.7362, temperature: 28.2, feels_like: 30.1, humidity: 72, pressure: 1012, wind_speed: 3.1, wind_direction: 150, clouds: 45, visibility: 9000, description: 'broken clouds', icon: '04d', rainfall_1h: 0.0, rainfall_3h: 1.2, timestamp: new Date().toISOString(), source: 'Synthetic (demo)' },
    'GR-S004': { station_id: 'GR-S004', station_name: 'Aizawl Ridge', latitude: 23.7271, longitude: 92.7176, temperature: 20.8, feels_like: 20.1, humidity: 88, pressure: 1006, wind_speed: 5.4, wind_direction: 240, clouds: 90, visibility: 4000, description: 'moderate rain', icon: '10d', rainfall_1h: 8.3, rainfall_3h: 22.1, timestamp: new Date().toISOString(), source: 'Synthetic (demo)' },
    'GR-S005': { station_id: 'GR-S005', station_name: 'Itanagar Slope', latitude: 27.0844, longitude: 93.6053, temperature: 25.6, feels_like: 26.2, humidity: 82, pressure: 1009, wind_speed: 4.0, wind_direction: 190, clouds: 70, visibility: 5500, description: 'light rain', icon: '10d', rainfall_1h: 3.5, rainfall_3h: 9.2, timestamp: new Date().toISOString(), source: 'Synthetic (demo)' },
    'GR-S006': { station_id: 'GR-S006', station_name: 'Kohima Highland', latitude: 25.6751, longitude: 94.1086, temperature: 19.2, feels_like: 18.5, humidity: 91, pressure: 1005, wind_speed: 7.1, wind_direction: 260, clouds: 85, visibility: 3500, description: 'moderate rain', icon: '10d', rainfall_1h: 12.4, rainfall_3h: 31.6, timestamp: new Date().toISOString(), source: 'Synthetic (demo)' },
    'GR-S007': { station_id: 'GR-S007', station_name: 'Mawsynram', latitude: 25.2972, longitude: 91.5822, temperature: 15.8, feels_like: 14.6, humidity: 99, pressure: 1001, wind_speed: 9.8, wind_direction: 200, clouds: 100, visibility: 1500, description: 'thunderstorm with rain', icon: '11d', rainfall_1h: 42.5, rainfall_3h: 98.7, timestamp: new Date().toISOString(), source: 'Synthetic (demo)' },
    'GR-S008': { station_id: 'GR-S008', station_name: 'Nongstoin', latitude: 25.5218, longitude: 91.2654, temperature: 17.9, feels_like: 17.0, humidity: 86, pressure: 1007, wind_speed: 4.8, wind_direction: 170, clouds: 80, visibility: 5000, description: 'light rain', icon: '10d', rainfall_1h: 5.1, rainfall_3h: 14.3, timestamp: new Date().toISOString(), source: 'Synthetic (demo)' },
};

export const MOCK_LANDSLIDE_STATS: LandslideStats = {
    total_events: 21,
    total_fatalities: 190,
    total_injuries: 209,
    by_state: {
        'Meghalaya': { events: 5, fatalities: 10, injuries: 15 },
        'Mizoram': { events: 3, fatalities: 49, injuries: 29 },
        'Arunachal Pradesh': { events: 3, fatalities: 7, injuries: 18 },
        'Nagaland': { events: 2, fatalities: 6, injuries: 8 },
        'Sikkim': { events: 2, fatalities: 42, injuries: 79 },
        'Assam': { events: 3, fatalities: 14, injuries: 32 },
        'Manipur': { events: 2, fatalities: 61, injuries: 32 },
        'Tripura': { events: 1, fatalities: 1, injuries: 3 },
    },
};

// ─── Phase 3 AI/ML Functions ─────────────────────────────────

export const predictionApi = {
    getModelInfo: () => fetchAPI<any>('/api/predict/model-info'),
    getAllZones: () => fetchAPI<{ zones: any[]; model: string }>('/api/predict/all-zones'),
    getSusceptibility: (zoneCode: string) => fetchAPI<any>(`/api/predict/susceptibility/${zoneCode}`),
};

export const MOCK_MODEL_INFO = {
    susceptibility_model: {
        name: 'RandomForest Susceptibility',
        version: 'rf-v1',
        status: 'active',
        metrics: {
            accuracy: 0.8760,
            n_samples: 500,
            n_estimators: 100,
            feature_importances: {
                slope_deg: 0.2814,
                relief_m: 0.1876,
                twi: 0.1543,
                spi: 0.1102,
                vegetation_index: 0.1231,
                curvature_score: 0.0512,
                drainage_score: 0.0922,
            },
        },
    },
    trigger_model: {
        name: 'GradientBoosted Trigger',
        version: 'gb-v1',
        status: 'active',
        metrics: {
            accuracy: 0.8350,
            precision: 0.8127,
            recall: 0.7843,
            f1_score: 0.7983,
            auc_roc_approx: 0.9012,
            n_samples: 800,
            n_estimators: 50,
            confusion_matrix: { tp: 215, fp: 49, fn: 59, tn: 477 },
            feature_importances: {
                susceptibility: 0.1834,
                rainfall_1h: 0.2156,
                rainfall_24h: 0.1543,
                soil_moisture: 0.1687,
                tilt_magnitude: 0.1102,
                humidity: 0.0654,
                antecedent_3d: 0.0612,
                antecedent_7d: 0.0412,
            },
        },
    },
};

export const MOCK_ZONE_PREDICTIONS = HOTSPOTS.map((h, i) => {
    const isHigh = h.priority_for_screening === 'high';
    const isMedium = h.priority_for_screening === 'medium';

    // Provide pseudo-realistic ML explanations based on metadata class labels provided by user
    let terrainClass = h.hotspot_type ? h.hotspot_type.replace('_', ' ').toUpperCase() : 'Undefined Profile';
    if (isHigh) terrainClass += ' — Critical Deforestation / High Accumulation';

    return {
        zone_code: h.id,
        zone_name: h.hotspot_name,
        terrain_class: terrainClass,
        elevation_m: 1000 + (i * 10),
        slope_deg: isHigh ? 35 + (i % 15) : 15 + (i % 20),
        susceptibility: isHigh ? 0.70 + (i % 25) / 100 : (isMedium ? 0.40 + (i % 30) / 100 : 0.10 + (i % 25) / 100),
        class: h.priority_for_screening ? h.priority_for_screening.toUpperCase() : 'UNKNOWN',
        top_factor: isHigh ? (i % 2 === 0 ? 'slope_deg' : 'rainfall_1h') : (i % 2 === 0 ? 'drainage_score' : 'twi'),
    };
});

// ─── Boundary Data ───────────────────────────────────────────

export const MOCK_BOUNDARIES_INDIA: GeoJSONCollection = {
    type: "FeatureCollection",
    features: [{
        type: "Feature",
        properties: { name: "India", level: 0 },
        geometry: {
            type: "Polygon",
            coordinates: [[[68.7, 8.4], [97.2, 8.4], [97.2, 37.6], [68.7, 37.6], [68.7, 8.4]]]
        }
    } as any]
};

export const MOCK_BOUNDARIES_STATES: GeoJSONCollection = {
    type: "FeatureCollection",
    features: [{
        type: "Feature",
        properties: { name: "Meghalaya", level: 1 },
        geometry: {
            type: "Polygon",
            coordinates: [[[89.8, 25.0], [92.8, 25.0], [92.8, 26.1], [89.8, 26.1], [89.8, 25.0]]]
        }
    } as any,
    {
        type: "Feature",
        properties: { name: "Assam", level: 1 },
        geometry: {
            type: "Polygon",
            coordinates: [[[89.7, 24.1], [96.0, 24.1], [96.0, 27.9], [89.7, 27.9], [89.7, 24.1]]]
        }
    } as any]
};
