import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader, AlertTriangle } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

function SharedLinkPage() {
  const navigate = useNavigate();
  const { shareId } = useParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shareId) {
      navigate('/', { replace: true });
      return;
    }

    let cancelled = false;

    apiClient.share.get(shareId)
      .then((data) => {
        if (cancelled) return;
        if (data?.venue) {
          navigate('/detail', {
            replace: true,
            state: {
              venue: data.venue,
              fromSharedLink: true,
            },
          });
        } else {
          setError('This share link is no longer valid.');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('This share link is no longer valid.');
        }
      });

    return () => { cancelled = true; };
  }, [shareId, navigate]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 24, textAlign: 'center', gap: 16,
    }}>
      {error ? (
        <>
          <AlertTriangle size={32} style={{ color: '#F44336' }} />
          <p style={{ color: '#F5F5F5', fontSize: 15, fontWeight: 600 }}>{error}</p>
        </>
      ) : (
        <>
          <Loader size={24} className="transport-loading-spinner" />
          <p style={{ color: '#A1A1A1', fontSize: 13 }}>Loading meeting details...</p>
        </>
      )}
    </div>
  );
}

export default SharedLinkPage;
