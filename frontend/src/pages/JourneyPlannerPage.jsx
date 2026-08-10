import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft, ArrowUpDown, MapPin,
  TrainFront, TramFront, Bus, Car, Footprints,
  Clock, AlertTriangle, Route,
  X, Loader
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiClient } from '../lib/apiClient';
import { fetchLocationSuggestions } from '../lib/locationSearch';
import {
  formatDuration,
  formatDistance,
  getPreferredUnits,
  getRouteMetrics,
  getLegRouteName,
  normalizeMode,
  decodePolyline,
  RouteStepsPanel,
} from '../lib/routeUtils';
import './JourneyPlannerPage.css';

const TRANSPORT_OPTIONS = [
  { id: 'rail', name: 'Train', icon: TrainFront },
  { id: 'bus', name: 'Bus', icon: Bus },
  { id: 'metro', name: 'Metro', icon: TramFront },
  { id: 'car', name: 'Car', icon: Car },
];

const DEFAULT_SELECTED_MODES = {
  rail: true,
  bus: true,
  metro: true,
  car: true,
};

const routeColors = ['#F5F5F5', '#34C759', '#FFCC00'];
const legModeColors = {
  WALK: '#F5F5F5',
  BUS: '#FF453A',
  SUBWAY: '#34C759',
  RAIL: '#0A84FF',
  CAR: '#C7C7CC',
  BICYCLE: '#FFD60A',
  TRAM: '#BF5AF2',
  FERRY: '#64D2FF',
};

