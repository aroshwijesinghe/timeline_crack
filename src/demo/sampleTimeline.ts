// Built-in sample timeline data (Scenic tour of Sri Lanka: Colombo -> Kandy -> Nuwara Eliya)
export const sampleTimelineJSON = {
  "semanticSegments": [
    {
      "startTime": "2026-08-15T08:00:00.000+05:30",
      "endTime": "2026-08-15T09:15:00.000+05:30",
      "visit": {
        "hierarchyLevel": 0,
        "probability": 0.95,
        "topCandidate": {
          "placeId": "ChIJ_sample_galle_face",
          "name": "Galle Face Green, Colombo",
          "semanticType": "PARK",
          "probability": 0.95,
          "placeLocation": {
            "latLng": "6.9271° N, 79.8436° E"
          }
        }
      }
    },
    {
      "startTime": "2026-08-15T09:15:00.000+05:30",
      "endTime": "2026-08-15T12:00:00.000+05:30",
      "activity": {
        "start": { "latLng": "6.9271°, 79.8436°" },
        "end": { "latLng": "7.2906°, 80.6337°" },
        "distanceMeters": 115400,
        "probability": 0.98,
        "topCandidate": {
          "type": "IN_PASSENGER_VEHICLE",
          "probability": 0.94
        }
      },
      "timelinePath": [
        { "point": "6.9271°, 79.8436°", "time": "2026-08-15T09:15:00.000+05:30" },
        { "point": "6.9800°, 79.9100°", "time": "2026-08-15T09:40:00.000+05:30" },
        { "point": "7.0800°, 80.0200°", "time": "2026-08-15T10:15:00.000+05:30" },
        { "point": "7.2000°, 80.3500°", "time": "2026-08-15T11:00:00.000+05:30" },
        { "point": "7.2500°, 80.5200°", "time": "2026-08-15T11:35:00.000+05:30" },
        { "point": "7.2906°, 80.6337°", "time": "2026-08-15T12:00:00.000+05:30" }
      ]
    },
    {
      "startTime": "2026-08-15T12:00:00.000+05:30",
      "endTime": "2026-08-15T14:30:00.000+05:30",
      "visit": {
        "hierarchyLevel": 0,
        "probability": 0.98,
        "topCandidate": {
          "placeId": "ChIJ_sample_tooth_temple",
          "name": "Temple of the Sacred Tooth Relic",
          "semanticType": "TEMPLE",
          "probability": 0.99,
          "placeLocation": {
            "latLng": "7.2936°, 80.6413°"
          }
        }
      }
    },
    {
      "startTime": "2026-08-15T14:30:00.000+05:30",
      "endTime": "2026-08-15T15:15:00.000+05:30",
      "activity": {
        "start": { "latLng": "7.2936°, 80.6413°" },
        "end": { "latLng": "7.2721°, 80.5960°" },
        "distanceMeters": 5800,
        "probability": 0.92,
        "topCandidate": {
          "type": "WALKING",
          "probability": 0.89
        }
      },
      "timelinePath": [
        { "point": "7.2936°, 80.6413°", "time": "2026-08-15T14:30:00.000+05:30" },
        { "point": "7.2880°, 80.6350°", "time": "2026-08-15T14:45:00.000+05:30" },
        { "point": "7.2800°, 80.6150°", "time": "2026-08-15T15:00:00.000+05:30" },
        { "point": "7.2721°, 80.5960°", "time": "2026-08-15T15:15:00.000+05:30" }
      ]
    },
    {
      "startTime": "2026-08-15T15:15:00.000+05:30",
      "endTime": "2026-08-15T17:45:00.000+05:30",
      "visit": {
        "hierarchyLevel": 0,
        "probability": 0.94,
        "topCandidate": {
          "placeId": "ChIJ_sample_botanical",
          "name": "Royal Botanic Gardens, Peradeniya",
          "semanticType": "PARK",
          "probability": 0.96,
          "placeLocation": {
            "latLng": "7.2721°, 80.5960°"
          }
        }
      }
    },
    {
      "startTime": "2026-08-15T17:45:00.000+05:30",
      "endTime": "2026-08-15T18:30:00.000+05:30",
      "activity": {
        "start": { "latLng": "7.2721°, 80.5960°" },
        "end": { "latLng": "7.2906°, 80.6337°" },
        "distanceMeters": 6200,
        "probability": 0.95,
        "topCandidate": {
          "type": "MOTORCYCLING",
          "probability": 0.91
        }
      },
      "timelinePath": [
        { "point": "7.2721°, 80.5960°", "time": "2026-08-15T17:45:00.000+05:30" },
        { "point": "7.2810°, 80.6120°", "time": "2026-08-15T18:05:00.000+05:30" },
        { "point": "7.2906°, 80.6337°", "time": "2026-08-15T18:30:00.000+05:30" }
      ]
    },
    {
      "startTime": "2026-08-15T18:30:00.000+05:30",
      "endTime": "2026-08-15T22:00:00.000+05:30",
      "visit": {
        "hierarchyLevel": 0,
        "probability": 0.97,
        "topCandidate": {
          "placeId": "ChIJ_sample_kandy_viewpoint",
          "name": "Kandy View Point Hotel",
          "semanticType": "HOTEL",
          "probability": 0.98,
          "placeLocation": {
            "latLng": "7.2906°, 80.6337°"
          }
        }
      }
    }
  ],
  "rawSignals": [
    {
      "position": {
        "LatLng": "6.9271°, 79.8436°",
        "accuracyMeters": 15,
        "altitudeMeters": 10.0,
        "source": "GPS",
        "timestamp": "2026-08-15T08:30:00.000+05:30",
        "speedMetersPerSecond": 0.0
      }
    },
    {
      "position": {
        "LatLng": "7.0800°, 80.0200°",
        "accuracyMeters": 20,
        "altitudeMeters": 45.0,
        "source": "GPS",
        "timestamp": "2026-08-15T10:15:00.000+05:30",
        "speedMetersPerSecond": 16.5
      }
    },
    {
      "position": {
        "LatLng": "7.2936°, 80.6413°",
        "accuracyMeters": 10,
        "altitudeMeters": 500.0,
        "source": "GPS",
        "timestamp": "2026-08-15T13:00:00.000+05:30",
        "speedMetersPerSecond": 0.0
      }
    }
  ]
};
