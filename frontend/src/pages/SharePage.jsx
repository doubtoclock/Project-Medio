import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, MessageCircle, Link2, QrCode, Share2 } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import './SharePage.css';

const venueNames = {
  1: { name: 'The Roastery', area: 'Berlin Mitte', id: 'NX-882-P' },
  2: { name: 'Berlin Library', area: 'Berlin Mitte', id: 'NX-441-L' },
  3: { name: 'Café Kranzler', area: 'Charlottenburg', id: 'NX-553-K' },
};

function SharePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
    const venueId = searchParams.get('venue') || '1';
  const venue = venueNames[venueId] || venueNames['1'];

  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`medio.io/x/${venue.id}`);
  };

  const handleSystemShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Meet at ${venue.name}`,
          text: `Let's meet at ${venue.name}, ${venue.area}!`,
          url: `https://medio.io/x/${venue.id}`,
        });
      } catch (err) {
        // User cancelled
      }
    }
  };

  return (
    <div className="share-page">
      <div className="share-content">
        {/* Top bar */}
        <div className="share-top-bar">
          <button className="share-close" onClick={() => navigate(-1)}>
            Close
          </button>
          <span className="share-sync-label">Live Sync Active</span>
        </div>

        {/* Success card */}
        <div className="share-success-card">
          <div className="share-check-icon">
            <Check />
          </div>
          <h2 className="share-locked-title">Location Locked</h2>
          <p className="share-locked-subtitle">
            {venue.name}, {venue.area}
          </p>
        </div>

        {/* Distribution methods */}
        <p className="share-section-label">Distribution Methods</p>

        <div className="share-options">
          <div className="share-option">
            <div className="share-option-icon">
              <MessageCircle />
            </div>
            <div className="share-option-text">
              <span className="share-option-name">Message Friend</span>
              <span className="share-option-desc">Direct Protocol Transfer</span>
            </div>
          </div>

          <div className="share-option" onClick={handleCopyLink}>
            <div className="share-option-icon">
              <Link2 />
            </div>
            <div className="share-option-text">
              <span className="share-option-name">Copy Secure Link</span>
              <span className="share-option-desc">medio.io/x/{venue.id}</span>
            </div>
          </div>

          <div className="share-option">
            <div className="share-option-icon">
              <QrCode />
            </div>
            <div className="share-option-text">
              <span className="share-option-name">Display QR Code</span>
              <span className="share-option-desc">In-Person Optical Sync</span>
            </div>
          </div>

          <div className="share-option" onClick={handleSystemShare}>
            <div className="share-option-icon">
              <Share2 />
            </div>
            <div className="share-option-text">
              <span className="share-option-name">System Share</span>
              <span className="share-option-desc">OS Native Share Sheet</span>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="share-spacer"></div>

        {/* Return button */}
        <button
          className="share-return-button"
          onClick={() => navigate('/meet')}
        >
          Return to Navigation
        </button>

        {/* Footer */}
        <div className="share-footer">
          <span className="share-footer-text">ID: {venue.id}</span>
          <span className="share-footer-text">Encryption: AES-256</span>
        </div>
      </div>
    </div>
  );
}

export default SharePage;
