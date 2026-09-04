'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJSONCollection, SensorStation } from '@/lib/api';

interface RiskMapProps {
  riskZones: GeoJSONCollection;
  sensors: SensorStation[];
  boundaries?: GeoJSONCollection;
  hotspots?: any[];
  center?: [number, number];
  zoom?: number;
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MODERATE: '#eab308',
  LOW: '#22c55e',
};

const STATUS_COLORS: Record<string, string> = {
  ONLINE: '#22c55e',
  OFFLINE: '#ef4444',
  FAULT: '#f97316',
  MAINTENANCE: '#eab308',
};

// Default NER center coordinates
const NER_CENTER: [number, number] = [25.5, 92.5];
const NER_ZOOM = 7;

export default function RiskMap({ riskZones, sensors, boundaries, hotspots, center, zoom }: RiskMapProps) {
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const boundariesLayerRef = useRef<L.GeoJSON | null>(null);
  const hotspotsLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current, {
      center: center || NER_CENTER,
      zoom: zoom || NER_ZOOM,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initialize with correct tile based on current theme
    const isDark = resolvedTheme === 'dark';
    // Use free tile providers that don't require API keys
    const url = isDark
      ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    tileLayerRef.current = L.tileLayer(url, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> | GeoRakshak Boundary Layer',
      subdomains: 'abc',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Listen for theme changes to update the tiles dynamically
  useEffect(() => {
    if (tileLayerRef.current) {
      const isDark = resolvedTheme === 'dark';
      const url = isDark
        ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      tileLayerRef.current.setUrl(url);
    }
  }, [resolvedTheme]);

  // Listen for region/center changes to pan the map
  useEffect(() => {
    if (mapRef.current && center && zoom) {
      mapRef.current.setView(center, zoom, { animate: true, duration: 1.5 });
    }
  }, [center, zoom]);

  // Listen for boundary changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (boundariesLayerRef.current) {
      map.removeLayer(boundariesLayerRef.current);
    }

    if (boundaries && boundaries.features?.length > 0) {
      boundariesLayerRef.current = L.geoJSON(boundaries as any, {
        style: (feature) => {
          const level = feature?.properties?.level || 0;
          return {
            color: level === 0 ? '#4f46e5' : '#8b5cf6',
            weight: level === 0 ? 3 : 2,
            opacity: 0.8,
            fill: false,
            dashArray: level > 0 ? '5, 5' : '',
          };
        },
        coordsToLatLng: (coords) => {
          // Fix antimeridian wrap artifacts by clamping longitude
          return L.latLng(coords[1], coords[0]);
        },
      }).addTo(map);
    }
  }, [boundaries]);

  // Update hotspots layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (hotspotsLayerRef.current) {
      map.removeLayer(hotspotsLayerRef.current);
    }

    if (hotspots && hotspots.length > 0) {
      const layerGroup = L.layerGroup();

      hotspots.forEach((h) => {
        // Representative Cluster rendering logic (Level 2)
        // 'priority_for_screening' in the dataset is either 'high' or 'medium'
        const isHigh = h.priority_for_screening === 'high';
        const color = isHigh ? '#f97316' : '#eab308'; // Orange for high, Yellow for medium

        const marker = L.circleMarker([h.latitude, h.longitude], {
          radius: 7,
          fillColor: color,
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.9,
          interactive: true
        });

        // Popup displaying the 120-item dataset fields on click
        marker.bindPopup(`
          <div style="font-family: Outfit, sans-serif; min-width: 150px; padding: 4px;">
            <div style="font-size: 10px; font-weight: bold; color: ${color}; text-transform: uppercase;">
              ${isHigh ? 'High Susceptibility Cluster' : 'Historical Reference Area'}
            </div>
            <strong style="font-size: 14px; display: block; margin: 4px 0;">${h.hotspot_name}</strong>
            <div style="font-size: 12px; color: #666;">${h.district}, ${h.state_ut}</div>
            <div style="font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd; color: #444;">
              <strong>Type:</strong> ${h.hotspot_type.replace('_', ' ')}
            </div>
          </div>
        `, {
          className: 'leaflet-popup-hotspot'
        });
        marker.addTo(layerGroup);
      });
      hotspotsLayerRef.current = layerGroup.addTo(map);
    }
  }, [hotspots]);

  // Update risk zones layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !riskZones?.features) return;

    // Remove existing risk zone layers
    map.eachLayer((layer) => {
      if ((layer as any)._isRiskZone) map.removeLayer(layer);
    });

    // Add risk zone polygons
    riskZones.features.forEach((feature) => {
      if (!feature.geometry) return;

      const riskLevel = feature.properties.risk_level || 'LOW';
      const color = RISK_COLORS[riskLevel] || RISK_COLORS.LOW;

      const layer = L.geoJSON(feature as any, {
        style: {
          color: color,
          weight: 2,
          opacity: 0.8,
          fillColor: color,
          fillOpacity: 0.25,
        },
      });

      (layer as any)._isRiskZone = true;

      // Tooltip on hover only (not permanent) to avoid label clutter
      layer.bindTooltip(feature.properties.name, {
        permanent: false,
        direction: 'center',
        className: 'leaflet-tooltip-risk',
      });

      layer.bindPopup(`
        <div style="min-width: 220px; font-family: Inter, sans-serif;">
          <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px; font-family: Outfit, sans-serif;">
            ${feature.properties.name}
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #9ca3af; font-size: 12px;">Risk Level</span>
            <span style="color: ${color}; font-weight: 700; font-size: 13px;">${riskLevel}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #9ca3af; font-size: 12px;">Risk Score</span>
            <span style="font-weight: 600; font-size: 13px;">${feature.properties.risk_score}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #9ca3af; font-size: 12px;">Susceptibility</span>
            <span style="font-weight: 600; font-size: 13px;">${(feature.properties.susceptibility_score * 100).toFixed(0)}%</span>
          </div>
          <div style="height: 6px; background: rgba(75,85,99,0.3); border-radius: 3px; margin-top: 8px;">
            <div style="height: 100%; width: ${feature.properties.risk_score}%; background: ${color}; border-radius: 3px;"></div>
          </div>
          <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">${feature.properties.zone_code}</div>
        </div>
      `);

      layer.addTo(map);
    });
  }, [riskZones]);

  // Update sensor markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sensors) return;

    // Remove existing sensor markers
    map.eachLayer((layer) => {
      if ((layer as any)._isSensor) map.removeLayer(layer);
    });

    sensors.forEach((sensor) => {
      const statusColor = STATUS_COLORS[sensor.status] || '#6b7280';

      // Custom circle marker
      const marker = L.circleMarker([sensor.latitude, sensor.longitude], {
        radius: 8,
        color: statusColor,
        weight: 2,
        opacity: 1,
        fillColor: statusColor,
        fillOpacity: 0.4,
      });

      (marker as any)._isSensor = true;

      const r = sensor.latest_reading;
      const tilt = r ? Math.sqrt((r.tilt_x || 0) ** 2 + (r.tilt_y || 0) ** 2).toFixed(2) : '—';

      marker.bindTooltip(sensor.name, {
        permanent: false,
        direction: 'top',
        offset: [0, -8],
        className: 'leaflet-tooltip-sensor',
      });

      marker.bindPopup(`
        <div style="min-width: 240px; font-family: Inter, sans-serif;">
          <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px; font-family: Outfit, sans-serif;">
            📍 ${sensor.name}
          </div>
          <div style="font-size: 11px; color: #6b7280; font-family: 'JetBrains Mono', monospace; margin-bottom: 8px;">
            ${sensor.id} • ${sensor.latitude.toFixed(4)}, ${sensor.longitude.toFixed(4)}
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="color: #9ca3af; font-size: 12px;">Status</span>
            <span style="color: ${statusColor}; font-weight: 700; font-size: 12px;">● ${sensor.status}</span>
          </div>

          ${r ? `
            <div style="border-top: 1px solid rgba(75,85,99,0.3); padding-top: 8px; margin-top: 4px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
                <div>🌧️ Rain (1h): <b>${r.rainfall_1h?.toFixed(1) ?? '—'} mm</b></div>
                <div>🌧️ Rain (24h): <b style="color: ${(r.rainfall_24h || 0) > 100 ? '#ef4444' : 'inherit'}">${r.rainfall_24h?.toFixed(1) ?? '—'} mm</b></div>
                <div>💧 Soil: <b style="color: ${(r.soil_moisture || 0) > 80 ? '#ef4444' : 'inherit'}">${r.soil_moisture?.toFixed(1) ?? '—'}%</b></div>
                <div>⛰️ Tilt: <b style="color: ${parseFloat(tilt) > 1 ? '#ef4444' : 'inherit'}">${tilt}°</b></div>
                <div>🌡️ Temp: <b>${r.temperature?.toFixed(1) ?? '—'}°C</b></div>
                <div>🔋 Battery: <b style="color: ${(sensor.battery_level || 0) < 20 ? '#ef4444' : '#22c55e'}">${sensor.battery_level ?? '—'}%</b></div>
              </div>
            </div>
          ` : '<div style="font-size: 11px; color: #ef4444; margin-top: 4px;">No recent readings</div>'}
        </div>
      `);

      marker.addTo(map);
    });
  }, [sensors]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-xl"
      style={{ minHeight: 500 }}
    />
  );
}
