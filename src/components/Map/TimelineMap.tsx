import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  TimelineDay,
  TimelinePlaceVisit,
  TimelineActivity,
  MapTileProvider,
  RawSignalPoint
} from '../../types/timeline';
import {
  getActivityStyle,
  formatTime,
  formatDistance,
  computePathArrowPoints,
  analyzeActivityDirections
} from '../../utils/geoUtils';
import { Eye, EyeOff, Navigation } from 'lucide-react';

interface TimelineMapProps {
  selectedDay: TimelineDay | null;
  focusedItemId?: string | null;
  rawSignals: RawSignalPoint[];
  onSelectVisit?: (visit: TimelinePlaceVisit) => void;
  onSelectActivity?: (activity: TimelineActivity) => void;
}

export const TimelineMap: React.FC<TimelineMapProps> = ({
  selectedDay,
  focusedItemId,
  rawSignals,
  onSelectVisit,
  onSelectActivity
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const arrowsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const rawSignalsLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [tileProvider, setTileProvider] = useState<MapTileProvider>('esri-dark');
  const [showRawSignals, setShowRawSignals] = useState(false);
  const [showDirectionArrows, setShowDirectionArrows] = useState(true);
  const [hasBidirectional, setHasBidirectional] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center Sri Lanka (from user dataset)
    const map = L.map(mapContainerRef.current, {
      center: [6.9271, 79.8612],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true, // Hardware-accelerated Canvas rendering for vector routes & points
      zoomSnap: 0.25, // Micro-zoom increments for silky smooth zooming
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120, // Prevents abrupt jumping on mouse wheel / trackpad scroll
      wheelDebounceTime: 40,
      fadeAnimation: true,
      zoomAnimation: true,
      markerZoomAnimation: true,
      inertia: true,
      inertiaDeceleration: 3400,
      inertiaMaxSpeed: 2000,
      easeLinearity: 0.25
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial tile layer: Esri World Dark Gray (free, no API key, no watermark)
    const initialUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    tileLayerRef.current = L.tileLayer(initialUrl, {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 16,
      keepBuffer: 8, // Keep preloaded buffer around viewport for lag-free panning
      updateWhenZooming: false, // Don't churn DOM during zoom; scale tiles with CSS3 transforms
      updateWhenIdle: true, // Only fetch new tile resolution once zooming/scrolling pauses
      updateInterval: 120
    }).addTo(map);

    markersLayerGroupRef.current = L.layerGroup().addTo(map);
    routesLayerGroupRef.current = L.layerGroup().addTo(map);
    arrowsLayerGroupRef.current = L.layerGroup().addTo(map);
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
    tileLayerRef.current.options.keepBuffer = 8;
    tileLayerRef.current.options.updateWhenZooming = false;
    tileLayerRef.current.options.updateWhenIdle = true;
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
    const { directionMap, hasBidirectional: foundBidirectional } = analyzeActivityDirections(selectedDay.activities);
    setHasBidirectional(foundBidirectional);

    selectedDay.activities.forEach((act) => {
      const style = getActivityStyle(act.type);
      if (act.path.length < 2) return;

      const dirInfo = directionMap.get(act.id);
      const pathToDraw = dirInfo?.offsetPath || act.path;
      const routeColor = dirInfo ? dirInfo.color : style.color;

      const polyline = L.polyline(pathToDraw, {
        color: routeColor,
        weight: 5,
        opacity: 0.88,
        lineCap: 'round',
        lineJoin: 'round'
      });

      let directionBadge = '';
      if (dirInfo?.role === 'outbound') {
        directionBadge = `
          <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            ➔ Outbound
          </span>
        `;
      } else if (dirInfo?.role === 'return') {
        directionBadge = `
          <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
            ➔ Return
          </span>
        `;
      }

      const avgSpeedKmh =
        act.durationMs > 0 && act.distanceKm > 0
          ? ((act.distanceKm / (act.durationMs / 3600000))).toFixed(1)
          : null;

      polyline.bindPopup(`
        <div class="p-3 text-slate-100 min-w-[210px]">
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" style="background-color: ${routeColor}"></span>
              <span class="font-bold text-sm tracking-wide text-white uppercase">${style.label}</span>
            </div>
            ${directionBadge}
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

    // 2. Draw Visited Place Markers with Human-Crafted Personality
    const totalVisits = selectedDay.visits.length;

    selectedDay.visits.forEach((v, index) => {
      const isDeparture = index === 0;
      const isDestination = totalVisits > 1 && index === totalVisits - 1;

      let badgeGradient = 'from-indigo-600 to-violet-500';
      let ringColor = 'ring-indigo-500/40 shadow-indigo-500/40';
      let statusLabel = `Stop #${index + 1}`;
      let statusBadge = `bg-indigo-500/20 text-indigo-300 border-indigo-500/30`;

      if (isDeparture) {
        badgeGradient = 'from-emerald-500 to-teal-400';
        ringColor = 'ring-emerald-400/50 shadow-emerald-500/50';
        statusLabel = 'Departure';
        statusBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      } else if (isDestination) {
        badgeGradient = 'from-rose-500 to-amber-500';
        ringColor = 'ring-rose-500/50 shadow-rose-500/50';
        statusLabel = 'Destination';
        statusBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      }

      const markerHtml = `
        <div class="custom-pin-marker relative group flex flex-col items-center">
          ${isDeparture ? '<div class="absolute -inset-1 rounded-full bg-emerald-400/30 animate-ping pointer-events-none"></div>' : ''}
          ${isDestination ? '<div class="absolute -inset-1 rounded-full bg-rose-500/30 animate-ping pointer-events-none"></div>' : ''}
          
          <div class="relative w-9 h-9 rounded-full bg-gradient-to-tr ${badgeGradient} text-white flex items-center justify-center font-extrabold text-xs shadow-xl ${ringColor} border-2 border-white ring-2">
            ${isDeparture ? '🛫' : isDestination ? '🏁' : index + 1}
          </div>

          <div class="absolute -bottom-2 bg-slate-950/90 backdrop-blur-md text-[9px] px-1.5 py-0.5 rounded-full border border-white/20 font-mono text-cyan-300 shadow-md whitespace-nowrap">
            ${v.durationFormatted}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: '',
        iconSize: [36, 42],
        iconAnchor: [18, 21],
        popupAnchor: [0, -22]
      });

      const marker = L.marker(v.location, { icon: customIcon });

      const googleMapsUrl = `https://www.google.com/maps?q=${v.location[0]},${v.location[1]}`;

      marker.bindPopup(`
        <div class="p-4 text-slate-100 min-w-[240px]">
          <div class="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-white/10">
            <div class="flex items-center gap-1.5">
              <span class="text-sm font-bold text-white">${statusLabel}</span>
              <span class="text-[10px] text-slate-400 font-mono">#${index + 1}</span>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${statusBadge}">
              ${v.semanticType || 'Visited Place'}
            </span>
          </div>
          
          <div class="text-xs space-y-2 text-slate-300">
            <div class="flex justify-between items-center bg-slate-950/40 px-2 py-1 rounded-lg border border-white/5">
              <span class="text-slate-400 flex items-center gap-1">⏱ Dwell Time:</span>
              <span class="font-bold text-emerald-400 font-mono">${v.durationFormatted}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Arrival:</span>
              <span class="font-medium text-white">${formatTime(v.startTime)}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Departure:</span>
              <span class="font-medium text-white">${formatTime(v.endTime)}</span>
            </div>
            <div class="pt-2 flex justify-between items-center text-[11px] border-t border-white/10">
              <span class="text-slate-400 font-mono text-[10px]">${v.location[0].toFixed(4)}, ${v.location[1].toFixed(4)}</span>
              <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-0.5 hover:underline">
                Maps ↗
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

  // Render Direction Arrows along visited paths (optimized to prevent DOM lag)
  useEffect(() => {
    const arrowsGroup = arrowsLayerGroupRef.current;
    if (!arrowsGroup) return;
    arrowsGroup.clearLayers();

    if (!showDirectionArrows || !selectedDay) return;

    const { directionMap } = analyzeActivityDirections(selectedDay.activities);

    // Limit total arrows across the map to prevent DOM layout lag during zoom/scroll
    let totalArrowsCount = 0;
    const MAX_TOTAL_ARROWS = 45;
    const maxPerPath = selectedDay.activities.length > 10 ? 3 : 5;

    for (const act of selectedDay.activities) {
      if (act.path.length < 2) continue;
      if (totalArrowsCount >= MAX_TOTAL_ARROWS) break;

      const dirInfo = directionMap.get(act.id);
      const pathToDraw = dirInfo?.offsetPath || act.path;
      const arrowColor = dirInfo ? dirInfo.arrowColor : getActivityStyle(act.type).color;

      const arrowPoints = computePathArrowPoints(pathToDraw, 900, maxPerPath);
      for (const point of arrowPoints) {
        if (totalArrowsCount >= MAX_TOTAL_ARROWS) break;

        const arrowHtml = `
          <div style="transform: rotate(${point.bearing}deg); width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <svg width="16" height="16" viewBox="0 0 24 24" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.85));">
              <path d="M12 2.5L20 20.5L12 16.5L4 20.5L12 2.5Z" fill="${arrowColor}" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round" />
            </svg>
          </div>
        `;
        const arrowIcon = L.divIcon({
          html: arrowHtml,
          className: 'bg-transparent border-none',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        const arrowMarker = L.marker(point.position, {
          icon: arrowIcon,
          interactive: false
        });
        arrowsGroup.addLayer(arrowMarker);
        totalArrowsCount++;
      }
    }
  }, [selectedDay, showDirectionArrows]);

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

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Map Controls & Overlays */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col items-end gap-2.5">
        {/* Layer Selector Segmented Control */}
        <div className="glass-panel p-1 rounded-2xl shadow-2xl flex items-center gap-1 border border-white/10 backdrop-blur-2xl">
          {(['esri-dark', 'esri-streets', 'satellite', 'osm'] as MapTileProvider[]).map((provider) => {
            const labels: Record<MapTileProvider, string> = {
              'esri-dark': 'Dark',
              'esri-streets': 'Streets',
              satellite: 'Satellite',
              osm: 'OSM'
            };
            const isActive = tileProvider === provider;
            return (
              <button
                key={provider}
                onClick={() => setTileProvider(provider)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {labels[provider]}
              </button>
            );
          })}
        </div>

        {/* Toggles: Direction Arrows & Raw GPS */}
        <div className="glass-panel p-1 rounded-2xl shadow-2xl flex items-center justify-end gap-1.5 border border-white/10 backdrop-blur-2xl">
          <button
            onClick={() => setShowDirectionArrows(!showDirectionArrows)}
            title="Toggle Visited Direction Arrows"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              showDirectionArrows
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Navigation className={`w-3.5 h-3.5 text-cyan-400 transition-transform duration-300 ${showDirectionArrows ? 'rotate-45' : ''}`} />
            <span>Arrows</span>
          </button>

          <button
            onClick={() => setShowRawSignals(!showRawSignals)}
            title="Toggle Raw GPS breadcrumbs"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              showRawSignals
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            {showRawSignals ? <Eye className="w-3.5 h-3.5 text-rose-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>GPS {rawSignals.length > 0 ? `(${rawSignals.length})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Bidirectional Route Legend */}
      {hasBidirectional && (
        <div className="absolute bottom-6 left-4 sm:left-6 z-[400] glass-panel px-4 py-2.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 text-xs animate-fade-in pointer-events-auto backdrop-blur-2xl">
          <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] tracking-wider uppercase">
            <Navigation className="w-3.5 h-3.5 text-cyan-400 rotate-45" />
            <span>Path Corridors:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
            <span className="text-cyan-300 font-semibold text-xs">Outbound ➔</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
            <span className="text-rose-300 font-semibold text-xs">Return ➔</span>
          </div>
        </div>
      )}
    </div>
  );
};
