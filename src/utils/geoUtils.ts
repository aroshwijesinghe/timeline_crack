import { LatLng, TimelineWaypoint } from '../types/timeline';

/**
 * Parses raw coordinate input into [lat, lng].
 * Handles degree symbols (e.g., "6.7951276°, 79.900867°"), E7 integers, strings, and objects.
 */
export function parseLatLng(input: any): LatLng | null {
  if (!input) return null;

  // Case 1: Array of 2 numbers
  if (Array.isArray(input) && input.length >= 2) {
    const lat = Number(input[0]);
    const lng = Number(input[1]);
    if (isValidCoord(lat, lng)) return [lat, lng];
  }

  // Case 2: String with degree symbol or comma: "6.7951276°, 79.900867°" or "6.795, 79.900"
  if (typeof input === 'string') {
    // Strip degree symbol, unicode characters like \u00b0 or 
    const cleaned = input.replace(/[\u00b0\uFFFD°\s]/g, '');
    const parts = cleaned.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (isValidCoord(lat, lng)) return [lat, lng];
    }
  }

  // Case 3: Object with lat/lng or latitude/longitude or E7
  if (typeof input === 'object') {
    // E7 format
    if ('latitudeE7' in input && 'longitudeE7' in input) {
      const lat = input.latitudeE7 / 1e7;
      const lng = input.longitudeE7 / 1e7;
      if (isValidCoord(lat, lng)) return [lat, lng];
    }
    if ('latLng' in input) {
      return parseLatLng(input.latLng);
    }
    if ('LatLng' in input) {
      return parseLatLng(input.LatLng);
    }
    if ('lat' in input && 'lng' in input) {
      const lat = Number(input.lat);
      const lng = Number(input.lng);
      if (isValidCoord(lat, lng)) return [lat, lng];
    }
    if ('latitude' in input && 'longitude' in input) {
      const lat = Number(input.latitude);
      const lng = Number(input.longitude);
      if (isValidCoord(lat, lng)) return [lat, lng];
    }
  }

  return null;
}

function isValidCoord(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);
}

/**
 * Calculates Haversine distance in meters between two coordinates.
 */
