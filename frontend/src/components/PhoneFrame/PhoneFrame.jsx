import React from 'react';
import './PhoneFrame.css';

export default function PhoneFrame({ children }) {
  return (
    <div className="phone-frame-wrapper">
      <div className="phone-container">
        {children}
      </div>
    </div>
  );
}
