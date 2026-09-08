import { LatLng, TimelineWaypoint, ParsedTimeline, TimelineDay, TimelineStats } from '../types/timeline';

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

/**
 * Calculates compass bearing (0-360 deg) between two coordinates.
 */
export function calculateBearing(p1: LatLng, p2: LatLng): number {
  const lat1 = (p1[0] * Math.PI) / 180;
  const lat2 = (p2[0] * Math.PI) / 180;
  const dLng = ((p2[1] - p1[1]) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Offsets a coordinate by a distance in meters along a given bearing angle.
 */
export function offsetLatLng(point: LatLng, bearingDeg: number, distanceMeters: number): LatLng {
  const R = 6371000; // Earth's radius in meters
  const latRad = (point[0] * Math.PI) / 180;
  const lngRad = (point[1] * Math.PI) / 180;
  const bearingRad = (bearingDeg * Math.PI) / 180;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distanceMeters / R) +
    Math.cos(latRad) * Math.sin(distanceMeters / R) * Math.cos(bearingRad)
  );
  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distanceMeters / R) * Math.cos(latRad),
      Math.cos(distanceMeters / R) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return [(newLatRad * 180) / Math.PI, (newLngRad * 180) / Math.PI];
}

/**
 * Offsets a polyline perpendicularly to its direction of travel (to the right if positive distance).
 * This creates clean parallel lanes for opposing or bidirectional paths so both directions are visible side-by-side.
 */
export function offsetPolyline(path: LatLng[], offsetMeters: number): LatLng[] {
  if (!path || path.length < 2 || offsetMeters === 0) return path;

  const result: LatLng[] = [];
  for (let i = 0; i < path.length; i++) {
    let bearing: number;
    if (i === 0) {
      bearing = calculateBearing(path[0], path[1]);
    } else if (i === path.length - 1) {
      bearing = calculateBearing(path[path.length - 2], path[path.length - 1]);
    } else {
      const b1 = calculateBearing(path[i - 1], path[i]);
      const b2 = calculateBearing(path[i], path[i + 1]);
      let diff = b2 - b1;
      while (diff < -180) diff += 360;
      while (diff > 180) diff -= 360;
      bearing = (b1 + diff / 2 + 360) % 360;
    }

    // Right-hand perpendicular angle (90 degrees clockwise)
    const perpBearing = (bearing + 90) % 360;
    result.push(offsetLatLng(path[i], perpBearing, offsetMeters));
  }

  return result;
}

export interface PathArrowPoint {
  position: LatLng;
  bearing: number;
}

/**
 * Computes evenly-spaced arrow positions and bearings along a polyline.
 * Ensures clean visibility with optimal spacing (e.g. every ~350m).
 */
export function computePathArrowPoints(path: LatLng[], minDistanceBetweenMeters: number = 350): PathArrowPoint[] {
  if (!path || path.length < 2) return [];

  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const len = calculateDistanceMeters(path[i], path[i + 1]);
    segmentLengths.push(len);
    totalLength += len;
  }

  if (totalLength < 35) return [];

  const targetDistances: number[] = [];
  if (totalLength < minDistanceBetweenMeters) {
    // Short path: 1 arrow right at 50%
    targetDistances.push(totalLength * 0.5);
  } else if (totalLength < minDistanceBetweenMeters * 2) {
    // Medium path: 2 arrows at 35% and 70%
    targetDistances.push(totalLength * 0.35);
    targetDistances.push(totalLength * 0.7);
  } else {
    // Longer path: evenly spaced arrows
    const count = Math.min(30, Math.max(2, Math.floor(totalLength / minDistanceBetweenMeters)));
    const step = totalLength / count;
    for (let i = 0; i < count; i++) {
      targetDistances.push((i + 0.5) * step);
    }
  }

  const arrows: PathArrowPoint[] = [];
  let currentDist = 0;
  let segIdx = 0;

  for (const target of targetDistances) {
    while (segIdx < segmentLengths.length - 1 && currentDist + segmentLengths[segIdx] < target) {
      currentDist += segmentLengths[segIdx];
      segIdx++;
    }

    const segLen = segmentLengths[segIdx];
    const p1 = path[segIdx];
    const p2 = path[segIdx + 1];
    const bearing = calculateBearing(p1, p2);

    if (segLen <= 0.0001) {
      arrows.push({ position: p1, bearing });
      continue;
    }

    const ratio = Math.max(0, Math.min(1, (target - currentDist) / segLen));
    const pos: LatLng = [
      p1[0] + (p2[0] - p1[0]) * ratio,
      p1[1] + (p2[1] - p1[1]) * ratio
    ];

    arrows.push({ position: pos, bearing });
  }

  return arrows;
}

