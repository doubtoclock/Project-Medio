import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, ArrowLeft, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { decodePolyline, formatDuration, formatDistance, getRouteMetrics, getLegRouteName, modeLabels, normalizeMode } from '../lib/routeUtils';
import './ResultsPage.css';

const CATEGORY_ORDER = [
  'Cafe', 'Restaurant', 'Food court', 'Mall', 'Park', 'Garden',
  'Cinema', 'Theatre', 'Museum', 'Gallery', 'Library', 'Bar',
  'Dessert', 'Quick bite', 'Bookstore', 'Market', 'Arts center',
  'Community center', 'Bowling', 'Sports', 'Beach', 'Hotel',
  'Attraction', 'Campus', 'Place',
];

const getMeetCategory = (place) => place.category || 'Place';

async function fetchRoute(start, end) {
  try {
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
    }
  } catch (error) {
    console.error("Error fetching route:", error);
  }
  return [[start.lat, start.lng], [end.lat, end.lng]];
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

const originADetailIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:#FFFFFF;border-radius:50%;border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 12px rgba(255,255,255,0.6);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const originBDetailIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:#D4AF37;border-radius:50%;border:2px solid rgba(212,175,55,0.5);box-shadow:0 0 12px rgba(212,175,55,0.6);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const venueDetailIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;background:#FFFFFF;border-radius:50%;border:3px solid rgba(255,255,255,0.8);box-shadow:0 0 20px rgba(255,255,255,0.9);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function getItineraryPolyline(itinerary) {
  if (!itinerary?.legs) return [];
  const pts = [];
  for (const leg of itinerary.legs) {
    if (leg.legGeometry?.points) {
      pts.push(...decodePolyline(leg.legGeometry.points));
    }
  }
  return pts;
}

function MapAnimator({ positions, midpoint, phase, rescaleTrigger, detailTrigger }) {
  const map = useMap();

  useEffect(() => {
    if (detailTrigger > 0 && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.flyToBounds(bounds, { padding: [80, 80], maxZoom: 15, duration: 1.2 });
    } else if (phase === 0) {
      map.setView([midpoint.lat, midpoint.lng], 15, { animate: false });
    } else if (phase >= 1 && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.flyToBounds(bounds, { padding: [100, 100], maxZoom: 14, duration: 1.5 });
    }
  }, [map, positions, midpoint, phase, rescaleTrigger, detailTrigger]);

  return null;
}

