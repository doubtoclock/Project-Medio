import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ArrowUpDown, MapPin, Navigation2,
  Train, Bus, Car, Bike, Footprints,
  Clock, Cloud, AlertTriangle, Zap, ShieldCheck, Route,
  CornerUpRight, X, Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { fetchLocationSuggestions } from '../lib/locationSearch';
import {
  formatDuration,
  formatDistance,
  getRouteMetrics,
  MODE_TO_API_PARAMS,
} from '../lib/routeUtils';
import './JourneyPlannerPage.css';

const TRANSPORT_OPTIONS = [
  {
    id: 'metro',
    name: 'Metro',
    icon: Train,
    duration: '28 min',
    cost: '₹40',
    distance: '8.4 km',
    label: 'Fastest during rush hour',
    tag: 'Fastest',
    color: '#F5F5F5',
    insights: [
      { icon: Route, text: '2 line changes required' },
      { icon: Footprints, text: '6 min walk to station' },
      { icon: Zap, text: 'Saves 18 minutes today' }
    ],
    path: 'M20,80 Q40,40 80,20',
  },
  {
    id: 'bus',
    name: 'Bus',
    icon: Bus,
    duration: '42 min',
    cost: '₹15',
    distance: '9.2 km',
    label: 'Lowest cost',
    tag: 'Cheapest',
    color: '#E0E0E0',
    insights: [
      { icon: Clock, text: 'Bus arrives in 4 mins' },
      { icon: Route, text: '14 stops to destination' },
      { icon: ShieldCheck, text: 'Air conditioned route' }
    ],
    path: 'M20,80 Q30,60 50,50 T80,20',
  },
  {
    id: 'car',
    name: 'Car',
    icon: Car,
    duration: '35 min',
    cost: '₹220',
    distance: '10.5 km',
    label: 'Heavy traffic today',
    tag: 'Comfort',
    color: '#D4D4D4',
    insights: [
      { icon: AlertTriangle, text: 'Heavy congestion expected' },
      { icon: MapPin, text: 'Parking is limited near destination' },
      { icon: Zap, text: '₹220 estimated fuel + toll' }
    ],
    path: 'M20,80 C20,60 60,60 80,20',
  },
  {
    id: 'bike',
    name: 'Bike',
    icon: Bike,
    duration: '24 min',
    cost: '₹60',
    distance: '10.1 km',
    label: 'Weaving through traffic',
    tag: 'Agile',
    color: '#A1A1A1',
    insights: [
      { icon: Zap, text: 'Fastest option overall' },
      { icon: AlertTriangle, text: 'Moderate traffic conditions' },
      { icon: MapPin, text: 'Easy parking available' }
    ],
    path: 'M20,80 C30,70 50,30 80,20',
  },
  {
    id: 'walking',
    name: 'Walking',
    icon: Footprints,
    duration: '1h 58m',
    cost: 'Free',
    distance: '7.8 km',
    label: 'Healthy option',
    tag: 'Eco',
    color: '#8A8A8A',
    insights: [
      { icon: Zap, text: 'Burns approximately 320 calories' },
      { icon: Cloud, text: 'Pleasant weather for walking' },
      { icon: ShieldCheck, text: 'Mostly flat terrain' }
    ],
    path: 'M20,80 L30,60 L50,60 L60,40 L80,20',
  }
];

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
  return result;
}

