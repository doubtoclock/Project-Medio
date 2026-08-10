import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, ArrowLeft, Clock } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { CARTO_DARK_TILE_URL, preloadMapTiles } from '../lib/mapTiles';
import { decodePolyline } from '../lib/routeUtils';
import './ResultsPage.css';

const CATEGORY_ORDER = [
  'Cafe', 'Restaurant', 'Food court', 'Mall', 'Park', 'Garden',
  'Cinema', 'Theatre', 'Museum', 'Gallery', 'Library', 'Bar',
  'Dessert', 'Quick bite', 'Bookstore', 'Market', 'Arts center',
  'Community center', 'Bowling', 'Sports', 'Beach', 'Hotel',
  'Attraction', 'Campus', 'Place',
];

const getMeetCategory = (place) => place.category || 'Place';

const limitRouteCache = (cache, maxEntries = 32) =>
  Object.fromEntries(Object.entries(cache).slice(-maxEntries));

const getVenueRouteKey = (side, venue) =>
  `${side}-${venue.id || `${venue.lat},${venue.lon ?? venue.lng}`}`;

const getRouteErrorMessage = (err) => {
  const msg = err?.message || '';
  if (msg.includes('Failed to fetch route from OTP') || msg.includes('502')) {
    return 'Routing is currently available only within the regions included in the current map dataset.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Unable to connect to the server.';
  }
  return 'Could not calculate route.';
};

const assertRouteData = (data) => {
  const itineraries = data?.data?.plan?.itineraries;
  if (!Array.isArray(itineraries) || itineraries.length === 0) {
    throw new Error('No route found');
  }
  return data;
};

const getRouteSegments = (routeData) => {
  const itinerary = routeData?.data?.plan?.itineraries?.[0];
  if (!itinerary?.legs) return [];

  return itinerary.legs
    .map((leg) => decodePolyline(leg?.legGeometry?.points))
    .filter((points) => points.length > 1);
};

function RoutedPolylines({ segments, color, className }) {
  if (segments.length === 0) return null;

  return (
    <>
      {segments.map((points, index) => (
        <React.Fragment key={`${className}-${index}`}>
          <Polyline positions={points} color={color} weight={5} opacity={0.3} className={className} />
          <Polyline positions={points} color={color} weight={2} opacity={1.0} className={className} />
        </React.Fragment>
      ))}
    </>
  );
}