const originMarkerIcon = L.divIcon({
  className: '',
  html: '<div class="planner-marker-origin" />',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const destinationMarkerIcon = L.divIcon({
  className: '',
  html: '<div class="planner-marker-dest" />',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const getEndpointPoint = (point) => {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng ?? point?.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
};

const getLegSegmentPoints = (leg) => {
  if (leg.legGeometry?.points) {
    const geometryPoints = decodePolyline(leg.legGeometry.points);
    if (geometryPoints.length > 1) return geometryPoints;
  }

  const fromPoint = getEndpointPoint(leg.from);
  const toPoint = getEndpointPoint(leg.to);

  if (fromPoint && toPoint) {
    return [fromPoint, toPoint];
  }

  return [];
};

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    requestAnimationFrame(() => map.invalidateSize());
  }, [map]);
  return null;
}

function MapBoundsAdjuster({ coordsA, coordsB, userMovedMap, setUserMovedMap }) {
  const map = useMap();

  useEffect(() => {
    const handler = () => setUserMovedMap(true);
    map.on('moveend', handler);
    return () => map.off('moveend', handler);
  }, [map, setUserMovedMap]);

  useEffect(() => {
    if (userMovedMap) return;
    const points = [];
    if (coordsA) points.push([coordsA.lat, coordsA.lng]);
    if (coordsB) points.push([coordsB.lat, coordsB.lng]);
    if (!coordsB && !coordsA) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
  }, [coordsA, coordsB, userMovedMap, map]);

  return null;
}

function RoutePolyline({ legs }) {
  const segments = useMemo(() => {
    return (legs || [])
      .map((leg) => {
      const points = getLegSegmentPoints(leg);
      if (points.length > 0) {
        return {
          mode: normalizeMode(leg.mode),
          points,
        };
      }
      return null;
    })
      .filter((segment) => segment?.points.length > 0);
  }, [legs]);

  if (segments.length === 0) return null;

  const sortedSegments = [...segments].sort((left, right) => {
    const leftIsWalk = left.mode === 'WALK';
    const rightIsWalk = right.mode === 'WALK';
    if (leftIsWalk === rightIsWalk) return 0;
    return leftIsWalk ? 1 : -1;
  });

  return (
    <>
      {sortedSegments.map((segment, index) => {
        const isWalk = segment.mode === 'WALK';
        return (
          <React.Fragment key={`${segment.mode}-${index}`}>
            <Polyline
              positions={segment.points}
              pathOptions={{
                color: '#090909',
                weight: isWalk ? 8 : 9,
                opacity: 0.65,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Polyline
              positions={segment.points}
              pathOptions={{
                color: legModeColors[segment.mode] || '#F5F5F5',
                weight: isWalk ? 5 : 6,
                opacity: 0.98,
                dashArray: isWalk ? '6 7' : undefined,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

function buildInsights(metrics, units) {
  const result = [];
  if (metrics.transfers > 0) {
    result.push({
      icon: Route,
      text: `${metrics.transfers} transfer${metrics.transfers > 1 ? 's' : ''} required`,
    });
  }
  if (metrics.walkingMeters > 0) {
    result.push({
      icon: Footprints,
      text: `${formatDistance(metrics.walkingMeters, units)} walk total`,
    });
  }
  if (metrics.stops > 0) {
    result.push({
      icon: Clock,
      text: `${metrics.stops} stop${metrics.stops > 1 ? 's' : ''}`,
    });
  }
  return result;
}

function getSelectedModeIds(selectedModes) {
  return TRANSPORT_OPTIONS
    .filter((option) => selectedModes[option.id])
    .map((option) => option.id);
}

function getRouteCacheKey(selectedModes) {
  return getSelectedModeIds(selectedModes).sort().join('-');
}

function getRouteModesLabel(itinerary) {
  const modes = new Set(
    (itinerary?.legs || [])
      .map((leg) => normalizeMode(leg.mode))
      .filter((mode) => mode && mode !== 'WALK')
  );

  if (modes.size === 0) return 'Walk only';

  return Array.from(modes)
    .map((mode) => ({
      RAIL: 'Train',
      SUBWAY: 'Metro',
      BUS: 'Bus',
      CAR: 'Car',
      BICYCLE: 'Bike',
    }[mode] || mode))
    .join(' + ');
}

function getRouteLineSummary(itinerary) {
  const names = (itinerary?.legs || [])
    .filter((leg) => !['WALK', 'CAR', 'BICYCLE'].includes(normalizeMode(leg.mode)))
    .map((leg) => getLegRouteName(leg))
    .filter(Boolean);

  return Array.from(new Set(names)).slice(0, 4).join(' / ');
}

export default function JourneyPlannerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledRef = useRef(false);

  // Location search state
  const [locA, setLocA] = useState('');
  const [locB, setLocB] = useState('');
  const [debouncedA, setDebouncedA] = useState('');
  const [debouncedB, setDebouncedB] = useState('');
  const [coordsA, setCoordsA] = useState(null);
  const [coordsB, setCoordsB] = useState(null);
  const [suggestionsA, setSuggestionsA] = useState([]);
  const [suggestionsB, setSuggestionsB] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [searchLoadingA, setSearchLoadingA] = useState(false);
  const [searchLoadingB, setSearchLoadingB] = useState(false);
  const debounceRefA = useRef(null);
  const debounceRefB = useRef(null);

  // Route state
  const [selectedModes, setSelectedModes] = useState(DEFAULT_SELECTED_MODES);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeCache, setRouteCache] = useState({});
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [units, setUnits] = useState(() => getPreferredUnits());
  const routeAbortRef = useRef(null);

  const [userMovedMap, setUserMovedMap] = useState(false);

  const routeCacheKey = useMemo(() => getRouteCacheKey(selectedModes), [selectedModes]);
  const routeOptions = routeCache[routeCacheKey] || [];
  const selectedRouteData = routeOptions[selectedRouteIndex] || routeOptions[0] || null;
  const fastestRouteData = useMemo(() => {
    if (routeOptions.length === 0) return null;
    return routeOptions.reduce((fastest, route, index) => {
      const fastestDuration = fastest.route?.itinerary?.duration ?? Infinity;
      const routeDuration = route?.itinerary?.duration ?? Infinity;
      return routeDuration < fastestDuration ? { route, index } : fastest;
    }, { route: routeOptions[0], index: 0 });
  }, [routeOptions]);
  const selectedModeCount = getSelectedModeIds(selectedModes).length;

  useEffect(() => {
    const handleUnitsChange = (event) => {
      setUnits(event.detail || getPreferredUnits());
    };
    const handleStorage = (event) => {
      if (event.key === 'medio_units') setUnits(getPreferredUnits());
    };
    window.addEventListener('medio:units-change', handleUnitsChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('medio:units-change', handleUnitsChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Debounce A
  useEffect(() => {
    debounceRefA.current = setTimeout(() => setDebouncedA(locA), 400);
    return () => clearTimeout(debounceRefA.current);
  }, [locA]);

  // Debounce B
  useEffect(() => {
    debounceRefB.current = setTimeout(() => setDebouncedB(locB), 400);
    return () => clearTimeout(debounceRefB.current);
  }, [locB]);

  // Fetch suggestions for A
  useEffect(() => {
    const query = debouncedA.trim();
    if (query.length < 1) { setSuggestionsA([]); setSearchLoadingA(false); return; }
    const controller = new AbortController();
    let cancelled = false;
    fetchLocationSuggestions(query, controller.signal, (suggestions) => {
      if (!cancelled) setSuggestionsA(suggestions);
    }, {
      onNetworkStart: () => { if (!cancelled) setSearchLoadingA(true); },
      onNetworkEnd: () => { if (!cancelled) setSearchLoadingA(false); },
    })
      .then((suggestions) => { if (!cancelled) setSuggestionsA(suggestions); })
      .catch(() => { if (!cancelled && !controller.signal.aborted) setSuggestionsA([]); });
    return () => { cancelled = true; setSearchLoadingA(false); controller.abort(); };
  }, [debouncedA]);

  // Fetch suggestions for B
  useEffect(() => {
    const query = debouncedB.trim();
    if (query.length < 1) { setSuggestionsB([]); setSearchLoadingB(false); return; }
    const controller = new AbortController();
    let cancelled = false;
    fetchLocationSuggestions(query, controller.signal, (suggestions) => {
      if (!cancelled) setSuggestionsB(suggestions);
    }, {
      onNetworkStart: () => { if (!cancelled) setSearchLoadingB(true); },
      onNetworkEnd: () => { if (!cancelled) setSearchLoadingB(false); },
    })
      .then((suggestions) => { if (!cancelled) setSuggestionsB(suggestions); })
      .catch(() => { if (!cancelled && !controller.signal.aborted) setSuggestionsB([]); });
    return () => { cancelled = true; setSearchLoadingB(false); controller.abort(); };
  }, [debouncedB]);

  // Prefill from navigation state (e.g. from DetailPage "Navigate" button)
  useEffect(() => {
    const st = location.state;
    if (st?.origin) {
      setLocA(st.origin.name || 'My Location');
      setCoordsA({ lat: st.origin.lat, lng: st.origin.lng });
    }
    if (st?.destination) {
      setLocB(st.destination.name || 'Destination');
      setCoordsB({ lat: st.destination.lat, lng: st.destination.lng });
      setUserMovedMap(false);
    }
    if (st?.origin && st?.destination) {
      prefilledRef.current = true;
    }
  }, []);

  // Auto-fetch route when coords are set from prefilled state
  useEffect(() => {
    if (prefilledRef.current && coordsA && coordsB) {
      fetchRoutesForSelection();
    }
  }, [coordsA, coordsB]);

  const handleInputChange = (value, field) => {
    if (field === 'A') { setLocA(value); setCoordsA(null); }
    else { setLocB(value); setCoordsB(null); }
    setActiveField(field);
    setRouteCache({});
    setSelectedRouteIndex(0);
    setRouteError(null);
  };

  const handleSelectLocation = (location, field) => {
    if (field === 'A') { setLocA(location.name); setCoordsA(location); setSuggestionsA([]); setSearchLoadingA(false); }
    else { setLocB(location.name); setCoordsB(location); setSuggestionsB([]); setSearchLoadingB(false); }
    setActiveField(null);
    setRouteCache({});
    setSelectedRouteIndex(0);
    setRouteError(null);
    setUserMovedMap(false);
  };

  const handleClearLocation = (field) => {
    if (field === 'A') { setLocA(''); setCoordsA(null); setSuggestionsA([]); setSearchLoadingA(false); }
    else { setLocB(''); setCoordsB(null); setSuggestionsB([]); setSearchLoadingB(false); }
    setActiveField(null);
    setRouteCache({});
    setSelectedRouteIndex(0);
    setRouteError(null);
  };

  const handleFieldBlur = (field) => {
    setTimeout(() => setActiveField((prev) => prev === field ? null : prev), 200);
  };

  const handleSwap = () => {
    setLocB(locA);
    setLocA(locB);
    setCoordsB(coordsA);
    setCoordsA(coordsB);
    setRouteCache({});
    setSelectedRouteIndex(0);
    setRouteError(null);
    setUserMovedMap(false);
  };

  const fetchRoutesForSelection = async () => {
    if (!coordsA || !coordsB) return null;
    const cacheKey = getRouteCacheKey(selectedModes);
    if (routeCache[cacheKey]) return routeCache[cacheKey];
    if (routeLoading) return null;

    const activeModeIds = getSelectedModeIds(selectedModes);
    if (activeModeIds.length === 0) {
      setRouteError('Select at least one mode of transport.');
      return null;
    }

    if (routeAbortRef.current) routeAbortRef.current.abort();
    const controller = new AbortController();
    routeAbortRef.current = controller;
    let didTimeout = false;
    const timeout = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, 30000);

    setRouteLoading(true);
    setRouteError(null);

    try {
      const onlyCar = activeModeIds.length === 1 && activeModeIds[0] === 'car';
      const body = {
        from: { lat: coordsA.lat, lng: coordsA.lng },
        to: { lat: coordsB.lat, lng: coordsB.lng },
        travelMode: onlyCar ? 'car' : 'local',
        localTransport: {
          rail: Boolean(selectedModes.rail),
          train: Boolean(selectedModes.rail),
          bus: Boolean(selectedModes.bus),
          subway: Boolean(selectedModes.metro),
          metro: Boolean(selectedModes.metro),
          car: Boolean(selectedModes.car),
        },
      };
      if (locA.trim()) body.fromName = locA.trim();
      if (locB.trim()) body.toName = locB.trim();

      const data = await apiClient.route.plan(body, { signal: controller.signal });

      if (controller.signal.aborted) return null;

      const itineraries = data?.data?.plan?.itineraries;
      if (Array.isArray(itineraries) && itineraries.length > 0) {
        const routes = itineraries.slice(0, 3).map((itinerary) => ({
          itinerary,
          metrics: getRouteMetrics(itinerary),
        }));
        setRouteCache((prev) => ({
          ...prev,
          [cacheKey]: routes,
        }));
        setSelectedRouteIndex(0);
        return routes;
      } else {
        setRouteError('Routing is currently available only within the regions included in the current map dataset.');
      }
    } catch (err) {
      if (controller.signal.aborted && !didTimeout) return null;
      if (didTimeout || err.name === 'AbortError') {
        setRouteError('Routing timed out. Please try again.');
      } else if (err.message === 'Failed to fetch') {
        setRouteError('Unable to connect to the server. Check your internet connection.');
      } else {
        setRouteError('Could not fetch route data. Please try again.');
      }
    } finally {
      clearTimeout(timeout);
      if (routeAbortRef.current === controller) {
        routeAbortRef.current = null;
        setRouteLoading(false);
      }
    }

    return null;
  };

  const handleModeToggle = (id) => {
    const selectedCount = getSelectedModeIds(selectedModes).length;
    if (selectedModes[id] && selectedCount === 1) {
      setRouteError('Keep at least one mode selected.');
      return;
    }

    setSelectedModes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    setSelectedRouteIndex(0);
    setRouteError(null);
  };

  const handleFindRoutes = () => {
    setRouteError(null);
    fetchRoutesForSelection();
  };

  const getRouteDisplay = (route, index) => {
    if (!route) {
      return {
        duration: '—',
        distance: '—',
        label: coordsA && coordsB ? 'Find routes' : 'Enter locations',
        tag: '',
        insights: [],
      };
    }

    const { itinerary, metrics } = route;
    const totalDistance = (itinerary.legs || []).reduce(
      (sum, leg) => sum + (leg.distance || 0), 0
    );

    return {
      duration: formatDuration(itinerary.duration),
      distance: formatDistance(totalDistance, units),
      label: `${metrics.transfers} transfer${metrics.transfers !== 1 ? 's' : ''}`,
      tag: index === 0 ? 'Fastest' : `Option ${index + 1}`,
      insights: buildInsights(metrics, units),
    };
  };

  const fallbackMapCenter = useMemo(() => {
    if (coordsA) return [coordsA.lat, coordsA.lng];
    if (coordsB) return [coordsB.lat, coordsB.lng];
    return [19.076, 72.8777];
  }, [coordsA, coordsB]);

  const hasBothCoords = Boolean(coordsA && coordsB);

  return (
    <div className="planner-page">
      {/* Header */}
      <header className="planner-header">
        <button className="planner-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>
        <div className="planner-title">Journey Planner</div>
      </header>

      <div className="planner-content">

        {/* Locations */}
        <section className="planner-locations">
          <div className="location-inputs">
            <div className="location-field">
              <div className="location-dot origin"></div>
              <input
                type="text"
                value={locA}
                onChange={(e) => handleInputChange(e.target.value, 'A')}
                onFocus={() => setActiveField('A')}
                onBlur={() => handleFieldBlur('A')}
                className="location-input"
                placeholder="Enter origin..."
              />
              {locA && (
                <button
                  className="location-clear-btn"
                  onClick={() => handleClearLocation('A')}
                  tabIndex={-1}
                  aria-label="Clear origin"
                >
                  <X size={14} />
                </button>
              )}
              {searchLoadingA && (
                <Loader size={14} className="planner-search-loader" aria-label="Loading suggestions" />
              )}
              {activeField === 'A' && suggestionsA.length > 0 && (
                <div className="location-suggestions">
                  {suggestionsA.map((s) => (
                    <button
                      key={s.name}
                      className="location-suggestion-item"
                      onPointerDown={(e) => { e.preventDefault(); handleSelectLocation(s, 'A'); }}
                    >
                      <MapPin size={14} className="suggestion-icon" />
                      <span className="suggestion-name">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="location-divider"></div>
            <div className="location-field">
              <div className="location-dot dest"></div>
              <input
                type="text"
                value={locB}
                onChange={(e) => handleInputChange(e.target.value, 'B')}
                onFocus={() => setActiveField('B')}
                onBlur={() => handleFieldBlur('B')}
                className="location-input"
                placeholder="Enter destination..."
              />
              {locB && (
                <button
                  className="location-clear-btn"
                  onClick={() => handleClearLocation('B')}
                  tabIndex={-1}
                  aria-label="Clear destination"
                >
                  <X size={14} />
                </button>
              )}
              {searchLoadingB && (
                <Loader size={14} className="planner-search-loader" aria-label="Loading suggestions" />
              )}
              {activeField === 'B' && suggestionsB.length > 0 && (
                <div className="location-suggestions">
                  {suggestionsB.map((s) => (
                    <button
                      key={s.name}
                      className="location-suggestion-item"
                      onPointerDown={(e) => { e.preventDefault(); handleSelectLocation(s, 'B'); }}
                    >
                      <MapPin size={14} className="suggestion-icon" />
                      <span className="suggestion-name">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button className="swap-btn" onClick={handleSwap}>
            <ArrowUpDown size={16} strokeWidth={2.5} />
          </button>
        </section>

        {/* Transport Modes */}
        <section className="transport-list transport-list--modes">
          {TRANSPORT_OPTIONS.map(transport => {
            const isSelected = Boolean(selectedModes[transport.id]);
            const Icon = transport.icon;

            return (
              <button
                key={transport.id}
                className={`transport-card transport-card--mode ${isSelected ? 'selected' : ''}`}
                onClick={() => handleModeToggle(transport.id)}
                type="button"
                aria-pressed={isSelected}
              >
                <div className="transport-icon-wrap">
                  <Icon size={20} strokeWidth={2.4} />
                </div>
                <span className="transport-name">{transport.name}</span>
                <span className={`transport-toggle ${isSelected ? 'on' : ''}`} aria-hidden="true">
                  <span className="transport-toggle-knob" />
                </span>
              </button>
            );
          })}
        </section>

        <section className="route-actions">
          <button
            className={`route-search-btn ${routeLoading ? 'is-loading' : ''}`}
            onClick={handleFindRoutes}
            disabled={!hasBothCoords || routeLoading || selectedModeCount === 0}
          >
            {routeLoading ? <Loader size={18} className="button-loader" /> : <Route size={18} />}
            <span>{routeLoading ? 'Finding Routes...' : 'Find Best Routes'}</span>
          </button>
        </section>

        {/* Map */}
        <section className="planner-map-container">
          <MapContainer
            center={fallbackMapCenter}
            zoom={13}
            zoomControl={false}
            attributionControl={false}
            scrollWheelZoom={true}
            className="planner-leaflet-map"
          >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              {coordsA && (
                <Marker position={[coordsA.lat, coordsA.lng]} icon={originMarkerIcon} />
              )}
              {coordsB && (
                <Marker position={[coordsB.lat, coordsB.lng]} icon={destinationMarkerIcon} />
              )}

              {selectedRouteData && selectedRouteData.itinerary.legs && (
                <RoutePolyline
                  legs={selectedRouteData.itinerary.legs}
                />
              )}

              <MapBoundsAdjuster
                coordsA={coordsA}
                coordsB={coordsB}
                userMovedMap={userMovedMap}
                setUserMovedMap={setUserMovedMap}
              />

              <MapResizer />
          </MapContainer>
        </section>

        {/* Journey Details */}
        <section className="planner-insights">
          <div className="route-options-heading">
            <h3 className="insights-title">Journey Details</h3>
            {fastestRouteData?.route && (
              <span className="route-options-count">Fastest: Route {fastestRouteData.index + 1}</span>
            )}
          </div>
          <div className="insights-grid">
            {routeError && (
              <div className="insight-row">
                <AlertTriangle size={16} className="insight-icon" />
                <span className="insight-text insight-error">{routeError}</span>
              </div>
            )}
            {!selectedRouteData && !routeError && (
              <div className="route-empty-state">
                {hasBothCoords ? 'Find routes to see line numbers and step details.' : 'Enter locations to see journey details.'}
              </div>
            )}
            {selectedRouteData && (
              <section className="journey-summary-panel">
                <div className="summary-item">
                  <span className="summary-val">{formatDuration(selectedRouteData.itinerary.duration)}</span>
                  <span className="summary-lbl">ETA</span>
                </div>
                <div className="summary-item">
                  <span className="summary-val">
                    {formatDistance(
                      selectedRouteData.itinerary.legs.reduce((s, l) => s + (l.distance || 0), 0),
                      units
                    )}
                  </span>
                  <span className="summary-lbl">Distance</span>
                </div>
                <div className="summary-item">
                  <span className="summary-val">{selectedRouteData.metrics.transfers}</span>
                  <span className="summary-lbl">Transfers</span>
                </div>
                <div className="summary-item">
                  <span className="summary-val">{formatDistance(selectedRouteData.metrics.walkingMeters, units)}</span>
                  <span className="summary-lbl">Walk</span>
                </div>
              </section>
            )}
            {selectedRouteData && getRouteDisplay(selectedRouteData, selectedRouteIndex).insights.map((insight, idx) => {
              const InsightIcon = insight.icon;
              return (
                <div key={idx} className="insight-row anim-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <InsightIcon size={16} className="insight-icon" />
                  <span className="insight-text">{insight.text}</span>
                </div>
              );
            })}
            {selectedRouteData && (
              <RouteStepsPanel itinerary={selectedRouteData.itinerary} units={units} />
            )}
          </div>
        </section>

        {/* Route Options */}
        <section className="route-options">
          <div className="route-options-heading">
            <h3 className="insights-title">Best Routes</h3>
            {routeOptions.length > 0 && (
              <span className="route-options-count">{routeOptions.length} option{routeOptions.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {routeOptions.length === 0 && !routeError && (
            <div className="route-empty-state">
              {hasBothCoords ? 'Find routes to compare the fastest combined options.' : 'Enter both locations to see route options.'}
            </div>
          )}

          {routeOptions.map((route, index) => {
            const display = getRouteDisplay(route, index);
            const isSelected = index === selectedRouteIndex;
            const lineSummary = getRouteLineSummary(route.itinerary);
            const isFastest = fastestRouteData?.index === index;

            return (
              <button
                key={`${display.duration}-${display.distance}-${index}`}
                className={`route-option-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedRouteIndex(index)}
                type="button"
              >
                <span className="route-color-dot" style={{ backgroundColor: routeColors[index] || routeColors[0] }} />
                <div className="route-option-main">
                  <div className="route-option-header">
                    <span className="route-option-title">{isFastest ? 'Fastest Route' : `Route ${index + 1}`}</span>
                    <span className="route-option-duration">{display.duration}</span>
                  </div>
                  <div className="route-option-meta">
                    <span>{getRouteModesLabel(route.itinerary)}</span>
                    <span className="transport-dot">•</span>
                    <span>{display.distance}</span>
                    <span className="transport-dot">•</span>
                    <span>{display.label}</span>
                  </div>
                  {lineSummary && (
                    <div className="route-line-summary">{lineSummary}</div>
                  )}
                </div>
              </button>
            );
          })}
        </section>

      </div>
    </div>
  );
}
