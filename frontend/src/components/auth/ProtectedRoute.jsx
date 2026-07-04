import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const SESSION_TIMEOUT_MS = 10000;

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, refresh } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, SESSION_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading && timedOut) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100%",
          padding: "24px",
          gap: "16px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--secondary-text)", fontSize: "14px" }}>
          Session check timed out. Please try again.
        </p>
        <button
          onClick={() => { setTimedOut(false); refresh(); }}
          style={{
            padding: "12px 24px",
            borderRadius: "24px",
            border: "none",
            backgroundColor: "var(--accent-color)",
            color: "var(--bg-color)",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100%",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "3px solid var(--border-color)",
            borderTopColor: "var(--accent-color)",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