export function calculateDistanceMeters(p1: LatLng, p2: LatLng): number {
  const R = 6371000; // Earth radius in meters
  const lat1 = (p1[0] * Math.PI) / 180;
  const lat2 = (p2[0] * Math.PI) / 180;
  const deltaLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const deltaLng = ((p2[1] - p1[1]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Formats duration in ms to human readable string, e.g. "1h 45m" or "25m".
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Formats distance in meters to km or m.
 */
export function formatDistance(meters: number): string {
  if (!meters || meters <= 0) return '0 m';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Formats ISO timestamp or ms to time string (e.g. "04:30 PM").
 */
export function formatTime(val: string | number): string {
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Formats ISO or timestamp to full date string (e.g. "Jun 10, 2026").
 */
export function formatDate(val: string | number): string {
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '';
  }
}

/**
 * Converts date to YYYY-MM-DD in local time.
 */
export function toDateString(val: string | number): string {
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

export interface ActivityStyle {
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
  iconName: string;
}

export function getActivityStyle(type: string): ActivityStyle {
  const norm = (type || 'UNKNOWN').toUpperCase();
  switch (norm) {
    case 'WALKING':
    case 'ON_FOOT':
      return {
        label: 'Walking',
        color: '#10b981', // emerald-500
        borderColor: '#059669',
        bgColor: 'rgba(16, 185, 129, 0.15)',
        iconName: 'Footprints'
      };
    case 'CYCLING':
    case 'ON_BICYCLE':
      return {
        label: 'Cycling',
        color: '#06b6d4', // cyan-500
        borderColor: '#0891b2',
        bgColor: 'rgba(6, 182, 212, 0.15)',
        iconName: 'Bike'
      };
    case 'IN_PASSENGER_VEHICLE':
    case 'IN_VEHICLE':
    case 'DRIVING':
      return {
        label: 'Driving',
        color: '#3b82f6', // blue-500
        borderColor: '#2563eb',
        bgColor: 'rgba(59, 130, 246, 0.15)',
        iconName: 'Car'
      };
    case 'MOTORCYCLING':
    case 'MOTORCYCLE':
      return {
        label: 'Motorcycle',
        color: '#f59e0b', // amber-500
        borderColor: '#d97706',
        bgColor: 'rgba(245, 158, 11, 0.15)',
        iconName: 'Zap'
      };
    case 'IN_BUS':
    case 'BUS':
      return {
        label: 'Bus',
        color: '#8b5cf6', // violet-500
        borderColor: '#7c3aed',
        bgColor: 'rgba(139, 92, 246, 0.15)',
        iconName: 'Bus'
      };
    case 'IN_TRAIN':
    case 'IN_SUBWAY':
    case 'TRAIN':
      return {
        label: 'Train',
        color: '#ec4899', // pink-500
        borderColor: '#db2777',
        bgColor: 'rgba(236, 72, 153, 0.15)',
        iconName: 'Train'
      };
    case 'FLYING':
      return {
        label: 'Flying',
        color: '#6366f1', // indigo-500
        borderColor: '#4f46e5',
        bgColor: 'rgba(99, 102, 241, 0.15)',
        iconName: 'Plane'
      };
    case 'RUNNING':
      return {
        label: 'Running',
        color: '#ef4444', // red-500
        borderColor: '#dc2626',
        bgColor: 'rgba(239, 68, 68, 0.15)',
        iconName: 'Activity'
      };
    case 'STILL':
      return {
        label: 'Stationary',
        color: '#94a3b8',
        borderColor: '#64748b',
        bgColor: 'rgba(148, 163, 184, 0.15)',
        iconName: 'MapPin'
      };
    default:
      return {
        label: formatLabel(type),
        color: '#38bdf8', // sky-400
        borderColor: '#0284c7',
        bgColor: 'rgba(56, 189, 248, 0.15)',
        iconName: 'Navigation'
      };
  }
}

function formatLabel(str: string): string {
  if (!str) return 'Travel';
  return str
    .replace(/^IN_/, '')
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Linearly interpolates position along waypoints or path for a given timestamp.
 */
export function interpolatePosition(
  waypoints: TimelineWaypoint[],
  timestamp: number,
  fallbackPath?: LatLng[],
  startTimestamp?: number,
  endTimestamp?: number
): LatLng | null {
  if (waypoints && waypoints.length > 0) {
    const firstTs = waypoints[0].timestamp;
    const lastTs = waypoints[waypoints.length - 1].timestamp;

    if (lastTs > firstTs) {
      if (timestamp <= firstTs) return waypoints[0].point;
      if (timestamp >= lastTs) return waypoints[waypoints.length - 1].point;

      for (let i = 0; i < waypoints.length - 1; i++) {
        const p1 = waypoints[i];
        const p2 = waypoints[i + 1];
        if (timestamp >= p1.timestamp && timestamp <= p2.timestamp) {
          const span = p2.timestamp - p1.timestamp;
          if (span <= 0) return p1.point;
          const ratio = (timestamp - p1.timestamp) / span;
          return [
            p1.point[0] + (p2.point[0] - p1.point[0]) * ratio,
            p1.point[1] + (p2.point[1] - p1.point[1]) * ratio
          ];
        }
      }
    }
  }

  // Fallback: interpolate along path based on duration ratio
  if (fallbackPath && fallbackPath.length > 0) {
    if (fallbackPath.length === 1) return fallbackPath[0];
    if (startTimestamp !== undefined && endTimestamp !== undefined && endTimestamp > startTimestamp) {
      const clampedTs = Math.max(startTimestamp, Math.min(endTimestamp, timestamp));
      const ratio = (clampedTs - startTimestamp) / (endTimestamp - startTimestamp);
      const floatIndex = ratio * (fallbackPath.length - 1);
      const idx = Math.floor(floatIndex);
      const nextIdx = Math.min(fallbackPath.length - 1, idx + 1);
      const subRatio = floatIndex - idx;
      const p1 = fallbackPath[idx];
      const p2 = fallbackPath[nextIdx];
      return [
        p1[0] + (p2[0] - p1[0]) * subRatio,
        p1[1] + (p2[1] - p1[1]) * subRatio
      ];
    }
    return fallbackPath[0];
  }

  return null;
}

