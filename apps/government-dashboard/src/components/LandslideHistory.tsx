'use client';

/**
 * GeoRakshak — Landslide History Component
 * Shows verified NER landslide events with stats and timeline.
 */

import { LandslideStats } from '@/lib/api';

interface LandslideHistoryProps {
    stats: LandslideStats;
}

const SEVERITY_COLORS: Record<string, string> = {
    'CATASTROPHIC': '#ef4444',
    'MAJOR': '#f97316',
    'MODERATE': '#eab308',
    'MINOR': '#22c55e',
};

const NER_STATES = [
    'Meghalaya', 'Mizoram', 'Arunachal Pradesh', 'Nagaland',
    'Sikkim', 'Assam', 'Manipur', 'Tripura',
];

export default function LandslideHistory({ stats }: LandslideHistoryProps) {
    const maxFatalities = Math.max(
        ...Object.values(stats.by_state).map(s => s.fatalities), 1
    );

    return (
        <div className="glass-card p-6 mt-2">
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                📊 Historical Landslide Analysis — NER
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                Documented events from GSI, NDMA, and state SDMA records
            </p>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <div style={{
                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                    borderRadius: '10px', padding: '16px', textAlign: 'center',
                }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#3b82f6' }}>{stats.total_events}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Documented Events</div>
                </div>
                <div style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: '10px', padding: '16px', textAlign: 'center',
                }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#ef4444' }}>{stats.total_fatalities}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Fatalities</div>
                </div>
                <div style={{
                    background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)',
                    borderRadius: '10px', padding: '16px', textAlign: 'center',
                }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#f97316' }}>{stats.total_injuries}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Injuries</div>
                </div>
            </div>

            {/* State-by-State Analysis */}
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Impact by State
            </h4>
            <div style={{ marginBottom: '12px' }}>
                {NER_STATES.filter(s => stats.by_state[s]).map(state => {
                    const data = stats.by_state[state];
                    return (
                        <div key={state} style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            marginBottom: '10px', padding: '8px 12px',
                            background: 'var(--bg-secondary)', borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                        }}>
                            <span style={{ width: '140px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
                                {state}
                            </span>

                            {/* Fatalities bar */}
                            <div style={{ flex: 1, height: '24px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                                <div style={{
                                    width: `${Math.max(3, (data.fatalities / maxFatalities) * 100)}%`,
                                    height: '100%',
                                    background: `linear-gradient(90deg, rgba(239,68,68,0.4), rgba(239,68,68,0.8))`,
                                    borderRadius: '4px',
                                    transition: 'width 0.8s ease',
                                }} />
                                <span style={{
                                    position: 'absolute', left: '8px', top: '4px',
                                    fontSize: '11px', fontWeight: 600, color: '#fca5a5',
                                }}>
                                    {data.fatalities > 0 ? `${data.fatalities} deaths` : ''}
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{data.events}</span> events
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <span style={{ fontWeight: 700, color: '#f97316' }}>{data.injuries}</span> injured
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Key Insight */}
            <div style={{
                marginTop: '16px', padding: '12px 16px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)',
            }}>
                <strong style={{ color: '#ef4444' }}>⚠️ Highest impact:</strong> Manipur (Tupul Railway, 2022 — 61 fatalities),
                Sikkim (GLOF, Oct 2023 — 40 fatalities), Mizoram (Aizawl, 2021 — 29 fatalities)
            </div>

            <p style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Data compiled from GSI Landslide Atlas, NDMA reports, state SDMA records, and verified media reports.
                Coordinates represent approximate locality-level locations.
            </p>
        </div>
    );
}
