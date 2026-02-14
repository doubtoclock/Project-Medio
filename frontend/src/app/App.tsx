import { Routes, Route, Navigate } from "react-router-dom";

import { BottomNav } from "./components/medio/BottomNav";
import { MeetView } from "./components/medio/MeetView";
import { TravelView } from "./components/medio/TravelView";
import { UserGuideView } from "./components/medio/UserGuideView";
import { ProfileView } from "./components/medio/ProfileView"; // 👈 NEW

import { LoginPage } from "./components/medio/auth/Login";
import { ProtectedRoute } from "./components/medio/auth/ProtectedRoute";

/**
 * Layout shown ONLY when user is authenticated
 */
const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
};

export default function App() {
  return (
    <div className="bg-black min-h-screen text-zinc-100 font-sans overflow-hidden">
      <div className="max-w-md mx-auto min-h-screen bg-zinc-950 relative shadow-2xl">
        <Routes>
          {/* 🔐 LOGIN (PUBLIC) */}
          <Route path="/login" element={<LoginPage />} />

          {/* 🔒 PROTECTED APP ROUTES */}
          <Route
            path="/meet"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <MeetView />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

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

          {/* 👤 PROFILE (NEW) */}
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

          {/* 🔁 DEFAULT */}
          <Route path="*" element={<Navigate to="/meet" replace />} />
        </Routes>

      </div>
    </div>
  );
}
