import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ArrowLeft, ArrowUpDown, MapPin, Navigation2,
  Train, Bus, Car, Bike, Footprints,
  Clock, AlertTriangle, Zap, Route,
  X, Loader, Crosshair
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
  getRouteMetrics,
  MODE_TO_API_PARAMS,
  decodePolyline,
} from '../lib/routeUtils';
import './JourneyPlannerPage.css';

const TRANSPORT_OPTIONS = [
  { id: 'metro', name: 'Metro', icon: Train },
  { id: 'bus', name: 'Bus', icon: Bus },
  { id: 'car', name: 'Car', icon: Car },
  { id: 'bike', name: 'Bike', icon: Bike },
  { id: 'walking', name: 'Walking', icon: Footprints },
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

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180)
    * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function MapResizer() {
  const map = useMap();
  const { isNavigating } = React.useContext(MapContext);
  useEffect(() => {
    if (isNavigating) {
      requestAnimationFrame(() => map.invalidateSize());
    }
  }, [isNavigating, map]);
  return null;
}

function LiveLocationMarker() {
  const markerRef = useRef(null);
  const { livePosition } = React.useContext(MapContext);
  useEffect(() => {
    if (markerRef.current && livePosition) {
      markerRef.current.setLatLng([livePosition.lat, livePosition.lng]);
    }
  }, [livePosition]);
  if (!livePosition) return null;
  return (
    <Marker
      ref={markerRef}
      position={[livePosition.lat, livePosition.lng]}
      icon={currentLocationIcon}
    />
  );
}

const MapContext = React.createContext({ isNavigating: false, livePosition: null });

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
  const [livePosition, setLivePosition] = useState(null);
  const [currentLegIndex, setCurrentLegIndex] = useState(0);
  const [navRemainingDistance, setNavRemainingDistance] = useState(null);
  const watchIdRef = useRef(null);

  const selectedTransport = TRANSPORT_OPTIONS.find(t => t.id === selectedId) || TRANSPORT_OPTIONS[0];
  const selectedRouteData = routeCache[selectedId] || null;

  const decodedLegs = useMemo(() => {
    if (!selectedRouteData?.itinerary?.legs) return [];
    return selectedRouteData.itinerary.legs.map(leg => {
      if (!leg.legGeometry?.points) return null;
      const coords = decodePolyline(leg.legGeometry.points);
      return { ...leg, decodedCoords: coords, endCoord: coords[coords.length - 1] };
    }).filter(Boolean);
  }, [selectedRouteData]);

  const currentLegInstruction = useMemo(() => {
    if (!decodedLegs.length || currentLegIndex >= decodedLegs.length) return '';
    const leg = decodedLegs[currentLegIndex];
    if (leg.mode === 'WALK') {
      if (currentLegIndex === decodedLegs.length - 1) return 'Walk to destination';
      return `Walk to ${leg.to?.name || 'next stop'}`;
    }
    const routeName = leg.route?.shortName || leg.route?.longName || '';
    const prefix = routeName ? `Board ${routeName}` : `Take ${leg.mode}`;
    return `${prefix} towards ${leg.to?.name || 'destination'}`;
  }, [decodedLegs, currentLegIndex]);

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
        if (!prefilledRef.current) {
          setLocA('Current Location');
          setCoordsA({ lat: latitude, lng: longitude });
        }
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

  // Cleanup watchPosition on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Live position: advance leg and update remaining distance
  useEffect(() => {
    if (!livePosition || !decodedLegs.length) return;
    const currentLeg = decodedLegs[currentLegIndex];
    if (!currentLeg) return;
    if (currentLeg.endCoord) {
      const distToEnd = haversineDistance(
        livePosition.lat, livePosition.lng,
        currentLeg.endCoord[0], currentLeg.endCoord[1]
      );
      if (distToEnd < 50 && currentLegIndex < decodedLegs.length - 1) {
        setCurrentLegIndex(prev => prev + 1);
      }
    }
    const destCoord = decodedLegs[decodedLegs.length - 1]?.endCoord;
    if (destCoord) {
      setNavRemainingDistance(haversineDistance(
        livePosition.lat, livePosition.lng,
        destCoord[0], destCoord[1]
      ));
    }
  }, [livePosition, decodedLegs, currentLegIndex]);

  // Prefill from navigation state (e.g. from DetailPage "Navigate" button)
  useEffect(() => {
    const st = location.state;
    if (st?.origin && st?.destination) {
      prefilledRef.current = true;
      setLocA(st.origin.name || 'My Location');
      setCoordsA({ lat: st.origin.lat, lng: st.origin.lng });
      setLocB(st.destination.name || 'Destination');
      setCoordsB({ lat: st.destination.lat, lng: st.destination.lng });
      setUserMovedMap(false);
    }
  }, []);

  // Auto-fetch route when coords are set from prefilled state
  useEffect(() => {
    if (prefilledRef.current && coordsA && coordsB) {
      handleTransportSelect('metro');
    }
  }, [coordsA, coordsB]);

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
    setUserMovedMap(false);
    setCurrentLegIndex(0);
    setNavRemainingDistance(null);
    setIsNavigating(true);
    if (!watchIdRef.current && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setLivePosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }
  };

  const handleEndRoute = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLivePosition(null);
    setCurrentLegIndex(0);
    setNavRemainingDistance(null);
    setIsNavigating(false);
  }, []);

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

      <div className={`planner-content ${isNavigating ? 'planner-content--navigating' : ''}`}>

        {!isNavigating && (<>
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
        </>)}

        {/* Map */}
        <section className={`planner-map-container ${isNavigating ? 'planner-map-container--navigating' : ''}`}>
          <MapContainer
            center={fallbackMapCenter}
            zoom={13}
            zoomControl={false}
            attributionControl={false}
            scrollWheelZoom={true}
            className="planner-leaflet-map"
          >
            <MapContext.Provider value={{ isNavigating, livePosition }}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              {currentPosition && !coordsA && !isNavigating && (
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

              <MapResizer />
              <LiveLocationMarker />
            </MapContext.Provider>
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

          {isNavigating && (
            <div className="nav-map-overlay-top">
              {currentLegInstruction && (
                <div className="nav-map-banner">
                  <Navigation2 size={18} strokeWidth={3} fill="#090909" color="#090909" />
                  <span className="nav-map-banner-text">{currentLegInstruction}</span>
                  {navRemainingDistance != null && (
                    <span className="nav-map-banner-dist">{formatDistance(navRemainingDistance)}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {isNavigating && (
            <div className="nav-map-overlay-bottom">
              <div className="nav-map-status">
                <div className="nav-map-time">
                  {decodedLegs.length > 0
                    ? `Leg ${currentLegIndex + 1} of ${decodedLegs.length}`
                    : 'Navigating'}
                </div>
                <div className="nav-map-meta">
                  {navRemainingDistance != null
                    ? `${formatDistance(navRemainingDistance)} remaining`
                    : decodedLegs.length > 0 ? formatDistance(
                        decodedLegs.reduce((s, l) => s + (l.distance || 0), 0)
                      ) + ' total' : '—'}
                </div>
              </div>
              <button className="nav-end-btn" onClick={handleEndRoute}>
                <X size={20} strokeWidth={2.5} />
                <span>End Route</span>
              </button>
            </div>
          )}
        </section>

        {!isNavigating && (<>
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
        </>)} {/* end !isNavigating block */}

      </div>

      {/* Bottom CTA */}
      {!isNavigating && (
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
      )}
    </div>
  );
}
