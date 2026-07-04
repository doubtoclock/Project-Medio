import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Shield, ChevronRight, MapPin,
  Navigation, Bell, Globe, LogOut, Sun, Link2,
  CreditCard, HelpCircle, Mail, Info, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

// Intersection Observer Hook for scroll animations
function useOnScreen(options = { threshold: 0.15 }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
      }
    }, options);

    if (node) {
      observer.observe(node);
    }
    return () => {
      if (node) observer.unobserve(node);
    };
  }, [ref, options]);

  return [ref, isVisible];
}

function ProfileSection({ children, className = '', style = {} }) {
  const [ref, isVisible] = useOnScreen({ threshold: 0.1 });
  
  return (
    <div ref={ref} className={`${className} ${isVisible ? 'is-visible' : ''}`} style={style}>
      {children}
    </div>
  );
}

// Simple hook for counting up numbers
function useAnimatedCounter(endValue, duration = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(ease * endValue));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [endValue, duration]);

  return count;
}

function StatItem({ label, value, unit, delay }) {
  const count = useAnimatedCounter(value);
  return (
    <div className="stat-item anim-slide-up" style={{ animationDelay: `${delay}s` }}>
      <div className="stat-value">
        {count}
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function ListRow({ icon: Icon, title, value, onClick, delay, danger }) {
  return (
    <button
      className={`list-row anim-slide-up ${danger ? 'danger' : ''}`}
      onClick={onClick}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="list-row-left">
        {Icon && <Icon size={20} strokeWidth={1.5} className="list-row-icon" />}
        <span className="list-row-title">{title}</span>
      </div>
      <div className="list-row-right">
        {value && <span className="list-row-value">{value}</span>}
        {!danger && <ChevronRight size={16} strokeWidth={2} className="list-row-chevron" />}
      </div>
    </button>
  );
}

function ToggleRow({ icon: Icon, title, state, toggle, delay }) {
  return (
    <button
      className="list-row anim-slide-up"
      onClick={toggle}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="list-row-left">
        {Icon && <Icon size={20} strokeWidth={1.5} className="list-row-icon" />}
        <span className="list-row-title">{title}</span>
      </div>
      <div className="list-row-right">
        <div className={`toggle-switch ${state ? 'active' : ''}`}>
          <div className="toggle-knob"></div>
        </div>
      </div>
    </button>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState('Dark');
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [units, setUnits] = useState('Metric');

  return (
    <div className="profile-page">
      <div className="profile-content">

        {/* Top bar */}
        <div className="profile-top-bar anim-fade-in">
          <button className="top-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <div className="profile-badge">
            <span className="profile-badge-text">IDENTITY SYSTEM ACTIVE</span>
          </div>
          {/* Spacer for global menu button */}
          <div className="profile-top-spacer"></div>
        </div>

        {/* Hero Section */}
        <div className="profile-hero anim-slide-up">
          <div className="hero-avatar anim-scale-in">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="hero-avatar-img" />
            ) : (
              <User size={56} strokeWidth={1.5} color="#090909" />
            )}
          </div>
          <div className="hero-details">
            <h1 className="hero-name">{user?.name || "User"}</h1>
            <p className="hero-email">{user?.email || ""}</p>
            <div className="hero-badges">
              <span className="badge-pro">PRO</span>
              <button className="edit-btn">Edit</button>
            </div>
          </div>
        </div>

        {/* Personal Statistics */}
        <div className="stats-container">
          <StatItem label="Meetings" value={142} delay={0.1} />
          <StatItem label="Saved Places" value={28} delay={0.15} />
          <StatItem label="Friends" value={14} delay={0.2} />
        </div>

        {/* Recent Activity Timeline */}
        <ProfileSection className="section-block">
          <h2 className="section-title">Recent Activity</h2>
          <div className="timeline">
            <div className="timeline-item anim-slide-up" style={{ animationDelay: '0.35s' }}>
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <span className="timeline-time">Yesterday</span>
                <span className="timeline-desc">Blue Tokai Coffee · With Rahul</span>
              </div>
            </div>
            <div className="timeline-item anim-slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <span className="timeline-time">Monday</span>
                <span className="timeline-desc">Starbucks · With Priya</span>
              </div>
            </div>
            <div className="timeline-item anim-slide-up" style={{ animationDelay: '0.45s' }}>
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <span className="timeline-time">Last Week</span>
                <span className="timeline-desc">Phoenix Mall · Team Meeting</span>
              </div>
            </div>
          </div>
        </ProfileSection>

        {/* Saved Places (Horizontal Scroll) */}
        <ProfileSection className="section-block">
          <h2 className="section-title">Saved Places</h2>
          <div className="places-scroll-container anim-slide-up" style={{ animationDelay: '0.55s' }}>
            <div className="place-card">
              <div className="place-card-bg"></div>
              <div className="place-card-info">
                <span className="place-name">The Roastery</span>
                <span className="place-type">Cafe</span>
              </div>
            </div>
            <div className="place-card">
              <div className="place-card-bg"></div>
              <div className="place-card-info">
                <span className="place-name">Berlin Library</span>
                <span className="place-type">Workspace</span>
              </div>
            </div>
            <div className="place-card">
              <div className="place-card-bg"></div>
              <div className="place-card-info">
                <span className="place-name">Tempelhof</span>
                <span className="place-type">Park</span>
              </div>
            </div>
          </div>
        </ProfileSection>

        {/* Preferences */}
        <ProfileSection className="section-block">
          <h2 className="section-title">Preferences</h2>
          <div className="list-group">
            <ListRow
              icon={Sun}
              title="Theme"
              value={theme}
              onClick={() => setTheme(theme === 'Dark' ? 'Light' : 'Dark')}
              delay={0.65}
            />
            <ToggleRow
              icon={Bell}
              title="Notifications"
              state={notificationsOn}
              toggle={() => setNotificationsOn(!notificationsOn)}
              delay={0.7}
            />
            <ListRow
              icon={MapPin}
              title="Units"
              value={units}
              onClick={() => setUnits(units === 'Metric' ? 'Imperial' : 'Metric')}
              delay={0.75}
            />
            <ListRow
              icon={Navigation}
              title="Default Transport"
              value="Transit"
              onClick={() => { }}
              delay={0.8}
            />
          </div>
        </ProfileSection>

        {/* Account */}
        <ProfileSection className="section-block">
          <h2 className="section-title">Account</h2>
          <div className="list-group">
            <ToggleRow
              icon={Globe}
              title="Private Profile"
              state={isPrivate}
              toggle={() => setIsPrivate(!isPrivate)}
              delay={0.9}
            />
            <ListRow icon={Shield} title="Security & Biometrics" onClick={() => { }} delay={0.95} />
            <ListRow icon={Link2} title="Connected Accounts" value="2 Active" onClick={() => { }} delay={1.0} />
            <ListRow icon={CreditCard} title="Subscription" value="Pro" onClick={() => { }} delay={1.05} />
          </div>
        </ProfileSection>

        {/* Support */}
        <ProfileSection className="section-block">
          <h2 className="section-title">Support</h2>
          <div className="list-group">
            <ListRow icon={HelpCircle} title="How to Use Medio" onClick={() => navigate('/guide')} delay={1.15} />
            <ListRow icon={Mail} title="Contact Support" onClick={() => { }} delay={1.2} />
            <ListRow icon={Info} title="About Medio" value="v4.0.2" onClick={() => { }} delay={1.25} />
            <ListRow icon={FileText} title="Privacy Policy" onClick={() => { }} delay={1.3} />
          </div>
        </ProfileSection>

        {/* Log Out */}
        <ProfileSection className="logout-block" style={{ marginTop: '-24px', marginBottom: '16px' }}>
          <div className="list-group">
            <ListRow
              icon={LogOut}
              title="Log Out"
              onClick={async () => { await logout(); navigate('/login', { replace: true }); }}
              delay={1.35}
              danger={true}
            />
          </div>
        </ProfileSection>

      </div>
    </div>
  );
}
