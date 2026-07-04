import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft, ArrowUpDown, MapPin, Navigation2,
  Train, Bus, Car, Bike, Footprints,
  Clock, AlertTriangle, Zap, Route,
  CornerUpRight, X, Loader, Crosshair
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiClient } from '../lib/apiClient';
import { fetchLocationSuggestions } from '../lib/locationSearch';
import {
  formatDuration,
  formatDistance,
  getRouteMetrics,
  MODE_TO_API_PARAMS,
  decodePolyline,
} from '../lib/routeUtils';
import './JourneyPlannerPage.css';

const TRANSPORT_OPTIONS = [
  {
    id: 'metro',
    name: 'Metro',
    icon: Train,
    path: 'M20,80 Q40,40 80,20',
  },
  {
    id: 'bus',
    name: 'Bus',
    icon: Bus,
    path: 'M20,80 Q30,60 50,50 T80,20',
  },
  {
    id: 'car',
    name: 'Car',
    icon: Car,
    path: 'M20,80 C20,60 60,60 80,20',
  },
  {
    id: 'bike',
    name: 'Bike',
    icon: Bike,
    path: 'M20,80 C30,70 50,30 80,20',
  },
  {
    id: 'walking',
    name: 'Walking',
    icon: Footprints,
    path: 'M20,80 L30,60 L50,60 L60,40 L80,20',
  }
];

const currentLocationIcon = L.divIcon({
  className: '',
  html: '<div class="planner-marker-current" />',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

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

function MapBoundsAdjuster({ coordsA, coordsB, currentPosition, userMovedMap, setUserMovedMap }) {
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
    if (!coordsA && currentPosition) points.push([currentPosition.lat, currentPosition.lng]);
    if (!coordsB && !coordsA && !currentPosition) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
  }, [coordsA, coordsB, currentPosition, userMovedMap, map]);

  return null;
}

function RoutePolyline({ legs }) {
  const points = useMemo(() => {
    const allPoints = [];
    (legs || []).forEach((leg) => {
      if (leg.legGeometry?.points) {
        const decoded = decodePolyline(leg.legGeometry.points);
        allPoints.push(...decoded);
      }
    });
    return allPoints;
  }, [legs]);

  if (points.length === 0) return null;

  return (
    <Polyline
      positions={points}
      pathOptions={{ color: '#F5F5F5', weight: 3, opacity: 0.8 }}
    />
  );
}

