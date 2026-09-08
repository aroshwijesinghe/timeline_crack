import type {
  LatLng,
  TimelinePlaceVisit,
  TimelineActivity,
  TimelineWaypoint,
  TimelineDay,
  RawSignalPoint,
  ParsedTimeline,
  TimelineStats
} from '../types/timeline';
import {
  parseLatLng,
  formatDuration,
  calculateDistanceMeters,
  toDateString,
  formatDate
} from './geoUtils';

/**
 * Parses raw JSON from any Google Maps Timeline / Location History export.
 */
export function parseTimelineJSON(jsonData: any): ParsedTimeline {
  const daysMap: Record<string, TimelineDay> = {};
  const rawSignalsList: RawSignalPoint[] = [];

  const stats: TimelineStats = {
    totalDays: 0,
    totalVisits: 0,
    totalActivities: 0,
    totalDistanceKm: 0,
    dateRange: null,
    activityDistanceByType: {},
    activityDurationByType: {},
    activityCountByType: {}
  };

  let minGlobalTs = Infinity;
  let maxGlobalTs = -Infinity;
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  let hasValidCoords = false;

  function updateBounds(lat: number, lng: number) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    hasValidCoords = true;
  }

  function getOrCreateDay(dateStr: string): TimelineDay {
    if (!daysMap[dateStr]) {
      daysMap[dateStr] = {
        dateStr,
        displayDate: formatDate(dateStr + 'T12:00:00'),
        segments: [],
        visits: [],
        activities: [],
        totalDistanceMeters: 0,
        totalDistanceKm: 0,
        totalActiveDurationMs: 0,
        bounds: null
      };
    }
    return daysMap[dateStr];
  }

  // --- 1. Modern Format: semanticSegments ---
  if (jsonData && Array.isArray(jsonData.semanticSegments)) {
    for (let i = 0; i < jsonData.semanticSegments.length; i++) {
      const seg = jsonData.semanticSegments[i];
      const startStr = seg.startTime;
      const endStr = seg.endTime;
      if (!startStr) continue;

      const startTs = new Date(startStr).getTime();
      const endTs = endStr ? new Date(endStr).getTime() : startTs;
      if (isNaN(startTs)) continue;

      if (startTs < minGlobalTs) minGlobalTs = startTs;
      if (endTs > maxGlobalTs) maxGlobalTs = endTs;

      const dateStr = toDateString(startTs);
      const day = getOrCreateDay(dateStr);
      const durationMs = Math.max(0, endTs - startTs);

      // 1.A Place Visit
      if (seg.visit) {
        const v = seg.visit;
        const candidate = v.topCandidate || {};
        const loc = parseLatLng(candidate.placeLocation || v.location);

        if (loc) {
          updateBounds(loc[0], loc[1]);
          const visitObj: TimelinePlaceVisit = {
            id: `visit-${i}-${startTs}`,
            startTime: startStr,
            endTime: endStr || startStr,
            startTimestamp: startTs,
            endTimestamp: endTs,
            durationMs,
            durationFormatted: formatDuration(durationMs),
            location: loc,
            placeId: candidate.placeId,
            semanticType: candidate.semanticType || 'VISIT',
            probability: candidate.probability ?? v.probability,
            name: candidate.name,
            address: candidate.address
          };

          day.visits.push(visitObj);
          day.segments.push({
            type: 'visit',
            id: visitObj.id,
            timestamp: startTs,
            data: visitObj
          });

          stats.totalVisits++;
        }
      }

      // 1.B Activity Segment
      if (seg.activity) {
        const a = seg.activity;
        const top = a.topCandidate || {};
        const actType = top.type || a.activityType || 'UNKNOWN';
        const startLoc = parseLatLng(a.start?.latLng || a.startLocation);
        const endLoc = parseLatLng(a.end?.latLng || a.endLocation);

        const waypoints: TimelineWaypoint[] = [];
        const path: LatLng[] = [];

        // Add start location
        if (startLoc) {
          waypoints.push({ point: startLoc, time: startStr, timestamp: startTs });
          path.push(startLoc);
          updateBounds(startLoc[0], startLoc[1]);
        }

        // Timeline path waypoints if available
        if (Array.isArray(seg.timelinePath)) {
          for (const wp of seg.timelinePath) {
            const p = parseLatLng(wp.point || wp.latLng);
            if (p) {
              const wpTime = wp.time || startStr;
              const wpTs = new Date(wpTime).getTime();
              waypoints.push({ point: p, time: wpTime, timestamp: isNaN(wpTs) ? startTs : wpTs });
              path.push(p);
              updateBounds(p[0], p[1]);
            }
          }
        }

        // Add end location
        if (endLoc && (!startLoc || endLoc[0] !== startLoc[0] || endLoc[1] !== startLoc[1])) {
          waypoints.push({ point: endLoc, time: endStr || startStr, timestamp: endTs });
          path.push(endLoc);
          updateBounds(endLoc[0], endLoc[1]);
        }

        // Calculate distance
        let dist = a.distanceMeters || 0;
        if (!dist && path.length > 1) {
          for (let k = 0; k < path.length - 1; k++) {
            dist += calculateDistanceMeters(path[k], path[k + 1]);
          }
        }

        const actObj: TimelineActivity = {
          id: `act-${i}-${startTs}`,
          startTime: startStr,
          endTime: endStr || startStr,
          startTimestamp: startTs,
          endTimestamp: endTs,
          durationMs,
          durationFormatted: formatDuration(durationMs),
          distanceMeters: Math.round(dist),
          distanceKm: parseFloat((dist / 1000).toFixed(2)),
          type: actType,
          probability: top.probability ?? a.probability,
          startLocation: startLoc || undefined,
          endLocation: endLoc || undefined,
          path,
          waypoints
        };

        day.activities.push(actObj);
        day.segments.push({
          type: 'activity',
          id: actObj.id,
          timestamp: startTs,
          data: actObj
        });

        day.totalDistanceMeters += dist;
        day.totalActiveDurationMs += durationMs;

        stats.totalActivities++;
        stats.totalDistanceKm += dist / 1000;
        stats.activityDistanceByType[actType] = (stats.activityDistanceByType[actType] || 0) + (dist / 1000);
        stats.activityDurationByType[actType] = (stats.activityDurationByType[actType] || 0) + durationMs;
        stats.activityCountByType[actType] = (stats.activityCountByType[actType] || 0) + 1;
      }
    }
  }

  // --- 2. Modern Format: rawSignals ---
  if (jsonData && Array.isArray(jsonData.rawSignals)) {
    for (let i = 0; i < jsonData.rawSignals.length; i++) {
      const sig = jsonData.rawSignals[i];
      if (sig.position) {
        const p = sig.position;
        const loc = parseLatLng(p.LatLng || p.latLng);
        if (loc && p.timestamp) {
          const ts = new Date(p.timestamp).getTime();
          if (!isNaN(ts)) {
            rawSignalsList.push({
              lat: loc[0],
              lng: loc[1],
              timestamp: ts,
              timeStr: p.timestamp,
              accuracyMeters: p.accuracyMeters,
              altitudeMeters: p.altitudeMeters,
              speedMetersPerSecond: p.speedMetersPerSecond
            });
            updateBounds(loc[0], loc[1]);
          }
        }
      }
    }
  }

  // --- 3. Legacy Format: timelineObjects ---
  if (jsonData && Array.isArray(jsonData.timelineObjects)) {
    for (let i = 0; i < jsonData.timelineObjects.length; i++) {
      const obj = jsonData.timelineObjects[i];

      if (obj.placeVisit) {
        const pv = obj.placeVisit;
        const loc = parseLatLng(pv.location);
        const startTs = Number(pv.duration?.startTimestampMs || (pv.duration?.startTimestamp ? new Date(pv.duration.startTimestamp).getTime() : 0));
        const endTs = Number(pv.duration?.endTimestampMs || (pv.duration?.endTimestamp ? new Date(pv.duration.endTimestamp).getTime() : startTs));

        if (loc && startTs > 0) {
          const startStr = new Date(startTs).toISOString();
          const endStr = new Date(endTs).toISOString();
          const dateStr = toDateString(startTs);
          const day = getOrCreateDay(dateStr);
          const durationMs = Math.max(0, endTs - startTs);
          updateBounds(loc[0], loc[1]);

          const visitObj: TimelinePlaceVisit = {
            id: `visit-legacy-${i}-${startTs}`,
            startTime: startStr,
            endTime: endStr,
            startTimestamp: startTs,
            endTimestamp: endTs,
            durationMs,
            durationFormatted: formatDuration(durationMs),
            location: loc,
            placeId: pv.location?.placeId,
            semanticType: pv.location?.semanticType || 'VISIT',
            name: pv.location?.name,
            address: pv.location?.address
          };

          day.visits.push(visitObj);
          day.segments.push({
            type: 'visit',
            id: visitObj.id,
            timestamp: startTs,
            data: visitObj
          });

          stats.totalVisits++;
        }
      }

      if (obj.activitySegment) {
        const as = obj.activitySegment;
        const startTs = Number(as.duration?.startTimestampMs || (as.duration?.startTimestamp ? new Date(as.duration.startTimestamp).getTime() : 0));
        const endTs = Number(as.duration?.endTimestampMs || (as.duration?.endTimestamp ? new Date(as.duration.endTimestamp).getTime() : startTs));
        const actType = as.activityType || 'UNKNOWN';

        if (startTs > 0) {
          const startStr = new Date(startTs).toISOString();
          const endStr = new Date(endTs).toISOString();
          const dateStr = toDateString(startTs);
          const day = getOrCreateDay(dateStr);
          const durationMs = Math.max(0, endTs - startTs);

          const startLoc = parseLatLng(as.startLocation);
          const endLoc = parseLatLng(as.endLocation);

          const waypoints: TimelineWaypoint[] = [];
          const path: LatLng[] = [];

          if (startLoc) {
            waypoints.push({ point: startLoc, time: startStr, timestamp: startTs });
            path.push(startLoc);
            updateBounds(startLoc[0], startLoc[1]);
          }

          if (Array.isArray(as.simplifiedRawPath?.points)) {
            for (const pt of as.simplifiedRawPath.points) {
              const p = parseLatLng(pt);
              if (p) {
                const ptTs = Number(pt.timestampMs || startTs);
                waypoints.push({ point: p, time: new Date(ptTs).toISOString(), timestamp: ptTs });
                path.push(p);
                updateBounds(p[0], p[1]);
              }
            }
          }

          if (endLoc && (!startLoc || endLoc[0] !== startLoc[0] || endLoc[1] !== startLoc[1])) {
            waypoints.push({ point: endLoc, time: endStr, timestamp: endTs });
            path.push(endLoc);
            updateBounds(endLoc[0], endLoc[1]);
          }

          let dist = as.distance || 0;
          if (!dist && path.length > 1) {
            for (let k = 0; k < path.length - 1; k++) {
              dist += calculateDistanceMeters(path[k], path[k + 1]);
            }
          }

          const actObj: TimelineActivity = {
            id: `act-legacy-${i}-${startTs}`,
            startTime: startStr,
            endTime: endStr,
            startTimestamp: startTs,
            endTimestamp: endTs,
            durationMs,
            durationFormatted: formatDuration(durationMs),
            distanceMeters: Math.round(dist),
            distanceKm: parseFloat((dist / 1000).toFixed(2)),
            type: actType,
            startLocation: startLoc || undefined,
            endLocation: endLoc || undefined,
            path,
            waypoints
          };

          day.activities.push(actObj);
          day.segments.push({
            type: 'activity',
            id: actObj.id,
            timestamp: startTs,
            data: actObj
          });

          day.totalDistanceMeters += dist;
          day.totalActiveDurationMs += durationMs;

          stats.totalActivities++;
          stats.totalDistanceKm += dist / 1000;
          stats.activityDistanceByType[actType] = (stats.activityDistanceByType[actType] || 0) + (dist / 1000);
          stats.activityDurationByType[actType] = (stats.activityDurationByType[actType] || 0) + durationMs;
          stats.activityCountByType[actType] = (stats.activityCountByType[actType] || 0) + 1;
        }
      }
    }
  }

  // --- Post-processing: Sort and compute daily bounds ---
  const sortedDates = Object.keys(daysMap).sort();

  for (const dateStr of sortedDates) {
    const day = daysMap[dateStr];
    // Sort segments chronologically
    day.segments.sort((a, b) => a.timestamp - b.timestamp);
    day.visits.sort((a, b) => a.startTimestamp - b.startTimestamp);
    day.activities.sort((a, b) => a.startTimestamp - b.startTimestamp);
    day.totalDistanceKm = parseFloat((day.totalDistanceMeters / 1000).toFixed(2));

    // Calculate day bounds
    let dMinLat = 90, dMaxLat = -90, dMinLng = 180, dMaxLng = -180;
    let dHasCoords = false;

    for (const v of day.visits) {
      if (v.location) {
        if (v.location[0] < dMinLat) dMinLat = v.location[0];
        if (v.location[0] > dMaxLat) dMaxLat = v.location[0];
        if (v.location[1] < dMinLng) dMinLng = v.location[1];
        if (v.location[1] > dMaxLng) dMaxLng = v.location[1];
        dHasCoords = true;
      }
    }

    for (const a of day.activities) {
      for (const p of a.path) {
        if (p[0] < dMinLat) dMinLat = p[0];
        if (p[0] > dMaxLat) dMaxLat = p[0];
        if (p[1] < dMinLng) dMinLng = p[1];
        if (p[1] > dMaxLng) dMaxLng = p[1];
        dHasCoords = true;
      }
    }

    if (dHasCoords) {
      day.bounds = [[dMinLat, dMinLng], [dMaxLat, dMaxLng]];
    }
  }

  stats.totalDays = sortedDates.length;
  stats.totalDistanceKm = parseFloat(stats.totalDistanceKm.toFixed(2));

  if (sortedDates.length > 0) {
    stats.dateRange = {
      start: sortedDates[0],
      end: sortedDates[sortedDates.length - 1]
    };
  }

  // Sort raw signals chronologically
  rawSignalsList.sort((a, b) => a.timestamp - b.timestamp);

  const overallBounds: [LatLng, LatLng] | null = hasValidCoords
    ? [[minLat, minLng], [maxLat, maxLng]]
    : null;

  return {
    days: daysMap,
    sortedDates,
    rawSignals: rawSignalsList,
    stats,
    overallBounds
  };
}
