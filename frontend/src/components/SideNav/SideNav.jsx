import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, BookOpen, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigation } from '../../context/NavigationContext';
import './SideNav.css';

export default function SideNav() {
  const { isExpanded, setIsExpanded } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('meet');

  useEffect(() => {
    if (location.pathname === '/meet' || location.pathname === '/results' || location.pathname === '/detail' || location.pathname === '/share') {
      setActiveTab('meet');
    } else if (location.pathname === '/travel') {
      setActiveTab('travel');
    } else if (location.pathname === '/guide') {
      setActiveTab('guide');
    } else if (location.pathname === '/profile') {
      setActiveTab('profile');
    }
  }, [location]);

  const tabs = [
    { id: 'meet', icon: MapPin, path: '/meet' },
    { id: 'travel', icon: Navigation, path: '/travel' },
    { id: 'guide', icon: BookOpen, path: '/guide' },
    { id: 'profile', icon: User, path: '/profile' },
  ];

  return (
    <div
      className={`side-nav-wrapper ${isExpanded ? 'expanded' : 'collapsed'}`}
    >
      <div className="side-nav">
        <div className="nav-items-top">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`nav-btn ${isActive ? 'active' : ''}`}
                style={{ transitionDelay: isExpanded ? `${0.1 + index * 0.05}s` : '0s' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab(tab.id);
                  navigate(tab.path);
                  setIsExpanded(false);
                }}
              >
                <div className="nav-indicator" />
                <div className="nav-icon-container">
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className="nav-icon" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
