import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const UNITS_STORAGE_KEY = 'medio_units';

export const modeLabels = {
  WALK: 'Walk',
  CAR: 'Car',
  BICYCLE: 'Bike',
  BUS: 'Bus',
  SUBWAY: 'Metro',
  RAIL: 'Local Train',
  TRAM: 'Tram',
  FERRY: 'Ferry',
};

export const normalizeMode = (mode = '') => mode.toUpperCase();

export const getPreferredUnits = () => {
  try {
    return localStorage.getItem(UNITS_STORAGE_KEY) === 'imperial' ? 'imperial' : 'metric';
  } catch {
    return 'metric';
  }
};

export const setPreferredUnits = (units) => {
  const normalized = units === 'imperial' ? 'imperial' : 'metric';
  try {
    localStorage.setItem(UNITS_STORAGE_KEY, normalized);
    window.dispatchEvent(new CustomEvent('medio:units-change', { detail: normalized }));
  } catch {

  }
};

export const formatDuration = (seconds = 0) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
};

export const formatDistance = (meters = 0, units = getPreferredUnits()) => {
  if (units === 'imperial') {
    const feet = meters * 3.28084;
    if (feet < 528) return `${Math.round(feet)} ft`;
    const miles = meters / 1609.344;
    return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
  }

  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
};

export const getLegDurationMinutes = (leg) => {
  if (Number.isFinite(leg.startTime) && Number.isFinite(leg.endTime)) {
    return Math.max(1, Math.round((leg.endTime - leg.startTime) / 60000));
  }
  return 0;
};

export const getLegRouteName = (leg) => {
  const mode = normalizeMode(leg.mode);
  const modeLabel = modeLabels[mode] || leg.mode;
  const routeName = leg.route?.shortName || leg.route?.longName;

  if (!routeName) return modeLabel;
  if (['BUS', 'SUBWAY', 'RAIL'].includes(mode)) return `${modeLabel} ${routeName}`;
  return routeName;
};

export const getLegEndpointName = (point, fallback) => {
  const rawName = point?.name || point?.stop?.name || point?.vertexType;
  if (!rawName || rawName === 'Origin' || rawName === 'Destination') return fallback;
  return rawName;
};

export const getLegEndpointSummary = (leg, index, total) => {
  const fromFallback = index === 0 ? 'Your location' : 'Transfer point';
  const toFallback = index === total - 1 ? 'Destination' : 'Transfer point';
  return `${getLegEndpointName(leg.from, fromFallback)} - ${getLegEndpointName(leg.to, toFallback)}`;
};

export const getTransportSequence = (itinerary) => {
  const modes = itinerary?.legs?.map((leg) => normalizeMode(leg.mode)) || [];
  return modes.length > 0 ? modes : ['WALK'];
};

export const getRouteMetrics = (itinerary) => {
  const legs = itinerary?.legs || [];
  const transitLegs = legs.filter(
    (leg) => !['WALK', 'CAR', 'BICYCLE'].includes(normalizeMode(leg.mode))
  );
  const walkingMeters = legs
    .filter((leg) => normalizeMode(leg.mode) === 'WALK')
    .reduce((sum, leg) => sum + (leg.distance || 0), 0);
  const stops = transitLegs.reduce((sum, leg) => {
    const distanceStops = Math.max(0, Math.round((leg.distance || 0) / 900) - 1);
    return sum + distanceStops;
  }, 0);

  return {
    etaMinutes: Math.max(1, Math.round((getDisplayDuration(itinerary) || 0) / 60)),
    fare: estimateFare(legs),
    walkingMeters,
    transfers: Math.max(0, transitLegs.length - 1),
    stops,
  };
};

export const estimateFare = (legs) => {
  if (legs.some((leg) => normalizeMode(leg.mode) === 'CAR')) return 0;
  if (legs.some((leg) => normalizeMode(leg.mode) === 'BICYCLE')) return 0;

  return legs.reduce((sum, leg) => {
    const mode = normalizeMode(leg.mode);
    if (mode === 'BUS') return sum + 15;
    if (mode === 'SUBWAY') return sum + 30;
    if (mode === 'RAIL') return sum + 15;
    return sum;
  }, 0);
};

