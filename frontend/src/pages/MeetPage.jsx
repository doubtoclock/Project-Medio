import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader, MapPin, Navigation, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiClient } from '../lib/apiClient';
import { fetchLocationSuggestions, recordLocationSelection } from '../lib/locationSearch';
import { CARTO_DARK_TILE_URL, preloadMapTiles } from '../lib/mapTiles';
import './MeetPage.css';

const liveLocationIcon = L.divIcon({
  className: '',
  html: `
    <div class="meet-dot" style="position: absolute; top: -5px; left: -5px;">
    </div>
  `,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

function MeetPage() {
  const navigate = useNavigate();

  const [locA, setLocA] = useState('');
  const [locB, setLocB] = useState('');
  const [debouncedA, setDebouncedA] = useState('');
  const [debouncedB, setDebouncedB] = useState('');
  const [coordsA, setCoordsA] = useState(null);
  const [coordsB, setCoordsB] = useState(null);
  const [suggestionsA, setSuggestionsA] = useState([]);
  const [suggestionsB, setSuggestionsB] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [loadingMeet, setLoadingMeet] = useState(false);
  const [meetNotice, setMeetNotice] = useState('');

  const debounceRefA = useRef(null);
  const debounceRefB = useRef(null);
  const selectingSuggestionRef = useRef(null);

  const resetResults = () => {
    setMeetNotice('');
  };

  // Debounce A
  useEffect(() => {
    preloadMapTiles({ lat: 19.0760, lng: 72.8777 }, 13, 1);
  }, []);

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
    if (query.length < 1) {
      setSuggestionsA([]);
      return;
    }

    const controller = new AbortController();
    let isCurrent = true;

    fetchLocationSuggestions(query, controller.signal, (suggestions) => {
      if (isCurrent) setSuggestionsA(suggestions);
    })
      .then((suggestions) => {
        if (isCurrent) setSuggestionsA(suggestions);
      })
      .catch(() => {
        if (isCurrent && !controller.signal.aborted) {
          setSuggestionsA([]);
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [debouncedA]);

  // Fetch suggestions for B
  useEffect(() => {
    const query = debouncedB.trim();
    if (query.length < 1) {
      setSuggestionsB([]);
      return;
    }

    const controller = new AbortController();
    let isCurrent = true;

    fetchLocationSuggestions(query, controller.signal, (suggestions) => {
      if (isCurrent) setSuggestionsB(suggestions);
    })
      .then((suggestions) => {
        if (isCurrent) setSuggestionsB(suggestions);
      })
      .catch(() => {
        if (isCurrent && !controller.signal.aborted) {
          setSuggestionsB([]);
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [debouncedB]);

  const handleLocationInputChange = (value, type) => {
    if (type === 'A') {
      setLocA(value);
      setCoordsA(null);
      setSuggestionsA([]);
    } else {
      setLocB(value);
      setCoordsB(null);
      setSuggestionsB([]);
    }
    setActiveField(type);
    resetResults();
  };

  const handleFieldBlur = (type) => {
    setTimeout(() => {
      if (selectingSuggestionRef.current === type) {
        selectingSuggestionRef.current = null;
        return;
      }
      if (activeField !== type) return;
      const suggestions = type === 'A' ? suggestionsA : suggestionsB;
      const coords = type === 'A' ? coordsA : coordsB;
      if (suggestions.length > 0 && !coords) {
        handleSelectLocation(suggestions[0], type);
      }
    }, 0);
  };

  const handleSelectLocation = (location, type) => {
    recordLocationSelection(location);
    if (type === 'A') {
      setLocA(location.name);
      setCoordsA(location);
      setSuggestionsA([]);
    } else {
      setLocB(location.name);
      setCoordsB(location);
      setSuggestionsB([]);
    }
    setActiveField(null);
    resetResults();
  };

  const clearLocation = (type) => {
    if (type === 'A') {
      setLocA('');
      setCoordsA(null);
      setSuggestionsA([]);
    } else {
      setLocB('');
      setCoordsB(null);
      setSuggestionsB([]);
    }
    setActiveField(null);
    resetResults();
  };

  const handleFindMidpoint = async () => {
    if (!coordsA || !coordsB) return;

    setLoadingMeet(true);
    setMeetNotice('');

    try {
      const data = await apiClient.meet.find({
        latA: coordsA.lat,
        lonA: coordsA.lng,
        latB: coordsB.lat,
        lonB: coordsB.lng,
        fromName: locA,
        toName: locB,
      });

      const results = Array.isArray(data) ? data.slice(0, 12) : [];

      if (results.length === 0) {
        setMeetNotice('No named meeting spots were found after expanding the search.');
        return;
      }

      preloadMapTiles({
        lat: (coordsA.lat + coordsB.lat) / 2,
        lng: (coordsA.lng + coordsB.lng) / 2,
      }, 13, 2);

      navigate('/results', {
        state: {
          meetResults: results,
          originA: coordsA,
          originB: coordsB,
          locA,
          locB,
        },
      });
    } catch {
      setMeetNotice('Could not finish the meeting spot search right now.');
    } finally {
      setLoadingMeet(false);
    }
  };

  return (
    <div className="meet-page">
      {/* Background Map */}
      <div className="meet-bg">
        <MapContainer
          center={[19.0760, 72.8777]}
          zoom={13}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
          dragging={false}
          touchZoom={false}
          doubleClickZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url={CARTO_DARK_TILE_URL}
          />
          <Marker position={[19.0760, 72.8777]} icon={liveLocationIcon} />
        </MapContainer>
        <div className="meet-bg-overlay"></div>
      </div>

      {/* Content */}
      <div className="meet-content">
        {/* Coordinate Badge */}
        <div className="meet-coord-badge">
          <div className="meet-coord-bar"></div>
          <span className="meet-coord-text">Coordinate System Active</span>
        </div>

        {/* Spacer to push everything down */}
        <div style={{ flex: 1 }}></div>

        {/* Hero */}
        <h1 className="meet-hero-title">
          Meet<br />Medio.
        </h1>
        <p className="meet-hero-subtitle">
          Define two origins to calculate the optimal nexus.
        </p>

        {/* Origin A */}
        <div className="origin-section" style={{ marginTop: '64px' }}>
          <div className="origin-label">Origin A / Your Location</div>
          <div className="relative" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={16} style={{ color: '#F5F5F5', flexShrink: 0 }} />
            <input
              type="text"
              className="origin-input"
              style={{ flex: 1 }}
              placeholder="Enter your address..."
              value={locA}
              onChange={(e) => handleLocationInputChange(e.target.value, 'A')}
              onFocus={() => setActiveField('A')}
              onBlur={() => handleFieldBlur('A')}
            />
            {locA && (
              <button
                type="button"
                aria-label="Clear location A"
                onClick={() => clearLocation('A')}
                style={{
                  width: 24, height: 24, borderRadius: '50%', border: 'none',
                  background: 'transparent', color: 'rgba(255,255,255,0.25)',
                  cursor: 'pointer', flexShrink: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          {activeField === 'A' && suggestionsA.length > 0 && (
            <div
              style={{
                marginTop: 6, overflow: 'hidden', borderRadius: 8,
                backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              }}
            >
              {suggestionsA.map((s) => (
                <button
                  key={s.name}
                  onPointerDown={(e) => { e.preventDefault(); selectingSuggestionRef.current = 'A'; handleSelectLocation(s, 'A'); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', fontSize: 14, textAlign: 'left', color: '#F5F5F5',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <MapPin size={14} style={{ color: '#A1A1A1' }} />
<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              </button>
            ))}
          </div>
          )}
        </div>

        {/* Origin B */}
        <div className="origin-section" style={{ marginBottom: '24px' }}>
          <div className="origin-label">Origin B / Friend&apos;s Location</div>
          <div className="relative" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Navigation size={16} style={{ color: '#F5F5F5', flexShrink: 0 }} />
            <input
              type="text"
              className="origin-input"
              style={{ flex: 1 }}
              placeholder="Enter friend's address..."
              value={locB}
              onChange={(e) => handleLocationInputChange(e.target.value, 'B')}
              onFocus={() => setActiveField('B')}
              onBlur={() => handleFieldBlur('B')}
            />
            {locB && (
              <button
                type="button"
                aria-label="Clear location B"
                onClick={() => clearLocation('B')}
                style={{
                  width: 24, height: 24, borderRadius: '50%', border: 'none',
                  background: 'transparent', color: 'rgba(255,255,255,0.25)',
                  cursor: 'pointer', flexShrink: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          {activeField === 'B' && suggestionsB.length > 0 && (
            <div
              style={{
                marginTop: 6, overflow: 'hidden', borderRadius: 8,
                backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              }}
            >
              {suggestionsB.map((s) => (
                <button
                  key={s.name}
                  onPointerDown={(e) => { e.preventDefault(); selectingSuggestionRef.current = 'B'; handleSelectLocation(s, 'B'); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', fontSize: 14, textAlign: 'left', color: '#F5F5F5',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Navigation size={14} style={{ color: '#A1A1A1' }} />
<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              </button>
            ))}
          </div>
          )}
        </div>

        {/* Bottom section */}
        <div className="meet-spacer-bottom" style={{ flex: 0, marginTop: '8px' }}>
          <p className="analysis-text">ANALYSIS ENGINE V.4.0</p>
          {coordsA && coordsB && (
            <button
              className={`meet-cta-button anim-card-lift ${loadingMeet ? 'is-loading' : ''}`}
              onClick={handleFindMidpoint}
              disabled={loadingMeet}
            >
              {loadingMeet && <Loader className="button-loader" />}
              <span>{loadingMeet ? 'Searching...' : 'Find Midpoint'}</span>
              {!loadingMeet && <ArrowRight className="anim-icon-tap" />}
            </button>
          )}
          {meetNotice && (
            <div
              style={{
                marginTop: 16, padding: 16, textAlign: 'center',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <p style={{ fontSize: 13, color: '#A1A1A1', fontFamily: "'Inter', sans-serif" }}>
                {meetNotice}
              </p>
              <button
                onClick={handleFindMidpoint}
                disabled={loadingMeet}
                style={{
                  marginTop: 12, padding: '8px 20px', borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent', color: '#F5F5F5',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="meet-footer">
          <span className="meet-footer-text">19.0760° N, 72.8777° E</span>
          <span className="meet-footer-text">S-01 ACTIVE</span>
        </div>
      </div>
    </div>
  );
}

export default MeetPage;