const getOriginIcon = (phase) => L.divIcon({
  className: phase >= 1 ? 'leaflet-custom-marker-container' : 'anim-hidden',
  html: `<div class="marker-origin"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const getVenueIcon = (phase, isSelected) => L.divIcon({
  className: phase >= 4 ? 'leaflet-custom-marker-container' : 'anim-hidden',
  html: `<div class="marker-venue ${isSelected ? 'marker-venue-selected' : ''} anim-ui-reveal"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const nexusIcon = L.divIcon({
  className: '',
  html: `
    <div class="marker-nexus">
      <div class="marker-nexus-outer"></div>
      <div class="marker-nexus-inner"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapAnimator({ positions, midpoint, phase, rescaleTrigger }) {
  const map = useMap();

  useEffect(() => {
    if (phase === 0) {
      map.setView([midpoint.lat, midpoint.lng], 15, { animate: false });
    } else if (phase >= 1 && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.flyToBounds(bounds, { padding: [100, 100], maxZoom: 14, duration: 1.5 });
    }
  }, [map, positions, midpoint, phase, rescaleTrigger]);

  return null;
}

function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const savedRestore = useMemo(() => {
    try {
      const saved = sessionStorage.getItem('resultsRestore');
      if (saved) {
        const parsed = JSON.parse(saved);
        sessionStorage.removeItem('resultsRestore');
        return parsed;
      }
    } catch {}
    return null;
  }, []);

  const meetResults = useMemo(() => location.state?.meetResults || [], [location.state?.meetResults]);
  const originA = useMemo(() => location.state?.originA || {
    lat: parseFloat(searchParams.get('latA')) || 19.0760,
    lng: parseFloat(searchParams.get('lngA')) || 72.8777,
    name: location.state?.locA || searchParams.get('nameA') || 'Mumbai',
  }, [location.state?.originA?.lat, location.state?.originA?.lng, location.state?.originA?.name, location.state?.locA, searchParams.get('latA'), searchParams.get('lngA'), searchParams.get('nameA')]);
  const originB = useMemo(() => location.state?.originB || {
    lat: parseFloat(searchParams.get('latB')) || 19.2813,
    lng: parseFloat(searchParams.get('lngB')) || 72.8567,
    name: location.state?.locB || searchParams.get('nameB') || "Friend's Location",
  }, [location.state?.originB?.lat, location.state?.originB?.lng, location.state?.originB?.name, location.state?.locB, searchParams.get('latB'), searchParams.get('lngB'), searchParams.get('nameB')]);

  const [phase, setPhase] = useState(0);
  const [rescaleTrigger, setRescaleTrigger] = useState(0);
  const [selectedVenue, setSelectedVenue] = useState(savedRestore?.selectedVenue || null);
  const [selectedCategories, setSelectedCategories] = useState(savedRestore?.selectedCategories || []);
  const [routeCache, setRouteCache] = useState(savedRestore?.routeCache || {});

  const [routeDataA, setRouteDataA] = useState(null);
  const [routeDataB, setRouteDataB] = useState(null);
  const [routeErrorA, setRouteErrorA] = useState(null);
  const [routeErrorB, setRouteErrorB] = useState(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const routeCacheRef = useRef(savedRestore?.routeCache || {});
  const pendingRoutesRef = useRef(new Map());
  routeCacheRef.current = routeCache;

  const hasResults = meetResults.length > 0;

  const midpoint = useMemo(() => ({
    lat: (originA.lat + originB.lat) / 2,
    lng: (originA.lng + originB.lng) / 2,
  }), [originA.lat, originA.lng, originB.lat, originB.lng]);

  useEffect(() => {
    preloadMapTiles(midpoint, 13, 2);
    preloadMapTiles(midpoint, 15, 1);
  }, [midpoint]);

  const fetchRouteForVenue = useCallback((side, venue) => {
    const routeKey = getVenueRouteKey(side, venue);
    const cached = routeCacheRef.current[routeKey];
    if (cached) return Promise.resolve(cached);

    const pending = pendingRoutesRef.current.get(routeKey);
    if (pending) return pending;

    const from = side === 'A' ? originA : originB;
    const fromName = side === 'A' ? originA.name : originB.name;
    const promise = apiClient.route.plan({
      from: { lat: from.lat, lng: from.lng },
      to: { lat: venue.lat, lng: venue.lon },
      fromName,
      toName: venue.name,
      travelMode: 'local',
      localTransport: { bus: true, rail: true, subway: true, car: false },
    })
      .then(assertRouteData)
      .then((data) => {
        setRouteCache((prev) => {
          if (prev[routeKey]) return prev;
          const next = limitRouteCache({ ...prev, [routeKey]: data });
          routeCacheRef.current = next;
          return next;
        });
        return data;
      })
      .finally(() => {
        pendingRoutesRef.current.delete(routeKey);
      });

    pendingRoutesRef.current.set(routeKey, promise);
    return promise;
  }, [originA, originB]);

  const navigateToDetail = (venue, dataA = routeDataA, dataB = routeDataB, errorA = routeErrorA, errorB = routeErrorB) => {
    if (!venue) return;
    sessionStorage.setItem('resultsRestore', JSON.stringify({
      selectedVenue: venue,
      routeCache: routeCacheRef.current,
      selectedCategories,
    }));
    sessionStorage.setItem('detailRestore', JSON.stringify({
      venue,
      originA,
      originB,
      routeDataA: dataA,
      routeDataB: dataB,
      routeErrorA: errorA,
      routeErrorB: errorB,
    }));
    navigate('/detail', {
      state: {
        venue,
        originA,
        originB,
        routeDataA: dataA,
        routeDataB: dataB,
        routeErrorA: errorA,
        routeErrorB: errorB,
      }
    });
  };

  const routeSegmentsA = useMemo(() => getRouteSegments(routeDataA), [routeDataA]);
  const routeSegmentsB = useMemo(() => getRouteSegments(routeDataB), [routeDataB]);

  const allPositions = useMemo(() => {
    const positions = [
      [originA.lat, originA.lng],
      [originB.lat, originB.lng],
    ];
    if (selectedVenue) {
      positions.push([selectedVenue.lat, selectedVenue.lon]);
    }
    routeSegmentsA.forEach((segment) => positions.push(...segment));
    routeSegmentsB.forEach((segment) => positions.push(...segment));
    return positions;
  }, [originA, originB, selectedVenue, routeSegmentsA, routeSegmentsB]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 1000);
    const t3 = setTimeout(() => setPhase(3), 1800);
    const t4 = setTimeout(() => setPhase(4), 2400);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      clearTimeout(t3); clearTimeout(t4);
    };
  }, []);

  useEffect(() => {
    if (hasResults && !selectedVenue) {
      setSelectedVenue(meetResults[0]);
    }
  }, [hasResults]);

  useEffect(() => {
    if (!hasResults) return;

    meetResults.forEach((venue) => {
      fetchRouteForVenue('A', venue).catch(() => {});
      fetchRouteForVenue('B', venue).catch(() => {});
    });
  }, [hasResults, meetResults, fetchRouteForVenue]);

  useEffect(() => {
    if (!selectedVenue) return;

    let cancelled = false;
    let localDataA = null;
    let localDataB = null;
    let localErrorA = null;
    let localErrorB = null;

    setLoadingRoutes(true);
    setRouteDataA(null);
    setRouteDataB(null);
    setRouteErrorA(null);
    setRouteErrorB(null);

    const fetchSide = async (side) => {
      const routeKey = getVenueRouteKey(side, selectedVenue);
      const cached = routeCacheRef.current[routeKey];

      if (cached) {
        if (!cancelled) {
          if (side === 'A') {
            setRouteDataA(cached);
            localDataA = cached;
          } else {
            setRouteDataB(cached);
            localDataB = cached;
          }
        }
        return;
      }

      try {
        const data = await fetchRouteForVenue(side, selectedVenue);
        if (!cancelled) {
          if (side === 'A') {
            setRouteDataA(data);
            localDataA = data;
          } else {
            setRouteDataB(data);
            localDataB = data;
          }
        }
      } catch (err) {
        if (!cancelled) {
          const errorText = getRouteErrorMessage(err);
          if (side === 'A') {
            setRouteErrorA(errorText);
            localErrorA = errorText;
          } else {
            setRouteErrorB(errorText);
            localErrorB = errorText;
          }
        }
      }
    };

    Promise.all([fetchSide('A'), fetchSide('B')]).finally(() => {
      if (!cancelled) {
        setLoadingRoutes(false);
      }
    });

    return () => { cancelled = true; };
  }, [selectedVenue, fetchRouteForVenue]);

  const categoryCounts = useMemo(() => {
    return meetResults.reduce((counts, place) => {
      const category = getMeetCategory(place);
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});
  }, [meetResults]);

  const availableCategories = useMemo(() => {
    return Object.keys(categoryCounts).sort((left, right) => {
      const li = CATEGORY_ORDER.indexOf(left);
      const ri = CATEGORY_ORDER.indexOf(right);
      return (li === -1 ? CATEGORY_ORDER.length : li) - (ri === -1 ? CATEGORY_ORDER.length : ri);
    });
  }, [categoryCounts]);

  const filteredMeetResults = useMemo(() => {
    if (selectedCategories.length === 0) return meetResults;
    const selected = new Set(selectedCategories);
    return meetResults.filter((place) => selected.has(getMeetCategory(place)));
  }, [meetResults, selectedCategories]);

  const toggleCategory = (category) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const goBack = () => navigate(-1);
  const handleRescale = () => setRescaleTrigger((prev) => prev + 1);

  const openDetailView = (venue) => {
    const cachedA = routeCacheRef.current[getVenueRouteKey('A', venue)] || null;
    const cachedB = routeCacheRef.current[getVenueRouteKey('B', venue)] || null;

    if (selectedVenue?.id === venue.id) {
      navigateToDetail(
        venue,
        routeDataA || cachedA,
        routeDataB || cachedB,
        routeErrorA,
        routeErrorB
      );
      return;
    }
    setSelectedVenue(venue);
    navigateToDetail(venue, cachedA, cachedB, null, null);
  };

  const selectVenue = (venue) => {
    setSelectedVenue(venue);
  };

  return (
    <div className="results-page">
      <div className="results-map-section">
        <div className="map-top-bar anim-ui-reveal">
          <button className="results-back-btn" onClick={goBack}>
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div className="map-badge anim-slide-up-fade" style={{ flex: 1, animationDelay: '0.2s' }}>
            <div className="map-badge-bar"></div>
            <span className="map-badge-text">Nexus Calculated</span>
          </div>
        </div>

        <button className="map-rescale-floating anim-ui-reveal" onClick={handleRescale} title="Rescale Map" style={{ animationDelay: '0.4s' }}>
          <LocateFixed size={20} className="anim-icon-tap" />
        </button>

        <div className={`results-map-container ${phase === 1 ? 'cinematic-drone-zoom' : ''}`}>
          <MapContainer
            center={[midpoint.lat, midpoint.lng]}
            zoom={15}
            scrollWheelZoom={false}
            zoomControl={false}
            attributionControl={false}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              url={CARTO_DARK_TILE_URL}
            />
            <MapAnimator positions={allPositions} midpoint={midpoint} phase={phase} rescaleTrigger={rescaleTrigger} />

            {phase >= 2 && (
              <>
                <RoutedPolylines segments={routeSegmentsA} color="#FFFFFF" className="anim-route-line-a" />
                <RoutedPolylines segments={routeSegmentsB} color="#D4AF37" className="anim-route-line-b" />
              </>
            )}

            <Marker position={[originA.lat, originA.lng]} icon={getOriginIcon(phase)}>
              <Popup className="custom-popup">
                <strong>Origin A</strong><br />{originA.name}
              </Popup>
            </Marker>

            <Marker position={[originB.lat, originB.lng]} icon={getOriginIcon(phase)}>
              <Popup className="custom-popup">
                <strong>Origin B</strong><br />{originB.name}
              </Popup>
            </Marker>

            {phase >= 3 && (
              <Marker
                position={[midpoint.lat, midpoint.lng]}
                icon={L.divIcon({
                  className: 'anim-nexus-spring',
                  html: nexusIcon.options.html,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
                })}
              >
                <Popup className="custom-popup">
                  <strong>Optimal Nexus</strong>
                </Popup>
              </Marker>
            )}

            {phase >= 4 && filteredMeetResults.map((venue) => (
              <Marker
                key={venue.id}
                position={[venue.lat, venue.lon]}
                icon={getVenueIcon(phase, selectedVenue?.id === venue.id)}
              >
                <Popup className="custom-popup">
                  <strong>{venue.name}</strong><br />
                  {getMeetCategory(venue)}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="results-bottom">
        <div className="anim-ui-reveal" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h1 className="results-title">Meeting<br />Points.</h1>
            <p className="results-subtitle">Found {meetResults.length} matches near {(midpoint.lat).toFixed(4)}° N</p>
            <div className="results-divider"></div>

            {availableCategories.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16,
              }}>
                {availableCategories.map((category) => {
                  const checked = selectedCategories.includes(category);
                  return (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 11,
                        fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                        border: '1px solid',
                        borderColor: checked ? '#F5F5F5' : 'rgba(255,255,255,0.15)',
                        backgroundColor: checked ? '#F5F5F5' : 'transparent',
                        color: checked ? '#0F0F0F' : '#A1A1A1',
                        cursor: 'pointer', fontFamily: "'Space Mono', monospace",
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {category} ({categoryCounts[category]})
                    </button>
                  );
                })}
              </div>
            )}

            {filteredMeetResults.length === 0 && selectedCategories.length > 0 && (
              <div style={{
                padding: 24, textAlign: 'center', borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: 16,
              }}>
                <p style={{ color: '#F5F5F5', fontSize: 14, fontWeight: 600 }}>No matching spots</p>
                <p style={{ color: '#A1A1A1', fontSize: 12, marginTop: 4 }}>Try selecting different categories</p>
              </div>
            )}

            {filteredMeetResults.map((point, index) => (
              <div
                className="meeting-card"
                key={point.id}
                style={{
                  cursor: 'pointer',
                  border: selectedVenue?.id === point.id ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  backgroundColor: selectedVenue?.id === point.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                }}
                onClick={() => selectVenue(point)}
              >
                <div className="meeting-card-info">
                  <span className={`meeting-card-tag ${index === 0 ? '' : 'nearby'}`}>
                    {getMeetCategory(point)}
                  </span>
                  <span className="meeting-card-name">{point.name}</span>
                  <div style={{
                    display: 'flex', gap: 12, marginTop: 4,
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 11, color: '#A1A1A1', fontFamily: "'Space Mono', monospace",
                    }}>
                      <Clock size={10} />
                      <span>A: {point.travelTimeA} min</span>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 11, color: '#A1A1A1', fontFamily: "'Space Mono', monospace",
                    }}>
                      <Clock size={10} />
                      <span>B: {point.travelTimeB} min</span>
                    </div>
                    <div style={{
                      fontSize: 11, fontFamily: "'Space Mono', monospace",
                      color: point.difference <= 5 ? '#4CAF50' : point.difference <= 15 ? '#FF9800' : '#F44336',
                    }}>
                      Gap: {point.difference} min
                    </div>
                  </div>
                  {point.reason && (
                    <span style={{ fontSize: 11, color: '#A1A1A1', marginTop: 2 }}>{point.reason}</span>
                  )}
                </div>
                <button
                  className="meeting-card-select"
                  onClick={(e) => { e.stopPropagation(); openDetailView(point); }}
                >
                  Select
                </button>
              </div>
            ))}

            <div className="results-footer">
              <span className="results-footer-text">V.4.0 ENGINE</span>
              <span className="results-footer-text">GRID: 1:25000</span>
            </div>
          </div>
      </div>
    </div>
  );
}

export default ResultsPage;
