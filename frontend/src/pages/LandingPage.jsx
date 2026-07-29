import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import worldMapBg from '../assets/world-map-bg.png';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigate('/meet');
      } else {
        navigate('/login');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated, isLoading]);

  return (
    <div className="landing-page">
      {/* Background Map */}
      <div className="landing-bg">
        <img src={worldMapBg} alt="World Map Background" />
        <div className="landing-bg-overlay"></div>
      </div>

      {/* Content */}
      <div className="landing-content" style={{ justifyContent: 'center' }}>
        {/* Coordinate System Badge */}
        <div className="coord-badge">
          <div className="coord-bar"></div>
          <span className="coord-text">Coordinate System Active</span>
        </div>

        {/* Radar Ping */}
        <div className="radar-container">
          <div className="radar-ring"></div>
          <div className="radar-ring radar-ring-2"></div>
          <div className="radar-dot"></div>
        </div>

        {/* Hero Text */}
        <h1 className="hero-title">
          Meet<br />Somewhere.
        </h1>
        <p className="hero-subtitle">
          The smart way to find the perfect midpoint for everyone.
        </p>

        {/* Spacer */}
        <div className="landing-spacer"></div>

        {/* Version */}
        <p className="version-text">VER. 2.0.4</p>

        {/* Loading Indicator */}
        <div className="loading-indicator" style={{ marginTop: '32px', color: 'var(--secondary-text)', fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Initializing...
        </div>

        {/* Footer */}
        <p className="landing-footer">
          19.0760° N, 72.8777° E — MUMBAI HQ
        </p>
      </div>
    </div>
  );
}

export default LandingPage;
