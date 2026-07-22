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
    etaMinutes: Math.max(1, Math.round((itinerary.duration || 0) / 60)),
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
        <span className="route-metric-value">{formatDuration(itinerary.duration)}</span>
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
        const endpointSummary = getLegEndpointSummary(leg, idx, legs.length);
        const isTransit = !['WALK', 'CAR', 'BICYCLE'].includes(mode);
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
              <span className="route-step-endpoints">{endpointSummary}</span>
              <span className="route-step-distance">{formatDistance(leg.distance || 0, units)}</span>
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
