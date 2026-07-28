import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import MeetPage from './pages/MeetPage';
import ResultsPage from './pages/ResultsPage';
import DetailPage from './pages/DetailPage';
import SharePage from './pages/SharePage';
import SharedLinkPage from './pages/SharedLinkPage';
import ProfilePage from './pages/ProfilePage';
import HowToUsePage from './pages/HowToUsePage';
import JourneyPlannerPage from './pages/JourneyPlannerPage';
import InfoPage from './pages/InfoPage';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SideNav from './components/SideNav/SideNav';
import PhoneFrame from './components/PhoneFrame/PhoneFrame';
import './App.css';

function AppRoutes() {
  const { isExpanded, setIsExpanded } = useNavigation();
  const location = useLocation();
  const isPublicPage = ['/', '/login', '/privacy', '/terms'].includes(location.pathname);
  const isGuestSharePage = location.pathname.startsWith('/share');
  const hideNav = isPublicPage || isGuestSharePage;

  return (
    <div className="app-container">
      {!hideNav && (
        <button
          className="floating-menu-btn anim-card-lift"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="menu-icon-lines">
            <div className={`menu-line ${isExpanded ? 'open' : ''}`}></div>
            <div className={`menu-line ${isExpanded ? 'open' : ''}`}></div>
          </div>
        </button>
      )}

      {!hideNav && <SideNav />}
      <div className={`main-content ${isExpanded ? 'nav-expanded' : ''}`}>
        <div className="main-content-inner">
          <div
            className="content-overlay"
            onClick={() => { if(isExpanded) setIsExpanded(false); }}
          />
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/meet" element={<ProtectedRoute><MeetPage /></ProtectedRoute>} />
              <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
              <Route path="/detail" element={<DetailPage />} />
              <Route path="/share" element={<ProtectedRoute><SharePage /></ProtectedRoute>} />
              <Route path="/share/:shareId" element={<SharedLinkPage />} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/guide" element={<ProtectedRoute><HowToUsePage /></ProtectedRoute>} />
              <Route path="/travel" element={<JourneyPlannerPage />} />
              <Route path="/privacy" element={<InfoPage type="privacy" />} />
              <Route path="/terms" element={<InfoPage type="terms" />} />
              <Route path="/about" element={<ProtectedRoute><InfoPage type="about" /></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute><InfoPage type="support" /></ProtectedRoute>} />
            </Routes>
          </AuthProvider>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

function App() {
  return (
    <NavigationProvider>
      <PhoneFrame>
        <AppContent />
      </PhoneFrame>
    </NavigationProvider>
  );
}

export default App;
