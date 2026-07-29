import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, Compass, Footprints, Train, Bus, Car, Bike, ArrowLeft, ChevronLeft, ChevronRight
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { apiClient } from '../lib/apiClient';
import {
  formatDuration, formatDistance, normalizeMode,
  modeLabels, getLegRouteName, getLegEndpointName, getRouteMetrics
} from '../lib/routeUtils';
import coffeeHero from '../assets/coffee-hero.png';
import './DetailPage.css';
import './ResultsPage.css';
import './SharedLinkPage.css';

function getModeIcon(mode) {
  const norm = normalizeMode(mode);
  if (norm === 'BUS') return <Bus size={18} />;
  if (norm === 'SUBWAY' || norm === 'RAIL' || norm === 'TRAM') return <Train size={18} />;
  if (norm === 'CAR') return <Car size={18} />;
  if (norm === 'BICYCLE') return <Bike size={18} />;
  return <Footprints size={18} />;
}

const getStepDotClass = (mode) => {
  const norm = normalizeMode(mode);
  if (norm === 'BUS') return 'dot-bus';
  if (norm === 'RAIL' || norm === 'SUBWAY' || norm === 'TRAM') return 'dot-rail';
  if (norm === 'CAR') return 'dot-car';
  return 'dot-walk';
};

function UserTimelineCard({ itineraries, origin, venue, userTag }) {
  const [index, setIndex] = useState(0);
  const itinerary = itineraries[index] || null;
  const legs = itinerary?.legs || [];
  const metrics = itinerary ? getRouteMetrics(itinerary) : null;
  const totalMeters = legs.reduce((acc, leg) => acc + (leg.distance || 0), 0);
  const total = itineraries.length;

  return (
    <section className="guest-route-card anim-slide-up-fade">
      <div className="guest-route-heading">
        <span className={`guest-route-dot user-${userTag.toLowerCase()}`}></span>
        <h3>Your Route</h3>
      </div>

      <div className="guest-route-metrics">
        {itinerary && metrics && (
          <>
            <div><strong>{formatDuration(itinerary.duration)}</strong><span>Duration</span></div>
            <div><strong>{metrics.transfers}</strong><span>Transfer</span></div>
            <div><strong>{formatDistance(metrics.walkingMeters)}</strong><span>Walk</span></div>
          </>
        )}
      </div>

      {legs.length > 0 ? (
        <div className="guest-route-steps">
          {legs.map((leg, idx) => {
            const mode = normalizeMode(leg.mode);
            const routeName = getLegRouteName(leg);
            const fromName = getLegEndpointName(leg.from, idx === 0 ? (origin?.name || 'Start Location') : 'Transfer Point');
            const toName = getLegEndpointName(leg.to, idx === legs.length - 1 ? (venue?.name || 'Meeting Point') : 'Transfer Point');
            const distanceText = formatDistance(leg.distance || 0);

            return (
              <div className="guest-route-step" key={idx}>
                <div className="guest-route-line">
                  <span className={`guest-route-step-dot ${getStepDotClass(mode)}`}></span>
                  {idx < legs.length - 1 && <span className="guest-route-connector"></span>}
                </div>
                <div className="guest-route-step-body">
                  <div className="guest-route-step-icon">{getModeIcon(mode)}</div>
                  <h4>{modeLabels[mode] || routeName}</h4>
                  {mode !== 'WALK' && routeName && <span className="guest-route-pill">{routeName}</span>}
                  <p>{fromName} - {toName}</p>
                  <small>{distanceText}</small>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-route-text">
          <p>Origin: {origin?.name || `User ${userTag} Location`}</p>
          <p className="no-route-sub">Direct travel to meeting point.</p>
        </div>
      )}

      {total > 1 && (
        <div className="guest-route-switcher">
          <button onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}>
            <ChevronLeft size={18} />
          </button>
          <span>{index + 1} / {total}</span>
          <button onClick={() => setIndex((value) => Math.min(total - 1, value + 1))} disabled={index === total - 1}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}

function SharedLinkPage() {
  const { shareId } = useParams();
  const navigate = useNavigate();
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
        <button className="guest-download-back" onClick={() => navigate('/download-app')} aria-label="Download MEDIO">
          <ArrowLeft size={20} />
        </button>

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
        <UserTimelineCard
          itineraries={itinerariesA}
          origin={originA}
          venue={venue}
          userTag="A"
        />

        <UserTimelineCard
          itineraries={itinerariesB}
          origin={originB}
          venue={venue}
          userTag="B"
        />
      </div>
    </div>
  );
}

export default SharedLinkPage;
