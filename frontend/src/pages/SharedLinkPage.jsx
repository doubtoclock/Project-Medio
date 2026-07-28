import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ExternalLink, MapPin, User, Users,
  Download, Compass, ShieldCheck
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiClient } from '../lib/apiClient';
import {
  RouteMetricsPanel, RouteStepsPanel, ItinerarySwitcher,
  formatDuration, decodePolyline, normalizeMode
} from '../lib/routeUtils';
import { GuestShareModal } from '../components/GuestShareModal';
import coffeeHero from '../assets/coffee-hero.png';
import './DetailPage.css';
import './ResultsPage.css';
import './SharedLinkPage.css';

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

function MapBoundsAdjuster({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [points, map]);

  return null;
}

function RoutePolyline({ legs }) {
  const segments = useMemo(() => {
    return (legs || [])
      .map((leg) => {
        const pts = getLegSegmentPoints(leg);
        if (pts.length > 0) {
          return {
            mode: normalizeMode(leg.mode),
            points: pts,
          };
        }
        return null;
      })
      .filter((segment) => segment?.points.length > 0);
  }, [legs]);

  if (segments.length === 0) return null;

  return (
    <>
      {segments.map((segment, index) => {
        const isWalk = segment.mode === 'WALK';
        return (
          <Polyline
            key={`segment-${index}`}
            positions={segment.points}
            pathOptions={{
              color: legModeColors[segment.mode] || '#0A84FF',
              weight: isWalk ? 4 : 6,
              opacity: 0.9,
              dashArray: isWalk ? '8, 8' : undefined,
            }}
          />
        );
      })}
    </>
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
        // Second back action allows natural browser back
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

  const itinerariesA = routeDataA?.data?.plan?.itineraries || [];
  const itinerariesB = routeDataB?.data?.plan?.itineraries || [];

  const itineraryA = itinerariesA[itineraryIndexA] || null;
  const itineraryB = itinerariesB[itineraryIndexB] || null;

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

  const googleMapsUrl = useMemo(() => {
    if (!venue) return '#';
    const lat = venue.lat;
    const lon = venue.lon ?? venue.lng;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  }, [venue]);

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
        {/* Open Google Maps Action Card */}
        <div className="guest-action-card anim-slide-up-fade">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="guest-gmaps-btn anim-card-lift"
          >
            <div className="guest-gmaps-left">
              <MapPin size={20} className="guest-gmaps-icon" />
              <div className="guest-gmaps-text">
                <span className="guest-gmaps-title">Open in Google Maps</span>
                <span className="guest-gmaps-sub">Get turns and live directions</span>
              </div>
            </div>
            <ExternalLink size={18} />
          </a>
        </div>

        {/* Journey Duration Overview */}
        {(itineraryA || itineraryB || routeErrorA || routeErrorB) && (
          <div className="detail-grid anim-slide-up-fade" style={{ animationDelay: '0.3s' }}>
            <div className="detail-info-card anim-card-lift">
              <div className="info-card-header">
                <div className="info-card-icon">
                  <User className="anim-icon-tap" />
                </div>
                <span className="info-card-label">{originA?.name || 'Person A'}</span>
              </div>
              <span className="info-card-value anim-slide-up-fade">
                {itineraryA ? formatDuration(itineraryA.duration) : (routeErrorA || '--')}
              </span>
            </div>

            <div className="detail-info-card anim-card-lift">
              <div className="info-card-header">
                <div className="info-card-icon friend-icon">
                  <Users className="anim-icon-tap" />
                </div>
                <span className="info-card-label">{originB?.name || 'Person B'}</span>
              </div>
              <span className="info-card-value friend-value anim-slide-up-fade">
                {itineraryB ? formatDuration(itineraryB.duration) : (routeErrorB || '--')}
              </span>
            </div>
          </div>
        )}

        {/* Interactive Map View */}
        <div className="guest-map-container anim-slide-up-fade" style={{ animationDelay: '0.4s' }}>
          <div className="guest-map-header">
            <span className="guest-map-title">Route Visualization</span>
            <span className="guest-map-hint">Pan & Zoom active</span>
          </div>
          <div className="guest-map-wrapper">
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

              {/* Route Polylines */}
              {itineraryA?.legs && <RoutePolyline legs={itineraryA.legs} />}
              {itineraryB?.legs && <RoutePolyline legs={itineraryB.legs} />}
            </MapContainer>
          </div>
        </div>

        {/* Detailed Person A Route */}
        {itineraryA && (
          <div className="route-user-section anim-slide-up-fade" style={{ animationDelay: '0.5s' }}>
            <div className="route-user-header">
              <span className="route-user-dot route-user-dot-a"></span>
              <span className="route-user-label">{originA?.name ? `Route from ${originA.name}` : 'Person A Route'}</span>
            </div>
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
          </div>
        )}

        {/* Detailed Person B Route */}
        {itineraryB && (
          <div className="route-user-section anim-slide-up-fade" style={{ animationDelay: '0.6s' }}>
            <div className="route-user-header">
              <span className="route-user-dot route-user-dot-b"></span>
              <span className="route-user-label">{originB?.name ? `Route from ${originB.name}` : 'Person B Route'}</span>
            </div>
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
