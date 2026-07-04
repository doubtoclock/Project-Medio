import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Users, ExternalLink } from 'lucide-react';
import coffeeHero from '../assets/coffee-hero.png';
import './DetailPage.css';

// Venue data (in a real app this would come from an API)
const venueData = {
  1: {
    name: 'The Roastery',
    location: 'Mitte District, Berlin 10115',
    tags: ['Specialty Coffee', 'Wi-Fi Active'],
    description:
      'A post-industrial workspace optimized for collaborative sessions. Located at the exact vector intersection of your trajectories.',
    yourTime: '14m',
    friendTime: '22m',
    id: 'NX-882-P',
  },
  2: {
    name: 'Berlin Library',
    location: 'Mitte District, Berlin 10117',
    tags: ['Quiet Space', 'Wi-Fi Active'],
    description:
      'A serene knowledge hub perfect for focused meetings. Strategically positioned along the optimal convergence corridor.',
    yourTime: '18m',
    friendTime: '16m',
    id: 'NX-304-L',
  },
  3: {
    name: 'Café Kranzler',
    location: 'Mitte District, Berlin 10119',
    tags: ['Classic Café', 'Outdoor Seating'],
    description:
      'A historic café with modern amenities, ideal for casual catch-ups and brainstorming.',
    yourTime: '20m',
    friendTime: '19m',
    id: 'NX-112-C',
  }
};

function DetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
    const venueId = searchParams.get('venue') || '1';
  const venue = venueData[venueId] || venueData[1];

  
  return (
    <div className="detail-page">
      {/* Hero Image */}
      <div className="detail-hero">
        <img src={coffeeHero} alt={venue.name} />
        <div className="detail-hero-overlay"></div>

        {/* Top bar */}
        <div className="detail-top-bar">
          <button className="detail-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <span className="detail-established anim-slide-up-fade">Meeting Established</span>
        </div>

        {/* Tags */}
        <div className="detail-tags anim-slide-up-fade" style={{ animationDelay: '0.1s' }}>
          {venue.tags.map((tag, i) => (
            <span className="detail-tag" key={i}>{tag}</span>
          ))}
        </div>

        {/* Title */}
        <div className="detail-hero-text anim-slide-up-fade" style={{ animationDelay: '0.2s' }}>
          <h1 className="detail-venue-name">{venue.name}</h1>
          <div className="detail-venue-location">
            <span className="loc-dot"></span>
            {venue.location}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="detail-body">
        {/* Description */}
        <p className="detail-description anim-slide-up-fade" style={{ animationDelay: '0.3s' }}>{venue.description}</p>

        {/* Travel times */}
        <div className="detail-grid anim-slide-up-fade" style={{ animationDelay: '0.4s' }}>
          <div className="detail-info-card anim-card-lift">
            <div className="info-card-header">
              <div className="info-card-icon">
                <User className="anim-icon-tap" />
              </div>
              <span className="info-card-label">You</span>
            </div>
            <span className="info-card-value anim-slide-up-fade" style={{ animationDelay: '0.6s' }}>{venue.yourTime}</span>
          </div>

          <div className="detail-info-card anim-card-lift">
            <div className="info-card-header">
              <div className="info-card-icon friend-icon">
                <Users className="anim-icon-tap" />
              </div>
              <span className="info-card-label">Friend</span>
            </div>
            <span className="info-card-value friend-value anim-slide-up-fade" style={{ animationDelay: '0.7s' }}>{venue.friendTime}</span>
          </div>
        </div>

        {/* Nav engine links */}
        <div className="detail-grid anim-slide-up-fade" style={{ animationDelay: '0.5s' }}>
          <div className="nav-card anim-card-lift" onClick={() => window.open('https://maps.google.com', '_blank')}>
            <span className="nav-card-label">Nav Engine</span>
            <div className="nav-card-bottom">
              <span className="nav-card-name">Google Maps</span>
              <ExternalLink className="nav-card-icon anim-icon-tap" />
            </div>
          </div>

          <div className="nav-card anim-card-lift" onClick={() => window.open('https://maps.apple.com', '_blank')}>
            <span className="nav-card-label">Nav Engine</span>
            <div className="nav-card-bottom">
              <span className="nav-card-name">Apple Maps</span>
              <ExternalLink className="nav-card-icon anim-icon-tap" />
            </div>
          </div>
        </div>

        {/* Share button */}
        <button className="detail-share-button anim-card-lift anim-slide-up-fade" style={{ animationDelay: '0.6s' }} onClick={() => navigate(`/share?venue=${venueId}`)}>
          Share Meeting Point
        </button>

        {/* Footer */}
        <div className="detail-footer">
          <span className="detail-footer-text">ID: {venue.id}</span>
          <span className="detail-footer-text">Secure Link Active</span>
        </div>
      </div>
    </div>
  );
}

export default DetailPage;
