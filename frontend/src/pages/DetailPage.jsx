import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Users, MapPin } from 'lucide-react';
import { RouteMetricsPanel, RouteStepsPanel, ItinerarySwitcher, formatDuration } from '../lib/routeUtils';
import coffeeHero from '../assets/coffee-hero.png';
import './DetailPage.css';
import './ResultsPage.css';

function DetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state || {};

  const venue = useMemo(() => {
    if (state.venue) return state.venue;
    const id = searchParams.get('id');
    const lat = parseFloat(searchParams.get('lat'));
    const lon = parseFloat(searchParams.get('lon'));
    const name = searchParams.get('name');
    const rating = searchParams.get('rating');
    const category = searchParams.get('category');
    if (id && !isNaN(lat) && !isNaN(lon)) {
      return { id, lat, lon, lng: lon, name: name || 'Meeting Point', rating: rating || null, category: category || 'Place' };
    }
    return null;
  }, [state.venue, searchParams]);

  const originA = state.originA || null;
  const originB = state.originB || null;
  const routeDataA = state.routeDataA || null;
  const routeDataB = state.routeDataB || null;
  const routeErrorA = state.routeErrorA || null;
  const routeErrorB = state.routeErrorB || null;

  const itinerariesA = routeDataA?.data?.plan?.itineraries || [];
  const itinerariesB = routeDataB?.data?.plan?.itineraries || [];

  const [itineraryIndexA, setItineraryIndexA] = useState(0);
  const [itineraryIndexB, setItineraryIndexB] = useState(0);

  const itineraryA = itinerariesA[itineraryIndexA] || null;
  const itineraryB = itinerariesB[itineraryIndexB] || null;

  const handleOpenMaps = useCallback(() => {
    const lat = venue?.lat;
    const lon = venue?.lon ?? venue?.lng;
    if (lat == null || lon == null) return;

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    if (isIOS) {
      window.open(`maps://app?daddr=${lat},${lon}&q=${encodeURIComponent(venue?.name || 'Meeting Point')}`, '_blank');
      setTimeout(() => {
        window.open(`https://maps.apple.com/?daddr=${lat},${lon}&q=${encodeURIComponent(venue?.name || 'Meeting Point')}`, '_blank');
      }, 500);
    } else if (isAndroid) {
      window.open(`geo:${lat},${lon}?q=${lat},${lon}(${encodeURIComponent(venue?.name || 'Meeting Point')})`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
    }
  }, [venue]);

  return (
    <div className="detail-page">
      <div className="detail-hero">
        <img src={venue?.image || coffeeHero} alt={venue?.name || 'Venue'} />
        <div className="detail-hero-overlay"></div>

        <div className="detail-top-bar">
          <button className="detail-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <span className="detail-established anim-slide-up-fade">Meeting Established</span>
        </div>

        <div className="detail-tags anim-slide-up-fade" style={{ animationDelay: '0.1s' }}>
          <span className="detail-tag">{venue?.category || 'Place'}</span>
          {venue?.rating && <span className="detail-tag">{venue.rating}/5</span>}
        </div>

        <div className="detail-hero-text anim-slide-up-fade" style={{ animationDelay: '0.2s' }}>
          <h1 className="detail-venue-name">{venue?.name || 'Venue'}</h1>
          <div className="detail-venue-location">
            <span className="loc-dot"></span>
            {venue?.address || venue?.location || `${venue?.lat?.toFixed(4)}, ${venue?.lon?.toFixed(4)}`}
          </div>
        </div>
      </div>

      <div className="detail-body">
        <div className="detail-grid anim-slide-up-fade" style={{ animationDelay: '0.4s' }}>
          <div className="detail-info-card anim-card-lift">
            <div className="info-card-header">
              <div className="info-card-icon">
                <User className="anim-icon-tap" />
              </div>
              <span className="info-card-label">You</span>
            </div>
            <span className="info-card-value anim-slide-up-fade" style={{ animationDelay: '0.6s' }}>
              {itineraryA ? formatDuration(itineraryA.duration) : (routeErrorA || '--')}
            </span>
          </div>

          <div className="detail-info-card anim-card-lift">
            <div className="info-card-header">
              <div className="info-card-icon friend-icon">
                <Users className="anim-icon-tap" />
              </div>
              <span className="info-card-label">Friend</span>
            </div>
            <span className="info-card-value friend-value anim-slide-up-fade" style={{ animationDelay: '0.7s' }}>
              {itineraryB ? formatDuration(itineraryB.duration) : (routeErrorB || '--')}
            </span>
          </div>
        </div>

        {routeErrorA && !itineraryA && (
          <div className="route-user-section route-user-error">
            <div className="route-user-header">
              <span className="route-user-dot route-user-dot-a"></span>
              <span className="route-user-label">User A</span>
            </div>
            <p className="route-user-fail">{routeErrorA}</p>
          </div>
        )}

        {itineraryA && (
          <div className="route-user-section">
            <div className="route-user-header">
              <span className="route-user-dot route-user-dot-a"></span>
              <span className="route-user-label">User A</span>
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

        {routeErrorB && !itineraryB && (
          <div className="route-user-section route-user-error">
            <div className="route-user-header">
              <span className="route-user-dot route-user-dot-b"></span>
              <span className="route-user-label">User B</span>
            </div>
            <p className="route-user-fail">{routeErrorB}</p>
          </div>
        )}

        {itineraryB && (
          <div className="route-user-section">
            <div className="route-user-header">
              <span className="route-user-dot route-user-dot-b"></span>
              <span className="route-user-label">User B</span>
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

        <div className="anim-slide-up-fade" style={{ animationDelay: '0.5s' }}>
          <div className="nav-card anim-card-lift" onClick={handleOpenMaps}>
            <span className="nav-card-label">Nav Engine</span>
            <div className="nav-card-bottom">
              <span className="nav-card-name">Show in Maps</span>
              <MapPin className="nav-card-icon anim-icon-tap" />
            </div>
          </div>
        </div>

        <button className="detail-share-button anim-card-lift anim-slide-up-fade" style={{ animationDelay: '0.6s' }}
          onClick={() => navigate('/share', {
            state: {
              venue,
              originA,
              originB,
              routeDataA,
              routeDataB,
              routeErrorA,
              routeErrorB,
            }
          })}>
          Share Meeting Point
        </button>

        <div className="detail-footer">
          <span className="detail-footer-text">ID: {venue?.id || '---'}</span>
          <span className="detail-footer-text">Secure Link Active</span>
        </div>
      </div>
    </div>
  );
}

export default DetailPage;
