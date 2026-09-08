import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  LatLng,
  TimelineDay,
  TimelinePlaceVisit,
  TimelineActivity,
  MapTileProvider,
  RawSignalPoint
} from '../../types/timeline';
import {
  getActivityStyle,
  formatTime,
  formatDistance
} from '../../utils/geoUtils';
import { Crosshair, Eye, EyeOff } from 'lucide-react';

interface TimelineMapProps {
  selectedDay: TimelineDay | null;
  focusedItemId: string | null;
  playbackPosition: LatLng | null;
  playbackStatus: string;
  playbackActivityType: string | null;
  rawSignals: RawSignalPoint[];
  onSelectVisit?: (visit: TimelinePlaceVisit) => void;
  onSelectActivity?: (activity: TimelineActivity) => void;
}

export const TimelineMap: React.FC<TimelineMapProps> = ({
  selectedDay,
  focusedItemId,
  playbackPosition,
  playbackStatus,
  playbackActivityType,
  rawSignals,
  onSelectVisit,
  onSelectActivity
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const rawSignalsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const playbackMarkerRef = useRef<L.Marker | null>(null);

  const [tileProvider, setTileProvider] = useState<MapTileProvider>('esri-dark');
  const [showRawSignals, setShowRawSignals] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center Sri Lanka (from user dataset)
    const map = L.map(mapContainerRef.current, {
      center: [6.9271, 79.8612],
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial tile layer: Esri World Dark Gray (free, no API key, no watermark)
    const initialUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    tileLayerRef.current = L.tileLayer(initialUrl, {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 16
    }).addTo(map);

    markersLayerGroupRef.current = L.layerGroup().addTo(map);
    routesLayerGroupRef.current = L.layerGroup().addTo(map);
    rawSignalsLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Tile Provider Switch (seamless with setUrl - zero black squares)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !tileLayerRef.current) return;

    let url = '';
    let maxZoom = 18;

    switch (tileProvider) {
      case 'esri-dark':
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
        maxZoom = 16;
        break;
      case 'esri-streets':
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
        maxZoom = 19;
        break;
      case 'satellite':
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        maxZoom = 18;
        break;
      case 'osm':
        url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        maxZoom = 19;
        break;
    }

    tileLayerRef.current.setUrl(url);
    tileLayerRef.current.options.maxZoom = maxZoom;
    map.invalidateSize();
  }, [tileProvider]);

  // Render Day's Elements (Visits & Routes)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedDay) return;

    const markersGroup = markersLayerGroupRef.current;
    const routesGroup = routesLayerGroupRef.current;
    if (!markersGroup || !routesGroup) return;

    markersGroup.clearLayers();
    routesGroup.clearLayers();

    // 1. Draw Routes / Activities
    selectedDay.activities.forEach((act) => {
      const style = getActivityStyle(act.type);
      if (act.path.length < 2) return;

      const polyline = L.polyline(act.path, {
        color: style.color,
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      });

      const avgSpeedKmh =
        act.durationMs > 0 && act.distanceKm > 0
          ? ((act.distanceKm / (act.durationMs / 3600000))).toFixed(1)
          : null;

      polyline.bindPopup(`
        <div class="p-3 text-slate-100 min-w-[200px]">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-3 h-3 rounded-full" style="background-color: ${style.color}"></span>
            <span class="font-bold text-sm tracking-wide text-white uppercase">${style.label}</span>
          </div>
          <div class="text-xs space-y-1 text-slate-300">
            <div class="flex justify-between"><span class="text-slate-400">Distance:</span> <span class="font-semibold text-white">${formatDistance(act.distanceMeters)}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Duration:</span> <span class="font-semibold text-white">${act.durationFormatted}</span></div>
            ${avgSpeedKmh ? `<div class="flex justify-between"><span class="text-slate-400">Avg Speed:</span> <span class="font-semibold text-white">${avgSpeedKmh} km/h</span></div>` : ''}
            <div class="flex justify-between"><span class="text-slate-400">Time:</span> <span>${formatTime(act.startTime)} - ${formatTime(act.endTime)}</span></div>
          </div>
        </div>
      `);

      polyline.on('click', () => {
        if (onSelectActivity) onSelectActivity(act);
      });

      routesGroup.addLayer(polyline);
    });

    // 2. Draw Visited Place Markers
    selectedDay.visits.forEach((v, index) => {
      const markerHtml = `
        <div class="custom-pin-marker relative group">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-indigo-500/50 border-2 border-white ring-2 ring-indigo-500/40">
            ${index + 1}
          </div>
          <div class="absolute -bottom-1 -right-1 bg-slate-900 text-[10px] px-1 rounded border border-slate-700 font-mono text-emerald-400">
            ${v.durationFormatted}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
      });

      const marker = L.marker(v.location, { icon: customIcon });

      const googleMapsUrl = `https://www.google.com/maps?q=${v.location[0]},${v.location[1]}`;

      marker.bindPopup(`
        <div class="p-3 text-slate-100 min-w-[220px]">
          <div class="flex items-center justify-between mb-2 border-b border-slate-700/60 pb-1.5">
            <span class="font-bold text-sm text-indigo-400">Stop #${index + 1}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold uppercase">
              ${v.semanticType || 'Place'}
            </span>
          </div>
          <div class="text-xs space-y-1.5 text-slate-300">
            <div class="flex justify-between">
              <span class="text-slate-400">Duration:</span>
              <span class="font-semibold text-emerald-400">${v.durationFormatted}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Arrival:</span>
              <span class="font-medium text-white">${formatTime(v.startTime)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Departure:</span>
              <span class="font-medium text-white">${formatTime(v.endTime)}</span>
            </div>
            <div class="pt-2 flex justify-between items-center text-[11px] border-t border-slate-800">
              <span class="text-slate-400 font-mono text-[10px]">${v.location[0].toFixed(4)}, ${v.location[1].toFixed(4)}</span>
              <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 underline font-medium">
                Google Maps ↗
              </a>
            </div>
          </div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectVisit) onSelectVisit(v);
      });

      markersGroup.addLayer(marker);
    });

    // 3. Fit Bounds to Day's Activity
    if (selectedDay.bounds) {
      map.fitBounds(selectedDay.bounds, { padding: [50, 50], maxZoom: 15, animate: true });
    }
  }, [selectedDay]);

  // Handle Focus Item (Pan/Zoom on click from feed)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusedItemId || !selectedDay) return;

    const visit = selectedDay.visits.find(v => v.id === focusedItemId);
    if (visit) {
      map.flyTo(visit.location, 16, { duration: 1.2 });
      return;
    }

    const activity = selectedDay.activities.find(a => a.id === focusedItemId);
    if (activity && activity.path.length > 0) {
      const bounds = L.latLngBounds(activity.path);
      map.fitBounds(bounds, { padding: [60, 60], animate: true });
    }
  }, [focusedItemId, selectedDay]);

  // Handle Raw Signals Toggle
  useEffect(() => {
    const rawGroup = rawSignalsLayerGroupRef.current;
    if (!rawGroup) return;
    rawGroup.clearLayers();

    if (showRawSignals && rawSignals.length > 0) {
      // Sample or render all points with subtle glowing dots
      rawSignals.forEach((p) => {
        const circle = L.circleMarker([p.lat, p.lng], {
          radius: 3,
          color: '#f43f5e',
          fillColor: '#fb7185',
          fillOpacity: 0.6,
          weight: 1
        });
        circle.bindTooltip(`Time: ${formatTime(p.timestamp)} | Speed: ${p.speedMetersPerSecond?.toFixed(1) || 0} m/s`, {
          direction: 'top',
          className: 'bg-slate-900 text-white text-xs px-2 py-1 rounded border border-slate-700'
        });
        rawGroup.addLayer(circle);
      });
    }
  }, [showRawSignals, rawSignals]);

  // Handle Playback Animated Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!playbackPosition) {
      if (playbackMarkerRef.current) {
        map.removeLayer(playbackMarkerRef.current);
        playbackMarkerRef.current = null;
      }
      return;
    }

    const actStyle = getActivityStyle(playbackActivityType || 'TRAVEL');

    const playbackHtml = `
      <div class="playback-marker-pulse">
        <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-xl border-2 border-white ring-2 ring-indigo-400" style="background-color: ${actStyle.color}">
          <div class="w-3 h-3 rounded-full bg-white animate-pulse"></div>
        </div>
      </div>
    `;

    const playbackIcon = L.divIcon({
      html: playbackHtml,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    if (!playbackMarkerRef.current) {
      playbackMarkerRef.current = L.marker(playbackPosition, {
        icon: playbackIcon,
        zIndexOffset: 2000
      }).addTo(map);
    } else {
      playbackMarkerRef.current.setLatLng(playbackPosition);
      playbackMarkerRef.current.setIcon(playbackIcon);
    }

    if (autoFollow) {
      map.panTo(playbackPosition, { animate: true, duration: 0.2 });
    }
  }, [playbackPosition, playbackActivityType, autoFollow]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Map Controls & Overlays */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        {/* Layer Selector */}
        <div className="glass-panel p-1 rounded-xl shadow-xl flex items-center gap-1">
          <button
            onClick={() => setTileProvider('esri-dark')}
            title="Esri Dark Theme (No API Key)"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tileProvider === 'esri-dark'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => setTileProvider('esri-streets')}
            title="Clean Street Map"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tileProvider === 'esri-streets'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Streets
          </button>
          <button
            onClick={() => setTileProvider('satellite')}
            title="Satellite Imagery"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tileProvider === 'satellite'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setTileProvider('osm')}
            title="OpenStreetMap Standard"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tileProvider === 'osm'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            OSM
          </button>
        </div>

        {/* Toggles: Raw GPS & Auto-Follow */}
        <div className="glass-panel p-1 rounded-xl shadow-xl flex items-center justify-end gap-1">
          <button
            onClick={() => setShowRawSignals(!showRawSignals)}
            title="Toggle Raw GPS breadcrumbs"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showRawSignals
                ? 'bg-rose-600/90 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {showRawSignals ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>GPS Points {rawSignals.length > 0 ? `(${rawSignals.length})` : ''}</span>
          </button>

          <button
            onClick={() => setAutoFollow(!autoFollow)}
            title="Auto-center camera on moving vehicle/pin"
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              autoFollow
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating HUD status during playback */}
      {playbackPosition && (
        <div className="absolute top-4 left-4 z-[400] glass-panel px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-indigo-500/30 animate-fade-in">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">Live Playback Status</div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{playbackStatus}</span>
              {playbackActivityType && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {playbackActivityType}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
