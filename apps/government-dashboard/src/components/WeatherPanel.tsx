'use client';

/**
 * GeoRakshak — Weather Panel Component
 * Shows current weather + rainfall intensity across NER stations.
 */

import { WeatherStation } from '@/lib/api';

interface WeatherPanelProps {
    weather: Record<string, WeatherStation>;
    latestReadings?: Record<string, any>;
}

function getRainColor(mm: number): string {
    if (mm > 40) return '#ef4444';  // Extreme
    if (mm > 20) return '#f97316';  // Heavy 
    if (mm > 7) return '#eab308';   // Moderate
    if (mm > 1) return '#3b82f6';   // Light
    return '#6b7280';               // None
}

function getRainIntensity(mm: number): string {
    if (mm > 50) return 'EXTREME';
    if (mm > 20) return 'HEAVY';
    if (mm > 7) return 'MODERATE';
    if (mm > 1) return 'LIGHT';
    return 'NONE';
}

function getWeatherEmoji(desc: string): string {
    if (desc.includes('thunder')) return '⛈️';
    if (desc.includes('heavy')) return '🌧️';
    if (desc.includes('rain')) return '🌦️';
    if (desc.includes('cloud')) return '☁️';
    if (desc.includes('clear') || desc.includes('sun')) return '☀️';
    if (desc.includes('mist') || desc.includes('fog')) return '🌫️';
    return '🌤️';
}

export default function WeatherPanel({ weather, latestReadings }: WeatherPanelProps) {
    const stations = Object.values(weather).map(w => {
        // Dynamically override static weather API with real-time WebSocket node telemetry if actively connected
        if (latestReadings && latestReadings[w.station_id]) {
            const live = latestReadings[w.station_id];
            return {
                ...w,
                rainfall_1h: live.measurements?.rainfall_1h ?? w.rainfall_1h,
                temperature: live.measurements?.temperature ?? w.temperature,
                humidity: live.measurements?.humidity ?? w.humidity,
            };
        }
        return w;
    }).sort(
        (a, b) => (b.rainfall_1h || 0) - (a.rainfall_1h || 0)
    );

    // Calculate max rainfall for bar chart scaling
    const maxRain = Math.max(...stations.map(s => s.rainfall_1h || 0), 1);

    return (
        <div className="glass-card p-6">
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                🌦️ Live Weather — NER Stations
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                Current conditions • Rainfall intensity • Source: {stations[0]?.source || 'Synthetic'}
            </p>

            {/* Rainfall Bar Chart */}
            <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Rainfall Intensity (mm/h)
                </h4>
                {stations.map(s => (
                    <div key={s.station_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ width: '140px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>
                            {s.station_name}
                        </span>
                        <div style={{ flex: 1, height: '20px', background: 'rgba(75,85,99,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${Math.max(2, (s.rainfall_1h / maxRain) * 100)}%`,
                                height: '100%',
                                background: `linear-gradient(90deg, ${getRainColor(s.rainfall_1h)}66, ${getRainColor(s.rainfall_1h)})`,
                                borderRadius: '4px',
                                transition: 'width 0.6s ease',
                            }} />
                        </div>
                        <span style={{
                            width: '40px', fontSize: '12px', fontWeight: 700, color: getRainColor(s.rainfall_1h),
                            textAlign: 'right', flexShrink: 0
                        }}>
                            {s.rainfall_1h.toFixed(1)}
                        </span>
                        <span style={{
                            width: '70px', fontSize: '11px', fontWeight: 700, textAlign: 'center',
                            padding: '2px 6px', borderRadius: '4px',
                            color: getRainColor(s.rainfall_1h),
                            background: `${getRainColor(s.rainfall_1h)}15`,
                        }}>
                            {getRainIntensity(s.rainfall_1h)}
                        </span>
                    </div>
                ))}
            </div>

            {/* Station Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {stations.map(s => (
                    <div key={s.station_id} style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '10px',
                        padding: '14px',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {s.station_name}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                                    {s.station_id}
                                </span>
                            </div>
                            <span style={{ fontSize: '28px' }}>{getWeatherEmoji(s.description)}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                            <div>
                                <span style={{ color: 'var(--text-muted)' }}>Temp</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: '6px' }}>
                                    {s.temperature}°C
                                </span>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)' }}>Humidity</span>
                                <span style={{
                                    color: s.humidity > 90 ? '#f97316' : 'var(--text-primary)',
                                    fontWeight: 600, marginLeft: '6px',
                                }}>
                                    {s.humidity}%
                                </span>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)' }}>Wind</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: '6px' }}>
                                    {s.wind_speed} m/s
                                </span>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)' }}>Clouds</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: '6px' }}>
                                    {s.clouds}%
                                </span>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Conditions</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 500, marginLeft: '6px', textTransform: 'capitalize' }}>
                                    {s.description}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