export const getRouteTags = (itineraries, index) => {
  const itinerary = itineraries[index];
  if (!itinerary) return [];

  const metrics = getRouteMetrics(itinerary);
  const fastest = Math.min(...itineraries.map((item) => item.duration || Infinity));
  const leastWalking = Math.min(
    ...itineraries.map((item) => getRouteMetrics(item).walkingMeters)
  );
  const tags = [];

  if (itinerary.duration === fastest) tags.push('Fastest');
  if (metrics.walkingMeters === leastWalking) tags.push('Least walking');

  return tags.slice(0, 3);
};

export function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') return [];
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

const MUMBAI_CAR_SPEED_KMH = 24;
const CORRIDOR_CAR_SPEED_KMH = 40;
const CORRIDOR_BUFFER_METERS = 500;

const SEA_LINK_CORRIDOR = [
  [19.0546, 72.8188],
  [19.0410, 72.8170],
  [19.0260, 72.8160],
  [19.0105, 72.8160],
];

const COASTAL_ROAD_CORRIDOR = [
  [18.9278, 72.8217],
  [18.9517, 72.8194],
  [18.9665, 72.8130],
  [18.9820, 72.8167],
  [19.0045, 72.8156],
  [19.0546, 72.8188],
  [19.0820, 72.8240],
  [19.1100, 72.8250],
  [19.1350, 72.8120],
  [19.1350, 72.7950],
  [19.1750, 72.8000],
  [19.1900, 72.8080],
  [19.2320, 72.8230],
];

const CAR_CORRIDORS = [SEA_LINK_CORRIDOR, COASTAL_ROAD_CORRIDOR];

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const haversineMeters = (a, b) => {
  const earthRadius = 6371000;
  const dLat = toRadians(b[0] - a[0]);
  const dLng = toRadians(b[1] - a[1]);
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
};

const pointToSegmentMeters = (point, segStart, segEnd) => {
  const earthRadius = 6371000;
  const toXY = (coord) => [
    earthRadius * toRadians(coord[1]) * Math.cos(toRadians(point[0])),
    earthRadius * toRadians(coord[0]),
  ];
  const p = toXY(point);
  const a = toXY(segStart);
  const b = toXY(segEnd);
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const lengthSq = abx * abx + aby * aby;
  const t = lengthSq === 0
    ? 0
    : Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / lengthSq));
  const dx = p[0] - (a[0] + t * abx);
  const dy = p[1] - (a[1] + t * aby);
  return Math.sqrt(dx * dx + dy * dy);
};

const distanceToCorridorsMeters = (point) => {
  let minDistance = Infinity;
  for (const corridor of CAR_CORRIDORS) {
    for (let i = 0; i < corridor.length - 1; i++) {
      minDistance = Math.min(
        minDistance,
        pointToSegmentMeters(point, corridor[i], corridor[i + 1])
      );
      if (minDistance <= CORRIDOR_BUFFER_METERS) return minDistance;
    }
  }
  return minDistance;
};

const getLegFixedSeconds = (leg) => {
  if (Number.isFinite(leg.startTime) && Number.isFinite(leg.endTime)) {
    return Math.max(0, (leg.endTime - leg.startTime) / 1000);
  }
  return 0;
};

export const getCarAdjustedDuration = (itinerary) => {
  const legs = itinerary?.legs || [];
  const carLegs = legs.filter((leg) => normalizeMode(leg.mode) === 'CAR');
  if (carLegs.length === 0) return itinerary?.duration || 0;

  let corridorMeters = 0;
  let regularMeters = 0;

  for (const leg of carLegs) {
    const points = decodePolyline(leg.legGeometry?.points);
    if (points.length < 2) {
      regularMeters += leg.distance || 0;
      continue;
    }
    for (let i = 0; i < points.length - 1; i++) {
      const segmentMeters = haversineMeters(points[i], points[i + 1]);
      const midpoint = [
        (points[i][0] + points[i + 1][0]) / 2,
        (points[i][1] + points[i + 1][1]) / 2,
      ];
      if (distanceToCorridorsMeters(midpoint) <= CORRIDOR_BUFFER_METERS) {
        corridorMeters += segmentMeters;
      } else {
        regularMeters += segmentMeters;
      }
    }
  }

  if (regularMeters + corridorMeters === 0) return itinerary?.duration || 0;

  const carSeconds =
    (regularMeters / 1000 / MUMBAI_CAR_SPEED_KMH) * 3600 +
    (corridorMeters / 1000 / CORRIDOR_CAR_SPEED_KMH) * 3600;
  const otherLegSeconds = legs
    .filter((leg) => normalizeMode(leg.mode) !== 'CAR')
    .reduce((sum, leg) => sum + getLegFixedSeconds(leg), 0);

  return Math.round(carSeconds + otherLegSeconds);
};

