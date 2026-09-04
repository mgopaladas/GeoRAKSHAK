'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Shield, Activity, AlertTriangle, Radio, MapPin, Cloud,
  Bell, Zap, BarChart3, ChevronRight, Wifi, WifiOff,
  Thermometer, Droplets, Mountain, BatteryMedium, Clock, Brain, Cpu, LogOut
} from 'lucide-react';
import {
  api, MOCK_STATS, MOCK_PRIORITIES, MOCK_SENSORS, MOCK_ALERTS, MOCK_RISK_ZONES,
  MOCK_WEATHER, MOCK_LANDSLIDE_STATS, MOCK_MODEL_INFO, MOCK_ZONE_PREDICTIONS,
  MOCK_BOUNDARIES_INDIA, MOCK_BOUNDARIES_STATES,
  type DashboardStats, type EmergencyPriority, type SensorStation,
  type Alert, type GeoJSONCollection, type SimulatorResult,
  type WeatherStation, type LandslideStats,
  weatherApi, landslideApi, predictionApi,
} from '@/lib/api';
import WeatherPanel from '@/components/WeatherPanel';
import LandslideHistory from '@/components/LandslideHistory';
import AIInsights from '@/components/AIInsights';
import MetricsPanel from '@/components/MetricsPanel';
import StudentHub from '@/components/StudentHub';
import RegionSelector from '@/components/RegionSelector';
import ThemeToggle from '@/components/ThemeToggle';
import { HOTSPOTS } from '@/lib/hotspotsData';
import { useTelemetry } from '@/hooks/useTelemetry';