function buildInsights(metrics) {
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
      text: `${formatDistance(metrics.walkingMeters)} walk total`,
    });
  }
  if (metrics.fare > 0) {
    result.push({
      icon: Zap,
      text: `Estimated fare ₹${metrics.fare}`,
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

export default function JourneyPlannerPage() {
  const navigate = useNavigate();

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
  const debounceRefA = useRef(null);
  const debounceRefB = useRef(null);

  // Route state
  const [selectedId, setSelectedId] = useState('metro');
  const [routeCache, setRouteCache] = useState({});
  const [routeLoading, setRouteLoading] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const routeAbortRef = useRef(null);

  // Geolocation state
  const [currentPosition, setCurrentPosition] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle');
  const [userMovedMap, setUserMovedMap] = useState(false);

  // Navigation overlay
  const [isNavigating, setIsNavigating] = useState(false);

  const selectedTransport = TRANSPORT_OPTIONS.find(t => t.id === selectedId) || TRANSPORT_OPTIONS[0];
  const selectedRouteData = routeCache[selectedId] || null;

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
    if (query.length < 3) { setSuggestionsA([]); return; }
    const controller = new AbortController();
    let cancelled = false;
    fetchLocationSuggestions(query, controller.signal)
      .then((suggestions) => { if (!cancelled) setSuggestionsA(suggestions); })
      .catch(() => { if (!cancelled && !controller.signal.aborted) setSuggestionsA([]); });
    return () => { cancelled = true; controller.abort(); };
  }, [debouncedA]);

  // Fetch suggestions for B
  useEffect(() => {
    const query = debouncedB.trim();
    if (query.length < 3) { setSuggestionsB([]); return; }
    const controller = new AbortController();
    let cancelled = false;
    fetchLocationSuggestions(query, controller.signal)
      .then((suggestions) => { if (!cancelled) setSuggestionsB(suggestions); })
      .catch(() => { if (!cancelled && !controller.signal.aborted) setSuggestionsB([]); });
    return () => { cancelled = true; controller.abort(); };
  }, [debouncedB]);

  // Browser geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentPosition({ lat: latitude, lng: longitude });
        setLocA('Current Location');
        setCoordsA({ lat: latitude, lng: longitude });
        setGeoStatus('success');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoStatus('denied');
        } else if (error.code === error.TIMEOUT) {
          setGeoStatus('unavailable');
        } else {
          setGeoStatus('unavailable');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handleInputChange = (value, field) => {
    if (field === 'A') { setLocA(value); setCoordsA(null); }
    else { setLocB(value); setCoordsB(null); }
    setActiveField(field);
    setRouteCache({});
    setRouteError(null);
  };

  const handleSelectLocation = (location, field) => {
    if (field === 'A') { setLocA(location.name); setCoordsA(location); setSuggestionsA([]); }
    else { setLocB(location.name); setCoordsB(location); setSuggestionsB([]); }
    setActiveField(null);
    setRouteCache({});
    setRouteError(null);
    setUserMovedMap(false);
  };

  const handleClearLocation = (field) => {
    if (field === 'A') { setLocA(''); setCoordsA(null); setSuggestionsA([]); }
    else { setLocB(''); setCoordsB(null); setSuggestionsB([]); }
    setActiveField(null);
    setRouteCache({});
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
    setRouteError(null);
    setUserMovedMap(false);
  };

  const handleUseCurrentLocation = () => {
    if (!currentPosition) return;
    setLocA('Current Location');
    setCoordsA(currentPosition);
    setSuggestionsA([]);
    setActiveField(null);
    setRouteCache({});
    setRouteError(null);
    setUserMovedMap(false);
  };

  const fetchRouteForMode = async (modeId) => {
    if (!coordsA || !coordsB) return;
    if (routeCache[modeId]) return;
    if (routeLoading === modeId) return;

    if (routeAbortRef.current) routeAbortRef.current.abort();
    const controller = new AbortController();
    routeAbortRef.current = controller;

    const params = MODE_TO_API_PARAMS[modeId];
    if (!params) return;

    setRouteLoading(modeId);
    setRouteError(null);

    try {
      const body = {
        from: { lat: coordsA.lat, lng: coordsA.lng },
        to: { lat: coordsB.lat, lng: coordsB.lng },
        ...params,
      };
      if (locA.trim()) body.fromName = locA.trim();
      if (locB.trim()) body.toName = locB.trim();

      const data = await apiClient.route.plan(body);

      if (controller.signal.aborted) return;

      const itineraries = data?.data?.plan?.itineraries;
      if (Array.isArray(itineraries) && itineraries.length > 0) {
        const itinerary = itineraries[0];
        const metrics = getRouteMetrics(itinerary);
        setRouteCache((prev) => ({
          ...prev,
          [modeId]: { itinerary, metrics },
        }));
      } else {
        setRouteError('Routing is currently available only within the regions included in the current map dataset.');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err.message === 'Failed to fetch') {
        setRouteError('Unable to connect to the server. Check your internet connection.');
      } else {
        setRouteError('Could not fetch route data. Please try again.');
      }
    } finally {
      if (!controller.signal.aborted) setRouteLoading(null);
    }
  };

  const handleTransportSelect = (id) => {
    setSelectedId(id);
    setRouteError(null);
    fetchRouteForMode(id);
  };

  const getTransportDisplay = (opt) => {
    const cached = routeCache[opt.id];
    if (!cached) {
      return {
        duration: '—',
        cost: '—',
        distance: '—',
        label: coordsA && coordsB ? 'Select to route' : 'Enter locations',
        tag: '',
        insights: [],
      };
    }

    const { itinerary, metrics } = cached;
    const totalDistance = (itinerary.legs || []).reduce(
      (sum, leg) => sum + (leg.distance || 0), 0
    );

    return {
      duration: formatDuration(itinerary.duration),
      cost: metrics.fare > 0 ? `₹${metrics.fare}` : 'Free',
      distance: formatDistance(totalDistance),
      label: `${metrics.transfers} transfer${metrics.transfers !== 1 ? 's' : ''}`,
      tag: '',
      insights: buildInsights(metrics),
    };
  };

  const handleStartJourney = () => {
    setIsNavigating(true);
  };

  const fallbackMapCenter = useMemo(() => {
    if (coordsA) return [coordsA.lat, coordsA.lng];
    if (coordsB) return [coordsB.lat, coordsB.lng];
    if (currentPosition) return [currentPosition.lat, currentPosition.lng];
    return [19.076, 72.8777];
  }, [coordsA, coordsB, currentPosition]);

  const canStartJourney = Boolean(selectedRouteData);
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
              {currentPosition && !locA && (
                <button
                  className="location-current-btn"
                  onClick={handleUseCurrentLocation}
                  tabIndex={-1}
                  title="Use current location"
                  aria-label="Use current location"
                >
                  <Crosshair size={14} />
                </button>
              )}
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
              {activeField === 'A' && suggestionsA.length > 0 && (
                <div className="location-suggestions">
                  {suggestionsA.map((s) => (
                    <button
                      key={s.name}
                      className="location-suggestion-item"
                      onMouseDown={(e) => { e.preventDefault(); handleSelectLocation(s, 'A'); }}
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
              {activeField === 'B' && suggestionsB.length > 0 && (
                <div className="location-suggestions">
                  {suggestionsB.map((s) => (
                    <button
                      key={s.name}
                      className="location-suggestion-item"
                      onMouseDown={(e) => { e.preventDefault(); handleSelectLocation(s, 'B'); }}
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

        {/* Journey Summary Ticker */}
        <section className="planner-summary">
          <div className="summary-item">
            <span className="summary-val">
              {selectedRouteData
                ? formatDistance(
                    (selectedRouteData.itinerary.legs || []).reduce(
                      (s, l) => s + (l.distance || 0), 0
                    )
                  )
                : '—'}
            </span>
            <span className="summary-lbl">Distance</span>
          </div>
          <div className="summary-item">
            <span className="summary-val">
              {selectedRouteData
                ? formatDuration(selectedRouteData.itinerary.duration)
                : '—'}
            </span>
            <span className="summary-lbl">Best ETA</span>
          </div>
          <div className="summary-item">
            <span className="summary-val">
              {selectedRouteData && selectedRouteData.metrics.transfers > 0
                ? `${selectedRouteData.metrics.transfers}`
                : '0'}
            </span>
            <span className="summary-lbl">Transfers</span>
          </div>
          <div className="summary-item">
            <span className="summary-val">
              {selectedRouteData
                ? formatDistance(selectedRouteData.metrics.walkingMeters)
                : '—'}
            </span>
            <span className="summary-lbl">Walk</span>
          </div>
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

            {currentPosition && !coordsA && (
              <Marker position={[currentPosition.lat, currentPosition.lng]} icon={currentLocationIcon} />
            )}
            {coordsA && (
              <Marker position={[coordsA.lat, coordsA.lng]} icon={originMarkerIcon} />
            )}
            {coordsB && (
              <Marker position={[coordsB.lat, coordsB.lng]} icon={destinationMarkerIcon} />
            )}

            {selectedRouteData && selectedRouteData.itinerary.legs && (
              <RoutePolyline legs={selectedRouteData.itinerary.legs} />
            )}

            <MapBoundsAdjuster
              coordsA={coordsA}
              coordsB={coordsB}
              currentPosition={currentPosition}
              userMovedMap={userMovedMap}
              setUserMovedMap={setUserMovedMap}
            />
          </MapContainer>

          {/* Geolocation status overlay */}
          {geoStatus === 'loading' && (
            <div className="map-geo-overlay">
              <Loader size={14} className="transport-loading-spinner" />
              <span>Getting your location...</span>
            </div>
          )}
          {geoStatus === 'denied' && (
            <div className="map-geo-overlay">Location access denied</div>
          )}
          {geoStatus === 'unavailable' && (
            <div className="map-geo-overlay">Location unavailable</div>
          )}
        </section>

        {/* Recommendation Highlight */}
        <section className="planner-recommendation">
          <div className="rec-badge">Recommended</div>
          <div className="rec-text">
            {selectedRouteData ? (
              <>
                <strong>{selectedTransport.name}</strong> is the best option today.{' '}
                {selectedRouteData.metrics.transfers > 0
                  ? `${selectedRouteData.metrics.transfers} transfer${selectedRouteData.metrics.transfers > 1 ? 's' : ''}. `
                  : 'No transfers. '}
                Estimated arrival in {formatDuration(selectedRouteData.itinerary.duration)}.
              </>
            ) : hasBothCoords ? (
              'Select a transport mode above to see route details.'
            ) : (
              'Enter origin and destination to plan your journey.'
            )}
          </div>
        </section>

        {/* Transport List */}
        <section className="transport-list">
          {TRANSPORT_OPTIONS.map(transport => {
            const isSelected = transport.id === selectedId;
            const Icon = transport.icon;
            const display = getTransportDisplay(transport);
            const isLoading = routeLoading === transport.id;

            return (
              <button
                key={transport.id}
                className={`transport-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleTransportSelect(transport.id)}
                disabled={isLoading || !hasBothCoords}
              >
                <div className="transport-icon-wrap">
                  {isLoading ? (
                    <Loader size={20} className="transport-loading-spinner" />
                  ) : (
                    <Icon size={24} strokeWidth={isSelected ? 2.5 : 2} />
                  )}
                </div>
                <div className="transport-info">
                  <div className="transport-header">
                    <span className="transport-name">{transport.name}</span>
                    <span className="transport-cost">{display.cost}</span>
                  </div>
                  <div className="transport-meta">
                    <span className="transport-duration">{display.duration}</span>
                    <span className="transport-dot">•</span>
                    <span className="transport-label">{display.label}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* Contextual Insights */}
        <section className="planner-insights">
          <h3 className="insights-title">Journey Details</h3>
          <div className="insights-grid">
            {routeError && (
              <div className="insight-row">
                <AlertTriangle size={16} className="insight-icon" />
                <span className="insight-text insight-error">{routeError}</span>
              </div>
            )}
            {getTransportDisplay(selectedTransport).insights.length === 0 && !routeError && (
              <div className="insight-row">
                <span className="insight-text" style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
                  {hasBothCoords ? 'Select a transport mode to see journey details.' : 'Enter locations to see journey details.'}
                </span>
              </div>
            )}
            {getTransportDisplay(selectedTransport).insights.map((insight, idx) => {
              const InsightIcon = insight.icon;
              return (
                <div key={idx} className="insight-row anim-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <InsightIcon size={16} className="insight-icon" />
                  <span className="insight-text">{insight.text}</span>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* Bottom CTA */}
      <div className="planner-cta-wrapper">
        <button
          className="planner-cta-btn"
          onClick={handleStartJourney}
          disabled={!canStartJourney}
          style={!canStartJourney ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
        >
          <Navigation2 size={18} strokeWidth={3} fill="currentColor" />
          Start Journey
        </button>
      </div>

      {/* Active Navigation Overlay */}
      {/* TODO: Replace mock turn-by-turn with real route leg instructions when backend supports step-by-step navigation. */}
      {isNavigating && (
        <div className="active-nav-container anim-fade-in">

          <div className="nav-instruction-banner">
            <div className="nav-dir-icon">
              <CornerUpRight size={32} strokeWidth={3} color="#090909" />
            </div>
            <div className="nav-instruction-text">
              <div className="nav-dist">
                {selectedRouteData
                  ? formatDistance(
                      (selectedRouteData.itinerary.legs || []).reduce(
                        (s, l) => s + (l.distance || 0), 0
                      )
                    ) + ' total'
                  : 'In 200m'}
              </div>
              <div className="nav-action">
                {selectedRouteData
                  ? `${selectedTransport.name} to destination`
                  : 'Turn right onto Main Street'}
              </div>
            </div>
          </div>

          <div className="nav-3d-map">
            <div className="nav-3d-plane">
              <svg className="nav-3d-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d={selectedTransport.path} className="nav-3d-path" />
              </svg>
              <div className="nav-current-location">
                <Navigation2 size={32} fill="var(--primary-text)" strokeWidth={0} />
              </div>
            </div>
          </div>

          <div className="nav-status-sheet">
            <div className="nav-status-info">
              <div className="nav-time-remaining" style={{ color: selectedRouteData ? '#34C759' : undefined }}>
                {selectedRouteData
                  ? formatDuration(selectedRouteData.itinerary.duration)
                  : '—'}
              </div>
              <div className="nav-meta-remaining">
                {selectedRouteData
                  ? formatDistance(
                      (selectedRouteData.itinerary.legs || []).reduce(
                        (s, l) => s + (l.distance || 0), 0
                      )
                    )
                  : '— km'}
              </div>
            </div>
            <button className="nav-end-btn" onClick={() => setIsNavigating(false)}>
              <X size={20} strokeWidth={2.5} />
              <span>End Route</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
