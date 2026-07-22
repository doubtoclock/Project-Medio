import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, ChevronRight, MapPin,
  Navigation, Bell, LogOut,
  CreditCard, HelpCircle, Mail, Info, FileText, X, Check, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/apiClient';
import { getPreferredUnits, setPreferredUnits } from '../lib/routeUtils';
import './ProfilePage.css';

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

function useAnimatedCounter(endValue, duration = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
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
  const [notificationsOn, setNotificationsOn] = useState(user?.notificationsEnabled ?? true);
  const [units, setUnits] = useState(() => getPreferredUnits());

  const [fullProfile, setFullProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedAvatarUrl, setEditedAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [comingSoonMsg, setComingSoonMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    setProfileError('');

    apiClient.auth.profile()
      .then((data) => {
        if (cancelled) return;
        setFullProfile(data);
        setEditedName(data.user.name);
        setEditedAvatarUrl(data.user.avatarUrl || '');
        setNotificationsOn(data.user.notificationsEnabled);
      })
      .catch(() => {
        if (!cancelled) setProfileError('Failed to load profile data');
      });

    return () => { cancelled = true; };
  }, [user]);

  const handleEditToggle = () => {
    if (!isEditing && fullProfile) {
      setEditedName(fullProfile.user.name);
      setEditedAvatarUrl(fullProfile.user.avatarUrl || '');
    }
    setIsEditing((prev) => !prev);
    setSuccessMessage('');
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim()) return;
    setSaving(true);
    setSuccessMessage('');
    setProfileError('');
    try {
      const data = await apiClient.auth.updateProfile({
        name: editedName.trim(),
        avatarUrl: editedAvatarUrl.trim() || null,
      });
      setFullProfile(data);
      setSuccessMessage('Profile updated');
      setIsEditing(false);
    } catch (err) {
      setProfileError(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotification = async () => {
    const next = !notificationsOn;
    setNotificationsOn(next);
    try {
      await apiClient.auth.updateProfile({ notificationsEnabled: next });
    } catch {
      setNotificationsOn(!next);
    }
  };

  const showComingSoon = (feature) => {
    setComingSoonMsg(`${feature} — coming soon.`);
    setTimeout(() => setComingSoonMsg(''), 3000);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleToggleUnits = () => {
    const next = units === 'metric' ? 'imperial' : 'metric';
    setUnits(next);
    setPreferredUnits(next);
    setSuccessMessage(`Units switched to ${next === 'metric' ? 'kilometers' : 'miles'}`);
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Delete your MEDIO account and all related saved places and activity? This cannot be undone.');
    if (!confirmed) return;

    setDeleting(true);
    setProfileError('');
    try {
      await apiClient.auth.deleteAccount();
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setProfileError(err?.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  const stats = fullProfile?.stats;
  const savedPlaces = fullProfile?.savedPlaces || [];

  return (
    <div className="profile-page">
      <div className="profile-content">

        <div className="profile-top-bar anim-fade-in">
          <button className="top-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <div className="profile-badge">
            <span className="profile-badge-text">IDENTITY SYSTEM ACTIVE</span>
          </div>
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
          {isEditing ? (
            <div className="hero-details">
              <input
                type="text"
                className="profile-edit-input profile-edit-name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Your name"
              />
              <input
                type="text"
                className="profile-edit-input profile-edit-avatar"
                value={editedAvatarUrl}
                onChange={(e) => setEditedAvatarUrl(e.target.value)}
                placeholder="Avatar URL (https://...)"
              />
              <div className="hero-badges">
                <button className="edit-btn" onClick={handleSaveProfile} disabled={saving || !editedName.trim()}>
                  {saving ? 'Saving...' : <Check size={16} />}
                </button>
                <button className="edit-btn" onClick={() => setIsEditing(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="hero-details">
              <h1 className="hero-name">{user?.name || 'User'}</h1>
              <p className="hero-email">{user?.email || ''}</p>
              <div className="hero-badges">
                <span className="badge-pro">PRO</span>
                <button className="edit-btn" onClick={handleEditToggle}>Edit</button>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        {(profileError || successMessage || comingSoonMsg) && (
          <div style={{
            padding: '12px 16px', borderRadius: 12, marginBottom: 16, fontSize: 13,
            backgroundColor: comingSoonMsg ? 'rgba(255,255,255,0.03)' : (profileError ? 'rgba(217,92,92,0.1)' : 'rgba(76,175,80,0.1)'),
            border: '1px solid',
            borderColor: comingSoonMsg ? 'rgba(255,255,255,0.06)' : (profileError ? 'rgba(217,92,92,0.2)' : 'rgba(76,175,80,0.2)'),
            color: comingSoonMsg ? '#A1A1A1' : (profileError ? '#D95C5C' : '#4CAF50'),
          }}>
            {profileError || successMessage || comingSoonMsg}
          </div>
        )}

        {/* Statistics */}
        <div className="stats-container">
          <StatItem label="Trips" value={stats?.tripsCount ?? 0} delay={0.1} />
          <StatItem label="Saved Places" value={stats?.savedPlacesCount ?? 0} delay={0.15} />
          <StatItem label="Activity" value={stats?.activityCount ?? 0} delay={0.2} />
        </div>

        {/* Saved Places */}
        <ProfileSection className="section-block">
          <h2 className="section-title">Saved Places</h2>
          {savedPlaces.length === 0 ? (
            <div style={{
              padding: 24, textAlign: 'center', borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <p style={{ color: '#A1A1A1', fontSize: 13 }}>No saved places yet. Save places from the travel page and they will show up here.</p>
            </div>
          ) : (
            <div className="places-scroll-container anim-slide-up" style={{ animationDelay: '0.55s' }}>
              {savedPlaces.map((place) => (
                <div key={place._id} className="place-card">
                  <div className="place-card-bg"></div>
                  <div className="place-card-info">
                    <span className="place-name">{place.label}</span>
                    <span className="place-type">{place.address}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ProfileSection>

        {/* Preferences */}
        <ProfileSection className="section-block">
          <h2 className="section-title">Preferences</h2>
          <div className="list-group">
            <ToggleRow
              icon={Bell}
              title="Notifications"
              state={notificationsOn}
              toggle={handleToggleNotification}
              delay={0.65}
            />
            <ListRow
              icon={MapPin}
              title="Units"
              value={units === 'metric' ? 'Kilometers' : 'Miles'}
              onClick={handleToggleUnits}
              delay={0.7}
            />
            <ListRow
              icon={Navigation}
              title="Default Transport"
              value="Transit"
              onClick={() => showComingSoon('Default transport preference')}
              delay={0.75}
            />
          </div>
        </ProfileSection>

        {/* Account */}
        <ProfileSection className="section-block">
          <h2 className="section-title">Account</h2>
          <div className="list-group">
            <ListRow icon={CreditCard} title="Subscription" value="Pro" onClick={() => showComingSoon('Subscription management')} delay={0.85} />
          </div>
        </ProfileSection>

        {/* Support */}
        <ProfileSection className="section-block">
          <h2 className="section-title">Support</h2>
          <div className="list-group">
            <ListRow icon={HelpCircle} title="How to Use Medio" onClick={() => navigate('/guide')} delay={1.15} />
            <ListRow icon={Mail} title="Contact Support" onClick={() => navigate('/support')} delay={1.2} />
            <ListRow icon={Info} title="About Medio" value="v4.0.2" onClick={() => navigate('/about')} delay={1.25} />
            <ListRow icon={FileText} title="Privacy Policy" onClick={() => navigate('/privacy')} delay={1.3} />
            <ListRow icon={FileText} title="Terms & Conditions" onClick={() => navigate('/terms')} delay={1.35} />
          </div>
        </ProfileSection>

        {/* Log Out */}
        <ProfileSection className="logout-block" style={{ marginTop: '-24px', marginBottom: '16px' }}>
          <div className="list-group">
            <ListRow
              icon={LogOut}
              title="Log Out"
              onClick={handleLogout}
              delay={1.4}
              danger={true}
            />
            <ListRow
              icon={Trash2}
              title={deleting ? 'Deleting...' : 'Delete Account'}
              onClick={handleDeleteAccount}
              delay={1.45}
              danger={true}
            />
          </div>
        </ProfileSection>

      </div>
    </div>
  );
}
