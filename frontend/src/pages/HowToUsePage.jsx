import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Search, Link2, Navigation2, 
  CheckCircle2, Star, Compass, User, QrCode, Share 
} from 'lucide-react';
import './HowToUsePage.css';

// Intersection Observer Hook for scroll animations & progress tracking
function useOnScreen(options = { threshold: 0.6 }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      // Toggle visibility based on intersection for re-triggering animations
      setIsVisible(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [ref, options]);

  return [ref, isVisible];
}

function GuideSection({ step, title, desc, onVisible, children }) {
  const [ref, isVisible] = useOnScreen({ threshold: 0.5 });
  
  useEffect(() => {
    if (isVisible) {
      onVisible(step);
    }
  }, [isVisible, step, onVisible]);

  return (
    <section ref={ref} className={`guide-section ${isVisible ? 'is-visible' : ''}`}>
      <div className="guide-text-content">
        <h2 className="guide-step-title">{title}</h2>
        <p className="guide-step-desc">{desc}</p>
      </div>
      {children}
    </section>
  );
}

export default function HowToUsePage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);
  const totalSteps = 5;

  return (
    <div className="guide-page">
      {/* Header */}
      <header className="guide-header">
        <button className="guide-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>
        <div className="guide-progress-indicator">
          Step {activeStep} of {totalSteps}
        </div>
      </header>

      <div className="guide-content-wrapper">
        
        {/* Hero Heading */}
        <div className="guide-hero">
          <h1 className="guide-hero-title">Guide</h1>
          <p className="guide-hero-subtitle">Learn how to use Medio in 5 simple steps.</p>
        </div>

        {/* Step 1 */}
        <GuideSection 
          step={1}
          onVisible={setActiveStep}
          title="Choose where everyone is starting"
          desc="Enter both starting points to find a fair middle ground."
        >
          <div className="mockup-container">
            <div className="mockup-inputs">
              <div className="mock-input-field">
                <User size={16} strokeWidth={2.5} className="mock-input-icon" />
                <div className="mock-input-text">Your Location</div>
              </div>
              <div className="mock-input-field">
                <MapPin size={16} strokeWidth={2.5} className="mock-input-icon highlight" />
                <div className="mock-input-text highlight-text">Friend's Location</div>
              </div>
            </div>
          </div>
        </GuideSection>

        {/* Step 2 */}
        <GuideSection 
          step={2}
          onVisible={setActiveStep}
          title="Let Medio calculate the best meeting spot"
          desc="Medio analyzes routes to recommend the perfect meeting location."
        >
          <div className="mockup-container">
            <div className="mockup-map">
              <svg className="mock-route-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path className="mock-path mock-path-1" d="M15,25 Q35,55 50,50" />
                <path className="mock-path mock-path-2" d="M85,75 Q65,45 50,50" />
              </svg>
              <div className="mock-marker origin-a"></div>
              <div className="mock-marker origin-b"></div>
              <div className="mock-nexus-marker">
                <div className="mock-nexus-outer"></div>
                <div className="mock-nexus-inner"></div>
              </div>
            </div>
          </div>
        </GuideSection>

        {/* Step 3 */}
        <GuideSection 
          step={3}
          onVisible={setActiveStep}
          title="Compare nearby places"
          desc="Browse cafés, restaurants, and parks around the suggested point."
        >
          <div className="mockup-container">
            <div className="mockup-explore">
              <div className="mock-venue-pin"></div>
              <div className="mock-venue-pin"></div>
              <div className="mock-venue-pin"></div>
              
              <div className="mock-meeting-card">
                <div className="mock-card-content">
                  <div className="mock-card-tag">NEARBY CAFE</div>
                  <div className="mock-card-name">Sightglass Coffee</div>
                  <div className="mock-card-distance">5 min walk</div>
                </div>
                <div className="mock-card-btn">Select</div>
              </div>
            </div>
          </div>
        </GuideSection>

        {/* Step 4 */}
        <GuideSection 
          step={4}
          onVisible={setActiveStep}
          title="Share the meeting instantly"
          desc="Send the location to your friends using your favorite apps."
        >
          <div className="mockup-container">
            <div className="mockup-share">
              <div className="mock-share-option">
                <Link2 size={20} strokeWidth={2} className="mock-share-icon" />
                <div className="mock-share-text">Copy Link</div>
              </div>
              <div className="mock-share-option">
                <QrCode size={20} strokeWidth={2} className="mock-share-icon" />
                <div className="mock-share-text">QR Code</div>
              </div>
              <div className="mock-share-option">
                <Share size={20} strokeWidth={2} className="mock-share-icon" />
                <div className="mock-share-text">System Share</div>
              </div>
            </div>
          </div>
        </GuideSection>

        {/* Step 5 */}
        <GuideSection 
          step={5}
          onVisible={setActiveStep}
          title="Navigate with confidence"
          desc="Open your navigation app knowing everyone has a fair route."
        >
          <div className="mockup-container">
            <div className="mockup-nav">
              <div className="mock-nav-marker">
                <Navigation2 size={20} strokeWidth={3} fill="currentColor" />
              </div>
              <div className="mock-nav-cta">
                <Navigation2 size={16} strokeWidth={2.5} />
                <span>Start Navigation</span>
              </div>
            </div>
          </div>
        </GuideSection>

        {/* Quick Tips */}
        <section className="guide-tips-section">
          <div className="tips-title">Tips for the Best Experience</div>
          
          <div className="tip-row">
            <MapPin size={20} strokeWidth={1.5} className="tip-icon" />
            <div className="tip-text">Turn on location permissions for more accurate results.</div>
          </div>
          <div className="tip-row">
            <CheckCircle2 size={20} strokeWidth={1.5} className="tip-icon" />
            <div className="tip-text">Double-check your friend's address before calculating.</div>
          </div>
          <div className="tip-row">
            <Star size={20} strokeWidth={1.5} className="tip-icon" />
            <div className="tip-text">Compare recommended places before selecting one.</div>
          </div>
          <div className="tip-row">
            <Navigation2 size={20} strokeWidth={1.5} className="tip-icon" />
            <div className="tip-text">Save frequently used meeting places for quicker planning.</div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="guide-cta-section">
          <h3 className="guide-cta-title">Ready to find your first meeting point?</h3>
          <button className="guide-cta-btn" onClick={() => navigate('/meet')}>
            Start Planning
          </button>
        </section>
      </div>
    </div>
  );
}
