import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Check, MessageCircle, Link2, QrCode, Share2, Send, Mail, MapPin } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './SharePage.css';

function SharePage() {
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
    if (id && !isNaN(lat) && !isNaN(lon)) {
      return { id, lat, lon, lng: lon, name: name || 'Meeting Point' };
    }
    return null;
  }, [state.venue, searchParams]);

  const shareId = venue?.id || '---';
  const shareName = venue?.name || 'Meeting Point';
  const shareArea = venue?.address || venue?.location || '';
  const lat = venue?.lat;
  const lon = venue?.lon ?? venue?.lng;
  const hasCoords = lat != null && lon != null;

  const meetingUrl = hasCoords
    ? `${window.location.origin}/detail?id=${encodeURIComponent(shareId)}&lat=${lat}&lon=${lon}&name=${encodeURIComponent(shareName)}`
    : `${window.location.origin}/detail?id=${encodeURIComponent(shareId)}`;

  const [feedback, setFeedback] = useState(null);
  const [showQr, setShowQr] = useState(false);

  const showFeedback = useCallback((msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  }, []);

  const copyToClipboard = useCallback(async (text, label) => {
    if (!navigator.clipboard) {
      showFeedback('Clipboard not available');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showFeedback(`${label} copied`);
    } catch {
      showFeedback('Failed to copy');
    }
  }, [showFeedback]);

  const handleCopyLink = useCallback(() => {
    copyToClipboard(meetingUrl, 'Link');
  }, [meetingUrl, copyToClipboard]);

  const handleCopyCoords = useCallback(() => {
    if (!hasCoords) {
      showFeedback('Coordinates not available');
      return;
    }
    copyToClipboard(`${lat},${lon}`, 'Coordinates');
  }, [hasCoords, lat, lon, copyToClipboard, showFeedback]);

  const handleWhatsApp = useCallback(() => {
    const text = `Let's meet at ${shareName}${shareArea ? `, ${shareArea}` : ''}! ${meetingUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }, [shareName, shareArea, meetingUrl]);

  const handleTelegram = useCallback(() => {
    const text = `Let's meet at ${shareName}${shareArea ? `, ${shareArea}` : ''}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(meetingUrl)}&text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }, [shareName, shareArea, meetingUrl]);

  const handleEmail = useCallback(() => {
    const subject = `Meet at ${shareName}`;
    const body = `Let's meet at ${shareName}${shareArea ? `, ${shareArea}` : ''}!\n\n${meetingUrl}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
  }, [shareName, shareArea, meetingUrl]);

  const handleSystemShare = useCallback(async () => {
    if (!navigator.share) {
      showFeedback('Share not supported on this device');
      return;
    }
    try {
      await navigator.share({
        title: `Meet at ${shareName}`,
        text: `Let's meet at ${shareName}${shareArea ? `, ${shareArea}` : ''}!`,
        url: meetingUrl,
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        showFeedback('Share was cancelled');
      }
    }
  }, [shareName, shareArea, meetingUrl, showFeedback]);

  const handleToggleQr = useCallback(() => {
    setShowQr((prev) => !prev);
  }, []);

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

        {feedback && (
          <div className="share-feedback">{feedback}</div>
        )}

        <p className="share-section-label">Distribution Methods</p>

        <div className="share-options">
          <div className="share-option" onClick={handleWhatsApp}>
            <div className="share-option-icon">
              <MessageCircle />
            </div>
            <div className="share-option-text">
              <span className="share-option-name">Message Friend</span>
              <span className="share-option-desc">Send via WhatsApp</span>
            </div>
          </div>

          <div className="share-option" onClick={handleTelegram}>
            <div className="share-option-icon">
              <Send />
            </div>
            <div className="share-option-text">
              <span className="share-option-name">Send via Telegram</span>
              <span className="share-option-desc">Instant message share</span>
            </div>
          </div>

          <div className="share-option" onClick={handleEmail}>
            <div className="share-option-icon">
              <Mail />
            </div>
            <div className="share-option-text">
              <span className="share-option-name">Send via Email</span>
              <span className="share-option-desc">Share meeting details</span>
            </div>
          </div>

          <div className="share-option" onClick={handleCopyLink}>
            <div className="share-option-icon">
              <Link2 />
            </div>
            <div className="share-option-text">
              <span className="share-option-name">Copy Secure Link</span>
              <span className="share-option-desc">{meetingUrl}</span>
            </div>
          </div>

          {hasCoords && (
            <div className="share-option" onClick={handleCopyCoords}>
              <div className="share-option-icon">
                <MapPin />
              </div>
              <div className="share-option-text">
                <span className="share-option-name">Copy Coordinates</span>
                <span className="share-option-desc">{`${lat.toFixed(4)}, ${lon.toFixed(4)}`}</span>
              </div>
            </div>
          )}

          <div className="share-option" onClick={handleToggleQr}>
            <div className="share-option-icon">
              <QrCode />
            </div>
            <div className="share-option-text">
              <span className="share-option-name">Display QR Code</span>
              <span className="share-option-desc">In-Person Optical Sync</span>
            </div>
          </div>

          {showQr && (
            <div className="share-qr-container">
              <div className="share-qr-code">
                <QRCodeSVG value={meetingUrl} size={180} bgColor="#FFFFFF" fgColor="#0F0F0F" />
              </div>
              <p className="share-qr-url">{meetingUrl}</p>
            </div>
          )}

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
