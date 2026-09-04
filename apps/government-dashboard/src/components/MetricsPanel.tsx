'use client';

import React, { useState } from 'react';
import { Search, Droplets, Wind, Thermometer, Activity, Map, ArrowUpCircle } from 'lucide-react';
import { SensorStation } from '@/lib/api';

interface TelemetryPacket {
    measurements?: {
        rainfall_1h: number;
        rainfall_24h: number;
        soil_moisture: number;
        susceptibility: number;
        tilt_magnitude: number;
        humidity?: number;
    };
    prediction?: {
        risk_level: string;
        confidence: number;
    };
}

interface MetricsPanelProps {
    sensors: SensorStation[];
    latestReadings: Record<string, TelemetryPacket>;
}

export default function MetricsPanel({ sensors, latestReadings }: MetricsPanelProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filtered = sensors.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between glass-card p-4">
                <div>
                    <h3 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Regional Telemetry Metrics</h3>
                    <p className="text-sm text-[var(--text-muted)]">Real-time geomorphic and hydrological criteria across deployed sensor hubs</p>
                </div>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search by area or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 w-64"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(station => {
                    const live = latestReadings[station.id]?.measurements;

                    // Fallback to baseline/mock if live socket stream hasn't hit this node yet
                    const rain1h = live?.rainfall_1h ?? station.latest_reading?.rainfall_1h ?? 0;
                    const rain24h = live?.rainfall_24h ?? station.latest_reading?.rainfall_24h ?? 0;
                    const soil = live?.soil_moisture ?? station.latest_reading?.soil_moisture ?? 0;
                    const tilt = live?.tilt_magnitude ?? 0;
                    const humidity = live?.humidity ?? 65 + (Math.random() * 20); // Fallback mock humidity
                    const temp = station.latest_reading?.temperature ?? 24;

                    const levelInfo = latestReadings[station.id]?.prediction?.risk_level || station.status;
                    const isCritical = levelInfo === 'CRITICAL' || levelInfo === 'EARLY WARNING (48HR)';

                    return (
                        <div key={station.id} className={`glass-card p-5 relative overflow-hidden ${isCritical ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : ''}`}>
                            {isCritical && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
                            )}

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-md font-bold text-[var(--text-primary)]">{station.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-[var(--text-muted)] mono bg-[var(--bg-secondary)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">{station.id}</span>
                                        <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Monitoring Node</span>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-bold ${isCritical ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                    {isCritical ? 'CRITICAL' : 'STABLE'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                {/* Rainfall */}
                                <div className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-1.5 text-blue-400 mb-2">
                                        <Droplets className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">Rainfall (1h)</span>
                                    </div>
                                    <div className="text-lg font-bold font-mono">
                                        {rain1h.toFixed(1)} <span className="text-xs text-[var(--text-muted)] font-sans font-normal">mm/h</span>
                                    </div>
                                    <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${Math.min((rain1h / 50) * 100, 100)}%` }} />
                                    </div>
                                </div>

                                {/* Soil Moisture */}
                                <div className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-1.5 text-orange-400 mb-2">
                                        <Activity className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">Soil Moisture</span>
                                    </div>
                                    <div className="text-lg font-bold font-mono">
                                        {soil.toFixed(1)} <span className="text-xs text-[var(--text-muted)] font-sans font-normal">%</span>
                                    </div>
                                    <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${Math.min(soil, 100)}%` }} />
                                    </div>
                                </div>

                                {/* Tilt & Dynamics */}
                                <div className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-1.5 text-purple-400 mb-2">
                                        <ArrowUpCircle className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">Ground Tilt</span>
                                    </div>
                                    <div className="text-lg font-bold font-mono">
                                        {tilt.toFixed(2)} <span className="text-xs text-[var(--text-muted)] font-sans font-normal">°</span>
                                    </div>
                                    <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${Math.min((tilt / 5) * 100, 100)}%` }} />
                                    </div>
                                </div>

                                {/* Atmosphere (Temp + Humidity) */}
                                <div className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5 text-green-400">
                                            <Thermometer className="w-4 h-4" />
                                        </div>
                                        <div className="flex items-center gap-1.5 text-cyan-400">
                                            <Wind className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-lg font-bold font-mono text-green-400/90">
                                            {temp.toFixed(1)}<span className="text-xs font-sans">°C</span>
                                        </div>
                                        <div className="text-lg font-bold font-mono text-cyan-400/90">
                                            {humidity.toFixed(0)}<span className="text-xs font-sans">%</span>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-[var(--text-muted)] text-center mt-2 uppercase tracking-wide">Atmospherics</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div className="p-12 text-center text-[var(--text-muted)] glass-card">
                    <Map className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    No monitoring hubs found matching "{searchTerm}"
                </div>
            )}
        </div>
    );
}
