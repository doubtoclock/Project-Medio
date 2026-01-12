import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { BottomNav } from "./components/medio/BottomNav";
import { MeetView } from "./components/medio/MeetView";
import { TravelView } from "./components/medio/TravelView";
import { UserGuideView } from "./components/medio/UserGuideView";

import { LoginPage } from "./components/medio/auth/Login";
import { ProtectedRoute } from "./components/medio/auth/ProtectedRoute";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <div className="bg-black min-h-screen text-zinc-100 font-sans flex justify-center">
      <main className="min-h-screen w-full mx-auto relative bg-zinc-950 shadow-2xl border-x border-zinc-900 overflow-hidden">

        <Routes>
          {/* LOGIN */}
          <Route
            path="/login"
            element={<LoginPage onLogin={() => setIsAuthenticated(true)} />}
          />

          {/* PROTECTED ROUTES */}
          <Route
            path="/meet"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MeetView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/travel"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <TravelView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/guide"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <UserGuideView />
              </ProtectedRoute>
            }
          />

          {/* DEFAULT */}
          <Route
            path="*"
            element={
              <Navigate to={isAuthenticated ? "/meet" : "/login"} replace />
            }
          />
        </Routes>

        {/* Bottom nav ONLY when logged in */}
        {isAuthenticated && <BottomNav />}
      </main>
    </div>
  );
}