function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const meetResults = useMemo(() => location.state?.meetResults || [], [location.state?.meetResults]);
  const originA = useMemo(() => location.state?.originA || {
    lat: parseFloat(searchParams.get('latA')) || 52.5350,
    lng: parseFloat(searchParams.get('lngA')) || 13.3890,
    name: location.state?.locA || searchParams.get('nameA') || 'Berlin, Mitte',
  }, [location.state?.originA?.lat, location.state?.originA?.lng, location.state?.originA?.name, location.state?.locA, searchParams.get('latA'), searchParams.get('lngA'), searchParams.get('nameA')]);
  const originB = useMemo(() => location.state?.originB || {
    lat: parseFloat(searchParams.get('latB')) || 52.5050,
    lng: parseFloat(searchParams.get('lngB')) || 13.4250,
    name: location.state?.locB || searchParams.get('nameB') || "Friend's Location",
  }, [location.state?.originB?.lat, location.state?.originB?.lng, location.state?.originB?.name, location.state?.locB, searchParams.get('latB'), searchParams.get('lngB'), searchParams.get('nameB')]);

  const [phase, setPhase] = useState(0);
  const [rescaleTrigger, setRescaleTrigger] = useState(0);
  const [routeA, setRouteA] = useState([]);
  const [routeB, setRouteB] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [routeCache, setRouteCache] = useState({});

  const [viewMode, setViewMode] = useState('list');
  const [routeDataA, setRouteDataA] = useState(null);
  const [routeDataB, setRouteDataB] = useState(null);
  const [routeErrorA, setRouteErrorA] = useState(null);
  const [routeErrorB, setRouteErrorB] = useState(null);
  const [itineraryIndexA, setItineraryIndexA] = useState(0);
  const [itineraryIndexB, setItineraryIndexB] = useState(0);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [detailTrigger, setDetailTrigger] = useState(0);

  const hasResults = meetResults.length > 0;

  const midpoint = useMemo(() => ({
    lat: (originA.lat + originB.lat) / 2,
    lng: (originA.lng + originB.lng) / 2,
  }), [originA.lat, originA.lng, originB.lat, originB.lng]);

  useEffect(() => {
    async function loadRoutes() {
      const rA = await fetchRoute(originA, midpoint);
      const rB = await fetchRoute(originB, midpoint);
      setRouteA(rA);
      setRouteB(rB);
    }
    loadRoutes();
  }, [originA.lat, originA.lng, originB.lat, originB.lng, midpoint.lat, midpoint.lng]);

  const allPositions = useMemo(() => {
    if (viewMode === 'detail') {
      const positions = [
        [originA.lat, originA.lng],
        [originB.lat, originB.lng],
      ];
      if (selectedVenue) {
        positions.push([selectedVenue.lat, selectedVenue.lon]);
      }
      return positions;
    }
    const positions = [
      [originA.lat, originA.lng],
      [originB.lat, originB.lng],
    ];
    if (selectedVenue) {
      positions.push([selectedVenue.lat, selectedVenue.lon]);
    }
    positions.push(...routeA, ...routeB);
    return positions;
  }, [originA, originB, selectedVenue, routeA, routeB, viewMode]);

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

  const itinerariesA = routeDataA?.data?.plan?.itineraries || [];
  const itinerariesB = routeDataB?.data?.plan?.itineraries || [];

  const itineraryA = itinerariesA[itineraryIndexA] || null;
  const itineraryB = itinerariesB[itineraryIndexB] || null;

  const polylineA = useMemo(() => itineraryA ? getItineraryPolyline(itineraryA) : [], [itineraryA]);
  const polylineB = useMemo(() => itineraryB ? getItineraryPolyline(itineraryB) : [], [itineraryB]);

  useEffect(() => {
    if (!selectedVenue) return;

    let cancelled = false;

    setLoadingRoutes(true);
    setRouteDataA(null);
    setRouteDataB(null);
    setRouteErrorA(null);
    setRouteErrorB(null);
    setItineraryIndexA(0);
    setItineraryIndexB(0);

    const fetchSide = async (side) => {
      const from = side === 'A' ? originA : originB;
      const fromName = side === 'A' ? originA.name : originB.name;
      const routeKey = `${side}-${selectedVenue.id}`;

      if (routeCache[routeKey]) {
        if (!cancelled) {
          if (side === 'A') setRouteDataA(routeCache[routeKey]);
          else setRouteDataB(routeCache[routeKey]);
        }
        return;
      }

      try {
        const data = await apiClient.route.plan({
          from: { lat: from.lat, lng: from.lng },
          to: { lat: selectedVenue.lat, lng: selectedVenue.lon },
          fromName,
          toName: selectedVenue.name,
        });
        if (!cancelled) {
          setRouteCache((prev) => ({ ...prev, [routeKey]: data }));
          if (side === 'A') setRouteDataA(data);
          else setRouteDataB(data);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err?.message || '';
          let errorText;
          if (msg.includes('Failed to fetch route from OTP') || msg.includes('502')) {
            errorText = 'Routing is currently available only within the regions included in the current map dataset.';
          } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
            errorText = 'Unable to connect to the server.';
          } else {
            errorText = 'Could not calculate route.';
          }
          if (side === 'A') setRouteErrorA(errorText);
          else setRouteErrorB(errorText);
        }
      }
    };

    Promise.all([fetchSide('A'), fetchSide('B')]).finally(() => {
      if (!cancelled) setLoadingRoutes(false);
    });

    return () => { cancelled = true; };
  }, [selectedVenue]);

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
    setSelectedVenue(venue);
    setPhase(4);
    setViewMode('detail');
    setDetailTrigger((prev) => prev + 1);
  };

  const closeDetailView = () => {
    setViewMode('list');
    setDetailTrigger((prev) => prev + 1);
  };

  const bothFailed = viewMode === 'detail' && !loadingRoutes && !routeDataA && !routeDataB && routeErrorA && routeErrorB;

  return (
    <div className="results-page">
      <div className="results-map-section">
        <div className="map-top-bar anim-ui-reveal">
          <button className="results-back-btn" onClick={goBack}>
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div className="map-badge anim-slide-up-fade" style={{ flex: 1, animationDelay: '0.2s' }}>
            <div className="map-badge-bar"></div>
            <span className="map-badge-text">
              {viewMode === 'detail' ? 'Route Calculated' : 'Nexus Calculated'}
            </span>
          </div>
        </div>

        <button className="map-rescale-floating anim-ui-reveal" onClick={handleRescale} title="Rescale Map" style={{ animationDelay: '0.4s' }}>
          <LocateFixed size={20} className="anim-icon-tap" />
        </button>

        <div className={`results-map-container ${viewMode === 'detail' ? '' : (phase === 1 ? 'cinematic-drone-zoom' : '')}`}>
          <MapContainer
            center={[midpoint.lat, midpoint.lng]}
            zoom={15}
            scrollWheelZoom={false}
            zoomControl={false}
            attributionControl={false}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapAnimator positions={allPositions} midpoint={midpoint} phase={phase} rescaleTrigger={rescaleTrigger} detailTrigger={detailTrigger} />

            {viewMode === 'detail' && selectedVenue && (
              <>
                {polylineA.length > 0 && (
                  <>
                    <Polyline positions={polylineA} color="#FFFFFF" weight={5} opacity={0.3} />
                    <Polyline positions={polylineA} color="#FFFFFF" weight={2} opacity={1.0} />
                  </>
                )}
                {polylineB.length > 0 && (
                  <>
                    <Polyline positions={polylineB} color="#D4AF37" weight={5} opacity={0.3} />
                    <Polyline positions={polylineB} color="#D4AF37" weight={2} opacity={1.0} />
                  </>
                )}
              </>
            )}

            {viewMode === 'list' && phase >= 2 && (
              <>
                {routeA.length > 0 && (
                  <>
                    <Polyline positions={routeA} color="#FFFFFF" weight={5} opacity={0.3} className="anim-route-line-a" />
                    <Polyline positions={routeA} color="#FFFFFF" weight={2} opacity={1.0} className="anim-route-line-a" />
                  </>
                )}
                {routeB.length > 0 && (
                  <>
                    <Polyline positions={routeB} color="#D4AF37" weight={5} opacity={0.3} className="anim-route-line-b" />
                    <Polyline positions={routeB} color="#D4AF37" weight={2} opacity={1.0} className="anim-route-line-b" />
                  </>
                )}
              </>
            )}

            <Marker position={[originA.lat, originA.lng]} icon={viewMode === 'detail' ? originADetailIcon : getOriginIcon(phase)}>
              <Popup className="custom-popup">
                <strong>Origin A</strong><br />{originA.name}
              </Popup>
            </Marker>

            <Marker position={[originB.lat, originB.lng]} icon={viewMode === 'detail' ? originBDetailIcon : getOriginIcon(phase)}>
              <Popup className="custom-popup">
                <strong>Origin B</strong><br />{originB.name}
              </Popup>
            </Marker>

            {viewMode === 'detail' && selectedVenue && (
              <Marker position={[selectedVenue.lat, selectedVenue.lon]} icon={venueDetailIcon}>
                <Popup className="custom-popup">
                  <strong>{selectedVenue.name}</strong><br />
                  {getMeetCategory(selectedVenue)}
                </Popup>
              </Marker>
            )}

            {viewMode === 'list' && phase >= 3 && (
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

            {viewMode === 'list' && phase >= 4 && filteredMeetResults.map((venue) => (
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
        {viewMode === 'detail' && selectedVenue ? (
          <div className="anim-ui-reveal" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="route-detail-header">
              <button className="route-detail-back" onClick={closeDetailView}>
                <ArrowLeft size={16} strokeWidth={2.5} />
                <span>Meeting Points</span>
              </button>
              <div style={{ marginTop: 12 }}>
                <span className="route-detail-category">{getMeetCategory(selectedVenue)}</span>
                <h2 className="route-detail-title">{selectedVenue.name}</h2>
              </div>
            </div>

            {loadingRoutes && (
              <div className="route-loading">
                <div className="route-spinner"></div>
                <p>Calculating routes...</p>
              </div>
            )}

            {bothFailed && (
              <div className="route-error-full">
                <p>{routeErrorA}</p>
                <button className="route-error-back" onClick={closeDetailView}>Back to meeting points</button>
              </div>
            )}

            {!loadingRoutes && (routeDataA || routeDataB) && (
              <div className="route-users">
                <div className={`route-user-section ${!routeDataA ? 'route-user-error' : ''}`}>
                  <div className="route-user-header">
                    <span className="route-user-dot route-user-dot-a"></span>
                    <span className="route-user-label">User A</span>
                  </div>
                  {routeErrorA && !routeDataA ? (
                    <p className="route-user-fail">{routeErrorA}</p>
                  ) : itineraryA && (
                    <>
                      <RouteMetricsPanel itinerary={itineraryA} />
                      <RouteStepsPanel itinerary={itineraryA} />
                      {itinerariesA.length > 1 && (
                        <ItinerarySwitcher
                          index={itineraryIndexA}
                          total={itinerariesA.length}
                          onPrev={() => setItineraryIndexA((i) => Math.max(0, i - 1))}
                          onNext={() => setItineraryIndexA((i) => Math.min(itinerariesA.length - 1, i + 1))}
                        />
                      )}
                    </>
                  )}
                </div>

                <div className={`route-user-section ${!routeDataB ? 'route-user-error' : ''}`}>
                  <div className="route-user-header">
                    <span className="route-user-dot route-user-dot-b"></span>
                    <span className="route-user-label">User B</span>
                  </div>
                  {routeErrorB && !routeDataB ? (
                    <p className="route-user-fail">{routeErrorB}</p>
                  ) : itineraryB && (
                    <>
                      <RouteMetricsPanel itinerary={itineraryB} />
                      <RouteStepsPanel itinerary={itineraryB} />
                      {itinerariesB.length > 1 && (
                        <ItinerarySwitcher
                          index={itineraryIndexB}
                          total={itinerariesB.length}
                          onPrev={() => setItineraryIndexB((i) => Math.max(0, i - 1))}
                          onNext={() => setItineraryIndexB((i) => Math.min(itinerariesB.length - 1, i + 1))}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="results-footer" style={{ marginTop: 'auto' }}>
              <span className="results-footer-text">V.4.0 ENGINE</span>
              <span className="results-footer-text">GRID: 1:25000</span>
            </div>
          </div>
        ) : (
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
                onClick={() => openDetailView(point)}
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
        )}
      </div>
    </div>
  );
}

function RouteMetricsPanel({ itinerary }) {
  const metrics = getRouteMetrics(itinerary);
  return (
    <div className="route-metrics">
      <div className="route-metric">
        <span className="route-metric-value">{formatDuration(itinerary.duration)}</span>
        <span className="route-metric-label">Duration</span>
      </div>
      <div className="route-metric">
        <span className="route-metric-value">{metrics.fare > 0 ? `₹${metrics.fare}` : 'Free'}</span>
        <span className="route-metric-label">Fare</span>
      </div>
      <div className="route-metric">
        <span className="route-metric-value">{metrics.transfers}</span>
        <span className="route-metric-label">Transfer{metrics.transfers !== 1 ? 's' : ''}</span>
      </div>
      <div className="route-metric">
        <span className="route-metric-value">{formatDistance(metrics.walkingMeters)}</span>
        <span className="route-metric-label">Walk</span>
      </div>
    </div>
  );
}

function RouteStepsPanel({ itinerary }) {
  const legs = itinerary?.legs || [];
  if (legs.length === 0) return null;

  return (
    <div className="route-steps">
      {legs.map((leg, idx) => {
        const mode = normalizeMode(leg.mode);
        const label = modeLabels[mode] || leg.mode;
        const routeName = getLegRouteName(leg);
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
              <span className="route-step-distance">{formatDistance(leg.distance || 0)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ItinerarySwitcher({ index, total, onPrev, onNext }) {
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

export default ResultsPage;