export interface DirectionalActivityInfo {
  isBidirectional: boolean;
  role: 'outbound' | 'return' | 'unidirectional';
  color: string;
  arrowColor: string;
  label: string;
  offsetPath: LatLng[];
  partnerActivityId?: string;
}

/**
 * Analyzes activities for bidirectional routes (outbound vs return journeys).
 * Pairs opposing routes and assigns Cyan (#06b6d4) for Outbound, Rose (#f43f5e) for Return,
 * and offsets their paths so both directions and arrows are distinctly visible side-by-side.
 */
export function analyzeActivityDirections(
  activities: import('../types/timeline').TimelineActivity[]
): {
  directionMap: Map<string, DirectionalActivityInfo>;
  hasBidirectional: boolean;
} {
  const directionMap = new Map<string, DirectionalActivityInfo>();
  let hasBidirectional = false;

  if (!activities || activities.length === 0) {
    return { directionMap, hasBidirectional: false };
  }

  // Find bidirectional pairs
  const pairedSet = new Set<string>();
  const pairs: Array<{ outboundId: string; returnId: string }> = [];

  for (let i = 0; i < activities.length; i++) {
    const actA = activities[i];
    if (actA.path.length < 2 || pairedSet.has(actA.id)) continue;

    for (let j = i + 1; j < activities.length; j++) {
      const actB = activities[j];
      if (actB.path.length < 2 || pairedSet.has(actB.id)) continue;

      // Check 1: Endpoints match in reverse
      const startA = actA.path[0];
      const endA = actA.path[actA.path.length - 1];
      const startB = actB.path[0];
      const endB = actB.path[actB.path.length - 1];

      const dDirectA = calculateDistanceMeters(startA, endA);
      const dDirectB = calculateDistanceMeters(startB, endB);

      let isOpposing = false;

      if (dDirectA > 250 && dDirectB > 250) {
        const dStartA_EndB = calculateDistanceMeters(startA, endB);
        const dEndA_StartB = calculateDistanceMeters(endA, startB);

        if (dStartA_EndB < 900 && dEndA_StartB < 900) {
          isOpposing = true;
        }
      }

      // Check 2: Sample intermediate points to see if paths overlap in opposite directions
      if (!isOpposing && actA.path.length >= 3 && actB.path.length >= 3) {
        const sampleCount = Math.min(8, actA.path.length);
        let opposingSampleMatches = 0;

        for (let s = 0; s < sampleCount; s++) {
          const idxA = Math.floor((s / (sampleCount - 1)) * (actA.path.length - 1));
          const ptA = actA.path[idxA];
          const nextIdxA = Math.min(actA.path.length - 1, idxA + 1);
          const bearingA = calculateBearing(ptA, actA.path[nextIdxA]);

          // Find closest point in B
          let minBdist = Infinity;
          let closestIdxB = 0;
          for (let b = 0; b < actB.path.length; b++) {
            const d = calculateDistanceMeters(ptA, actB.path[b]);
            if (d < minBdist) {
              minBdist = d;
              closestIdxB = b;
            }
          }

          if (minBdist < 350) {
            const nextIdxB = Math.min(actB.path.length - 1, closestIdxB + 1);
            const bearingB = calculateBearing(actB.path[closestIdxB], actB.path[nextIdxB]);
            let diff = Math.abs(bearingA - bearingB);
            if (diff > 180) diff = 360 - diff;

            if (diff > 115) {
              opposingSampleMatches++;
            }
          }
        }

        if (opposingSampleMatches >= 2 && opposingSampleMatches >= Math.floor(sampleCount * 0.3)) {
          isOpposing = true;
        }
      }

      if (isOpposing) {
        pairedSet.add(actA.id);
        pairedSet.add(actB.id);
        hasBidirectional = true;

        // The earlier activity is Outbound, later is Return
        if (actA.startTime <= actB.startTime) {
          pairs.push({ outboundId: actA.id, returnId: actB.id });
        } else {
          pairs.push({ outboundId: actB.id, returnId: actA.id });
        }
        break;
      }
    }
  }

  // Populate pairs with distinct colors and lane offsets
  for (const pair of pairs) {
    const actOut = activities.find(a => a.id === pair.outboundId);
    const actRet = activities.find(a => a.id === pair.returnId);

    if (actOut) {
      directionMap.set(actOut.id, {
        isBidirectional: true,
        role: 'outbound',
        color: '#06b6d4', // Cyan
        arrowColor: '#06b6d4',
        label: 'Outbound Journey',
        offsetPath: offsetPolyline(actOut.path, 3.5),
        partnerActivityId: pair.returnId
      });
    }

    if (actRet) {
      directionMap.set(actRet.id, {
        isBidirectional: true,
        role: 'return',
        color: '#f43f5e', // Rose
        arrowColor: '#f43f5e',
        label: 'Return Journey',
        offsetPath: offsetPolyline(actRet.path, 3.5),
        partnerActivityId: pair.outboundId
      });
    }
  }

  // Populate remaining unpaired activities as unidirectional
  for (const act of activities) {
    if (!directionMap.has(act.id)) {
      const defaultColor = getActivityStyle(act.type).color;
      directionMap.set(act.id, {
        isBidirectional: false,
        role: 'unidirectional',
        color: defaultColor,
        arrowColor: defaultColor,
        label: getActivityStyle(act.type).label,
        offsetPath: act.path
      });
    }
  }

  return { directionMap, hasBidirectional };
}