export default function JourneyPlannerPage() {
  const navigate = useNavigate();

  // Location search state
  const [locA, setLocA] = useState('Current Location');
  const [locB, setLocB] = useState('Nexus Mall, Koramangala');
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

  // Navigation overlay
  const [isNavigating, setIsNavigating] = useState(false);

  // Derive selected transport
  const selectedTransport = TRANSPORT_OPTIONS.find(t => t.id === selectedId) || TRANSPORT_OPTIONS[0];
  // Derive route data for selected transport
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
    if (query.length < 3) {
      setSuggestionsA([]);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    fetchLocationSuggestions(query, controller.signal)
      .then((suggestions) => {
        if (!cancelled) setSuggestionsA(suggestions);
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) setSuggestionsA([]);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedA]);

  // Fetch suggestions for B
  useEffect(() => {
    const query = debouncedB.trim();
    if (query.length < 3) {
      setSuggestionsB([]);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    fetchLocationSuggestions(query, controller.signal)
      .then((suggestions) => {
        if (!cancelled) setSuggestionsB(suggestions);
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) setSuggestionsB([]);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedB]);

  const handleInputChange = (value, field) => {
    if (field === 'A') {
      setLocA(value);
      setCoordsA(null);
    } else {
      setLocB(value);
      setCoordsB(null);
    }
    setActiveField(field);
    setRouteCache({});
    setRouteError(null);
  };

  const handleSelectLocation = (location, field) => {
    if (field === 'A') {
      setLocA(location.name);
      setCoordsA(location);
      setSuggestionsA([]);
    } else {
      setLocB(location.name);
      setCoordsB(location);
      setSuggestionsB([]);
    }
    setActiveField(null);
    setRouteCache({});
  };

  const handleClearLocation = (field) => {
    if (field === 'A') {
      setLocA('');
      setCoordsA(null);
      setSuggestionsA([]);
    } else {
      setLocB('');
      setCoordsB(null);
      setSuggestionsB([]);
    }
    setActiveField(null);
    setRouteCache({});
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
  };

  const fetchRouteForMode = async (modeId) => {
    if (!coordsA || !coordsB) return;
    if (routeCache[modeId]) return;
    if (routeLoading === modeId) return;

    if (routeAbortRef.current) {
      routeAbortRef.current.abort();
    }
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
        setRouteError('No route found for this mode.');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setRouteError('Could not fetch route data.');
    } finally {
      if (!controller.signal.aborted) {
        setRouteLoading(null);
      }
    }
  };

  const handleTransportSelect = (id) => {
    setSelectedId(id);
    setRouteError(null);
    fetchRouteForMode(id);
  };

  // Derive display data for a transport option
  const getTransportDisplay = (opt) => {
    const cached = routeCache[opt.id];
    if (!cached) {
      return {
        duration: opt.duration,
        cost: opt.cost,
        distance: opt.distance,
        label: opt.label,
        tag: opt.tag,
        insights: opt.insights,
      };
    }

    const { itinerary, metrics } = cached;
    const totalDistance = (itinerary.legs || []).reduce(
      (sum, leg) => sum + (leg.distance || 0),
      0
    );

    return {
      duration: formatDuration(itinerary.duration),
      cost: metrics.fare > 0 ? `₹${metrics.fare}` : 'Free',
      distance: formatDistance(totalDistance),
      label: `${metrics.transfers} transfer${metrics.transfers !== 1 ? 's' : ''}`,
      tag: opt.tag,
      insights: buildInsights(metrics),
    };
  };

  const handleStartJourney = () => {
    setIsNavigating(true);
  };

  const renderDisplayData = (opt) => {
    const cached = routeCache[opt.id];
    if (!cached) return null;

    const { itinerary } = cached;
    const modes = [
      ...new Set(
        (itinerary.legs || []).map((leg) => leg.mode.toUpperCase())
      ),
    ].slice(0, 3);

    if (modes.length === 0) return null;

    return (
      <span className="transport-mode-badge">
        {modes.join(' → ')}
      </span>
    );
  };

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
                      (s, l) => s + (l.distance || 0),
                      0
                    )
                  )
                : selectedTransport.distance}
            </span>
            <span className="summary-lbl">Distance</span>
          </div>
          <div className="summary-item">
            <span className="summary-val">
              {selectedRouteData
                ? formatDuration(selectedRouteData.itinerary.duration)
                : selectedTransport.duration}
            </span>
            <span className="summary-lbl">Best ETA</span>
          </div>
          <div className="summary-item">
            <span className="summary-val">
              {selectedRouteData && selectedRouteData.metrics.transfers > 0
                ? `${selectedRouteData.metrics.transfers}`
                : '0'}{' '}
              <span className="summary-val-unit">trf</span>
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

        {/* Map Preview */}
        <section className="planner-map-container">
          <svg className="planner-map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            {TRANSPORT_OPTIONS.map(opt => (
              <path
                key={`bg-${opt.id}`}
                d={opt.path}
                className="map-path-inactive"
              />
            ))}
            <path
              key={`active-${selectedTransport.id}`}
              d={selectedTransport.path}
              className={`map-path-active ${selectedTransport.id === 'walking' ? 'dashed' : ''}`}
            />
          </svg>
          <div className="map-pin origin-pin"></div>
          <div className="map-pin dest-pin"></div>
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
            ) : (
              <>
                <strong>{selectedTransport.name}</strong> is the best option today.{' '}
                {selectedTransport.insights[0]?.text}. Estimated arrival in{' '}
                {selectedTransport.duration}.
              </>
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
                disabled={isLoading}
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
                <span className="insight-text" style={{ color: '#FF6B6B' }}>{routeError}</span>
              </div>
            )}
            {getTransportDisplay(selectedTransport).insights.map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <div key={idx} className="insight-row anim-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <Icon size={16} className="insight-icon" />
                  <span className="insight-text">{insight.text}</span>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* Bottom CTA */}
      <div className="planner-cta-wrapper">
        <button className="planner-cta-btn" onClick={handleStartJourney}>
          <Navigation2 size={18} strokeWidth={3} fill="currentColor" />
          Start Journey
        </button>
      </div>

      {/* Active Navigation Overlay (mock, no turn-by-turn integration yet) */}
      {isNavigating && (
        <div className="active-nav-container anim-fade-in">

          {/* Top Instruction Banner */}
          <div className="nav-instruction-banner">
            <div className="nav-dir-icon">
              <CornerUpRight size={32} strokeWidth={3} color="#090909" />
            </div>
            <div className="nav-instruction-text">
              <div className="nav-dist">In 200m</div>
              <div className="nav-action">Turn right onto Main Street</div>
            </div>
          </div>

          {/* 3D Map View */}
          <div className="nav-3d-map">
            <div className="nav-3d-plane">
              <svg className="nav-3d-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path
                  d={selectedTransport.path}
                  className="nav-3d-path"
                />
              </svg>
              <div className="nav-current-location">
                <Navigation2 size={32} fill="var(--primary-text)" strokeWidth={0} />
              </div>
            </div>
          </div>

          {/* Bottom Status Panel */}
          <div className="nav-status-sheet">
            <div className="nav-status-info">
              <div className="nav-time-remaining">
                {selectedRouteData
                  ? formatDuration(selectedRouteData.itinerary.duration)
                  : selectedTransport.duration}
              </div>
              <div className="nav-meta-remaining">
                {selectedRouteData
                  ? formatDistance(
                      (selectedRouteData.itinerary.legs || []).reduce(
                        (s, l) => s + (l.distance || 0),
                        0
                      )
                    )
                  : selectedTransport.distance}{' '}
                • 12:45 PM
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
