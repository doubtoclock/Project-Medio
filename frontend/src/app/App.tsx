import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { MeetView } from "./components/medio/MeetView";
import { TravelView } from "./components/medio/TravelView";
import { UserGuideView } from "./components/medio/UserGuideView";
import { ProfileView } from "./components/medio/ProfileView";
import { NotificationBell } from "./components/medio/NotificationBell";

import { LoginPage } from "./components/medio/auth/Login";
import { ProtectedRoute } from "./components/medio/auth/ProtectedRoute";

import SplashScreen from "./components/medio/SplashScreen";

type ThemeMode = "dark" | "light";

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "dark";

  const savedTheme = window.localStorage.getItem("medio-theme");
  return savedTheme === "light" ? "light" : "dark";
};

const ThemeToggle = ({
  theme,
  onToggle,
}: {
  theme: ThemeMode;
  onToggle: () => void;
}) => {
  const isLight = theme === "light";

  return (
    <button
      type="button"
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      aria-pressed={isLight}
      title={`Switch to ${isLight ? "dark" : "light"} mode`}
      onClick={onToggle}
      className={`theme-toggle ${isLight ? "theme-toggle--light" : ""}`}
    >
      <span className="theme-toggle__halo" aria-hidden="true" />
      <span className="theme-toggle__track" aria-hidden="true">
        <Moon size={14} className="theme-toggle__icon theme-toggle__icon--moon" />
        <Sun size={15} className="theme-toggle__icon theme-toggle__icon--sun" />
        <span className="theme-toggle__thumb">
          {isLight ? <Sun size={16} /> : <Moon size={16} />}
        </span>
      </span>
    </button>
  );
};

/**
 * Minimal layout wrapper for protected pages
 * (pages now control their own header and navigation)
 */
const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full">
      <NotificationBell />
      {children}
    </div>
  );
};

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;

    root.dataset.theme = theme;
    root.classList.toggle("light-mode", theme === "light");
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("medio-theme", theme);
  }, [theme]);

  return (
    <>
      <ThemeToggle
        theme={theme}
        onToggle={() => setTheme((current) => (
          current === "dark" ? "light" : "dark"
        ))}
      />

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
              <ProtectedLayout>
                <MeetView />
              </ProtectedLayout>
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
    </>
  );
}
