import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle, Compass, Footprints, Train, Bus, Car, Bike, ArrowDown, MapPin
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiClient } from '../lib/apiClient';
import {
  formatDuration, formatDistance, normalizeMode,
  modeLabels, getLegRouteName, getLegEndpointName, getLegDurationMinutes, getRouteMetrics
} from '../lib/routeUtils';
import coffeeHero from '../assets/coffee-hero.png';
import './DetailPage.css';
import './ResultsPage.css';
import './SharedLinkPage.css';

const venueMarkerIcon = L.divIcon({
  className: 'guest-map-marker-container',
  html: '<div class="guest-marker-badge venue-badge"><div class="marker-dot"></div><span>Meeting Point</span></div>',
  iconSize: [110, 28],
  iconAnchor: [55, 14],
});

const userAMarkerIcon = L.divIcon({
  className: 'guest-map-marker-container',
  html: '<div class="guest-marker-badge user-a-badge"><div class="marker-dot"></div><span>User A</span></div>',
  iconSize: [80, 28],
  iconAnchor: [40, 14],
});

const userBMarkerIcon = L.divIcon({
  className: 'guest-map-marker-container',
  html: '<div class="guest-marker-badge user-b-badge"><div class="marker-dot"></div><span>User B</span></div>',
  iconSize: [80, 28],
  iconAnchor: [40, 14],
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
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
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

function UserTimelineCard({ itinerary, origin, venue, userTag }) {
  const legs = itinerary?.legs || [];
  const metrics = itinerary ? getRouteMetrics(itinerary) : null;
  const totalMeters = legs.reduce((acc, leg) => acc + (leg.distance || 0), 0);

  return (
    <div className="user-timeline-card anim-slide-up-fade">
      <div className="user-timeline-header">
        <h3 className={`user-badge user-badge-${userTag.toLowerCase()}`}>
          USER {userTag}
        </h3>
        {itinerary && metrics && (
          <div className="user-summary-bar">
            <span className="summary-chip">{formatDuration(itinerary.duration)}</span>
            <span className="summary-chip">{formatDistance(totalMeters)}</span>
            <span className="summary-chip">{metrics.transfers} Transfer{metrics.transfers !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {legs.length > 0 ? (
        <div className="guest-timeline-steps">
          {legs.map((leg, idx) => {
            const mode = normalizeMode(leg.mode);
            const isWalk = mode === 'WALK';
            const routeName = getLegRouteName(leg);
            const fromName = getLegEndpointName(leg.from, idx === 0 ? (origin?.name || 'Start Location') : 'Transfer Point');
            const toName = getLegEndpointName(leg.to, idx === legs.length - 1 ? (venue?.name || 'Meeting Point') : 'Transfer Point');
            const legMinutes = getLegDurationMinutes(leg);
            const distanceText = formatDistance(leg.distance || 0);

            return (
              <React.Fragment key={idx}>
                <div className={`guest-timeline-step ${isWalk ? 'guest-step-walk' : 'guest-step-transit'}`}>
                  <div className="guest-step-left">
                    <div className={`guest-step-icon-badge mode-${mode.toLowerCase()}`}>
                      {getModeIcon(mode)}
                    </div>
                  </div>

                  <div className="guest-step-right">
                    <div className="guest-step-title-row">
                      <span className="guest-step-title">
                        {isWalk ? `🚶 Walk` : (modeLabels[mode] ? `🚇 ${routeName}` : routeName)}
                      </span>
                      <span className="guest-step-metrics">
                        {distanceText} {legMinutes > 0 ? `• ${legMinutes} min` : ''}
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
                          <span className="endpoint-text"><strong className="endpoint-label">Board:</strong> {fromName}</span>
                          <span className="endpoint-text"><strong className="endpoint-label">Ride:</strong> {legMinutes > 0 ? `${legMinutes} min` : 'Transit'}</span>
                          <span className="endpoint-text"><strong className="endpoint-label">Get Off:</strong> {toName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="guest-timeline-connector">
                  <ArrowDown size={16} />
                </div>
              </React.Fragment>
            );
          })}

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
      ) : (
        <div className="no-route-text">
          <p>Origin: {origin?.name || `User ${userTag} Location`}</p>
          <p className="no-route-sub">Direct travel to meeting point.</p>
        </div>
      )}
    </div>
  );
}

function SharedLinkPage() {
  const { shareId } = useParams();
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const venue = shareData?.venue;
  const originA = shareData?.originA;
  const originB = shareData?.originB;
  const routeDataA = shareData?.routeDataA;
  const routeDataB = shareData?.routeDataB;

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

  const itineraryA = itinerariesA[0] || null;
  const itineraryB = itinerariesB[0] || null;

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
      </div>
    );
  }

  return (
    <div className="guest-share-page">
      {/* 1. Venue Hero */}
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

      {/* Main Content Body */}
      <div className="guest-share-body">
        {/* 2. Small Map (ONLY 3 Markers - NO Route Lines/Polylines/Replay) */}
        <div className="guest-map-container guest-map-small anim-slide-up-fade" style={{ animationDelay: '0.3s' }}>
          <div className="guest-map-header">
            <span className="guest-map-title">Location Overview</span>
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

              {/* Meeting Point Marker */}
              {venue?.lat != null && (
                <Marker
                  position={[venue.lat, venue.lon ?? venue.lng]}
                  icon={venueMarkerIcon}
                />
              )}

              {/* User A Marker */}
              {originA?.lat != null && originA?.lng != null && (
                <Marker
                  position={[originA.lat, originA.lng]}
                  icon={userAMarkerIcon}
                />
              )}

              {/* User B Marker */}
              {originB?.lat != null && originB?.lng != null && (
                <Marker
                  position={[originB.lat, originB.lng]}
                  icon={userBMarkerIcon}
                />
              )}
            </MapContainer>
          </div>
        </div>

        {/* 3. USER A CARD */}
        <UserTimelineCard
          itinerary={itineraryA}
          origin={originA}
          venue={venue}
          userTag="A"
        />

        {/* 4. USER B CARD */}
        <UserTimelineCard
          itinerary={itineraryB}
          origin={originB}
          venue={venue}
          userTag="B"
        />
      </div>
    </div>
  );
}

export default SharedLinkPage;
