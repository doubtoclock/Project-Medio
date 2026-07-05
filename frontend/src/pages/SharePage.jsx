import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, MessageCircle, Link2, QrCode, Share2 } from 'lucide-react';
import './SharePage.css';

function SharePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};

  const venue = state.venue || null;

  const shareId = venue?.id || '---';
  const shareName = venue?.name || 'Meeting Point';
  const shareArea = venue?.address || venue?.location || '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`medio.io/x/${shareId}`);
  };

  const handleSystemShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Meet at ${shareName}`,
          text: `Let's meet at ${shareName}${shareArea ? `, ${shareArea}` : ''}!`,
          url: `https://medio.io/x/${shareId}`,
        });
      } catch (err) {
        // User cancelled
      }
    }
  };

  return (
    <div className="share-page">
      <div className="share-content">
        <div className="share-top-bar">
          <button className="share-close" onClick={() => navigate(-1)}>
            Close
          </button>
          <span className="share-sync-label">Live Sync Active</span>
        </div>

        <div className="share-success-card">
          <div className="share-check-icon">
            <Check />
          </div>
          <h2 className="share-locked-title">Location Locked</h2>
          <p className="share-locked-subtitle">
            {shareName}{shareArea ? `, ${shareArea}` : ''}
          </p>
        </div>

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
              <span className="share-option-desc">medio.io/x/{shareId}</span>
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

        <div className="share-spacer"></div>

        <button
          className="share-return-button"
          onClick={() => navigate('/meet')}
        >
          Return to Navigation
        </button>

        <div className="share-footer">
          <span className="share-footer-text">ID: {shareId}</span>
          <span className="share-footer-text">Encryption: AES-256</span>
        </div>
      </div>
    </div>
  );
}

export default SharePage;