// Dynamic import for Leaflet (SSR-incompatible)
const RiskMap = dynamic(() => import('@/components/RiskMap'), { ssr: false });

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(MOCK_STATS);
  const [priorities, setPriorities] = useState<EmergencyPriority[]>(MOCK_PRIORITIES);
  const [sensors, setSensors] = useState<SensorStation[]>(MOCK_SENSORS);
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [riskZones, setRiskZones] = useState<GeoJSONCollection>(MOCK_RISK_ZONES);
  const [simResult, setSimResult] = useState<SimulatorResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'sensors' | 'alerts' | 'metrics' | 'weather' | 'history' | 'ai' | 'simulator' | 'student'>('overview');
  const [weather, setWeather] = useState<Record<string, WeatherStation>>(MOCK_WEATHER);
  const [landslideStats, setLandslideStats] = useState<LandslideStats>(MOCK_LANDSLIDE_STATS);
  const [modelInfo, setModelInfo] = useState<any>(MOCK_MODEL_INFO);
  const [zonePredictions, setZonePredictions] = useState<any[]>(MOCK_ZONE_PREDICTIONS);
  const [now, setNow] = useState<Date | null>(null);
  const [regionId, setRegionId] = useState('ner');
  const [sensorSearch, setSensorSearch] = useState('');
  const [boundaries, setBoundaries] = useState<GeoJSONCollection | undefined>(undefined);
  const [hotspots, setHotspots] = useState<any[]>(HOTSPOTS);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Persist authentication during showcase reload
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('georakshak_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Manual Telemetry Override State
  const [manualTelemetry, setManualTelemetry] = useState({
    station_id: 'DEMO-NODE-01',
    rainfall_1h: 0,
    rainfall_24h: 0,
    soil_moisture: 0,
    tilt_magnitude: 0
  });

  const sendManualTelemetry = async () => {
    try {
      const payload = {
        station_id: manualTelemetry.station_id,
        measurements: {
          rainfall_1h: Number(manualTelemetry.rainfall_1h),
          rainfall_24h: Number(manualTelemetry.rainfall_24h),
          soil_moisture: Number(manualTelemetry.soil_moisture),
          tilt_magnitude: Number(manualTelemetry.tilt_magnitude)
        }
      };
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/v1/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'sk_test_123' },
        body: JSON.stringify(payload)
      });
      console.log(`Manual payload for ${manualTelemetry.station_id} injected into Edge ML Pipeline successfully.`);
    } catch (err) {
      console.error("Error sending manual telemetry", err);
    }
  };

  // Phase 10: Live WebSocket streaming
  const { telemetryStream, activeAlerts: liveAlerts, nodeStates, latestReadings } = useTelemetry();

  // Phase 15: Dynamically compute real-time structural risk counts directly from live streams!
  const liveStats = useMemo<DashboardStats>(() => {
    if (Object.keys(nodeStates).length === 0) return stats; // Fallback to baseline if websocket is warming up

    let critical = 0;
    let high = 0;
    let moderate = 0;
    // Nodes that haven't transmitted yet via WS are assumed safe/low baseline
    let low = Math.max(0, stats.total_sensors - Object.keys(nodeStates).length);

    Object.values(nodeStates).forEach(state => {
      const level = state.risk_level;
      if (level === 'CRITICAL' || level === 'EARLY WARNING (48HR)') critical++;
      else if (level === 'HIGH') high++;
      else if (level === 'MODERATE') moderate++;
      else if (level === 'LOW') low++;
    });

    return {
      ...stats,
      critical_zones: critical,
      high_risk_zones: high,
      moderate_zones: moderate,
      low_risk_zones: low,
    };
  }, [nodeStates, stats]);

  const packetTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  const filteredSensors = sensors.filter(s =>
    s.name.toLowerCase().includes(sensorSearch.toLowerCase()) ||
    s.id.toLowerCase().includes(sensorSearch.toLowerCase())
  );

  const mapConfig = (() => {
    // NOTE: For production, consider Bhuvan (ISRO) tiles which natively show India's official boundaries.
    // The SOI-derived boundary overlay ensures J&K and Ladakh are shown per India's official claim.
    switch (regionId) {
      case 'india': return { center: [23.5, 82.0] as [number, number], zoom: 4.5 };
      case 'himalayas': return { center: [31.0, 78.0] as [number, number], zoom: 6 };
      case 'western_ghats': return { center: [14.0, 75.0] as [number, number], zoom: 6 };
      case 'eastern_ghats': return { center: [17.5, 82.5] as [number, number], zoom: 6 };
      case 'ner':
      default: return { center: [25.5, 92.5] as [number, number], zoom: 7 };
    }
  })();

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Try connecting to real API, fall back to mock data
  useEffect(() => {
    async function loadData() {
      try {
        const [s, p, sen, a, rz] = await Promise.all([
          api.getStats(), api.getPriorities(), api.getSensors(),
          api.getAlerts(), api.getRiskZones()
        ]);
        setStats(s);
        setPriorities(p);
        setSensors(sen);
        setAlerts(a);
        setRiskZones(rz);
        setApiConnected(true);
        // Phase 2 data
        try {
          const [w, ls] = await Promise.all([
            weatherApi.getCurrent(), landslideApi.getStats(),
          ]);
          setWeather(w.stations);
          setLandslideStats(ls);
        } catch { /* Phase 2 data optional */ }
        // Phase 3 ML data
        try {
          const [mi, zp] = await Promise.all([
            predictionApi.getModelInfo(), predictionApi.getAllZones(),
          ]);
          setModelInfo(mi);
          setZonePredictions(zp.zones);
        } catch { /* Phase 3 data optional */ }
      } catch {
        setApiConnected(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load SOI-derived India boundary (includes J&K and Ladakh per India's official claim)
  useEffect(() => {
    async function loadBoundaries() {
      try {
        const res = await fetch('/data/boundaries/india_soi.geojson');
        if (res.ok) {
          const soiBoundary = await res.json();
          // Merge national boundary with state-level mock boundaries
          setBoundaries({
            type: 'FeatureCollection',
            features: [
              ...soiBoundary.features,
              ...MOCK_BOUNDARIES_STATES.features,
            ],
          } as any);
        } else {
          setBoundaries(MOCK_BOUNDARIES_STATES);
        }
      } catch {
        setBoundaries(MOCK_BOUNDARIES_STATES);
      }
    }
    loadBoundaries();
  }, []);

  // Trigger simulation
  const triggerSim = async (scenario: string) => {
    setSimLoading(true);
    try {
      if (apiConnected) {
        const result = await api.triggerSimulation(scenario);
        setSimResult(result);
        // Refresh data
        const [s, p, sen, a, rz] = await Promise.all([
          api.getStats(), api.getPriorities(), api.getSensors(),
          api.getAlerts(), api.getRiskZones(),
        ]);
        setStats(s); setPriorities(p); setSensors(sen); setAlerts(a); setRiskZones(rz);
      } else {
        // Mock simulation
        const mockLevels: Record<string, Partial<DashboardStats>> = {
          NORMAL: { critical_zones: 0, high_risk_zones: 1, moderate_zones: 4, low_risk_zones: 3 },
          HEAVY_RAIN: { critical_zones: 1, high_risk_zones: 4, moderate_zones: 2, low_risk_zones: 1 },
          GROUND_MOVEMENT: { critical_zones: 2, high_risk_zones: 4, moderate_zones: 1, low_risk_zones: 1 },
          CRITICAL: { critical_zones: 4, high_risk_zones: 3, moderate_zones: 1, low_risk_zones: 0 },
        };
        setStats(prev => ({ ...prev, ...mockLevels[scenario] }));
        setSimResult({
          scenario, stations_affected: 8, timestamp: new Date().toISOString(),
          note: 'SIMULATED — Mock mode (API not connected)',
          results: sensors.slice(0, 4).map(s => ({
            station_id: s.id, zone: s.name,
            risk_score: scenario === 'CRITICAL' ? 91 : scenario === 'GROUND_MOVEMENT' ? 78 : scenario === 'HEAVY_RAIN' ? 65 : 22,
            risk_level: scenario === 'CRITICAL' ? 'CRITICAL' : scenario === 'GROUND_MOVEMENT' ? 'HIGH' : scenario === 'HEAVY_RAIN' ? 'HIGH' : 'LOW',
            confidence: 0.82,
            reasons: scenario === 'NORMAL' ? ['Normal conditions'] : ['Simulated event triggered'],
          })),
        });
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimLoading(false);
    }
  };

  const riskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-500';
      case 'HIGH': return 'text-orange-500';
      case 'MODERATE': return 'text-yellow-500';
      case 'LOW': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  const riskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'risk-critical';
      case 'HIGH': return 'risk-high';
      case 'MODERATE': return 'risk-moderate';
      case 'LOW': return 'risk-low';
      default: return '';
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'nodal_officer' && password === 'georakshak2024') {
      if (typeof window !== 'undefined') localStorage.setItem('georakshak_auth', 'true');
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Invalid credentials. Please verify your clearance level.');
    }
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined') localStorage.removeItem('georakshak_auth');
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/grid-bg.svg')] bg-[var(--bg-primary)] bg-center relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-500/[0.02]" />

        <div className="relative z-10 w-full max-w-md p-8 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'Outfit, sans-serif' }}>GeoRakshak</h1>
            <p className="text-[var(--text-muted)] text-sm tracking-widest uppercase mt-2">MDoNER Secure Gateway</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Officer ID</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm"
                placeholder="Enter nodal credentials..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Security Key</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm"
                placeholder="••••••••••••"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-lg transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 mt-4"
            >
              Initialize Dashboard <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-1.5 opacity-60">
            <Shield className="w-3.5 h-3.5" /> SIH26001 Demo • Encrypted Session
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]/80 backdrop-blur-md flex flex-col min-h-screen fixed left-0 top-0 z-50">
        <div className="p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'Outfit, sans-serif' }}>GeoRakshak</h1>
              <p className="text-xs text-[var(--text-muted)]">Landslide Early Warning</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <button onClick={() => setActiveTab('overview')} className={`sidebar-link w-full ${activeTab === 'overview' ? 'active' : ''}`}>
            <BarChart3 className="w-5 h-5" /> Overview
          </button>
          <button onClick={() => setActiveTab('sensors')} className={`sidebar-link w-full ${activeTab === 'sensors' ? 'active' : ''}`}>
            <Radio className="w-5 h-5" /> Sensors
          </button>
          <button onClick={() => setActiveTab('alerts')} className={`sidebar-link w-full ${activeTab === 'alerts' ? 'active' : ''}`}>
            <Bell className="w-5 h-5" />
            Alerts
            {liveStats.active_alerts > 0 && (
              <span className="ml-auto bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">{liveStats.active_alerts}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('weather')} className={`sidebar-link w-full ${activeTab === 'weather' ? 'active' : ''}`}>
            <Cloud className="w-5 h-5" /> Weather
          </button>
          <button onClick={() => setActiveTab('metrics')} className={`sidebar-link w-full ${activeTab === 'metrics' ? 'active' : ''}`}>
            <Activity className="w-5 h-5" /> Metrics
          </button>

          <button onClick={() => setActiveTab('history')} className={`sidebar-link w-full ${activeTab === 'history' ? 'active' : ''}`}>
            <Clock className="w-5 h-5" /> History
          </button>
          <button onClick={() => setActiveTab('ai')} className={`sidebar-link w-full ${activeTab === 'ai' ? 'active' : ''}`}>
            <Brain className="w-5 h-5" /> AI Insights
          </button>
          <button onClick={() => setActiveTab('student')} className={`sidebar-link w-full ${activeTab === 'student' ? 'active' : ''}`}>
            <Cpu className="w-5 h-5" />
            <div className="flex flex-col items-start leading-tight">
              <span>Maker Hub</span>
              <span className="text-[9px] text-[var(--text-muted)]">Connect Equipment</span>
            </div>
          </button>
          <button onClick={() => setActiveTab('simulator')} className={`sidebar-link w-full ${activeTab === 'simulator' ? 'active' : ''}`}>
            <Zap className="w-5 h-5" /> SIH Demo
          </button>
        </nav>

        <div className="p-4 border-t border-[var(--border-subtle)]">
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-2 px-3 text-red-500 border border-red-500/20 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors mb-4">
            <LogOut className="w-4 h-4" /> Secure Sign Out
          </button>

          <div className={`flex items-center gap-2 text-xs ${apiConnected ? 'text-green-500' : 'text-yellow-500'}`}>
            {apiConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {apiConnected ? 'API Connected' : 'Demo Mode (Mock Data)'}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-[var(--bg-secondary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  GeoRakshak Operations Center
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  MDoNER • AI-Based Early Warning System
                </p>
              </div>
              <div className="flex items-center gap-3">
                <RegionSelector onRegionChange={setRegionId} />
                <ThemeToggle />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${liveStats.critical_zones > 0 ? 'bg-red-500 pulse-critical' : 'bg-green-500'}`} />
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {liveStats.critical_zones > 0 ? `${liveStats.critical_zones} Critical` : 'All Clear'}
                </span>
              </div>
              <span className="text-xs text-[var(--text-muted)] mono w-32 text-right">
                {now ? now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) : ''}
              </span>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Stats Row */}
          {activeTab !== 'student' && (
            <>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Critical Zones" value={liveStats.critical_zones} color="red" pulse={liveStats.critical_zones > 0} onClick={() => setActiveTab('alerts')} />
                <StatCard icon={<Mountain className="w-5 h-5" />} label="High Risk" value={liveStats.high_risk_zones} color="orange" onClick={() => setActiveTab('alerts')} />
                <StatCard icon={<Activity className="w-5 h-5" />} label="Moderate" value={liveStats.moderate_zones} color="yellow" onClick={() => setActiveTab('sensors')} />
                <StatCard icon={<Shield className="w-5 h-5" />} label="Low Risk" value={liveStats.low_risk_zones} color="green" onClick={() => setActiveTab('overview')} />
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <MiniStat label="Total Sensors" value={liveStats.total_sensors} sub={`${liveStats.online_sensors} online`} onClick={() => setActiveTab('sensors')} />
                <MiniStat label="Offline Sensors" value={liveStats.offline_sensors} sub="require attention" alert={liveStats.offline_sensors > 0} onClick={() => setActiveTab('sensors')} />
                <MiniStat label="Active Alerts" value={liveStats.active_alerts} sub="pending action" alert={liveStats.active_alerts > 2} onClick={() => setActiveTab('alerts')} />
                <MiniStat label="Historical Events" value={liveStats.total_landslide_events} sub="NER landslide records" onClick={() => setActiveTab('history')} />
              </div>
            </>
          )}

          {activeTab === 'overview' && (
            <div className="grid grid-cols-3 gap-6">
              {/* Map — takes 2 columns */}
              <div className="col-span-2 glass-card p-1" style={{ height: 520 }}>
                <RiskMap riskZones={riskZones} sensors={sensors} boundaries={boundaries} hotspots={hotspots} center={mapConfig.center} zoom={mapConfig.zoom} />
              </div>

              {/* Emergency Priorities */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">Emergency Priorities</h3>
                <div className="space-y-3">
                  {priorities.map((item, i) => (
                    <div key={item.rank} className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-card-hover)] transition-colors group">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-[var(--text-muted)]">#{item.rank}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riskBadge(item.risk_level)}`}>
                          {item.risk_level}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm mb-1 text-[var(--text-primary)]">{item.zone_name}</h4>
                      <p className="text-xs text-[var(--text-muted)]">{item.description}</p>
                      <div className="mt-2">
                        <div className="score-bar">
                          <div
                            className="score-bar-fill"
                            style={{
                              width: `${item.risk_score}%`,
                              background: item.risk_level === 'CRITICAL' ? '#ef4444' :
                                item.risk_level === 'HIGH' ? '#f97316' : '#eab308',
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-[var(--text-muted)]">{item.risk_score}% risk</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'sensors' && (
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Sensor Network — NER</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Real-time sensor station status and latest readings</p>
                </div>
                <div className="flex gap-2">
                  {telemetryStream.length > 0 && (
                    <div className="flex items-center gap-2 mr-4">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      <span className="text-xs font-bold text-green-500 tracking-wider">LIVE STREAM</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search station or ID..."
                      className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-md px-3 py-1.5 text-sm w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[var(--text-primary)]"
                      value={sensorSearch}
                      onChange={(e) => setSensorSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Phase 10: Live Telemetry terminal */}

              {/* Phase 10: Live Telemetry terminal */}
              <div className="bg-[#0a0e1a] border-b border-[var(--border-subtle)] p-4 max-h-48 overflow-y-auto font-mono text-xs shadow-inner">
                {telemetryStream.length === 0 ? (
                  <div className="text-gray-500 italic">Waiting for incoming telemetry packets...</div>
                ) : (
                  <div className="space-y-1">
                    {telemetryStream.map((pkt, idx) => (
                      <div key={idx} className="flex gap-3 text-green-400/80 hover:bg-green-500/10 px-2 py-0.5 rounded transition-colors">
                        <span className="text-gray-500 opacity-60">[{packetTime(pkt.timestamp)}]</span>
                        <span className="text-blue-400 font-bold min-w-[70px]">{pkt.station_id}</span>
                        <span className="text-gray-400">MEAS:</span>
                        <span>[ R1h: <span className="text-cyan-300">{pkt.measurements?.rainfall_1h?.toFixed(2)}</span>, R24h: <span className="text-cyan-300">{pkt.measurements?.rainfall_24h?.toFixed(2)}</span>, SM: <span className="text-orange-300">{pkt.measurements?.soil_moisture?.toFixed(2)}</span>, TILT: <span className="text-yellow-300">{pkt.measurements?.tilt_magnitude?.toFixed(3)}</span> ]</span>
                        <span className="text-gray-400 mx-2">{'->'}</span>
                        <span className={`${pkt.prediction?.risk_level === 'CRITICAL' ? 'text-red-500 font-bold' : pkt.prediction?.risk_level === 'HIGH' ? 'text-orange-500 font-bold' : 'text-green-500'} bg-black/40 px-1 rounded`}>
                          {pkt.prediction?.risk_level} ({(pkt.prediction?.confidence || 0) * 100}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-[var(--text-muted)] uppercase border-b border-[var(--border-subtle)]">
                      <th className="text-left p-4">Station</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-right p-4">Rain (1h)</th>
                      <th className="text-right p-4">Rain (24h)</th>
                      <th className="text-right p-4">Soil %</th>
                      <th className="text-right p-4">Tilt °</th>
                      <th className="text-right p-4">Temp</th>
                      <th className="text-right p-4">Battery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensors.filter(s =>
                      s.name.toLowerCase().includes(sensorSearch.toLowerCase()) ||
                      s.id.toLowerCase().includes(sensorSearch.toLowerCase()) ||
                      s.status.toLowerCase().includes(sensorSearch.toLowerCase())
                    ).map((s) => {
                      const livePacket = latestReadings[s.id];
                      // Sync live measurements instantly over the standard mock array
                      const r = livePacket ? {
                        rainfall_1h: livePacket.measurements?.rainfall_1h ?? 0,
                        rainfall_24h: livePacket.measurements?.rainfall_24h ?? 0,
                        soil_moisture: livePacket.measurements?.soil_moisture ?? 0,
                        tilt_x: livePacket.measurements?.tilt_magnitude ?? 0,
                        tilt_y: 0,
                        temperature: s.latest_reading?.temperature ?? 24,
                      } : s.latest_reading;
                      const currentStatus = nodeStates[s.id]?.risk_level || s.status;

                      const tilt = r ? Math.sqrt((r.tilt_x || 0) ** 2 + (r.tilt_y || 0) ** 2) : 0;
                      return (
                        <tr key={s.id} className="border-b border-[var(--border-subtle)]/50 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer" onClick={() => alert(`Navigating to detailed telemetry view for ${s.id}... (Demo)`)}>
                          <td className="p-4">
                            <div className="font-medium text-sm text-[var(--text-primary)]">{s.name}</div>
                            <div className="text-xs text-[var(--text-muted)] mono">{s.id}</div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${currentStatus === 'CRITICAL' || currentStatus === 'EARLY WARNING (48HR)' ? 'text-red-500' : currentStatus === 'HIGH' ? 'text-orange-500' : 'text-green-500'}`}>
                              <span className={`w-2 h-2 rounded-full ${currentStatus === 'CRITICAL' || currentStatus === 'EARLY WARNING (48HR)' ? 'bg-red-500 animate-pulse' : currentStatus === 'HIGH' ? 'bg-orange-500' : 'bg-green-500'}`} />
                              {currentStatus}
                            </span>
                          </td>
                          <td className={`p-4 text-right text-sm mono ${(r?.rainfall_1h || 0) > 100 ? 'text-red-400' : ''}`}>
                            {r?.rainfall_1h?.toFixed(1) ?? '—'} mm
                          </td>
                          <td className={`p-4 text-right text-sm mono ${(r?.rainfall_24h || 0) > 100 ? 'text-red-400' : ''}`}>
                            {r?.rainfall_24h?.toFixed(1) ?? '—'} mm
                          </td>
                          <td className={`p-4 text-right text-sm mono ${(r?.soil_moisture || 0) > 80 ? 'text-red-400' : (r?.soil_moisture || 0) > 60 ? 'text-orange-400' : ''}`}>
                            {r?.soil_moisture?.toFixed(1) ?? '—'}%
                          </td>
                          <td className={`p-4 text-right text-sm mono ${tilt > 1 ? 'text-red-400 font-bold' : tilt > 0.5 ? 'text-orange-400' : ''}`}>
                            {r ? tilt.toFixed(2) : '—'}°
                          </td>
                          <td className="p-4 text-right text-sm mono">{r?.temperature?.toFixed(1) ?? '—'}°C</td>
                          <td className="p-4 text-right">
                            <span className={`text-sm mono ${(s.battery_level || 0) < 20 ? 'text-red-400' : (s.battery_level || 0) < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {s.battery_level ?? '—'}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Live Emergency Action Hub</h3>
              {liveAlerts.length === 0 ? (
                <div className="p-10 text-center text-[var(--text-muted)] glass-card">
                  All regional triggers stabilize under nominal parameters. No active alerts.
                </div>
              ) : (
                liveAlerts.map((a: any, index) => (
                  <div key={index} className={`glass-card p-5 border-l-4 ${a.severity === 'CRITICAL' ? 'border-l-red-500' :
                    a.severity === 'HIGH' ? 'border-l-orange-500' :
                      a.severity === 'EARLY WARNING (48HR)' ? 'border-l-purple-500' :
                        a.severity === 'MODERATE' ? 'border-l-yellow-500' : 'border-l-green-500'
                    }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riskBadge(a.severity)}`}>
                          {a.severity}
                        </span>
                        <h4 className="font-semibold mt-2 text-[var(--text-primary)]">{a.station_id || 'Unknown Station'}</h4>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">{a.message || 'Critical structural distress signature detected.'}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-2">Active Zone • {a.timestamp ? new Date(a.timestamp).toLocaleString('en-IN') : 'Just now'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        <span className={`text-xs px-2 py-1 rounded font-bold bg-red-500/10 text-red-500 border border-red-500/20`}>
                          ACTIVE
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => alert(`Anomaly response protocol initiated for ${a.station_id || 'Unknown Station'}. Flagged for direct Field Operations review.`)}
                            className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/30 transition-colors">
                            Acknowledge
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('overview');
                              setTimeout(() => alert(`Centering map interface and engaging GIS isolation on ${a.station_id || 'regional'} sector...`), 300);
                            }}
                            className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30 transition-colors">
                            Locate
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'weather' && (
            <WeatherPanel weather={weather} latestReadings={latestReadings} />
          )}

          {activeTab === 'history' && (
            <LandslideHistory stats={{
              ...landslideStats,
              total_events: (landslideStats.total_events || 0) + liveStats.critical_zones
            }} />
          )}

          {activeTab === 'ai' && (
            <AIInsights modelInfo={modelInfo} zonePredictions={zonePredictions} telemetryStream={telemetryStream} nodeStates={nodeStates} />
          )}

          {activeTab === 'metrics' && (
            <MetricsPanel sensors={sensors} latestReadings={latestReadings} />
          )}

          {activeTab === 'student' && (
            <StudentHub />
          )}

          {activeTab === 'simulator' && (
            <div className="space-y-6">
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  SIH Demonstration Simulator
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Simulate disaster scenarios to demonstrate the end-to-end sensor → AI → GIS → alert pipeline.
                  All generated data is <span className="text-yellow-400 font-medium">SYNTHETIC</span>.
                </p>

                <div className="grid grid-cols-4 gap-4 mb-6">
                  <button onClick={() => triggerSim('NORMAL')} disabled={simLoading} className="sim-btn sim-btn-normal">
                    🟢 Normal Conditions
                  </button>
                  <button onClick={() => triggerSim('HEAVY_RAIN')} disabled={simLoading} className="sim-btn sim-btn-rain">
                    🌧️ Heavy Rain
                  </button>
                  <button onClick={() => triggerSim('GROUND_MOVEMENT')} disabled={simLoading} className="sim-btn sim-btn-movement">
                    ⛰️ Ground Movement
                  </button>
                  <button onClick={() => triggerSim('CRITICAL')} disabled={simLoading} className="sim-btn sim-btn-critical">
                    🚨 Critical Scenario
                  </button>
                </div>

                {simLoading && (
                  <div className="text-center py-4 text-gray-400">
                    <span className="animate-spin inline-block mr-2">⏳</span>
                    Simulating...
                  </div>
                )}

                {simResult && !simLoading && (
                  <div className="glass-card p-5 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Simulation Result</h4>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${riskBadge(
                        simResult.results[0]?.risk_level || 'LOW'
                      )}`}>
                        {simResult.scenario}
                      </span>
                    </div>

                    <div className="text-xs text-yellow-400/80 mb-4 italic">{simResult.note}</div>

                    <div className="space-y-3">
                      {simResult.results.map((r, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                          <div>
                            <span className="text-sm font-medium">{r.zone || r.station_id}</span>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {r.reasons?.join(' • ')}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-bold mono ${riskColor(r.risk_level || 'LOW')}`}>
                              {r.risk_score}%
                            </span>
                            <div className={`text-xs font-medium ${riskColor(r.risk_level || 'LOW')}`}>
                              {r.risk_level}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 border-t border-[var(--border-subtle)] pt-6">
                  <h3 className="text-md font-semibold mb-2 text-blue-400" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Manual Node Edge-Trigger (Direct IoT Mock)
                  </h3>
                  <p className="text-xs text-gray-400 mb-4">Craft a custom packet to explicitly trigger the exact ML classification engine parameters and prove real-time pipeline latency.</p>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Station ID</label>
                      <input type="text" value={manualTelemetry.station_id} onChange={e => setManualTelemetry({ ...manualTelemetry, station_id: e.target.value })} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Rain (1H)</label>
                      <input type="number" value={manualTelemetry.rainfall_1h} onChange={e => setManualTelemetry({ ...manualTelemetry, rainfall_1h: Number(e.target.value) })} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Rain (24H)</label>
                      <input type="number" value={manualTelemetry.rainfall_24h} onChange={e => setManualTelemetry({ ...manualTelemetry, rainfall_24h: Number(e.target.value) })} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Soil Moist %</label>
                      <input type="number" value={manualTelemetry.soil_moisture} onChange={e => setManualTelemetry({ ...manualTelemetry, soil_moisture: Number(e.target.value) })} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Tilt (Deg)</label>
                      <input type="number" value={manualTelemetry.tilt_magnitude} onChange={e => setManualTelemetry({ ...manualTelemetry, tilt_magnitude: Number(e.target.value) })} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm" />
                    </div>
                  </div>

                  <button onClick={sendManualTelemetry} className="w-full bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 border border-blue-500/50 transition-colors py-2 rounded font-bold text-sm">
                    🚀 Dispatch IoT Packet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main >
    </div >
  );
}

// ─── Sub-components ──────────────────────────────────────────

function StatCard({ icon, label, value, color, pulse, onClick }: {
  icon: React.ReactNode; label: string; value: number; color: string; pulse?: boolean; onClick?: () => void;
}) {
  const colors: Record<string, string> = {
    red: 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-400',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-400',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-400',
  };

  return (
    <div onClick={onClick} className={`glass-card p-5 bg-gradient-to-br ${colors[color]} border ${pulse ? 'pulse-critical' : ''} ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-3xl font-bold mono">{value}</span>
      </div>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

function MiniStat({ label, value, sub, alert, onClick }: {
  label: string; value: number; sub: string; alert?: boolean; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={`glass-card p-4 ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:bg-[var(--bg-card-hover)] transition-all' : ''}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold mono ${alert ? 'text-orange-400' : ''}`}>{value}</div>
      <div className="text-xs text-gray-600">{sub}</div>
    </div>
  );
}
