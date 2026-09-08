export type LatLng = [number, number];

export interface TimelinePlaceVisit {
  id: string;
  startTime: string;
  endTime: string;
  startTimestamp: number;
  endTimestamp: number;
  durationMs: number;
  durationFormatted: string;
  location: LatLng;
  placeId?: string;
  semanticType?: string;
  probability?: number;
  name?: string;
  address?: string;
}

export interface TimelineWaypoint {
  point: LatLng;
  time: string;
  timestamp: number;
}

export interface TimelineActivity {
  id: string;
  startTime: string;
  endTime: string;
  startTimestamp: number;
  endTimestamp: number;
  durationMs: number;
  durationFormatted: string;
  distanceMeters: number;
  distanceKm: number;
  type: string;
  probability?: number;
  startLocation?: LatLng;
  endLocation?: LatLng;
  path: LatLng[];
  waypoints: TimelineWaypoint[];
}

export type TimelineSegment =
  | { type: 'visit'; id: string; timestamp: number; data: TimelinePlaceVisit }
  | { type: 'activity'; id: string; timestamp: number; data: TimelineActivity };

export interface TimelineDay {
  dateStr: string; // YYYY-MM-DD
  displayDate: string;
  segments: TimelineSegment[];
  visits: TimelinePlaceVisit[];
  activities: TimelineActivity[];
  totalDistanceMeters: number;
  totalDistanceKm: number;
  totalActiveDurationMs: number;
  bounds: [LatLng, LatLng] | null;
}

export interface RawSignalPoint {
  lat: number;
  lng: number;
  timestamp: number;
  timeStr: string;
  accuracyMeters?: number;
  altitudeMeters?: number;
  speedMetersPerSecond?: number;
}

export interface TimelineStats {
  totalDays: number;
  totalVisits: number;
  totalActivities: number;
  totalDistanceKm: number;
  dateRange: { start: string; end: string } | null;
  activityDistanceByType: Record<string, number>;
  activityDurationByType: Record<string, number>;
  activityCountByType: Record<string, number>;
}

export interface ParsedTimeline {
  days: Record<string, TimelineDay>;
  sortedDates: string[];
  rawSignals: RawSignalPoint[];
  stats: TimelineStats;
  overallBounds: [LatLng, LatLng] | null;
}

export type MapTileProvider = 'esri-dark' | 'esri-streets' | 'osm' | 'satellite';

export interface PlaybackState {
  isPlaying: boolean;
  speed: number; // 1x, 5x, 15x, 30x, 60x, 120x
  currentTimestamp: number; // current time in ms
  minTimestamp: number;
  maxTimestamp: number;
  currentPosition: LatLng | null;
  currentStatus: string;
  currentActivityType: string | null;
}