export const getDisplayDuration = (itinerary) => {
  if (!itinerary) return 0;
  const adjusted = getCarAdjustedDuration(itinerary);
  return adjusted > 0 ? adjusted : itinerary.duration || 0;
};

export const MODE_TO_API_PARAMS = {
  metro: { travelMode: 'local', localTransport: { subway: true } },
  bus: { travelMode: 'local', localTransport: { bus: true } },
  car: { travelMode: 'car' },
  bike: { travelMode: 'bike' },
  walking: { travelMode: 'walk' },
};

export function RouteMetricsPanel({ itinerary, units = getPreferredUnits() }) {
  const metrics = getRouteMetrics(itinerary);
  return (
    <div className="route-metrics">
      <div className="route-metric">
        <span className="route-metric-value">{formatDuration(getDisplayDuration(itinerary))}</span>
        <span className="route-metric-label">Duration</span>
      </div>
      <div className="route-metric">
        <span className="route-metric-value">{metrics.transfers}</span>
        <span className="route-metric-label">Transfer{metrics.transfers !== 1 ? 's' : ''}</span>
      </div>
      <div className="route-metric">
        <span className="route-metric-value">{formatDistance(metrics.walkingMeters, units)}</span>
        <span className="route-metric-label">Walk</span>
      </div>
    </div>
  );
}

export function RouteStepsPanel({ itinerary, units = getPreferredUnits() }) {
  const legs = itinerary?.legs || [];
  if (legs.length === 0) return null;

  return (
    <div className="route-steps">
      {legs.map((leg, idx) => {
        const mode = normalizeMode(leg.mode);
        const label = modeLabels[mode] || leg.mode;
        const routeName = getLegRouteName(leg);
        const headsign = typeof leg.trip?.headsign === 'string' ? leg.trip.headsign.trim() : '';
        const endpointSummary = getLegEndpointSummary(leg, idx, legs.length);
        const isTransit = !['WALK', 'CAR', 'BICYCLE'].includes(mode);
        const stopCount = Array.isArray(leg.intermediateStops) ? leg.intermediateStops.length : 0;
        const boardAt = getLegEndpointName(leg.from, idx === 0 ? 'Your location' : 'Transfer point');
        const alightAt = getLegEndpointName(leg.to, idx === legs.length - 1 ? 'Destination' : 'Transfer point');
        const startTime = Number.isFinite(leg.startTime) ? new Date(leg.startTime) : null;
        return (
          <div key={idx} className="route-step">
            <div className="route-step-line">
              <div className={`route-step-dot route-step-dot-${mode.toLowerCase()}`}></div>
              {idx < legs.length - 1 && <div className="route-step-connector"></div>}
            </div>
            <div className="route-step-content">
              <span className="route-step-mode">{label}</span>
              {isTransit && routeName && (
                <span className="route-step-name">{routeName}</span>
              )}
              {isTransit && headsign && (
                <span className="route-step-headsign">towards {headsign}</span>
              )}
              {isTransit ? (
                <>
                  <span className="route-step-endpoints">Board at {boardAt}</span>
                  <span className="route-step-endpoints">Get off at {alightAt}</span>
                  {stopCount > 0 && (
                    <span className="route-step-distance">
                      {stopCount} stop{stopCount !== 1 ? 's' : ''} in between
                    </span>
                  )}
                </>
              ) : (
                <span className="route-step-endpoints">{endpointSummary}</span>
              )}
              <span className="route-step-distance">{formatDistance(leg.distance || 0, units)}</span>
              {startTime && !Number.isNaN(startTime.getTime()) && (
                <span className="route-step-time">
                  {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ItinerarySwitcher({ index, total, onPrev, onNext }) {
  return (
    <div className="itinerary-switcher">
      <button className="itinerary-switcher-btn" onClick={onPrev} disabled={index === 0}>
        <ChevronLeft size={14} />
      </button>
      <span className="itinerary-switcher-label">{index + 1} / {total}</span>
      <button className="itinerary-switcher-btn" onClick={onNext} disabled={index === total - 1}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
