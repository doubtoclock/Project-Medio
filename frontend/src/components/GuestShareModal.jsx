import React from 'react';
import { Compass, Download, X } from 'lucide-react';
import './GuestShareModal.css';

export function GuestShareModal({ isOpen, onClose, onDownload }) {
  if (!isOpen) return null;

  return (
    <div className="guest-modal-overlay" onClick={onClose}>
      <div className="guest-modal-card anim-card-lift" onClick={(e) => e.stopPropagation()}>
        <button className="guest-modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="guest-modal-header">
          <div className="guest-modal-icon">
            <Compass size={24} />
          </div>
          <h2 className="guest-modal-title">Continue with MEDIO</h2>
        </div>

        <p className="guest-modal-body">
          You're viewing a shared journey. Download MEDIO to create meeting points, discover places, and unlock the complete experience.
        </p>

        <div className="guest-modal-actions">
          <button className="guest-modal-btn guest-modal-btn-secondary" onClick={onClose}>
            Stay Here
          </button>
          <button className="guest-modal-btn guest-modal-btn-primary" onClick={onDownload}>
            <Download size={16} />
            Download MEDIO
          </button>
        </div>
      </div>
    </div>
  );
}

export default GuestShareModal;