export interface PeriodStatsResult extends TimelineStats {
  rawSignalCount: number;
  periodLabel: string;
  isAllTime: boolean;
}

/**
 * Computes travel and visit analytics specifically for the selected time period (single day, date range, or all).
 */
export function computePeriodStats(
  selectedDay: TimelineDay | null,
  timelineData: ParsedTimeline | null,
  selectedDate: string
): PeriodStatsResult {
  if (!timelineData) {
    return {
      totalDays: 0,
      totalVisits: 0,
      totalActivities: 0,
      totalDistanceKm: 0,
      dateRange: null,
      activityDistanceByType: {},
      activityDurationByType: {},
      activityCountByType: {},
      rawSignalCount: 0,
      periodLabel: 'No period selected',
      isAllTime: false
    };
  }

  // If 'all' is explicitly chosen, return whole-timeline stats
  if (selectedDate === 'all' || !selectedDay) {
    return {
      ...timelineData.stats,
      rawSignalCount: timelineData.rawSignals.length,
      periodLabel: 'All Recorded Dates Combined',
      isAllTime: true
    };
  }

  // Calculate breakdown for the selected period
  const activityDistanceByType: Record<string, number> = {};
  const activityDurationByType: Record<string, number> = {};
  const activityCountByType: Record<string, number> = {};
  let totalDistanceKm = 0;

  for (const act of selectedDay.activities) {
    const type = act.type || 'UNKNOWN';
    activityDistanceByType[type] = (activityDistanceByType[type] || 0) + (act.distanceKm || 0);
    activityDurationByType[type] = (activityDurationByType[type] || 0) + (act.durationMs || 0);
    activityCountByType[type] = (activityCountByType[type] || 0) + 1;
    totalDistanceKm += (act.distanceKm || 0);
  }

  let totalDays = 1;
  let dateRange: { start: string; end: string } = {
    start: selectedDay.displayDate || selectedDate,
    end: selectedDay.displayDate || selectedDate
  };

  let rawSignalCount = 0;

  if (selectedDate.includes('..')) {
    const [start, end] = selectedDate.split('..');
    const matchingDates = Object.keys(timelineData.days).filter(d => d >= start && d <= end);
    totalDays = matchingDates.length;
    dateRange = { start, end };

    const startTs = new Date(`${start}T00:00:00`).getTime();
    const endTs = new Date(`${end}T23:59:59.999`).getTime();
    rawSignalCount = timelineData.rawSignals.filter(
      p => p.timestamp >= startTs && p.timestamp <= endTs
    ).length;
  } else {
    // Single day: filter raw signals for that calendar date
    const startTs = new Date(`${selectedDate}T00:00:00`).getTime();
    const endTs = new Date(`${selectedDate}T23:59:59.999`).getTime();
    rawSignalCount = timelineData.rawSignals.filter(
      p => p.timestamp >= startTs && p.timestamp <= endTs
    ).length;
  }

  return {
    totalDays,
    totalVisits: selectedDay.visits.length,
    totalActivities: selectedDay.activities.length,
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    dateRange,
    activityDistanceByType,
    activityDurationByType,
    activityCountByType,
    rawSignalCount,
    periodLabel: selectedDay.displayDate || selectedDate,
    isAllTime: false
  };
}
