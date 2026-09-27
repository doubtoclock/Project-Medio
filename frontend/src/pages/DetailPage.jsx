import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Users, MapPin } from 'lucide-react';
import { RouteMetricsPanel, RouteStepsPanel, ItinerarySwitcher, formatDuration } from '../lib/routeUtils';
import { apiClient } from '../lib/apiClient';
import coffeeHero from '../assets/coffee-hero.png';
import './DetailPage.css';
import './ResultsPage.css';

function DetailPage({ sharedData = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state || {};

  const savedDetail = useMemo(() => {
    try {
      const saved = sessionStorage.getItem('detailRestore');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  }, []);

  useEffect(() => {
    sessionStorage.removeItem('detailRestore');
  }, []);

  const isSharedLink = Boolean(sharedData);

  const venue = useMemo(() => {
    if (sharedData?.venue) return sharedData.venue;
    if (state.venue) return state.venue;
    if (savedDetail?.venue) return savedDetail.venue;
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
  }, [sharedData?.venue, state.venue, savedDetail?.venue, searchParams]);

  const originA = isSharedLink ? sharedData.originB : (state.originA || savedDetail?.originA || null);
  const originB = isSharedLink ? sharedData.originA : (state.originB || savedDetail?.originB || null);
  const [routeDataA, setRouteDataA] = useState(isSharedLink ? sharedData.routeDataB : (state.routeDataA || savedDetail?.routeDataA || null));
  const [routeDataB, setRouteDataB] = useState(isSharedLink ? sharedData.routeDataA : (state.routeDataB || savedDetail?.routeDataB || null));
  const [routeErrorA, setRouteErrorA] = useState(isSharedLink ? sharedData.routeErrorB : (state.routeErrorA || savedDetail?.routeErrorA || null));
  const [routeErrorB, setRouteErrorB] = useState(isSharedLink ? sharedData.routeErrorA : (state.routeErrorB || savedDetail?.routeErrorB || null));

  const isRecipient = isSharedLink || state.fromSharedLink || (!state.venue && !savedDetail?.venue && !!searchParams.get('id'));
  const showRouteDetails = !isRecipient || isSharedLink;

  const extractItineraries = (routeData) => {
    if (Array.isArray(routeData)) return routeData;
    if (Array.isArray(routeData?.itineraries)) return routeData.itineraries;
    if (Array.isArray(routeData?.plan?.itineraries)) return routeData.plan.itineraries;
    if (Array.isArray(routeData?.data?.plan?.itineraries)) return routeData.data.plan.itineraries;
    if (Array.isArray(routeData?.data?.itineraries)) return routeData.data.itineraries;
    if (routeData?.itinerary?.legs) return [routeData.itinerary];
    if (routeData?.legs) return [routeData];
    return [];
  };

  const itinerariesA = extractItineraries(routeDataA);
  const itinerariesB = extractItineraries(routeDataB);

  const [itineraryIndexA, setItineraryIndexA] = useState(0);
  const [itineraryIndexB, setItineraryIndexB] = useState(0);
  const requestedRouteKeysRef = useRef(new Set());

  const itineraryA = itinerariesA[itineraryIndexA] || null;
  const itineraryB = itinerariesB[itineraryIndexB] || null;

  useEffect(() => {
    if ((isRecipient && !isSharedLink) || !venue || !originA || !originB) return;
    const needsRouteA = !routeDataA && !routeErrorA;
    const needsRouteB = !routeDataB && !routeErrorB;
    if (!needsRouteA && !needsRouteB) return;

    let cancelled = false;
    const fetchRoute = async (origin, side) => {
      const routeKey = `${side}-${venue.id || `${venue.lat},${venue.lon ?? venue.lng}`}`;
      if (requestedRouteKeysRef.current.has(routeKey)) return;
      requestedRouteKeysRef.current.add(routeKey);

      try {
        const data = await apiClient.route.plan({
          from: { lat: origin.lat, lng: origin.lng },
          to: { lat: venue.lat, lng: venue.lon ?? venue.lng },
          fromName: origin.name,
          toName: venue.name,
          travelMode: 'local',
          localTransport: { bus: true, rail: true, subway: true, car: false },
        });
        const itineraries = data?.data?.plan?.itineraries;
        if (!Array.isArray(itineraries) || itineraries.length === 0) {
          throw new Error('No route found');
        }
        if (cancelled) return;
        if (side === 'A') setRouteDataA(data);
        else setRouteDataB(data);
      } catch {
        if (cancelled) return;
        if (side === 'A') setRouteErrorA('Could not calculate route.');
        else setRouteErrorB('Could not calculate route.');
      }
    };

    if (needsRouteA) fetchRoute(originA, 'A');
    if (needsRouteB) fetchRoute(originB, 'B');

    return () => { cancelled = true; };
  }, [isRecipient, isSharedLink, venue, originA, originB, routeDataA, routeDataB, routeErrorA, routeErrorB]);

  const handleNavigate = useCallback(() => {
    if (isRecipient && !isSharedLink) {
      if (!venue) return;
      navigate('/travel', {
        state: {
          destination: { lat: venue.lat, lng: venue.lon ?? venue.lng, name: venue.name || 'Meeting Point' },
        }
      });
    } else {
      if (!originA || !venue) return;
      navigate('/travel', {
        state: {
          origin: originA,
          destination: { lat: venue.lat, lng: venue.lon ?? venue.lng, name: venue.name || 'Meeting Point' },
        }
      });
    }
  }, [isRecipient, isSharedLink, originA, venue, navigate]);

  return (
    <div className="detail-page">
      <div className="detail-hero">
        <img src={venue?.image || coffeeHero} alt={venue?.name || 'Venue'} />
        <div className="detail-hero-overlay"></div>

        <div className="detail-top-bar">
          <button className="detail-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <span className="detail-established anim-slide-up-fade">
            {isRecipient ? 'Shared Meeting' : 'Meeting Established'}
          </span>
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

      <div className="detail-content detail-body">
        {showRouteDetails && (
          <>
            <div className="detail-grid anim-slide-up-fade" style={{ animationDelay: '0.4s' }}>
              <div className="detail-info-card anim-card-lift">
                <div className="info-card-header">
                  <div className="info-card-icon">
                    <User className="anim-icon-tap" />
                  </div>
                  <span className="info-card-label">{isSharedLink ? (originA?.name || 'You') : 'You'}</span>
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
                  <span className="info-card-label">{isSharedLink ? (originB?.name || 'Friend') : 'Friend'}</span>
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
                  <span className="route-user-label">{isSharedLink ? (originA?.name || 'User A') : 'User A'}</span>
                </div>
                <p className="route-user-fail">{routeErrorA}</p>
              </div>
            )}

            {itineraryA && (
              <div className="route-user-section">
                <div className="route-user-header">
                  <span className="route-user-dot route-user-dot-a"></span>
                  <span className="route-user-label">{isSharedLink ? (originA?.name || 'User A') : 'User A'}</span>
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
                  <span className="route-user-label">{isSharedLink ? (originB?.name || 'User B') : 'User B'}</span>
                </div>
                <p className="route-user-fail">{routeErrorB}</p>
              </div>
            )}

            {itineraryB && (
              <div className="route-user-section">
                <div className="route-user-header">
                  <span className="route-user-dot route-user-dot-b"></span>
                  <span className="route-user-label">{isSharedLink ? (originB?.name || 'User B') : 'User B'}</span>
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
          </>
        )}

        {showRouteDetails && (
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
        )}

        <button className="detail-navigate-button" onClick={handleNavigate}>
          <MapPin size={19} />
          <span>Navigate to meeting point</span>
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
