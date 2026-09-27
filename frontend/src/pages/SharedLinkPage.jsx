import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Compass } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import DetailPage from './DetailPage';
import './SharedLinkPage.css';

function SharedLinkPage() {
  const { shareId } = useParams();
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shareId) {
      setError('Invalid share link.');
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.share.get(shareId)
      .then((data) => {
        if (cancelled) return;
        if (data?.venue) setShareData(data);
        else setError('This share link is no longer valid.');
      })
      .catch(() => {
        if (!cancelled) setError('This share link is no longer valid.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [shareId]);

  if (loading) {
    return (
      <div className="guest-share-loading">
        <Compass size={28} className="transport-loading-spinner" style={{ color: '#0A84FF' }} />
        <p style={{ color: '#A1A1A1', fontSize: 14, fontWeight: 500 }}>Loading shared meeting...</p>
      </div>
    );
  }

  if (error || !shareData?.venue) {
    return (
      <div className="guest-share-error">
        <AlertTriangle size={36} style={{ color: '#FF453A' }} />
        <h2 style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 700, margin: '8px 0 4px' }}>
          Link Unavailable
        </h2>
        <p style={{ color: '#A1A1A1', fontSize: 14 }}>{error || 'This share link is no longer valid.'}</p>
      </div>
    );
  }

  return <DetailPage key={shareId} sharedData={shareData} />;
}

export default SharedLinkPage;
