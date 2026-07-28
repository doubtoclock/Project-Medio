import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, User, Users, Footprints, Train, Bus, Car, Bike,
  Download, Compass, ShieldCheck, MapPin, ArrowDown
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiClient } from '../lib/apiClient';
import {
  RouteMetricsPanel, ItinerarySwitcher,
  formatDuration, formatDistance, normalizeMode,
  modeLabels, getLegRouteName, getLegEndpointName, getLegDurationMinutes
} from '../lib/routeUtils';
import { GuestShareModal } from '../components/GuestShareModal';
import coffeeHero from '../assets/coffee-hero.png';
import './DetailPage.css';
import './ResultsPage.css';
import './SharedLinkPage.css';

const venueMarkerIcon = L.divIcon({
  className: '',
  html: '<div class="guest-marker-venue"><div class="guest-marker-pin"></div></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const originAMarkerIcon = L.divIcon({
  className: '',
  html: '<div class="planner-marker-origin" />',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const originBMarkerIcon = L.divIcon({
  className: '',
  html: '<div class="planner-marker-dest" />',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function MapBoundsAdjuster({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }, [points, map]);

  return null;
}

function getModeIcon(mode) {
  const norm = normalizeMode(mode);
  if (norm === 'BUS') return <Bus size={18} />;
  if (norm === 'SUBWAY' || norm === 'RAIL' || norm === 'TRAM') return <Train size={18} />;
  if (norm === 'CAR') return <Car size={18} />;
  if (norm === 'BICYCLE') return <Bike size={18} />;
  return <Footprints size={18} />;
}

function GuestTimelineItinerary({ itinerary, origin, venue, userTag }) {
  const legs = itinerary?.legs || [];
  if (legs.length === 0) return null;

  return (
    <div className="guest-timeline-card anim-slide-up-fade">
      <div className="guest-timeline-header">
        <div className={`guest-user-badge ${userTag === 'B' ? 'guest-user-badge-b' : 'guest-user-badge-a'}`}>
          {userTag === 'B' ? <Users size={15} /> : <User size={15} />}
          <span>{origin?.name ? `Route from ${origin.name}` : `Person ${userTag} Route`}</span>
        </div>
      </div>

      <RouteMetricsPanel itinerary={itinerary} />

      <div className="guest-timeline-steps">
        {legs.map((leg, idx) => {
          const mode = normalizeMode(leg.mode);
          const isWalk = mode === 'WALK';
          const routeName = getLegRouteName(leg);
          const fromName = getLegEndpointName(leg.from, idx === 0 ? (origin?.name || 'Start Location') : 'Transfer Point');
          const toName = getLegEndpointName(leg.to, idx === legs.length - 1 ? (venue?.name || 'Meeting Point') : 'Transfer Point');
          const legMinutes = getLegDurationMinutes(leg);

          return (
            <React.Fragment key={idx}>
              <div className={`guest-timeline-step ${isWalk ? 'guest-step-walk' : 'guest-step-transit'}`}>
                <div className="guest-step-left">
                  <div className={`guest-step-icon-badge mode-${mode.toLowerCase()}`}>
                    {getModeIcon(mode)}
                  </div>
                  {idx < legs.length - 1 && <div className="guest-step-line"></div>}
                </div>

                <div className="guest-step-right">
                  <div className="guest-step-title-row">
                    <span className="guest-step-title">{isWalk ? `Walk • ${formatDistance(leg.distance || 0)}` : routeName}</span>
                    <span className="guest-step-duration">
                      {legMinutes > 0 ? `${legMinutes} min` : formatDuration((leg.endTime - leg.startTime) / 1000)}
                    </span>
                  </div>

                  <div className="guest-step-detail">
                    {isWalk ? (
                      <div className="guest-step-endpoints">
                        <span className="endpoint-text"><strong className="endpoint-label">From:</strong> {fromName}</span>
                        <span className="endpoint-text"><strong className="endpoint-label">To:</strong> {toName}</span>
                      </div>
                    ) : (
                      <div className="guest-step-endpoints">
                        <span className="endpoint-text"><strong className="endpoint-label">Board at:</strong> {fromName}</span>
                        <span className="endpoint-text"><strong className="endpoint-label">Get off at:</strong> {toName}</span>
                        {leg.intermediateStops && leg.intermediateStops.length > 0 && (
                          <span className="guest-step-stops">
                            {leg.intermediateStops.length} stop{leg.intermediateStops.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="guest-timeline-connector">
                <ArrowDown size={14} />
              </div>
            </React.Fragment>
          );
        })}

        {/* Final Destination Node */}
        <div className="guest-timeline-step guest-step-destination">
          <div className="guest-step-left">
            <div className="guest-step-icon-badge mode-destination">
              <MapPin size={18} />
            </div>
          </div>
          <div className="guest-step-right">
            <span className="guest-step-title">{venue?.name || 'Meeting Point'}</span>
            <span className="guest-step-sub">{venue?.address || venue?.location || 'Destination'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SharedLinkPage() {
  const navigate = useNavigate();
  const { shareId } = useParams();
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [backIntercepted, setBackIntercepted] = useState(false);

  const [itineraryIndexA, setItineraryIndexA] = useState(0);
  const [itineraryIndexB, setItineraryIndexB] = useState(0);

  // Fetch share link data
  useEffect(() => {
    if (!shareId) {
      setError('Invalid share link.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    apiClient.share.get(shareId)
      .then((data) => {
        if (cancelled) return;
        if (data?.venue) {
          setShareData(data);
        } else {
          setError('This share link is no longer valid.');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('This share link is no longer valid.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [shareId]);

  // Browser Back Button Interception
  useEffect(() => {
    window.history.pushState({ isGuestShare: true }, '', window.location.href);

    const handlePopState = (e) => {
      if (!backIntercepted) {
        window.history.pushState({ isGuestShare: true }, '', window.location.href);
        setShowModal(true);
        setBackIntercepted(true);
      } else {
        window.history.back();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [backIntercepted]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleDownloadApp = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const venue = shareData?.venue;
  const originA = shareData?.originA;
  const originB = shareData?.originB;
  const routeDataA = shareData?.routeDataA;
  const routeDataB = shareData?.routeDataB;
  const routeErrorA = shareData?.routeErrorA;
  const routeErrorB = shareData?.routeErrorB;

  const extractItineraries = useCallback((routeData) => {
    if (!routeData) return [];
    if (Array.isArray(routeData)) return routeData;
    if (Array.isArray(routeData.itineraries)) return routeData.itineraries;
    if (Array.isArray(routeData.plan?.itineraries)) return routeData.plan.itineraries;
    if (Array.isArray(routeData.data?.plan?.itineraries)) return routeData.data.plan.itineraries;
    if (Array.isArray(routeData.data?.itineraries)) return routeData.data.itineraries;
    if (routeData.itinerary?.legs) return [routeData.itinerary];
    if (routeData.legs) return [routeData];
    return [];
  }, []);

  const itinerariesA = useMemo(() => extractItineraries(routeDataA), [extractItineraries, routeDataA]);
  const itinerariesB = useMemo(() => extractItineraries(routeDataB), [extractItineraries, routeDataB]);

  const itineraryA = itinerariesA[itineraryIndexA] || itinerariesA[0] || null;
  const itineraryB = itinerariesB[itineraryIndexB] || itinerariesB[0] || null;
  const hasDetailedRoutes = Boolean(itineraryA || itineraryB);

  const mapPoints = useMemo(() => {
    const pts = [];
    if (venue?.lat != null && (venue?.lon != null || venue?.lng != null)) {
      pts.push([venue.lat, venue.lon ?? venue.lng]);
    }
    if (originA?.lat != null && originA?.lng != null) {
      pts.push([originA.lat, originA.lng]);
    }
    if (originB?.lat != null && originB?.lng != null) {
      pts.push([originB.lat, originB.lng]);
    }
    return pts;
  }, [venue, originA, originB]);

  if (loading) {
    return (
      <div className="guest-share-loading">
        <Compass size={28} className="transport-loading-spinner" style={{ color: '#0A84FF' }} />
        <p style={{ color: '#A1A1A1', fontSize: 14, fontWeight: 500 }}>Loading shared journey...</p>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="guest-share-error">
        <AlertTriangle size={36} style={{ color: '#FF453A' }} />
        <h2 style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 700, margin: '8px 0 4px' }}>
          Link Unavailable
        </h2>
        <p style={{ color: '#A1A1A1', fontSize: 14 }}>{error || 'This share link is no longer valid.'}</p>
        <button className="guest-btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
          Go to MEDIO
        </button>
      </div>
    );
  }

  return (
    <div className="guest-share-page">
      <GuestShareModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onDownload={handleDownloadApp}
      />

      {/* Guest Mode Navigation Header */}
      <div className="guest-top-bar">
        <div className="guest-brand">
          <Compass size={20} style={{ color: '#0A84FF' }} />
          <span className="guest-brand-text">MEDIO</span>
        </div>
        <div className="guest-mode-badge">
          <ShieldCheck size={14} />
          <span>Shared View</span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="detail-hero">
        <img src={venue?.image || coffeeHero} alt={venue?.name || 'Venue'} />
        <div className="detail-hero-overlay"></div>

        <div className="detail-tags anim-slide-up-fade" style={{ animationDelay: '0.1s' }}>
          <span className="detail-tag">{venue?.category || 'Place'}</span>
          {venue?.rating && <span className="detail-tag">{venue.rating}/5</span>}
        </div>

        <div className="detail-hero-text anim-slide-up-fade" style={{ animationDelay: '0.2s' }}>
          <h1 className="detail-venue-name">{venue?.name || 'Venue'}</h1>
          <div className="detail-venue-location">
            <span className="loc-dot"></span>
            {venue?.address || venue?.location || `${venue?.lat?.toFixed(4)}, ${(venue?.lon ?? venue?.lng)?.toFixed(4)}`}
          </div>
        </div>
      </div>

      {/* Guest Mode Main Content */}
      <div className="guest-share-body">
        {/* Legacy Share Document Fallback Alert */}
        {!hasDetailedRoutes && (
          <div className="guest-legacy-fallback anim-slide-up-fade">
            <Compass size={24} style={{ color: '#FF9F0A', flexShrink: 0 }} />
            <span>This shared journey was created using an older version of MEDIO and does not contain detailed route information.</span>
          </div>
        )}

        {/* Small Context Map (Pins Only - No Polylines) */}
        <div className="guest-map-container guest-map-small anim-slide-up-fade" style={{ animationDelay: '0.3s' }}>
          <div className="guest-map-header">
            <span className="guest-map-title">Location Overview</span>
            <span className="guest-map-hint">Pan & Zoom active</span>
          </div>
          <div className="guest-map-wrapper guest-map-wrapper-small">
            <MapContainer
              center={mapPoints[0] || [19.076, 72.8777]}
              zoom={13}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />

              <MapBoundsAdjuster points={mapPoints} />

              {/* Meeting Venue Marker */}
              {venue?.lat != null && (
                <Marker
                  position={[venue.lat, venue.lon ?? venue.lng]}
                  icon={venueMarkerIcon}
                />
              )}

              {/* Origin A Marker */}
              {originA?.lat != null && originA?.lng != null && (
                <Marker
                  position={[originA.lat, originA.lng]}
                  icon={originAMarkerIcon}
                />
              )}

              {/* Origin B Marker */}
              {originB?.lat != null && originB?.lng != null && (
                <Marker
                  position={[originB.lat, originB.lng]}
                  icon={originBMarkerIcon}
                />
              )}
            </MapContainer>
          </div>
        </div>

        {/* Textual Step-by-Step Timeline: Person A */}
        {itineraryA && (
          <div>
            <GuestTimelineItinerary
              itinerary={itineraryA}
              origin={originA}
              venue={venue}
              userTag="A"
            />
            {itinerariesA.length > 1 && (
              <ItinerarySwitcher
                index={itineraryIndexA}
                total={itinerariesA.length}
                onPrev={() => setItineraryIndexA((i) => Math.max(0, i - 1))}
                onNext={() => setItineraryIndexA((i) => Math.min(itinerariesA.length - 1, i + 1))}
              />
            )}
          </div>
        )}

        {/* Textual Step-by-Step Timeline: Person B */}
        {itineraryB && (
          <div>
            <GuestTimelineItinerary
              itinerary={itineraryB}
              origin={originB}
              venue={venue}
              userTag="B"
            />
            {itinerariesB.length > 1 && (
              <ItinerarySwitcher
                index={itineraryIndexB}
                total={itinerariesB.length}
                onPrev={() => setItineraryIndexB((i) => Math.max(0, i - 1))}
                onNext={() => setItineraryIndexB((i) => Math.min(itinerariesB.length - 1, i + 1))}
              />
            )}
          </div>
        )}

        {/* Download App Sticky Banner */}
        <div className="guest-cta-banner anim-slide-up-fade">
          <div className="guest-cta-content">
            <span className="guest-cta-title">Enjoying this shared journey?</span>
            <span className="guest-cta-sub">Download MEDIO to create your own smart meeting points.</span>
          </div>
          <button className="guest-cta-btn" onClick={handleDownloadApp}>
            <Download size={15} />
            Download App
          </button>
        </div>
      </div>
    </div>
  );
}

export default SharedLinkPage;
