'use client';

/**
 * GeoRakshak — AI Insights Component
 * ML model performance metrics, feature importance, and per-zone predictions.
 */

interface ModelMetrics {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
    auc_roc_approx?: number;
    n_samples?: number;
    n_estimators?: number;
    feature_importances?: Record<string, number>;
    confusion_matrix?: { tp: number; fp: number; fn: number; tn: number };
}

interface ZonePrediction {
    zone_code: string;
    zone_name?: string;
    terrain_class: string;
    elevation_m: number;
    slope_deg: number;
    susceptibility: number;
    class: string;
    top_factor: string;
}

interface AIInsightsProps {
    modelInfo: {
        susceptibility_model: { name: string; version: string; status: string; metrics: ModelMetrics };
        trigger_model: { name: string; version: string; status: string; metrics: ModelMetrics };
    };
    zonePredictions: ZonePrediction[];
    telemetryStream?: any[];
    nodeStates?: Record<string, { risk_level: string, confidence: number }>;
}

function MetricBadge({ label, value, format = 'pct' }: { label: string; value?: number; format?: string }) {
    if (value === undefined) return null;
    const displayVal = format === 'pct' ? `${(value * 100).toFixed(1)}%` : `${value}`;
    const color = value >= 0.8 ? '#22c55e' : value >= 0.6 ? '#eab308' : '#ef4444';

    return (
        <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
            borderRadius: '10px', padding: '12px 16px', textAlign: 'center',
        }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color, fontFamily: 'monospace' }}>
                {displayVal}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
        </div>
    );
}

function FeatureImportanceChart({ importances }: { importances: Record<string, number> }) {
    const sorted = Object.entries(importances).sort(([, a], [, b]) => b - a);
    const maxImp = Math.max(...sorted.map(([, v]) => v), 0.01);

    const featureLabels: Record<string, string> = {
        slope_deg: '📐 Slope',
        relief_m: '⛰️ Relief',
        twi: '💧 TWI',
        spi: '🌊 SPI',
        vegetation_index: '🌿 Vegetation',
        curvature_score: '📈 Curvature',
        drainage_score: '🔄 Drainage',
        susceptibility: '🏔️ Susceptibility',
        rainfall_1h: '🌧️ Rainfall 1h',
        rainfall_24h: '🌧️ Rainfall 24h',
        soil_moisture: '💦 Soil Moisture',
        tilt_magnitude: '📊 Tilt',
        humidity: '💨 Humidity',
        antecedent_3d: '☔ Rain 3-day',
        antecedent_7d: '☔ Rain 7-day',
    };

    return (
        <div>
            {sorted.map(([name, importance]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ width: '130px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>
                        {featureLabels[name] || name}
                    </span>
                    <div style={{ flex: 1, height: '18px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${(importance / maxImp) * 100}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, rgba(59,130,246,0.4), rgba(59,130,246,0.9))',
                            borderRadius: '4px',
                            transition: 'width 0.8s ease',
                        }} />
                    </div>
                    <span style={{ width: '50px', fontSize: '11px', fontWeight: 700, color: '#3b82f6', textAlign: 'right' }}>
                        {(importance * 100).toFixed(1)}%
                    </span>
                </div>
            ))}
        </div>
    );
}

const SUSC_CLASS_COLORS: Record<string, string> = {
    HIGH: '#ef4444',
    MODERATE: '#eab308',
    LOW: '#22c55e',
};

