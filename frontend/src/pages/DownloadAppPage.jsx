import React from 'react';
import { ArrowLeft, Download, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './DownloadAppPage.css';

function DownloadAppPage() {
  const navigate = useNavigate();

  return (
    <div className="download-app-page">
      <button className="download-back-btn" onClick={() => navigate(-1)} aria-label="Back">
        <ArrowLeft size={20} />
      </button>

      <div className="download-app-content">
        <div className="download-app-icon">
          <Smartphone size={34} />
        </div>
        <h1>Download MEDIO</h1>
        <p>Access saved meetings, route history, profile tools, and the full travel planner in the app.</p>

        <div className="download-actions">
          <button disabled><Download size={18} /> App Store</button>
          <button disabled><Download size={18} /> Play Store</button>
          <button disabled><Download size={18} /> PWA</button>
        </div>
      </div>
    </div>
  );
}

export default DownloadAppPage;
