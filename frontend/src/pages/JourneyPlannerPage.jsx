import React, { useState } from 'react';
import { 
  ArrowLeft, ArrowUpDown, MapPin, Search, Navigation2, 
  Train, Bus, Car, Bike, PersonStanding, 
  Clock, Cloud, AlertTriangle, Zap, Info, ShieldCheck, Footprints, Route,
  CornerUpRight, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './JourneyPlannerPage.css';

const TRANSPORT_OPTIONS = [
  {
    id: 'metro',
    name: 'Metro',
    icon: Train,
    duration: '28 min',
    cost: '₹40',
    distance: '8.4 km',
    label: 'Fastest during rush hour',
    tag: 'Fastest',
    color: '#F5F5F5',
    insights: [
      { icon: Route, text: '2 line changes required' },
      { icon: Footprints, text: '6 min walk to station' },
      { icon: Zap, text: 'Saves 18 minutes today' }
    ],
    path: 'M20,80 Q40,40 80,20',
  },
  {
    id: 'bus',
    name: 'Bus',
    icon: Bus,
    duration: '42 min',
    cost: '₹15',
    distance: '9.2 km',
    label: 'Lowest cost',
    tag: 'Cheapest',
    color: '#E0E0E0',
    insights: [
      { icon: Clock, text: 'Bus arrives in 4 mins' },
      { icon: Route, text: '14 stops to destination' },
      { icon: ShieldCheck, text: 'Air conditioned route' }
    ],
    path: 'M20,80 Q30,60 50,50 T80,20',
  },
  {
    id: 'car',
    name: 'Car',
    icon: Car,
    duration: '35 min',
    cost: '₹220',
    distance: '10.5 km',
    label: 'Heavy traffic today',
    tag: 'Comfort',
    color: '#D4D4D4',
    insights: [
      { icon: AlertTriangle, text: 'Heavy congestion expected' },
      { icon: MapPin, text: 'Parking is limited near destination' },
      { icon: Zap, text: '₹220 estimated fuel + toll' }
    ],
    path: 'M20,80 C20,60 60,60 80,20',
  },
  {
    id: 'bike',
    name: 'Bike',
    icon: Bike,
    duration: '24 min',
    cost: '₹60',
    distance: '10.1 km',
    label: 'Weaving through traffic',
    tag: 'Agile',
    color: '#A1A1A1',
    insights: [
      { icon: Zap, text: 'Fastest option overall' },
      { icon: AlertTriangle, text: 'Moderate traffic conditions' },
      { icon: MapPin, text: 'Easy parking available' }
    ],
    path: 'M20,80 C30,70 50,30 80,20',
  },
  {
    id: 'walking',
    name: 'Walking',
    icon: Footprints,
    duration: '1h 58m',
    cost: 'Free',
    distance: '7.8 km',
    label: 'Healthy option',
    tag: 'Eco',
    color: '#8A8A8A',
    insights: [
      { icon: Zap, text: 'Burns approximately 320 calories' },
      { icon: Cloud, text: 'Pleasant weather for walking' },
      { icon: ShieldCheck, text: 'Mostly flat terrain' }
    ],
    path: 'M20,80 L30,60 L50,60 L60,40 L80,20',
  }
];

export default function JourneyPlannerPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState('metro');
  const [origin, setOrigin] = useState('Current Location');
  const [destination, setDestination] = useState('Nexus Mall, Koramangala');
  const [isNavigating, setIsNavigating] = useState(false);

  const selectedTransport = TRANSPORT_OPTIONS.find(t => t.id === selectedId) || TRANSPORT_OPTIONS[0];

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  return (
    <div className="planner-page">
      {/* Header */}
      <header className="planner-header">
        <button className="planner-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>
        <div className="planner-title">Journey Planner</div>
      </header>

      <div className="planner-content">
        
        {/* Locations */}
        <section className="planner-locations">
          <div className="location-inputs">
            <div className="location-field">
              <div className="location-dot origin"></div>
              <input 
                type="text" 
                value={origin} 
                onChange={(e) => setOrigin(e.target.value)}
                className="location-input"
              />
            </div>
            <div className="location-divider"></div>
            <div className="location-field">
              <div className="location-dot dest"></div>
              <input 
                type="text" 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)}
                className="location-input"
              />
            </div>
          </div>
          <button className="swap-btn" onClick={handleSwap}>
            <ArrowUpDown size={16} strokeWidth={2.5} />
          </button>
        </section>

        {/* Journey Summary Ticker */}
        <section className="planner-summary">
          <div className="summary-item">
            <span className="summary-val">{selectedTransport.distance}</span>
            <span className="summary-lbl">Distance</span>
          </div>
          <div className="summary-item">
            <span className="summary-val">{selectedTransport.duration}</span>
            <span className="summary-lbl">Best ETA</span>
          </div>
          <div className="summary-item">
            <span className="summary-val">Heavy</span>
            <span className="summary-lbl">Traffic</span>
          </div>
          <div className="summary-item">
            <span className="summary-val">24°C</span>
            <span className="summary-lbl">Weather</span>
          </div>
        </section>

        {/* Map Preview */}
        <section className="planner-map-container">
          <svg className="planner-map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Draw all inactive paths faintly */}
            {TRANSPORT_OPTIONS.map(opt => (
              <path 
                key={`bg-${opt.id}`}
                d={opt.path}
                className="map-path-inactive"
              />
            ))}
            {/* Draw active path */}
            <path 
              key={`active-${selectedTransport.id}`}
              d={selectedTransport.path}
              className={`map-path-active ${selectedTransport.id === 'walking' ? 'dashed' : ''}`}
            />
          </svg>
          <div className="map-pin origin-pin"></div>
          <div className="map-pin dest-pin"></div>
        </section>

        {/* Recommendation Highlight */}
        <section className="planner-recommendation">
          <div className="rec-badge">Recommended</div>
          <div className="rec-text">
            <strong>{selectedTransport.name}</strong> is the best option today. {selectedTransport.insights[0]?.text}. Estimated arrival in {selectedTransport.duration}.
          </div>
        </section>

        {/* Transport List */}
        <section className="transport-list">
          {TRANSPORT_OPTIONS.map(transport => {
            const isSelected = transport.id === selectedId;
            const Icon = transport.icon;
            return (
              <button 
                key={transport.id} 
                className={`transport-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedId(transport.id)}
              >
                <div className="transport-icon-wrap">
                  <Icon size={24} strokeWidth={isSelected ? 2.5 : 2} />
                </div>
                <div className="transport-info">
                  <div className="transport-header">
                    <span className="transport-name">{transport.name}</span>
                    <span className="transport-cost">{transport.cost}</span>
                  </div>
                  <div className="transport-meta">
                    <span className="transport-duration">{transport.duration}</span>
                    <span className="transport-dot">•</span>
                    <span className="transport-label">{transport.label}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* Contextual Insights */}
        <section className="planner-insights">
          <h3 className="insights-title">Journey Details</h3>
          <div className="insights-grid">
            {selectedTransport.insights.map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <div key={idx} className="insight-row anim-slide-up" style={{animationDelay: `${idx * 0.05}s`}}>
                  <Icon size={16} className="insight-icon" />
                  <span className="insight-text">{insight.text}</span>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* Bottom CTA */}
      <div className="planner-cta-wrapper">
        <button className="planner-cta-btn" onClick={() => setIsNavigating(true)}>
          <Navigation2 size={18} strokeWidth={3} fill="currentColor" />
          Start Journey
        </button>
      </div>

      {/* Active Navigation Overlay */}
      {isNavigating && (
        <div className="active-nav-container anim-fade-in">
          
          {/* Top Instruction Banner */}
          <div className="nav-instruction-banner">
            <div className="nav-dir-icon">
              <CornerUpRight size={32} strokeWidth={3} color="#090909" />
            </div>
            <div className="nav-instruction-text">
              <div className="nav-dist">In 200m</div>
              <div className="nav-action">Turn right onto Main Street</div>
            </div>
          </div>

          {/* 3D Map View */}
          <div className="nav-3d-map">
            <div className="nav-3d-plane">
              <svg className="nav-3d-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path 
                  d={selectedTransport.path}
                  className="nav-3d-path"
                />
              </svg>
              <div className="nav-current-location">
                <Navigation2 size={32} fill="var(--primary-text)" strokeWidth={0} />
              </div>
            </div>
          </div>

          {/* Bottom Status Panel */}
          <div className="nav-status-sheet">
            <div className="nav-status-info">
              <div className="nav-time-remaining">{selectedTransport.duration}</div>
              <div className="nav-meta-remaining">{selectedTransport.distance} • 12:45 PM</div>
            </div>
            <button className="nav-end-btn" onClick={() => setIsNavigating(false)}>
              <X size={20} strokeWidth={2.5} />
              <span>End Route</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