export default function AIInsights({ modelInfo, zonePredictions, telemetryStream = [], nodeStates }: AIInsightsProps) {
    const susc = modelInfo.susceptibility_model;
    const trig = modelInfo.trigger_model;

    return (
        <div className="space-y-6">
            {/* Model Status Cards */}
            <div className="grid grid-cols-2 gap-6">
                {/* Susceptibility Model */}
                <div className="glass-card p-6">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: 700 }}>
                                🌲 {susc.name}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                Terrain-based susceptibility mapping
                            </p>
                        </div>
                        <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px',
                            background: susc.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            color: susc.status === 'active' ? '#22c55e' : '#ef4444',
                        }}>
                            {susc.version} • {susc.status}
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                        <MetricBadge label="Accuracy" value={susc.metrics.accuracy} />
                        <MetricBadge label="Samples" value={susc.metrics.n_samples} format="num" />
                        <MetricBadge label="Trees" value={susc.metrics.n_estimators} format="num" />
                    </div>

                    {susc.metrics.feature_importances && (
                        <>
                            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                Feature Importance
                            </h4>
                            <FeatureImportanceChart importances={susc.metrics.feature_importances} />
                        </>
                    )}
                </div>

                {/* Trigger Model */}
                <div className="glass-card p-6">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: 700 }}>
                                ⚡ {trig.name}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                Real-time trigger prediction
                            </p>
                        </div>
                        <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px',
                            background: trig.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            color: trig.status === 'active' ? '#22c55e' : '#ef4444',
                        }}>
                            {trig.version} • {trig.status}
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                        <MetricBadge label="Accuracy" value={trig.metrics.accuracy} />
                        <MetricBadge label="Precision" value={trig.metrics.precision} />
                        <MetricBadge label="Recall" value={trig.metrics.recall} />
                        <MetricBadge label="AUC-ROC" value={trig.metrics.auc_roc_approx} />
                    </div>

                    {/* Phase 10: Live Stream Confidence Tracker */}
                    <div className="mb-6 p-4 bg-[#0a0e1a] rounded-lg border border-[var(--border-subtle)] shadow-inner">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                Live Trigger Confidence
                            </h4>
                            <span className="text-[10px] text-gray-500 font-mono tracking-widest">STREAM</span>
                        </div>
                        {telemetryStream && telemetryStream.length > 0 ? (
                            <div className="flex items-end gap-1 h-12 overflow-hidden justify-end">
                                {telemetryStream.slice(0, 30).reverse().map((pkt, idx) => {
                                    const conf = pkt.prediction?.confidence || 0;
                                    const h = Math.max(5, conf * 100);
                                    const isAlert = pkt.prediction?.risk_level === 'CRITICAL' || pkt.prediction?.risk_level === 'HIGH';
                                    return (
                                        <div
                                            key={idx}
                                            title={`${(conf * 100).toFixed(1)}%`}
                                            className={`w-3 rounded-t-sm transition-all duration-300 ${isAlert ? 'bg-red-500' : 'bg-blue-500/80 hover:bg-blue-400'}`}
                                            style={{ height: `${h}%` }}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-12 flex items-center justify-center text-xs text-gray-600 italic">
                                Waiting for live model evaluations...
                            </div>
                        )}
                        <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono">
                            <span>-30s</span>
                            <span>NOW</span>
                        </div>
                    </div>

                    {trig.metrics.confusion_matrix && (
                        <div style={{ marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Confusion Matrix
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '4px', fontSize: '12px', maxWidth: '280px' }}>
                                <div />
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Pred +</div>
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Pred −</div>
                                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Actual +</div>
                                <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(34,197,94,0.15)', borderRadius: '6px', color: '#22c55e', fontWeight: 700 }}>
                                    {trig.metrics.confusion_matrix.tp}
                                </div>
                                <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(239,68,68,0.15)', borderRadius: '6px', color: '#ef4444', fontWeight: 700 }}>
                                    {trig.metrics.confusion_matrix.fn}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Actual −</div>
                                <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(249,115,22,0.15)', borderRadius: '6px', color: '#f97316', fontWeight: 700 }}>
                                    {trig.metrics.confusion_matrix.fp}
                                </div>
                                <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(34,197,94,0.15)', borderRadius: '6px', color: '#22c55e', fontWeight: 700 }}>
                                    {trig.metrics.confusion_matrix.tn}
                                </div>
                            </div>
                        </div>
                    )}

                    {trig.metrics.feature_importances && (
                        <>
                            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                Feature Importance
                            </h4>
                            <FeatureImportanceChart importances={trig.metrics.feature_importances} />
                        </>
                    )}
                </div>
            </div>

            {/* Zone Susceptibility Ranking */}
            <div className="glass-card p-6">
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                    🗺️ ML Susceptibility Ranking — All NER Zones
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                    Live ranking by Edge ML confidence overlay • Higher = more landslide-prone
                </p>

                <div style={{ display: 'grid', gap: '10px' }}>
                    {zonePredictions
                        .map(zone => {
                            // Wire the rendering array organically to live WebSocket pipeline if node data shifts!
                            if (nodeStates && nodeStates[zone.zone_code]) {
                                return {
                                    ...zone,
                                    susceptibility: Math.max(zone.susceptibility, nodeStates[zone.zone_code].confidence),
                                    class: nodeStates[zone.zone_code].risk_level
                                };
                            }
                            return zone;
                        })
                        .sort((a, b) => b.susceptibility - a.susceptibility)
                        .map((zone, idx) => (
                            <div key={zone.zone_code} style={{
                                display: 'flex', alignItems: 'center', gap: '16px',
                                padding: '12px 16px', background: 'var(--bg-secondary)',
                                borderRadius: '10px', border: '1px solid var(--border-subtle)',
                            }}>
                                <span style={{
                                    width: '28px', height: '28px', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '12px', fontWeight: 800,
                                    background: idx < 3 ? 'rgba(239,68,68,0.15)' : 'var(--border-subtle)',
                                    color: idx < 3 ? '#ef4444' : 'var(--text-muted)',
                                }}>
                                    #{idx + 1}
                                </span>

                                <div style={{ width: '200px', flexShrink: 0 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {zone.zone_code} {zone.zone_name ? `— ${zone.zone_name}` : ''}
                                    </div>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{zone.terrain_class}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {zone.elevation_m}m • {zone.slope_deg}° • Top: {zone.top_factor}
                                    </div>
                                </div>

                                {/* Susceptibility bar */}
                                <div style={{ width: '200px', flexShrink: 0 }}>
                                    <div style={{ height: '12px', background: 'var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${zone.susceptibility * 100}%`,
                                            height: '100%',
                                            background: `linear-gradient(90deg, ${SUSC_CLASS_COLORS[zone.class] || '#6b7280'}66, ${SUSC_CLASS_COLORS[zone.class] || '#6b7280'})`,
                                            borderRadius: '6px',
                                            transition: 'width 0.8s ease',
                                        }} />
                                    </div>
                                </div>

                                <span style={{
                                    width: '65px', fontSize: '16px', fontWeight: 800, textAlign: 'right',
                                    color: SUSC_CLASS_COLORS[zone.class] || '#6b7280',
                                    fontFamily: 'monospace',
                                }}>
                                    {(zone.susceptibility * 100).toFixed(1)}%
                                </span>

                                <span style={{
                                    fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                                    color: SUSC_CLASS_COLORS[zone.class] || '#6b7280',
                                    background: `${SUSC_CLASS_COLORS[zone.class] || '#6b7280'}15`,
                                    width: '75px', textAlign: 'center',
                                }}>
                                    {zone.class}
                                </span>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
