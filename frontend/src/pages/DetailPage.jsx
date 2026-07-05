import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Users, MapPin, Loader, AlertTriangle } from 'lucide-react';
import { RouteMetricsPanel, RouteStepsPanel, ItinerarySwitcher, formatDuration } from '../lib/routeUtils';
import { apiClient } from '../lib/apiClient';
import coffeeHero from '../assets/coffee-hero.png';
import './DetailPage.css';
import './ResultsPage.css';

function DetailPage() {
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

  const venue = useMemo(() => {
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
  }, [state.venue, savedDetail?.venue, searchParams]);

  const originA = state.originA || savedDetail?.originA || null;
  const originB = state.originB || savedDetail?.originB || null;
  const routeDataA = state.routeDataA || savedDetail?.routeDataA || null;
  const routeDataB = state.routeDataB || savedDetail?.routeDataB || null;
  const routeErrorA = state.routeErrorA || savedDetail?.routeErrorA || null;
  const routeErrorB = state.routeErrorB || savedDetail?.routeErrorB || null;

  const isRecipient = state.fromSharedLink || (!state.venue && !savedDetail?.venue && !!searchParams.get('id'));

  const itinerariesA = routeDataA?.data?.plan?.itineraries || [];
  const itinerariesB = routeDataB?.data?.plan?.itineraries || [];

  const [itineraryIndexA, setItineraryIndexA] = useState(0);
  const [itineraryIndexB, setItineraryIndexB] = useState(0);

  const itineraryA = itinerariesA[itineraryIndexA] || null;
  const itineraryB = itinerariesB[itineraryIndexB] || null;

  // Recipient state
  const [recipientLocation, setRecipientLocation] = useState(null);
  const [recipientGeoStatus, setRecipientGeoStatus] = useState('idle');
  const [recipientRouteData, setRecipientRouteData] = useState(null);
  const [recipientRouteError, setRecipientRouteError] = useState(null);
  const [recipientRouteLoading, setRecipientRouteLoading] = useState(false);
  const [recipientItineraryIndex, setRecipientItineraryIndex] = useState(0);

  const recipientItineraries = recipientRouteData?.data?.plan?.itineraries || [];
  const recipientItinerary = recipientItineraries[recipientItineraryIndex] || null;

  // Recipient geolocation
  useEffect(() => {
    if (!isRecipient) return;
    if (!navigator.geolocation) {
      setRecipientGeoStatus('unavailable');
      return;
    }
    setRecipientGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setRecipientLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setRecipientGeoStatus('success');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setRecipientGeoStatus('denied');
        } else {
          setRecipientGeoStatus('unavailable');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [isRecipient]);

  // Recipient route fetch
  useEffect(() => {
    if (!isRecipient || !recipientLocation || !venue) return;

    let cancelled = false;
    setRecipientRouteLoading(true);
    setRecipientRouteError(null);
    setRecipientRouteData(null);
    setRecipientItineraryIndex(0);

    apiClient.route.plan({
      from: { lat: recipientLocation.lat, lng: recipientLocation.lng },
      to: { lat: venue.lat, lng: venue.lon ?? venue.lng },
      fromName: 'My Location',
      toName: venue.name || 'Meeting Point',
    }).then((data) => {
      if (cancelled) return;
      const itineraries = data?.data?.plan?.itineraries;
      if (Array.isArray(itineraries) && itineraries.length > 0) {
        setRecipientRouteData(data);
      } else {
        setRecipientRouteError('Routing is currently unavailable for this region.');
      }
    }).catch((err) => {
      if (cancelled) return;
      const msg = err?.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setRecipientRouteError('Unable to calculate your route right now.');
      } else {
        setRecipientRouteError('Routing is currently available only within the regions included in the current map dataset.');
      }
    }).finally(() => {
      if (!cancelled) setRecipientRouteLoading(false);
    });

    return () => { cancelled = true; };
  }, [isRecipient, recipientLocation, venue?.id, venue?.lat, venue?.lon ?? venue?.lng]);

  const retryGeolocation = useCallback(() => {
    setRecipientGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setRecipientLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setRecipientGeoStatus('success');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setRecipientGeoStatus('denied');
        } else {
          setRecipientGeoStatus('unavailable');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handleNavigate = useCallback(() => {
    if (isRecipient) {
      if (!recipientLocation || !venue) return;
      navigate('/travel', {
        state: {
          origin: { ...recipientLocation, name: 'My Location' },
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
  }, [isRecipient, recipientLocation, originA, venue, navigate]);

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

      <div className="detail-body">
        {!isRecipient && (
          <>
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
          </>
        )}

        {isRecipient && (
          <>
            {recipientGeoStatus === 'loading' && (
              <div className="route-user-section" style={{ textAlign: 'center', padding: '24px 16px' }}>
                <Loader size={20} className="transport-loading-spinner" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#A1A1A1', fontSize: 13 }}>Getting your location...</p>
              </div>
            )}

            {recipientGeoStatus === 'denied' && (
              <div className="route-user-section route-user-error">
                <div className="route-user-header">
                  <AlertTriangle size={16} />
                  <span className="route-user-label">Location Required</span>
                </div>
                <p className="route-user-fail">Enable location to calculate your route.</p>
                <button
                  onClick={retryGeolocation}
                  className="detail-share-button"
                  style={{ marginTop: 12 }}
                >
                  Retry
                </button>
              </div>
            )}

            {recipientGeoStatus === 'unavailable' && (
              <div className="route-user-section route-user-error">
                <div className="route-user-header">
                  <AlertTriangle size={16} />
                  <span className="route-user-label">Location Unavailable</span>
                </div>
                <p className="route-user-fail">Enable location to calculate your route.</p>
                <button
                  onClick={retryGeolocation}
                  className="detail-share-button"
                  style={{ marginTop: 12 }}
                >
                  Retry
                </button>
              </div>
            )}

            {recipientRouteLoading && recipientGeoStatus === 'success' && (
              <div className="route-user-section" style={{ textAlign: 'center', padding: '24px 16px' }}>
                <Loader size={20} className="transport-loading-spinner" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#A1A1A1', fontSize: 13 }}>Calculating your route...</p>
              </div>
            )}

            {recipientRouteError && (
              <div className="route-user-section route-user-error">
                <div className="route-user-header">
                  <AlertTriangle size={16} />
                  <span className="route-user-label">Route Error</span>
                </div>
                <p className="route-user-fail">{recipientRouteError}</p>
              </div>
            )}

            {recipientItinerary && (
              <div className="route-user-section">
                <div className="route-user-header">
                  <span className="route-user-dot route-user-dot-a"></span>
                  <span className="route-user-label">Your Route</span>
                </div>
                <RouteMetricsPanel itinerary={recipientItinerary} />
                <RouteStepsPanel itinerary={recipientItinerary} />
                {recipientItineraries.length > 1 && (
                  <ItinerarySwitcher
                    index={recipientItineraryIndex}
                    total={recipientItineraries.length}
                    onPrev={() => setRecipientItineraryIndex((i) => Math.max(0, i - 1))}
                    onNext={() => setRecipientItineraryIndex((i) => Math.min(recipientItineraries.length - 1, i + 1))}
                  />
                )}
              </div>
            )}
          </>
        )}

        <div className="anim-slide-up-fade" style={{ animationDelay: '0.5s' }}>
          <div className="nav-card anim-card-lift" onClick={handleNavigate}>
            <span className="nav-card-label">{isRecipient ? 'Navigate' : 'Nav Engine'}</span>
            <div className="nav-card-bottom">
              <span className="nav-card-name">Navigate</span>
              <MapPin className="nav-card-icon anim-icon-tap" />
            </div>
          </div>
        </div>

        {!isRecipient && (
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

        <div className="detail-footer">
          <span className="detail-footer-text">ID: {venue?.id || '---'}</span>
          <span className="detail-footer-text">Secure Link Active</span>
        </div>
      </div>
    </div>
  );
}

export default DetailPage;
