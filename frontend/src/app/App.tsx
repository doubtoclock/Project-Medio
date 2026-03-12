import { Routes, Route, Navigate } from "react-router-dom";
import { MeetView } from "./components/medio/MeetView";
import { TravelView } from "./components/medio/TravelView";
import { UserGuideView } from "./components/medio/UserGuideView";
import { ProfileView } from "./components/medio/ProfileView";

import { LoginPage } from "./components/medio/auth/Login";
import { ProtectedRoute } from "./components/medio/auth/ProtectedRoute";

import SplashScreen from "./components/medio/SplashScreen";

/**
 * Minimal layout wrapper for protected pages
 * (pages now control their own header and navigation)
 */
const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full">
      {children}
    </div>
  );
};

export default function App() {
  return (
    <Routes>

      {/* Splash */}
      <Route path="/" element={<SplashScreen />} />

      {/* Login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Meet page (full screen layout handled inside MeetView) */}
      <Route
        path="/meet"
        element={
          <ProtectedRoute>
            <MeetView />
          </ProtectedRoute>
        }
      />

      {/* Travel */}
      <Route
        path="/travel"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <TravelView />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      {/* Guide */}
      <Route
        path="/guide"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <UserGuideView />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      {/* Profile */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <ProfileView />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}
